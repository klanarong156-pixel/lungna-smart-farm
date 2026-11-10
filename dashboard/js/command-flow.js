/*
 * ตัวอย่าง Frontend state machine สำหรับคำสั่ง relay ของสวนลุงนะ
 * ไม่ทำงาน/ส่ง MQTT เอง จนกว่าจะ inject commandRelay adapter เข้ามา
 * เข้ากันกับ classic script: window.RelayCommandMachine
 */
(function attach(root) {
  'use strict';

  const ALLOWED_STATES = {
    idle: ['confirming'],
    confirming: ['sending', 'cancelled', 'failed'],
    sending: ['awaiting_ack', 'failed', 'timeout'],
    awaiting_ack: ['confirmed', 'failed', 'timeout'],
    confirmed: ['confirming'],
    timeout: ['confirming'],
    failed: ['confirming'],
    cancelled: ['confirming']
  };

  class RelayCommandMachine {
    constructor({ relayIds, getSnapshot, commandRelay, confirm, onChange = () => {} }) {
      if (!Array.isArray(relayIds) || !relayIds.length) throw new Error('relayIds is required');
      if (typeof getSnapshot !== 'function' || typeof commandRelay !== 'function') {
        throw new Error('getSnapshot and commandRelay adapters are required');
      }
      this.relayIds = new Set(relayIds);
      this.getSnapshot = getSnapshot;
      this.commandRelay = commandRelay;
      this.confirm = confirm || (() => false);
      this.onChange = onChange;
      this.byRelay = new Map();
    }

    get(relayId) {
      return this.byRelay.get(relayId) || { relayId, state: 'idle', target: null, message: '' };
    }

    isPending(relayId) {
      return ['confirming', 'sending', 'awaiting_ack'].includes(this.get(relayId).state);
    }

    _transition(relayId, next, patch = {}) {
      const current = this.get(relayId);
      if (!ALLOWED_STATES[current.state]?.includes(next)) {
        throw new Error(`Invalid command transition: ${current.state} -> ${next}`);
      }
      const value = { ...current, ...patch, relayId, state: next, updatedAt: Date.now() };
      this.byRelay.set(relayId, value);
      this.onChange(structuredClone(value));
      return value;
    }

    async request(relayId, target) {
      if (!this.relayIds.has(relayId)) throw new Error('ไม่รู้จัก relay นี้');
      if (typeof target !== 'boolean') throw new Error('target ต้องเป็น true (ON) หรือ false (OFF)');
      if (this.isPending(relayId)) throw new Error('กำลังรอคำสั่งก่อนหน้า กรุณารอสถานะจาก ESP');

      const snapshot = this.getSnapshot();
      // Broker online อย่างเดียวไม่พอ: ต้องมี heartbeat สดจาก ESP ด้วย
      if (snapshot.connection !== 'online') throw new Error('MQTT ยังไม่เชื่อมต่อ');
      if (snapshot.espOnline !== true) throw new Error('ESP ออฟไลน์หรือยังไม่มี heartbeat ล่าสุด');
      if (snapshot.emergency?.active === true) throw new Error('Emergency Stop ทำงานอยู่ · firmware ล็อกรีเลย์');
      if (snapshot.relays?.[relayId] === null || snapshot.relays?.[relayId] === undefined) {
        throw new Error('ยังไม่มีสถานะ relay ล่าสุดจาก ESP');
      }
      if (snapshot.relays[relayId] === target) {
        throw new Error(`รีเลย์อยู่สถานะ${target ? 'เปิด' : 'ปิด'}อยู่แล้ว`);
      }

      const startedAt = Date.now();
      this._transition(relayId, 'confirming', { target, startedAt, message: 'รอการยืนยันจากผู้ใช้' });
      let accepted = false;
      try {
        accepted = await this.confirm({ relayId, target, snapshot });
      } catch (error) {
        this._transition(relayId, 'failed', { message: error?.message || 'ยืนยันคำสั่งไม่สำเร็จ' });
        throw error;
      }
      if (!accepted) {
        this._transition(relayId, 'cancelled', { message: 'ยกเลิกคำสั่งแล้ว' });
        return this.get(relayId);
      }

      // The dialog is asynchronous. Re-check fresh device state before any publish
      // so a disconnect, stale heartbeat, emergency lock, or external relay change
      // while the user is deciding cannot authorize a stale command.
      const latest = this.getSnapshot();
      let staleReason = null;
      if (latest.connection !== 'online') staleReason = 'สถานะเปลี่ยนแล้ว · MQTT ไม่ได้เชื่อมต่อ';
      else if (latest.espOnline !== true) staleReason = 'สถานะเปลี่ยนแล้ว · ESP ไม่มี heartbeat ล่าสุด';
      else if (latest.emergency?.active === true) staleReason = 'Emergency Stop ทำงานอยู่ · firmware ล็อกรีเลย์';
      else if (latest.relays?.[relayId] === null || latest.relays?.[relayId] === undefined) staleReason = 'สถานะรีเลย์ล่าสุดหายไป · กรุณาตรวจสอบก่อนสั่งใหม่';
      else if (latest.relays[relayId] === target) staleReason = `รีเลย์เปลี่ยนเป็นสถานะ${target ? 'เปิด' : 'ปิด'}แล้ว · ไม่ส่งคำสั่งซ้ำ`;
      else if (latest.relays[relayId] !== snapshot.relays[relayId]) staleReason = 'สถานะรีเลย์เปลี่ยนระหว่างยืนยัน · ตรวจสอบสถานะใหม่ก่อนลองอีกครั้ง';
      if (staleReason) {
        this._transition(relayId, 'failed', { message: staleReason });
        return this.get(relayId);
      }

      this._transition(relayId, 'sending', { message: 'กำลังส่งคำสั่งไปยัง ESP' });
      try {
        // onPublished เป็น optional hook ที่เพิ่มใน FarmMqtt.commandRelay (ตัวอย่างด้านล่าง)
        // จะเข้า awaiting_ack หลัง MQTT.js publish callback สำเร็จเท่านั้น
        const result = await this.commandRelay(relayId, target, {
          onPublished: () => {
            if (this.get(relayId).state === 'sending') {
              this._transition(relayId, 'awaiting_ack', {
                message: 'ส่งแล้ว · กำลังรอสถานะ relay/status จาก ESP'
              });
            }
          }
        });
        if (result !== true) {
          this._transition(relayId, 'failed', { message: 'ยังไม่ได้รับการยืนยันสถานะจาก ESP' });
        } else {
          this._transition(relayId, 'confirmed', {
            confirmedAt: Date.now(),
            message: `ESP ยืนยันสถานะ${target ? 'เปิด' : 'ปิด'}แล้ว`
          });
        }
        return this.get(relayId);
      } catch (error) {
        const message = error?.message || 'เกิดข้อผิดพลาดขณะส่งคำสั่ง';
        const next = /timeout|ภายในเวลาที่กำหนด|ไม่สามารถยืนยัน/i.test(message) ? 'timeout' : 'failed';
        this._transition(relayId, next, {
          message: next === 'timeout' ? 'หมดเวลารอ · ยังไม่ได้รับการยืนยันจาก ESP' : message
        });
        return this.get(relayId);
      }
    }
  }

  root.RelayCommandMachine = RelayCommandMachine;
})(typeof window !== 'undefined' ? window : globalThis);
