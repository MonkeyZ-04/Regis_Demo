นี่คือโครงสร้างไฟล์ `README.md` สำหรับโปรเจกต์ระบบจัดการสัมภาษณ์ค่าย (RainCamp) ที่เขียนสรุปฟีเจอร์ โครงสร้างโค้ด และวิธีติดตั้งไว้อย่างครบถ้วน คุณสามารถคัดลอกข้อความด้านล่างนี้ไปใส่ในไฟล์ `README.md` ของโปรเจกต์ได้เลยครับ

---

# 🏕️ ระบบจัดการสัมภาษณ์ค่ายอาสา (RainCamp Interview Management System)

ระบบเว็บแอปพลิเคชัน (Web Application) สำหรับจัดการกระบวนการสัมภาษณ์ผู้สมัครค่ายอาสาแบบครบวงจร ตั้งแต่จุดลงทะเบียน (Check-in), การให้คะแนนของกรรมการสัมภาษณ์ (Interviewer), ไปจนถึงการดูภาพรวมและวิเคราะห์คะแนนของผู้ดูแลระบบ (Admin) โดยระบบทั้งหมดทำงานแบบ **Real-time** ผ่าน Firebase Realtime Database

## ✨ ฟีเจอร์หลัก (Key Features)

ระบบถูกออกแบบมาให้รองรับการทำงาน 3 บทบาทหลัก ได้แก่:

### 1. 👥 สำหรับจุดลงทะเบียน (Staff Dashboard - `staff.html`)
* **ระบบตารางเวลา (Timeslot Grid):** แสดงตารางเวลาสัมภาษณ์ของผู้สมัครทั้งหมด แบ่งตามโต๊ะ (1-9) และช่วงเวลา
* **การจัดการสถานะ (Status Management):** สตาฟสามารถเช็คอินผู้สมัคร เปลี่ยนสถานะเป็น "มาถึงแล้ว" (Arrived), "กำลังสัมภาษณ์" (Called) หรือ "สละสิทธิ์" (Forfeited) ได้
* **ระบบ Walk-in:** รองรับการเพิ่มข้อมูลผู้สมัครหน้างานแบบ Real-time พร้อมกรอกข้อมูลจำเป็นและลิงก์ใบสมัคร

### 2. 📝 สำหรับกรรมการสัมภาษณ์ (Interviewer Dashboard - `interviewer.html`)
* **ระบบให้คะแนนและจดบันทึก:** แบบฟอร์มสำหรับประเมินคะแนนตามเกณฑ์ที่กำหนด (เช่น ทักษะการแก้ปัญหา, การทำงานเป็นทีม)
* **Real-time Presence:** ระบบแจ้งเตือนคล้าย Google Docs (เช่น "✍️ นัทตี้ กำลังพิมพ์...") เพื่อป้องกันการพิมพ์ข้อมูลชนกันระหว่างกรรมการที่อยู่โต๊ะเดียวกัน
* **Auto-Save:** บันทึกข้อมูลคะแนนและข้อความที่พิมพ์อัตโนมัติ ไม่ต้องกลัวข้อมูลหาย

