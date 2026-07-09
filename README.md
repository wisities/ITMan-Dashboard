# IT Man Dashboard บน Vercel

โครงสร้างไฟล์:

```
project/
├─ public/
│  └─ index.html      ← หน้าเว็บหลัก (4 แท็บ)
├─ api/
│  └─ dashboard.js     ← Serverless function ที่ไป fetch ข้อมูลจาก Apps Script ให้
├─ Code.gs              ← โค้ด backend ที่ต้องเอาไปแทนที่ Code.gs เดิมใน Apps Script
└─ vercel.json
```

## ภาพรวมสถาปัตยกรรม

| แท็บ | วิธีทำงาน | ต้องแก้อะไรไหม |
|---|---|---|
| 1, 3, 4 | `<iframe>` ชี้ไปที่ `.../exec?page=...` เดิม | ไม่ต้องแก้ ใช้ได้ทันที |
| 2 | เดิมใช้ `google.script.run` (ใช้ได้เฉพาะในหน้า Apps Script) | เปลี่ยนมาเรียก `/api/dashboard` ของเราเอง ซึ่งจะไป fetch JSON จาก Apps Script ให้แบบ server-to-server (ไม่ติด CORS) |

## ขั้นตอน deploy

### 1) อัปเดต Apps Script backend
1. เปิดโปรเจกต์ Apps Script เดิม (ตัวที่ผูกกับ Google Sheet ชื่อ "สถานะการแก้ไขงานงวด")
2. เปิดไฟล์ `Code.gs` แล้ว **แทนที่เนื้อหาทั้งหมด** ด้วยไฟล์ `Code.gs` ที่แนบมาให้นี้
3. กด **Deploy > Manage deployments**
4. เลือก deployment ที่ URL ตรงกับที่ใช้อยู่ในปัจจุบัน (`AKfycbwLy37e2OKv...`) แล้วกด ✏️ แก้ไข
5. เลือก **Version: New version** แล้วกด **Deploy**
   - ⚠️ สำคัญมาก: ถ้าไม่เลือก "New version" ลิงก์ `/exec` เดิมจะยังรันโค้ดเก่าอยู่ ไม่มีผล
6. ทดสอบเปิดลิงก์นี้ในเบราว์เซอร์ ต้องได้ JSON กลับมา (ไม่ใช่หน้าเว็บ):
   ```
   https://script.google.com/macros/s/AKfycbwLy37e2OKv1nRdEPFuIfbmJyOxs3ZTSIZ7fBJ1KYtJfTkn0gmlBVee89zLTcIRuJt1/exec?page=api&action=getDashboardData
   ```

### 2) เตรียมโปรเจกต์บน Vercel
1. สร้าง repo ใหม่บน GitHub/GitLab แล้ว push โฟลเดอร์ `public/`, `api/`, `vercel.json` ขึ้นไป (ไม่ต้อง push `Code.gs` ก็ได้ เพราะเป็นไฟล์อ้างอิงสำหรับ Apps Script เท่านั้น ไม่เกี่ยวกับ Vercel)
2. เข้า [vercel.com](https://vercel.com) > New Project > import repo นี้
3. ตอนตั้งค่า project ไม่ต้องเลือก Framework preset ใดๆ (เลือก "Other" ได้) เพราะเป็น static + serverless function ธรรมดา
4. ไปที่ **Project Settings > Environment Variables** เพิ่มตัวแปร:

   | Key | Value |
   |---|---|
   | `APPS_SCRIPT_URL` | `https://script.google.com/macros/s/AKfycbwLy37e2OKv1nRdEPFuIfbmJyOxs3ZTSIZ7fBJ1KYtJfTkn0gmlBVee89zLTcIRuJt1/exec` |

   (ใส่เฉพาะ base URL ไม่ต้องมี `?page=...` ต่อท้าย)

5. กด **Deploy**

### 3) ทดสอบ
- เปิดโดเมน Vercel ที่ได้ → ต้องเห็นหน้า dashboard เหมือนเดิมทั้ง 4 แท็บ
- คลิกแท็บ "ส่วนที่ 2: ประเมินการทำงาน" → ควรโหลดข้อมูลอำเภอขึ้นมาได้ (เรียกผ่าน `/api/dashboard`)
- ถ้าขึ้น error "ยังไม่ได้ตั้งค่า APPS_SCRIPT_URL" → กลับไปเช็คขั้นตอน 2.4
- ถ้าขึ้น error "Apps Script ตอบกลับผิดพลาด" → เช็คว่า deploy Apps Script เวอร์ชันใหม่แล้วจริง (ขั้นตอน 1.5) และลิงก์ทดสอบในขั้นตอน 1.6 คืน JSON ได้จริง

## หมายเหตุ

- แท็บ 1, 3, 4 ยังคงพึ่งพา Apps Script Web App เดิมอยู่ (ผ่าน iframe) เพราะเนื้อหาข้างในหน้าเหล่านั้นสร้างจากฝั่ง Apps Script เอง — ถ้าต้องการย้ายส่วนนั้นออกจาก Apps Script ทั้งหมดในอนาคต จะต้องทำ endpoint JSON เพิ่มเติมสำหรับ `page=viewer`, `page=june_lotto`, `page=special` เช่นเดียวกับที่ทำให้แท็บ 2
- การแก้ไขข้อมูลยังทำผ่าน Google Sheet เหมือนเดิมทุกประการ ไม่มีอะไรเปลี่ยนในส่วนนั้น
