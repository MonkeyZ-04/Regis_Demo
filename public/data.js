// public/data.js

// ==========================================
// 1. Firebase Configuration (รวมศูนย์ที่นี่)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAwl3WMBn3vz55uV2GSQFf3mljJiA1lpPk",
    authDomain: "learningcamp.firebaseapp.com",
    databaseURL: "https://learningcamp-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "learningcamp",
    storageBucket: "learningcamp.firebasestorage.app",
    messagingSenderId: "1021844432990",
    appId: "1:1021844432990:web:7ea299f90d6cf746f66ccf",
    measurementId: "G-1L2N2XFLV8"
  };

// ==========================================
// 2. Application Configuration (Centralized)
// ==========================================
const APP_CONFIG = {
    DB_PATH: '/applicants',
    
    // ตั้งค่าคำถามและน้ำหนักคะแนนที่นี่ที่เดียว
    QUESTIONS: [
        { id: 'application', label: 'ใบสมัคร', type: 'score_text', weight: 1 },
        { id: 'q1', label: '1', type: 'text' },
        { id: 'q2a', label: '2a', type: 'score_text', weight: 0.5 },
        { id: 'q2b', label: '2b', type: 'score_text', weight: 0.5 },
        { id: 'q3', label: '3', type: 'text' },
        { id: 'q4a', label: '4a', type: 'score_text', weight: 3 },
        { id: 'q4b', label: '4b', type: 'score_text', weight: 2 },
        { id: 'q5', label: '5', type: 'score_text', weight: 2 },
        { id: 'q6', label: '6', type: 'score_text', weight: 2 },
        { id: 'q7a', label: '7a', type: 'score_text', weight: 1 },
        { id: 'q7b', label: '7b', type: 'score_text', weight: 1 },
        { id: 'q8a', label: '8a', type: 'score_text', weight: 0.5 },
        { id: 'q8b', label: '8b', type: 'score_text', weight: 0.5 },
        { id: 'q9', label: '9', type: 'text' },
        { id: 'q10', label: '10', type: 'text' },
        { id: 'q11', label: '11', type: 'text' },
        { id: 'q12', label: '12', type: 'text' },
        { id: 'q13', label: '13', type: 'score_text', weight: 2 },
        { id: 'qSpecial', label: 'พิเศษ', type: 'score_only', weight: 2.5 },
        { id: 'general', label: 'Note', type: 'text' }
    ],
    
    getScoreKeys: function() { return this.QUESTIONS.filter(q => q.type.includes('score')).map(q => q.id); },
    getScoreLabels: function() { 
        const labels = {}; 
        this.QUESTIONS.filter(q => q.type.includes('score')).forEach(q => labels[q.id] = q.label); 
        return labels; 
    },
    getScoreWeights: function() { 
        const weights = {}; 
        this.QUESTIONS.filter(q => q.type.includes('score')).forEach(q => weights[q.id] = q.weight); 
        return weights; 
    }
};

// ==========================================
// 3. Initialize Firebase
// ==========================================
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
const storage = firebase.storage();
const dbRef = database.ref(APP_CONFIG.DB_PATH);

// ==========================================
// 4. Database Helper & Data Processing
// ==========================================
const Database = {
    config: APP_CONFIG,
    storage: storage,

    onDataChange: (callback) => {
        console.log('[data.js] Connecting to:', APP_CONFIG.DB_PATH);
        const listener = dbRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const dataObject = snapshot.val();
                const dataArray = Object.values(dataObject);
                // เรียงตาม ID
                dataArray.sort((a, b) => (a.id || 0) - (b.id || 0));
                callback(dataArray);
            } else {
                callback([]); 
            }
        });
        return () => dbRef.off('value', listener);
    },

    updateApplicant: (id, updatedFields) => {
        database.ref(`${APP_CONFIG.DB_PATH}/${id}`).update(updatedFields)
            .then(() => console.log(`Updated ID ${id}`))
            .catch(err => alert('Error: ' + err.message));
    },

    // ⭐️ ฟังก์ชันเตรียมข้อมูลก่อนอัปโหลด (Mapping Key ไทย -> อังกฤษ) ⭐️
    initializeUpload: async () => {
        try {
            const response = await fetch('db.json');
            if (!response.ok) throw new Error('ไม่พบไฟล์ db.json');
            const rawData = await response.json();
            
            // แปลงข้อมูล
            const mappedData = rawData.map((item, index) => {
                const slot = item["เลือกวันเวลาที่สะดวกสัมภาษณ์"] || "";
                
                return {
                    id: index + 1,
                    timestamp: item["Timestamp"],
                    email: item["Email Address"],
                    prefix: item["คำนำหน้าชื่อ"],
                    firstName: item["ชื่อจริง"],
                    lastName: item["นามสกุล"],
                    nickname: item["ชื่อเล่น"],
                    faculty: item["คณะ"],
                    year: item["ชั้นปี"],
                    phone: item["เบอร์โทรติดต่อ"],
                    contactLine: item["ช่องทางการติดต่อ (Line ID)"],
                    contactOther: item["ช่องทางการติดต่อสำรอง (IG, Facebook, นกพิราบสื่อสาร etc.)"],
                    applicationUrl: item["อัพโหลดใบสมัครไว้ตรงนี้จู้ (ไฟล์ pdf)"],
                    interviewSlot: slot,
                    
                    // Fields สำหรับระบบจัดการ
                    table: Math.floor(Math.random() * 9) + 1, // สุ่มโต๊ะ 1-9
                    status: 'Pending',
                    isCalled: false,
                    isForfeited: false,
                    Online: slot.toLowerCase().includes("online"),
                    
                    // เตรียม Object คะแนนว่างๆ ไว้
                    interviewScores: {},
                    interviewDetails: {}
                };
            });
            return mappedData;
        } catch (error) {
            throw error;
        }
    },

    uploadAllData: async (dataArray) => {
        const dataToUpload = {};
        for (const item of dataArray) {
            dataToUpload[String(item.id)] = item;
        }
        await dbRef.set(dataToUpload);
    }
};