### 3. 👑 สำหรับผู้ดูแลระบบ (Admin Dashboard - `admin.html`)
* **Kanban Board:** แสดงสถานะของผู้สมัครทุกคนบนกระดาน เพื่อดูว่าใครกำลังรอสัมภาษณ์ หรือสัมภาษณ์เสร็จแล้ว
* **Leaderboard:** จัดอันดับผู้สมัครตามคะแนนรวม
* **Radar Chart Analytics:** ระบบกราฟใยแมงมุมวิเคราะห์จุดแข็ง-จุดอ่อนของผู้สมัครรายบุคคลใน 6 มิติ (สร้างด้วย Chart.js)

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ไม่มี Framework เพื่อความรวดเร็วและเข้าใจง่าย)
* **Backend / Database:** [Firebase Realtime Database](https://firebase.google.com/products/realtime-database) (v8.10.1)
* **Hosting:** Firebase Hosting
* **Data Visualization:** [Chart.js](https://www.chartjs.org/) (สำหรับวาดกราฟ Radar ในหน้า Admin)

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
📂 Regis_Demo/
├── 📄 firebase.json       # ไฟล์ตั้งค่า Firebase Hosting
├── 📄 .firebaserc         # ไฟล์ระบุ Project ID ของ Firebase
├── 📂 public/             # โฟลเดอร์หลักที่เก็บไฟล์เว็บทั้งหมด
│   ├── 📄 index.html      # หน้า Landing Page สำหรับเลือกบทบาท
│   ├── 📄 admin.html      # หน้า Dashboard ของ Admin
│   ├── 📄 admin.js        # โลจิกสำหรับหน้า Admin (รวมระบบกราฟ Chart.js)
│   ├── 📄 interviewer.html# หน้าสำหรับกรรมการสัมภาษณ์
│   ├── 📄 interviewer.js  # โลจิกการให้คะแนนและ Real-time Sync
│   ├── 📄 staff.html      # หน้าจุดลงทะเบียน (Check-in)
│   ├── 📄 staff.js        # โลจิกตารางเวลาและระบบ Walk-in
│   ├── 📄 data.js         # ⭐️ ไฟล์สำคัญ! เก็บ Config Firebase และเกณฑ์คำถาม
│   ├── 📄 style.css       # ไฟล์จัดการความสวยงาม (CSS) ทั้งโปรเจกต์
│   ├── 📄 upload_db.html  # เครื่องมืออัปโหลดไฟล์ db.json เข้า Firebase
│   └── 📄 db.json         # ไฟล์ฐานข้อมูลตั้งต้น (จาก Google Forms/CSV)
```

---

## 🚀 วิธีการติดตั้งและใช้งาน (Setup & Installation)

### 1. การตั้งค่า Firebase (Prerequisites)
1. ไปที่ [Firebase Console](https://console.firebase.google.com/) และสร้างโปรเจกต์ใหม่
2. เปิดใช้งาน **Realtime Database** (เลือก Test Mode หรือตั้ง Rules ให้เป็น `true` ชั่วคราว)
3. เปิดใช้งาน **Storage** (หากต้องการใช้ฟีเจอร์อัปโหลดรูปภาพ)
4. คัดลอก `firebaseConfig` ของโปรเจกต์คุณมาเตรียมไว้

### 2. การอัปเดต Config ในโค้ด
เปิดไฟล์ `public/data.js` และนำ Config ของโปรเจกต์คุณไปวางทับในส่วนบนสุดของไฟล์:

```javascript
// ในไฟล์ public/data.js
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app", // ระวังเรื่อง Region (เช่น asia-southeast1)
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

แก้ไขไฟล์ `.firebaserc` ให้ตรงกับ Project ID ของคุณ:
```json
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
  }
}
```

### 3. การอัปโหลดข้อมูลเริ่มต้น (Initial Data)
1. นำรายชื่อผู้สมัครจาก Google Forms / Excel มาแปลงเป็นรูปแบบ JSON และตั้งชื่อว่า `db.json` ไว้ในโฟลเดอร์ `public/`
2. เปิดไฟล์ `public/upload_db.html` ผ่าน Browser หรือรันผ่าน Local Server
3. กดปุ่ม **"เริ่มอัปโหลดข้อมูล"** เพื่อส่งข้อมูลทั้งหมดขึ้น Firebase Realtime Database

### 4. การรันเซิร์ฟเวอร์จำลอง (Local Development)
ต้องติดตั้ง [Firebase CLI](https://firebase.google.com/docs/cli) ก่อน:
```bash
npm install -g firebase-tools
firebase login
firebase use --add YOUR_PROJECT_ID
firebase serve
```
ระบบจะรันบน `http://localhost:5000`

### 5. การนำขึ้นระบบจริง (Deployment)
เมื่อแก้ไขและทดสอบระบบเสร็จแล้ว สามารถ Deploy ขึ้นเว็บจริงได้ด้วยคำสั่ง:
```bash
firebase deploy
```

---

## ⚙️ การตั้งค่าเกณฑ์ให้คะแนน (Customizing Questions)

หากต้องการเปลี่ยนคำถามหรือเกณฑ์การให้คะแนน สามารถเข้าไปแก้ได้ที่ตัวแปร `QUESTIONS` ในไฟล์ `public/data.js` โดยระบบจะสร้างช่องกรอกคะแนน (Dropdown) และช่องกรอกข้อความ (Textarea) ในหน้า Interviewer ให้แบบอัตโนมัติตาม Array ที่ตั้งไว้

---

**พัฒนาโดย:** ทีมพัฒนาระบบค่ายอาสา (RainCamp) 🌧️