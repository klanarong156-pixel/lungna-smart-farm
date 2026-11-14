# Dashboard Next Plan

## ขอบเขต

เพิ่มแดชบอร์ดรุ่นถัดไปใน `dashboard/next/` โดยไม่ทับแดชบอร์ด MQTT เดิมใน `dashboard/` เพื่อให้ระบบฮาร์ดแวร์เดิมยังใช้งานต่อได้ แดชบอร์ดใหม่เป็น static functional prototype ที่ใช้ข้อมูลตัวอย่างสมจริงและมีการโต้ตอบในเบราว์เซอร์

## โครงสร้างหน้า

- `/dashboard/next/#overview` — ภาพรวมฟาร์ม: KPI, แผนที่โซน, งานเร่งด่วน, แนวโน้ม, เหตุการณ์
- `/dashboard/next/#farm` — ฟาร์มและแปลง: ตัวกรองแปลง/ชนิดพืช/สถานะ และการ์ดแต่ละแปลง
- `/dashboard/next/#water` — การให้น้ำ: ความชื้น, วาล์ว/ปั๊ม, ตารางให้น้ำ และปุ่มควบคุมโซน
- `/dashboard/next/#environment` — สภาพแวดล้อม: อุณหภูมิ, ความชื้น, แสง, ฝน, ลม และกราฟ 24 ชั่วโมง
- `/dashboard/next/#crops` — สุขภาพพืช: คะแนนสุขภาพ, ความเสี่ยงศัตรูพืช/โรค, ผลการตรวจ และคำแนะนำ
- `/dashboard/next/#tasks` — งานและทีม: board ตามสถานะ, ตัวกรอง, งานใหม่ และภาระงานทีม
- `/dashboard/next/#analytics` — การวิเคราะห์: ผลผลิต, การใช้น้ำ, ต้นทุน, เปรียบเทียบแปลง, export CSV

## การออกแบบ

สไตล์ที่พิจารณา: editorial farm operations 0.07, colorful data garden 0.06, dark precision control 0.05

เลือก **colorful data garden**: แดชบอร์ดข้อมูลฟาร์มที่สดใสแต่มีลำดับชั้นชัดเจน ใช้สีเป็นภาษาของสถานะและแยกพื้นที่ทำงานเป็นหน้าเฉพาะ

- Design movement: colorful editorial dashboard / modern agri SaaS
- Core principles: เห็นสิ่งสำคัญใน 5 วินาที, แยกภารกิจชัด, สีสื่อสถานะ, ทุกการ์ดนำไปสู่การกระทำได้
- Color philosophy: เขียวเข้มเป็นโครงสร้างและความน่าเชื่อถือ, เขียวสด/ฟ้าเป็นข้อมูลปกติ, เหลืองเป็นเฝ้าระวัง, แดงอมส้มเป็นเรื่องเร่งด่วน, ม่วงใช้กับการวิเคราะห์
- Layout paradigm: asymmetrical command center; hero + KPI rail + split workspace, ไม่ใช้กริดเท่ากันทั้งหน้า
- Signature elements: ตัวเลขขนาดใหญ่แบบ editorial, ป้ายสถานะทรง pill, แผนที่แปลงรูปทรงอินทรีย์ด้วย SVG
- Interaction: filter แล้วผลลัพธ์เปลี่ยนทันที, toggle การให้น้ำแสดงสถานะยืนยัน, กราฟเปลี่ยนช่วงเวลา, export สร้าง CSV จริง
- Animation: เปลี่ยนหน้าแบบ fade/slide สั้น, progress bars เติมแบบเบา, เคารพ prefers-reduced-motion
- Typography: IBM Plex Sans Thai สำหรับเนื้อหา + Manrope สำหรับตัวเลขและ label อังกฤษ
- Brand essence: ศูนย์บัญชาการฟาร์มที่ช่วยเปลี่ยนข้อมูลให้เป็นการลงมือทำ; ชัดเจน, สดใส, ลงมือได้
- Brand voice: “วันนี้ฟาร์มพร้อมแค่ไหน?” และ “เห็นสัญญาณเร็ว จัดการก่อนพืชเครียด”
- Wordmark: ใช้ชื่อ สวนลุงนะ พร้อมสัญลักษณ์เมล็ด/เส้นแปลงจาก asset เดิม
- Signature brand color: leaf green `#2FB673`

## ฟังก์ชันใหม่ที่เสนอในแต่ละหน้า

- ภาพรวม: Focus Queue แนะนำลำดับสิ่งที่ควรทำจากความเสี่ยงและงานวันนี้
- ฟาร์ม: Field Snapshot เปรียบเทียบแปลงแบบย่อและกรองตามความเสี่ยง
- น้ำ: Water Guard จำลองผลประหยัดน้ำและยืนยันการเปิด/ปิดโซน
- สภาพแวดล้อม: Zone Compare เทียบค่าพื้นที่ที่เลือกกับค่าเฉลี่ยฟาร์ม
- สุขภาพพืช: Crop Scan สร้างผลตรวจล่าสุดและคำแนะนำที่ตรวจสอบได้
- งานและทีม: Workload Lens แสดงภาระงานและเพิ่มงานใหม่ใน board
- วิเคราะห์: What-if scenario และ export CSV สำหรับนำไปใช้ต่อ

## โครงสร้างไฟล์

- `dashboard/next/index.html`: shell, semantic page containers, accessible controls
- `dashboard/next/styles.css`: design system, responsive layout, charts and states
- `dashboard/next/app.js`: mock data, routing, rendering, interactions, export
- `docs/dashboard-research.md`: แหล่งวิจัยและหลักที่นำมาปรับใช้
