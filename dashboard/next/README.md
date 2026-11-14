# Dashboard Next

แดชบอร์ดรุ่นถัดไปของสวนลุงนะ เป็น static functional prototype ที่เพิ่มไว้แยกจากระบบ MQTT เดิม เพื่อให้ทดลอง UX ใหม่ได้โดยไม่กระทบการควบคุมอุปกรณ์จริง

## เปิดใช้งาน

เปิด `dashboard/next/index.html` โดยตรง หรือใช้ static server จาก root ของ `dashboard/`:

```bash
python3 -m http.server 4173 --bind 0.0.0.0 --directory dashboard
```

แล้วเปิด `http://localhost:4173/next/` หรือเส้นทางบน GitHub Pages ที่ลงท้ายด้วย `/dashboard/next/`

## หน้าในรุ่นนี้

ใช้เมนูด้านซ้ายหรือ hash route เพื่อเปลี่ยนหน้า: `#overview`, `#farm`, `#water`, `#environment`, `#crops`, `#tasks`, `#analytics`

ข้อมูลชุดนี้เป็นข้อมูลตัวอย่างที่ฝังใน `app.js` เพื่อให้ทุกหน้ามีเนื้อหาและ interaction พร้อมทดสอบได้ทันที ฟังก์ชันที่ทำงานในเบราว์เซอร์ ได้แก่ การกรองแปลง/งาน การเปิด–ปิดโซนจำลอง การสแกนพืชจำลอง การเพิ่มงาน การทดลอง what-if และการ export CSV

การเชื่อมต่อ MQTT และ safety logic เดิมยังอยู่ใน `dashboard/` ระดับบน ไม่ได้ถูกแก้ทับโดย Dashboard Next
