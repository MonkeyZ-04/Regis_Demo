// data.js

const DB_KEY = 'interviewData';

const Database = {
    // ฟังก์ชันนี้จะทำหน้าที่เตรียมข้อมูลให้พร้อมใช้งาน
    // มันจะเช็คก่อนว่ามีข้อมูลใน localStorage หรือยัง
    // ถ้ายังไม่มี -> จะไปดึงจาก db.json มาใส่ให้
    initialize: async () => {
        const localData = localStorage.getItem(DB_KEY);
        if (localData) {
            return JSON.parse(localData);
        }

        try {
            const response = await fetch('db.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const jsonData = await response.json();
            
            // เตรียมข้อมูลเริ่มต้น (เพิ่ม status, table, scores)
            const initialData = jsonData.map((row, index) => {
                // ***สำคัญ: ชื่อในวงเล็บ '[ ]' ต้องตรงกับหัวคอลัมน์ในไฟล์ JSON ของคุณ***
                return {
                    id: index + 1,
                    timestamp: row['ประทับเวลา'],
                    email: row['ที่อยู่อีเมล'],
                    prefix: row['คำนำหน้าชื่อ'],
                    firstName: row['ชื่อจริง'],
                    lastName: row['นามสกุล'],
                    nickname: row['ชื่อเล่น'],
                    faculty: row['คณะ'],
                    year: row['ชั้นปี'],
                    phone: row['เบอร์โทรติดต่อ'],
                    contactLine: row['ช่องทางการติดต่อ (Line ID)'],
                    contactOther: row['ช่องทางการติดต่อสำรอง (IG, Facebook, นกพิราบสื่อสาร etc.)'],
                    applicationUrl: row['อัพโหลดใบสมัครไว้ตรงนี้จู้ (ไฟล์ pdf)'],
                    interviewSlot: row['เลือกวันเวลาที่สะดวกสัมภาษณ์'],
                    // --- ข้อมูลที่ระบบจะสร้างขึ้นเอง ---
                    status: 'Pending', // สถานะเริ่มต้น
                    table: Math.floor(Math.random() * 8) + 1, // สุ่มโต๊ะเริ่มต้น 1-8
                    scores: { passion: 0, teamwork: 0, attitude: 0, creativity: 0 },
                    notes: ''
                };
            });
            
            localStorage.setItem(DB_KEY, JSON.stringify(initialData));
            return initialData;
        } catch (error) {
            console.error("Could not load initial data from db.json:", error);
            alert("เกิดข้อผิดพลาด: ไม่สามารถโหลดไฟล์ข้อมูล db.json ได้ กรุณาตรวจสอบว่าไฟล์อยู่ในตำแหน่งที่ถูกต้อง");
            return [];
        }
    },

    // ฟังก์ชันสำหรับดึงข้อมูล (ตอนนี้จะดึงจาก localStorage อย่างเดียว)
    getData: () => {
        const data = localStorage.getItem(DB_KEY);
        return data ? JSON.parse(data) : [];
    },

    // ฟังก์ชันสำหรับบันทึกข้อมูล
    saveData: (data) => {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
        // ส่งสัญญาณบอกแท็บอื่นว่าข้อมูลมีการเปลี่ยนแปลง
        window.dispatchEvent(new CustomEvent('storageUpdated'));
    },

    // ฟังก์ชันอัปเดตผู้สมัคร
    updateApplicant: (id, updatedFields) => {
        let data = Database.getData();
        const index = data.findIndex(app => app.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updatedFields };
            Database.saveData(data);
        }
    }
};