# AI วิเคราะห์สถานะ Smart Farm

## รูปแบบและข้อจำกัด

AI เป็นผู้ช่วยอ่าน snapshot และเสนอขั้นตอนให้ผู้ใช้ตรวจสอบเท่านั้น ไม่สามารถส่ง MQTT, ควบคุม relay/pump, แก้ schedule, ปลด Emergency Stop หรือแก้ state ของอุปกรณ์ได้ ผลวิเคราะห์ไม่ใช่คำวินิจฉัยหรือคำสั่งอัตโนมัติ และ UI แสดงคำตอบเป็นข้อความธรรมดาโดยไม่ประมวลผล HTML จากโมเดล

Dashboard ปัจจุบันเป็น static site บน GitHub Pages จึงไม่มีที่เก็บ API key ฝั่ง server. API key ต้องอยู่ใน Cloudflare Worker secret และห้ามใส่ใน `dashboard/`, JavaScript ที่ส่งไป browser, localStorage, Git หรือ log. OpenAI ระบุให้เก็บ API key ใน secret manager/server ไม่ใช่ browser/client/source control [OpenAI API keys](https://developers.openai.com/api/docs/guides/api-keys); Cloudflare Worker เปิด secret ผ่าน `env` ฝั่ง Worker และเตือนว่าไม่ควรใช้ `vars` หรือ commit `.dev.vars` สำหรับ secret [Cloudflare Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

## ข้อมูลที่ส่ง

เมื่อผู้ใช้กด “วิเคราะห์สถานะล่าสุด” browser ส่ง snapshot ขั้นต่ำไปยัง Worker: เวลา/เขตเวลา, สถานะ MQTT, heartbeat/online ของ ESP, ค่าล่าสุดและเวลารับ DHT11, threshold ที่ตั้งไว้ใน browser, สถานะ relay 4 ช่อง, mode, Emergency Stop และ firmware version. ค่า freshness ใช้ heartbeat timeout จาก config และเกณฑ์ความสด DHT11 ที่หน้า dashboard ใช้อยู่

ไม่ส่ง MQTT username/password, broker credential, IP address, finance/harvest ledger, ข้อความ log ดิบ, ตารางให้น้ำ, พิกัดแปลง หรือข้อมูลบัญชีผู้ใช้ AI ต้องแยกความชื้นอากาศจากความชื้นดิน; ใน firmware ปัจจุบันไม่มี sensor ความชื้นดิน จึงห้ามสรุปว่าดินแห้งหรือเปียก/ฟันธงเวลาให้น้ำ. โค้ดนี้ไม่บันทึก snapshot เป็นประวัติแอป แต่การประมวลผล/การเก็บรักษาฝั่งผู้ให้บริการ AI อยู่ภายใต้นโยบายของบัญชีและ provider ที่เลือก ผู้ดูแลต้องตรวจเงื่อนไขเหล่านั้นก่อนเปิดใช้

Firmware ปัจจุบันเผยแพร่สถานะ relay, mode และ Emergency Stop แบบ retained ขณะที่ DHT11 ส่งแบบ non-retained. Dashboard เก็บธง `packet.retain`; AI จะถือ relay/mode และ Emergency Stop ที่เป็น inactive ว่าไม่ทราบจนกว่าจะได้รับ status แบบ live พร้อม heartbeat ESP ที่สด ส่วน Emergency Stop ที่ active ยังคงแสดงเป็น active แบบ fail-safe แม้เป็น retained/stale

## Backend และการป้องกัน

แหล่ง backend อยู่ใน `ai-worker/` และกำหนด endpoint upstream เป็น OpenAI Chat Completions API โดยเลือก `AI_MODEL` ผ่าน Worker configuration; ไม่ฝัง model/API secret ใน browser. Worker ตรวจ method, content type, payload size, allowed Origin, Turnstile token/hostname/action, และ schema ของ snapshot ก่อนเรียกผู้ให้บริการ จำกัด token output และส่งกลับเฉพาะโครงสร้างผลวิเคราะห์ที่ผ่าน allowlist. ถ้า Turnstile หรือ API configuration ไม่ครบ จะปิดการเรียกอย่างปลอดภัย

CORS ใช้จำกัด browser origins ที่อนุญาต แต่ไม่ใช่ระบบยืนยันตัวตน ผู้ดูแลต้องตั้ง Turnstile site/secret keys ให้ตรง domain และเปิด rate limit/usage budget ใน Cloudflare และผู้ให้บริการ AI. Cloudflare กำหนดให้ตรวจ Turnstile token ฝั่ง server; token ใช้ครั้งเดียวและหมดอายุใน 5 นาที [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). CORS/preflight ต้องตอบเฉพาะ origin ที่กำหนด ไม่ใช้ wildcard กับข้อมูลวิเคราะห์ [Cloudflare Workers CORS](https://developers.cloudflare.com/workers/examples/cors-header-proxy/).

Worker ส่งข้อความ system/user ไปยัง Chat Completions และจำกัด output ด้วย `max_completion_tokens`; รูปแบบ request/response ให้ยึด API reference ปัจจุบัน และ model บางชนิดอาจรองรับ parameters ต่างกัน [Chat Completions overview](https://developers.openai.com/api/reference/chat-completions/overview/) [Create chat completion](https://developers.openai.com/api/reference/python/resources/chat/subresources/completions/methods/create/). ไม่มี tools/function calling หรือความสามารถสั่งงานอุปกรณ์ใน request

## การตั้งค่าและเปิดใช้งาน

ค่าเริ่มต้นใน `dashboard/js/ai-config.js` ว่างไว้และปุ่มวิเคราะห์ปิดอยู่ จนกว่าจะติดตั้ง Worker และกรอก endpoint กับ public Turnstile site key. ก่อน deploy ให้แก้ `ai-worker/wrangler.toml`: ตั้ง `AI_MODEL` ให้เป็นรุ่นที่บัญชีใช้ได้, ตรวจ `ALLOWED_ORIGIN`/`TURNSTILE_HOSTNAME` ให้ตรง GitHub Pages, และเปลี่ยน `AI_RATE_LIMITER.namespace_id` เป็น namespace เฉพาะที่ยังไม่ใช้ใน Cloudflare account. สร้าง Turnstile widget โดยใช้ hostname เดียวกัน จากนั้นรันคำสั่งด้านล่างโดยผู้ดูแลในเครื่องที่ login Cloudflare แล้ว:

```sh
cd ai-worker
npx wrangler secret put AI_API_KEY
npx wrangler secret put TURNSTILE_SECRET
npx wrangler deploy
```

หลัง deploy ให้นำ Worker URL ที่ได้มาต่อ `/analyze` และใส่ใน `dashboard/js/ai-config.js` พร้อม public Turnstile site key เท่านั้น ห้ามใส่ provider key หรือ Turnstile secret ในไฟล์ frontend. ทดสอบ CORS, Turnstile, rate-limit และ budget ก่อนเปิด UI ให้ผู้ใช้จริง

การแก้ไขใน repository นี้เตรียม source, UI และ tests เท่านั้น ไม่ได้สร้าง Cloudflare account, ใส่ key, deploy Worker หรือเปิดใช้งานการเรียกเก็บเงิน Rate-limit binding ที่กำหนดเป็น 5 คำขอต่อนาทีต่อ IP เป็นค่า approximate ไม่ใช่เพดานค่าใช้จ่ายที่เข้มงวด; ค่าใช้บริการ AI เกิดขึ้นเมื่อ Worker ที่ตั้งค่าแล้วรับคำขอจริง จึงต้องกำหนด budget/usage limit ที่ provider เพิ่มเติม. CORS และ Turnstile ไม่ใช่ระบบบัญชีผู้ใช้ ผู้ที่ใช้ domain และผ่าน challenge อาจเรียกได้ตาม rate limit

## แหล่งอ้างอิง

- [OpenAI API keys and service accounts](https://developers.openai.com/api/docs/guides/api-keys)
- [OpenAI Chat Completions overview](https://developers.openai.com/api/reference/chat-completions/overview/)
- [OpenAI Create chat completion](https://developers.openai.com/api/reference/python/resources/chat/subresources/completions/methods/create/)
- [Cloudflare Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare Workers CORS example](https://developers.cloudflare.com/workers/examples/cors-header-proxy/)

Cloudflare Workers Rate Limiting binding ใน config ตั้งไว้ 5 คำขอต่อนาทีต่อ IP ที่ hash แล้วเพื่อเป็นด่านลดการเรียกซ้ำ แต่ Cloudflare ระบุว่า limit เป็นแบบ approximate และแยกตาม location จึงไม่ใช่เพดานค่าใช้จ่ายแบบเข้มงวด ต้องตั้ง budget/quota กับผู้ให้บริการ AI เพิ่มเติม [Cloudflare Workers Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
