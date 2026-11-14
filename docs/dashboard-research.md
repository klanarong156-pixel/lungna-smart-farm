# แหล่งวิจัยก่อนออกแบบ Dashboard Next

## แหล่งอ้างอิง

- [AgroFlow – Farm Management SaaS Dashboard](https://rondesignlab.com/blog/work-in-progress/agroflow-farm-management-saas-dashboard-and-operational-uxui-design): รวมแผนที่แปลง การแบ่งโซนพืช สภาพอากาศแบบเรียลไทม์ ชั้นความเสี่ยงน้ำ การ์ดงาน และการแจ้งเตือนโรค/ศัตรูพืชไว้ในศูนย์กลางเดียว
- [ThingsBoard – Agriculture & Farm management software](https://thingsboard.io/smart-farming-demo/): เน้นการติดตามแบบเรียลไทม์ แผนที่แบบโต้ตอบ dashboard ที่ปรับได้ การตั้งค่าอุปกรณ์ การวิเคราะห์ย้อนหลัง และระบบแจ้งเตือนตามกฎ
- [Kaa IoT – Smart Farming IoT Solution](https://www.kaaiot.com/iot-dashboards/smart-farming-iot-solution): รวมค่าดิน อากาศ อุปกรณ์ และยานพาหนะในอินเทอร์เฟซเดียว พร้อม trend analysis, customizable alerts, asset tracking และการรองรับหลายไซต์
- [Bold BI – Agriculture Analytics](https://www.boldbi.com/dashboard-examples/agriculture/): ตัวชี้วัดสำคัญ ได้แก่ ผลผลิต การใช้ทรัพยากร ตัวแปรดิน/อากาศ ประสิทธิภาพแปลง การเปรียบเทียบตามฤดูกาล และกราฟ irrigation/resource monitoring

## สิ่งที่นำมาปรับใช้ในรุ่นนี้

การวิจัยชี้ว่าหน้าแรกของ smart-farm dashboard ควรเป็นศูนย์ตัดสินใจ ไม่ใช่เพียงพื้นที่รวมกราฟ จึงวาง KPI สถานะสุขภาพฟาร์ม แผนที่โซน งานเร่งด่วน แนวโน้ม และเหตุการณ์ล่าสุดไว้ด้วยกัน แต่แยกหน้าการให้น้ำ สภาพแวดล้อม สุขภาพพืช งานทีม และการวิเคราะห์ให้ชัด เพื่อไม่ให้ข้อมูลแน่นจนผู้ใช้หา action ไม่เจอ

นำแนวคิด color-coded risk mapping, weather-linked irrigation, customizable alerts, asset/status view และ historical comparison มาปรับเป็นข้อมูลตัวอย่างที่ใช้งานได้ในเบราว์เซอร์ โดยไม่แตะ MQTT dashboard เดิมและไม่สมมติว่าเซนเซอร์จริงกำลังออนไลน์อยู่
