// data.js

const DB_KEY = 'interviewData';

// --- ฟังก์ชันสำหรับสุ่ม Array ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const Database = {
    // ฟังก์ชันนี้จะทำหน้าที่เตรียมข้อมูลให้พร้อมใช้งาน
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
            
            // 1. จัดกลุ่มผู้สมัครตามรอบเวลา (interviewSlot)
            const applicantsBySlot = {};
            jsonData.forEach((row, index) => {
                const interviewSlot = row['เลือกวันเวลาที่สะดวกสัมภาษณ์'];
                if (!interviewSlot) return; // ข้ามข้อมูลที่ไม่มีรอบเวลา

                if (!applicantsBySlot[interviewSlot]) {
                    applicantsBySlot[interviewSlot] = [];
                }
                applicantsBySlot[interviewSlot].push({
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
                    status: 'Pending',
                    scores: { passion: 0, teamwork: 0, attitude: 0, creativity: 0 },
                    notes: ''
                });
            });

            // 2. สุ่มโต๊ะในแต่ละกลุ่มเวลา โดยไม่ให้ซ้ำกัน
            let initialData = [];
            for (const slot in applicantsBySlot) {
                const applicants = applicantsBySlot[slot];
                let tables = Array.from({ length: 8 }, (_, i) => i + 1); // สร้างโต๊ะ [1, 2, ..., 8]
                shuffleArray(tables); // สลับลำดับโต๊ะ

                applicants.forEach((applicant, index) => {
                    applicant.table = tables[index % 8]; // วนใช้โต๊ะในกรณีที่คนเยอะกว่า 8
                    initialData.push(applicant);
                });
            }
            
            localStorage.setItem(DB_KEY, JSON.stringify(initialData));
            return initialData;
        } catch (error) {
            console.error("Could not load initial data from db.json:", error);
            alert("เกิดข้อผิดพลาด: ไม่สามารถโหลดไฟล์ข้อมูล db.json ได้");
            return [];
        }
    },

    getData: () => {
        const data = localStorage.getItem(DB_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveData: (data) => {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
        window.dispatchEvent(new CustomEvent('storageUpdated'));
    },

    updateApplicant: (id, updatedFields) => {
        let data = Database.getData();
        const index = data.findIndex(app => app.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updatedFields };
            Database.saveData(data);
        }
    },

    // ⭐️ ฟังก์ชันใหม่สำหรับสุ่มโต๊ะตามเงื่อนไข ⭐️
    shuffleAllTables: () => {
        let allData = Database.getData();
        
        const applicantsBySlot = {};
        allData.forEach(applicant => {
            if (!applicantsBySlot[applicant.interviewSlot]) {
                applicantsBySlot[applicant.interviewSlot] = [];
            }
            applicantsBySlot[applicant.interviewSlot].push(applicant);
        });

        let shuffledData = [];
        for (const slot in applicantsBySlot) {
            const applicants = applicantsBySlot[slot];
            let tables = Array.from({ length: 8 }, (_, i) => i + 1);
            shuffleArray(tables);

            applicants.forEach((applicant, index) => {
                applicant.table = tables[index % 8];
                shuffledData.push(applicant);
            });
        }
        
        Database.saveData(shuffledData);
    }
};