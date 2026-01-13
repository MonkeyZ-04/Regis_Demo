// data.js (เวอร์ชันใหม่ - เชื่อมต่อ Firebase Realtime Database และ Storage)

// ⭐️⭐️⭐️ 1. นี่คือ Config ที่คุณใช้ใน upload_db.html (มันถูกต้องแล้ว) ⭐️⭐️⭐️
const firebaseConfig = {
    apiKey: "AIzaSyAHf_f5CnirpFQwbfNIvj54X72lCsRhFbg",
    authDomain: "wintercamp2025-eb71b.firebaseapp.com",
    databaseURL: "https://wintercamp2025-eb71b-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "wintercamp2025-eb71b",
    storageBucket: "wintercamp2025-eb71b.firebasestorage.app", // 👈 Storage จะใช้ค่านี้
    messagingSenderId: "425433198221",
    appId: "1:425433198221:web:bf5adeb0fcbdb41e61fcc4",
    measurementId: "G-W9KBFJQR5Y"
};

// ⭐️⭐️⭐️ 2. นี่คือ Path ที่คุณอัปโหลดข้อมูลไป ⭐️⭐️⭐️
const dbPath = '/applicants';

// 3. Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const dbRef = database.ref(dbPath);

// ⭐️ [ใหม่] khởi tạo Firebase Storage ⭐️
const storage = firebase.storage();
// ⭐️ [จบส่วนใหม่] ⭐️


// 4. สร้าง Database object (เวอร์ชันเชื่อมต่อ Firebase จริง)
const Database = {
    
    /**
     * onDataChange(callback)
     * ติดตามการเปลี่ยนแปลงข้อมูลใน Firebase RTDB แบบ Real-time
     * @param {function(Array)} callback ฟังก์ชันที่จะถูกเรียกเมื่อข้อมูลเปลี่ยนแปลง
     * @returns {function} ฟังก์ชันสำหรับ "unsubscribe" (หยุดฟัง)
     */
    onDataChange: (callback) => {
        console.log('[data.js] Connecting to Firebase RTDB at path:', dbPath);
        
        const listener = dbRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const dataObject = snapshot.val();
                const dataArray = Object.values(dataObject);
                
                console.log(`[data.js] Data received from Firebase: ${dataArray.length} items.`);
                callback(dataArray);
            } else {
                console.warn('[data.js] No data found at path:', dbPath);
                callback([]); 
            }
        }, (error) => {
            console.error('[data.js] Firebase read error:', error);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล Firebase: ' + error.message);
        });

        return () => {
            console.log('[data.js] Unsubscribing from Firebase listener.');
            dbRef.off('value', listener);
        };
    },

    /**
     * updateApplicant(id, updatedFields)
     * อัปเดตข้อมูลผู้สมัครใน Firebase
     * @param {number | string} id ID ของผู้สมัคร (เช่น 1, 2, 3)
     * @param {object} updatedFields ฟิลด์ที่ต้องการอัปเดต (เช่น { scores, notes })
     */
    updateApplicant: (id, updatedFields) => {
        const applicantRef = database.ref(`${dbPath}/${id}`);
        console.log(`[data.js] Updating Firebase path: ${applicantRef.toString()}`, updatedFields);

        applicantRef.update(updatedFields)
            .then(() => {
                console.log('[data.js] Update successful.');
            })
            .catch((error) => {
                console.error('[data.js] Firebase update error:', error);
                alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
            });
    },

    // ⭐️ [ใหม่] Export ตัวแปร Storage ที่เรา khởi tạo ไว้ ⭐️
    storage: storage
    
};