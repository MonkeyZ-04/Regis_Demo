// data.js (เวอร์ชันอัปเดต - แปลงเป็น English Key)

const DB_KEY = 'interviewData';

// --- ฟังก์ชันสำหรับสุ่ม Array ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ⭐️ [เพิ่ม] ฟังก์ชันสำหรับแปลงข้อมูลไทยเป็น English Key ⭐️
function parseThaiSlot(slotString) {
    if (!slotString) return { dateKey: null, timeKey: null, original: slotString };
    
    let dateKey = null;
    // --- (ปรับแก้ Regex ให้ตรงกับข้อมูลของคุณ) ---
    if (slotString.includes("วันที่ 22 ตุลาคม") || slotString.includes("วันที 22 ตุลาคม")) dateKey = "2025-10-22";
    if (slotString.includes("วันที่ 24 ตุลาคม") || slotString.includes("วันที 24 ตุลาคม")) dateKey = "2025-10-24";
    if (slotString.includes("เวลาสำรอง")) dateKey = "RESERVE";
    // ------------------------------------------

    let timeKey = null;
    const timeMatch = slotString.match(/(\d{2}[.:]\d{2})/); // Get first time (e.g., 16.30)
    if (timeMatch) {
        timeKey = timeMatch[1].replace('.', ':'); // Standardize to 16:30
    }

    // ถ้าหาเวลาไม่เจอ แต่เป็นเวลาสำรอง ให้ตั้งค่าหลอกไว้
    if (dateKey === "RESERVE" && !timeKey) timeKey = "RESERVE";

    return { dateKey, timeKey, original: slotString };
}


const Database = {
    // ฟังก์ชันนี้จะทำหน้าที่เตรียมข้อมูลให้พร้อมใช้งาน
    initialize: async () => {
        const localData = localStorage.getItem(DB_KEY);
        if (localData) {
            // ถ้ามีข้อมูลใน Local Storage อยู่แล้ว ให้ใช้เลย
            return JSON.parse(localData);
        }

        // ถ้าไม่มี ให้ดึงจาก db.json
        try {
            const response = await fetch('db.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const jsonData = await response.json();
            
            // 1. จัดกลุ่มผู้สมัครตามรอบเวลา (interviewSlot)
            const applicantsBySlot = {};
            jsonData.forEach((row, index) => {
                // ⭐️ [แก้ไข] เปลี่ยนมาใช้ตัวแปรใหม่ ⭐️
                const thaiSlot = row['เลือกวันเวลาที่สะดวกสัมภาษณ์']; 
                if (!thaiSlot) return; // ข้ามข้อมูลที่ไม่มีรอบเวลา

                if (!applicantsBySlot[thaiSlot]) {
                    applicantsBySlot[thaiSlot] = [];
                }

                // ⭐️ [แก้ไข] แปลงข้อมูลไทยเป็น English Key ที่นี่ ⭐️
                const parsedSlot = parseThaiSlot(thaiSlot);

                applicantsBySlot[thaiSlot].push({
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
                    
                    // --- [ บล็อกข้อมูลใหม่ ] ---
                    interviewDate: parsedSlot.dateKey, // e.g., "2025-10-22"
                    interviewTime: parsedSlot.timeKey, // e.g., "16:30"
                    interviewSlotOriginal: parsedSlot.original, // The full Thai string, for display
                    // --- [ จบ ] ---

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
            alert("เกิดข้อผิดพลาด: ไม่สามารถโหลดไฟล์ข้อมูล db.json ได้ \n\nโปรดตรวจสอบว่าไฟล์ db.json อยู่ในโฟลเดอร์ public/ และมี format ที่ถูกต้อง \n\n" + error.message);
            return [];
        }
    },

    getData: () => {
        const data = localStorage.getItem(DB_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveData: (data) => {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
        // Dispatch a custom event to notify other parts of the app
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
    
    // Function to shuffle tables for all applicants already in localStorage
    shuffleAllTables: () => {
        let allData = Database.getData();
        
        const applicantsBySlot = {};
        allData.forEach(applicant => {
            // ⭐️ [แก้ไข] จัดกลุ่มด้วย Key ใหม่ ⭐️
            const slotKey = applicant.interviewSlotOriginal || 'Unassigned';
            if (!applicantsBySlot[slotKey]) {
                applicantsBySlot[slotKey] = [];
            }
            applicantsBySlot[slotKey].push(applicant);
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
        
        // Save the newly shuffled data
        Database.saveData(shuffledData);
    },

    // This function simulates the real-time listener
    onDataChange: (callback) => {
        // 1. Define the handler
        const storageUpdateHandler = () => {
            console.log('[data.js] storageUpdated event detected. Reloading data.');
            callback(Database.getData());
        };

        // 2. Add the listener
        window.addEventListener('storageUpdated', storageUpdateHandler);

        // 3. Immediately call back with the current data to load the initial state
        console.log('[data.js] Initial data load.');
        Database.initialize().then(initialData => {
            callback(initialData);
        });

        // 4. Return an "unsubscribe" function
        return () => {
            console.log('[data.js] Removing storageUpdated listener.');
            window.removeEventListener('storageUpdated', storageUpdateHandler);
        };
    }
};