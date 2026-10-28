(() => {
  'use strict';

  const cfg = SmartFarmConfig.mqtt;
  const topics = cfg.topics;
  const manager = {
    client: null,
    manualStop: false,
    connecting: false,
    subscribed: new WeakSet(),
    pending: new Map(),
    pendingMode: null,
    pendingSchedules: new Map(),
    watchdog: null,
    reconnectTimer: null,
    reconnectAttempt: 0,
    credentialKeys: ['sf.mqtt.user', 'sf.mqtt.pass'],

    credentials() {
      try {
        return {
          user: sessionStorage.getItem(this.credentialKeys[0]) || localStorage.getItem(this.credentialKeys[0]) || cfg.defaultUsername,
          pass: sessionStorage.getItem(this.credentialKeys[1]) || localStorage.getItem(this.credentialKeys[1]) || '',
          remember: Boolean(localStorage.getItem(this.credentialKeys[1]))
        };
      } catch (error) {
        FarmState.addError('storage', error.message);
        return { user: cfg.defaultUsername, pass: '', remember: false };
      }
    },

    saveCredentials(user, pass, remember) {
      if (!user.trim() || !pass) throw Error('กรุณากรอก MQTT username และ password');
      for (const store of [localStorage, sessionStorage]) {
        store.removeItem(this.credentialKeys[0]);
        store.removeItem(this.credentialKeys[1]);
      }
      const store = remember ? localStorage : sessionStorage;
      store.setItem(this.credentialKeys[0], user.trim());
      store.setItem(this.credentialKeys[1], pass);
    },

    autoConnect() {
      const credentials = this.credentials();
      if (!credentials.pass) {
        FarmState.setConnection('offline', 'พร้อมเชื่อมต่ออัตโนมัติ · รอ password ครั้งแรก');
        return false;
      }
      return this.connect(credentials.user, credentials.pass, credentials.remember);
    },

    connect(user, pass, remember) {
      if (typeof window.mqtt === 'undefined') {
        FarmState.setConnection('error', 'ไม่พบ MQTT.js');
        FarmState.addError('mqtt-library', 'MQTT.js load ไม่สำเร็จ');
        return false;
      }
      try { this.saveCredentials(user, pass, remember); }
      catch (error) { FarmState.addError('credentials', error.message); return false; }
      if (this.client?.connected || this.connecting) return true;

      this.manualStop = false;
      this.connecting = true;
      FarmState.setConnection('connecting', 'กำลังเชื่อมต่อ HiveMQ Cloud');
      const clientId = `SF-DASH-${crypto.getRandomValues(new Uint32Array(1))[0].toString(16)}`;
      let client;
      try {
        client = mqtt.connect(cfg.url, {
          clientId, username: user.trim(), password: pass,
          clean: true, reconnectPeriod: 0, connectTimeout: 20000,
          keepalive: 30, resubscribe: true, protocolVersion: 4
        });
      } catch (error) {
        this.connecting = false;
        FarmState.setConnection('error', error.message);
        FarmState.addError('mqtt-connect', error.message);
        return false;
      }
      this.client = client;
      client.on('connect', () => {
        if (this.client !== client) return;
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        this.reconnectAttempt = 0;
        this.connecting = false;
        FarmState.setConnection('online', 'เชื่อมต่อ broker แล้ว');
        this.subscribe(client);
        this.startWatchdog();
      });
      client.on('reconnect', () => {
        if (this.client !== client) return;
        this.connecting = true;
        FarmState.setConnection('reconnecting', 'กำลังเชื่อมต่อใหม่');
      });
      client.on('offline', () => {
        if (this.client !== client) return;
        this.connecting = true;
        FarmState.setConnection('reconnecting', 'MQTT socket offline');
      });
      client.on('close', () => {
        if (this.client !== client) return;
        this.connecting = !this.manualStop;
        FarmState.setConnection(this.manualStop ? 'offline' : 'reconnecting', this.manualStop ? 'ตัดการเชื่อมต่อแล้ว' : 'MQTT socket ปิด');
        this.resolveAll('การเชื่อมต่อขาดก่อนยืนยันสถานะ');
        if (!this.manualStop) this.scheduleReconnect(client);
      });
      client.on('error', error => {
        if (this.client !== client) return;
        const message = error?.message || String(error);
        FarmState.addError('mqtt', message);
        if (/not authorized|unauthori[sz]ed|bad user name or password|authentication|auth/i.test(message)) {
          this.manualStop = true;
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
          this.connecting = false;
          this.client = null;
          client.end(true);
          FarmState.setConnection('error', 'broker ปฏิเสธ credentials');
          this.resolveAll('MQTT authentication failed');
        }
      });
      client.on('message', (topic, payload, packet) => this.message(topic, payload.toString(), Boolean(packet?.retain)));
      return true;
    },

    subscribe(client) {
      if (this.subscribed.has(client)) return;
      this.subscribed.add(client);
      for (const topic of cfg.subscriptions) {
        client.subscribe(topic, { qos: 0 }, error => {
          if (error) FarmState.addError('mqtt-subscribe', `${topic}: ${error.message || error}`);
        });
      }
    },

    scheduleReconnect(client) {
      if (this.manualStop || this.reconnectTimer || this.client !== client) return;
      const delay = Math.min(3000 * (2 ** this.reconnectAttempt), 60000);
      this.reconnectAttempt += 1;
      FarmState.setConnection('reconnecting', `จะลองเชื่อมต่ออีกครั้งใน ${Math.round(delay / 1000)} วินาที`);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        if (this.manualStop || this.client !== client) return;
        try { client.reconnect(); }
        catch (error) {
          FarmState.addError('mqtt-reconnect', error.message);
          this.scheduleReconnect(client);
        }
      }, delay);
    },

    disconnect() {
      this.manualStop = true;
      this.connecting = false;
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      clearInterval(this.watchdog);
      this.watchdog = null;
      const client = this.client;
      this.client = null;
      this.resolveAll('ยกเลิกการเชื่อมต่อ');
      if (client) { client.removeAllListeners(); client.end(true); }
      FarmState.setConnection('offline', 'ตัดการเชื่อมต่อโดยผู้ใช้');
    },

    message(topic, value, retained) {
      try {
        if (topic === topics.online) {
          if (['false', '0', 'offline'].includes(value.trim().toLowerCase())) {
            FarmState.setEspOffline('ESP LWT offline');
            window.dispatchEvent(new CustomEvent('farm:presence-offline'));
          }
          return;
        }
        if (topic === topics.device) { FarmState.setDevice(JSON.parse(value), retained); return; }
        if (topic === topics.dht11) { FarmState.setSensor(JSON.parse(value)); return; }
        if (topic === topics.modeStatus) {
          const mode = value.trim();
          FarmState.setMode(mode);
          if (this.pendingMode?.target === mode) {
            clearTimeout(this.pendingMode.timer);
            this.pendingMode.resolve(true);
            this.pendingMode = null;
          }
          return;
        }
        if (topic === topics.emergencyStatus) { FarmState.setEmergency(JSON.parse(value)); return; }
        if (topic === topics.systemError) { FarmState.setSystemError(JSON.parse(value)); return; }
        const scheduleTopic = /^smartfarm\/schedule\/([^/]+)\/status$/.exec(topic);
        if (scheduleTopic) {
          const id = scheduleTopic[1];
          const schedule = FarmState.normalizeSchedule(id, JSON.parse(value));
          FarmState.setSchedule(id, schedule);
          const pending = this.pendingSchedules.get(id);
          if (pending) {
            const matches = JSON.stringify(pending.target.slots) === JSON.stringify(schedule.slots);
            if (matches) {
              clearTimeout(pending.timer);
              this.pendingSchedules.delete(id);
              pending.resolve(true);
            } else {
              // Keep waiting for the exact schedule requested. Retained or stale
              // status must never be mistaken for confirmation of a new command.
              pending.lastReported = schedule;
              pending.mismatchCount = (pending.mismatchCount || 0) + 1;
              FarmState.addError(
                'schedule-ack-mismatch',
                `${id}: ESP รายงานตารางไม่ตรงกับที่ส่ง (ครั้งที่ ${pending.mismatchCount})`
              );
            }
          }
          return;
        }
        if (topic.startsWith('smartfarm/relay/') && topic.endsWith('/status')) {
          const id = topic.split('/')[2];
          const status = value.trim();
          FarmState.setRelay(id, status);
          const pending = this.pending.get(id);
          if (pending && pending.target === (status === 'ON')) {
            clearTimeout(pending.timer);
            this.pending.delete(id);
            pending.resolve(true);
          }
          return;
        }
        FarmState.addError('unknown-topic', topic);
      } catch (error) {
        FarmState.addError('invalid-payload', `${topic}: ${error.message}`);
      }
    },

    commandRelay(id, target) {
      if (!Object.hasOwn(FarmState.get().relays, id)) return Promise.reject(Error('unknown relay'));
      if (!this.client?.connected) return Promise.reject(Error('MQTT ยังไม่เชื่อมต่อ'));
      if (this.pending.has(id)) return Promise.reject(Error('กำลังรอการยืนยันคำสั่งก่อนหน้า'));
      const request = { target, resolve: null, timer: null };
      const promise = new Promise((resolve, reject) => {
        request.resolve = resolve;
        request.timer = setTimeout(() => {
          this.pending.delete(id);
          reject(Error('ไม่สามารถยืนยันสถานะได้ภายในเวลาที่กำหนด'));
        }, cfg.commandTimeoutMs);
      });
      this.pending.set(id, request);
      this.client.publish(topics.relaySet(id), target ? 'ON' : 'OFF', { qos: 1, retain: false }, error => {
        if (!error) return;
        clearTimeout(request.timer);
        this.pending.delete(id);
        request.resolve(false);
        FarmState.addError('mqtt-publish', error.message || String(error));
      });
      return promise;
    },

    commandMode(mode) {
      if (!['AUTO', 'MANUAL'].includes(mode)) return Promise.reject(Error('ไม่รองรับ mode นี้ใน firmware'));
      if (!this.client?.connected) return Promise.reject(Error('MQTT ยังไม่เชื่อมต่อ'));
      if (this.pendingMode) return Promise.reject(Error('กำลังรอการยืนยัน mode ก่อนหน้า'));
      const request = { target: mode, resolve: null, timer: null };
      const promise = new Promise((resolve, reject) => {
        request.resolve = resolve;
        request.timer = setTimeout(() => {
          this.pendingMode = null;
          reject(Error('ไม่สามารถยืนยัน mode จาก ESP ได้ภายในเวลาที่กำหนด'));
        }, cfg.commandTimeoutMs);
      });
      this.pendingMode = request;
      this.client.publish(topics.modeSet, mode, { qos: 1, retain: false }, error => {
        if (!error) return;
        clearTimeout(request.timer);
        this.pendingMode = null;
        request.resolve(false);
        FarmState.addError('mqtt-publish', error.message || String(error));
      });
      return promise;
    },

    commandSchedule(id, payload) {
      let target;
      try { target = FarmState.normalizeSchedule(id, payload); }
      catch (error) { return Promise.reject(error); }
      if (!this.client?.connected) return Promise.reject(Error('MQTT ยังไม่เชื่อมต่อ'));
      if (FarmState.get().espOnline !== true) return Promise.reject(Error('ESP ออฟไลน์หรือยังไม่มี heartbeat ล่าสุด'));
      if (this.pendingSchedules.has(id)) return Promise.reject(Error('กำลังรอ ESP ยืนยันตารางเวลานี้'));

      const request = { target, resolve: null, reject: null, timer: null, lastReported: null, mismatchCount: 0 };
      const promise = new Promise((resolve, reject) => {
        request.resolve = resolve;
        request.reject = reject;
        request.timer = setTimeout(() => {
          this.pendingSchedules.delete(id);
          const reported = request.lastReported
            ? ' ESP รายงานตารางกลับมาแต่ไม่ตรงกับค่าที่ส่ง'
            : ' ไม่ได้รับ schedule/status กลับจาก ESP';
          reject(Error(`บันทึกไม่สำเร็จ:${reported} ตรวจสอบว่า ESP ใช้เฟิร์มแวร์ที่รองรับตาราง MQTT และดูสถานะอุปกรณ์`));
        }, cfg.scheduleCommandTimeoutMs || cfg.commandTimeoutMs);
      });
      this.pendingSchedules.set(id, request);
      this.client.publish(topics.scheduleSet(id), JSON.stringify(target), { qos: 1, retain: false }, error => {
        if (!error) return;
        clearTimeout(request.timer);
        this.pendingSchedules.delete(id);
        request.reject(Error(`ส่งตารางผ่าน MQTT ไม่สำเร็จ: ${error.message || String(error)}`));
        FarmState.addError('mqtt-schedule-publish', error.message || String(error));
      });
      return promise;
    },

    resolveAll(reason) {
      for (const [id, pending] of this.pending) {
        clearTimeout(pending.timer);
        this.pending.delete(id);
        pending.resolve(false);
        FarmState.addError('command-unconfirmed', `${id}: ${reason}`);
      }
      if (this.pendingMode) {
        clearTimeout(this.pendingMode.timer);
        this.pendingMode.resolve(false);
        this.pendingMode = null;
        FarmState.addError('mode-unconfirmed', reason);
      }
      for (const [id, pending] of this.pendingSchedules) {
        clearTimeout(pending.timer);
        this.pendingSchedules.delete(id);
        pending.resolve(false);
        FarmState.addError('schedule-unconfirmed', `${id}: ${reason}`);
      }
    },

    startWatchdog() {
      clearInterval(this.watchdog);
      const connectedAt = Date.now();
      this.watchdog = setInterval(() => {
        const state = FarmState.get();
        const reference = state.heartbeatAt || connectedAt;
        if (Date.now() - reference > cfg.heartbeatTimeoutMs && state.espOnline !== false) {
          FarmState.setEspOffline('ESP heartbeat timeout');
          this.resolveAll('ESP heartbeat timeout');
          window.dispatchEvent(new CustomEvent('farm:esp-timeout'));
          FarmState.addError('heartbeat-timeout', 'ESP8266 heartbeat timed out');
        }
      }, 3000);
    }
  };

  window.FarmMqtt = manager;
})();
