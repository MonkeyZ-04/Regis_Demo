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
// 2. Application Configuration
// ==========================================
const APP_CONFIG = {
    DB_PATH: '/applicants',
    
    // อัปเดตคำถามตามไฟล์ PDF (รวมคะแนน .5 และโครงสร้างใหม่)
    QUESTIONS: [
        { 
            id: 'application', 
            label: 'ใบสมัคร', 
            type: 'score_text', 
            weight: 1.5, 
            maxScore: 10,
            text: 'คะแนนใบสมัคร' 
        },
        // --- Page 1 ---
        { 
            id: 'q1', 
            label: '1', 
            type: 'text', 
            text: 'เวลาว่างชอบทำอะไรหรือมีงานอดิเรกที่ชอบทำมั้ย > ทำไมถึงชอบ?' 
        },
        { 
            id: 'q2a', 
            label: '2a', 
            type: 'score_text', 
            weight: 0.25, 
            maxScore: 5,
            text: 'โดยปกติแล้วเรามีวิธีรับมือกับงานที่ยากและสำคัญยังไง? (เช่น อาจไม่มั่นใจว่าตัวเองจะสามารถทำได้มั้ย)' 
        },
        { 
            id: 'q2b', 
            label: '2b', 
            type: 'score_text', 
            weight: 0.25, 
            maxScore: 5,
            isSubQuestion: true,
            text: 'แล้วถ้าเป็นงานที่เราไม่คุ้นเคยหรือไม่เคยทำ มาแบบฉับพลันจะรับมือยังไง?' 
        },
        { 
            id: 'q3', 
            label: '3', 
            type: 'text', 
            text: 'ตอนนี้มีงานอะไรที่รับผิดชอบอยู่บ้าง? วางแผนกิจกรรมมหาลัยในปีหน้า ๆ ไว้ยังไงบ้าง? เคยทำกิจกรรมอะไรในมหาลัยมาก่อนหน้าบ้าง?' 
        },
        // --- Page 2 ---
        { 
            id: 'q4a', 
            label: '4a', 
            type: 'score_text', 
            weight: 2, 
            maxScore: 5,
            text: 'ถ้าทำงานกลุ่มกับเพื่อนแล้วเพื่อนทำส่วนที่รับผิดชอบไม่ทัน > คิดว่าเป็นเพราะอะไรได้บ้าง?' 
        },
                { 
            id: 'q4b', 
            label: '4b', 
            type: 'score_text', 
            weight: 1, 
            maxScore: 5,
            isSubQuestion: true,
            text: 'ถ้าเป็นเราในตอนนี้จะมีวิธีจัดการยังไง?' 
        },
        // --- Page 3 ---
        { 
            id: 'q5a', 
            label: '5a', 
            type: 'score_text', 
            weight: 0.75, 
            maxScore: 5,
            text: 'ก่อนหน้านี้เคยได้ยิน/เคยศึกษาเกี่ยวกับวิถีชีวิตความเป็นอยู่และปัญหากลุ่มชาติพันธุ์มาก่อนมั้ย?' 
        },
                { 
            id: 'q5b', 
            label: '5b', 
            type: 'score_text', 
            weight: 1.5, 
            maxScore: 5,
            isSubQuestion: true,
            text: 'เล่าให้ฟังถึงมุมมองของเราต่อกลุ่มชาติพันธุ์หน่อย' 
        },
        // --- Page 4 ---
        { 
            id: 'q6a', 
            label: '6a', 
            type: 'score_text', 
            weight: 1, 
            maxScore: 5,
            text: 'ปกติชมรมเราจะจัดค่ายยาวเป็นหลัก ถ้าติดค่ายนี้จะมาช่วยสานต่อตอนค่ายยาวมั้ย?' 
        },
                { 
            id: 'q6b', 
            label: '6b', 
            type: 'score_text', 
            weight: 2, 
            maxScore: 5,
            isSubQuestion: true,
            text: 'คาดหวังกิจกรรมอาสาเช่นการทำค่ายแบบ HTC ยังไง?' 
        },
        // ส่วนนี้ไม่มีคำถามเป็น Text แต่เป็นเกณฑ์ประเมินจาก PDF (Q7 Area)
        { 
            id: 'q7a_questioning', 
            label: '7a (Skill)', 
            type: 'score_text', 
            weight: 0.75, 
            maxScore: 5,
            text: 'ทักษะการตั้งคำถาม (Questioning Skill) [ประเมินจากการพูดคุย]' 
        },
        { 
            id: 'q7b_openmind', 
            label: '7b (Mind)', 
            type: 'score_text', 
            weight: 1, 
            maxScore: 5,
            text: 'การเปิดใจ (Open-mindedness) [ประเมินจากการพูดคุย]' 
        },
        // --- Page 5 ---
        { 
            id: 'q8a', 
            label: '8a', 
            type: 'score_text', 
            weight: 1, 
            maxScore: 5,
            text: 'รู้จักชมรมของเรามาก่อนมั้ย > รู้จักแค่ไหน > ชอบอะไรในชมรมเรา?' 
        },
        { 
            id: 'q8b', 
            label: '8b', 
            type: 'score_text', 
            weight: 1, 
            maxScore: 5,
            isSubQuestion: true,
            text: 'คิดว่าทำไมถึงต้องเป็นค่ายนี้?' 
        },
        { 
            id: 'q9', 
            label: '9', 
            type: 'text', 
            text: 'ในแต่ละวันจะมีการร้องเพลงและพูดคุยกันตาม topic ต่างๆ เราสามารถแลกเปลี่ยนหรือรับฟังทุกคนได้มั้ย โอเครึป่าว?' 
        },
        { 
            id: 'q10', 
            label: '10', 
            type: 'text', 
            text: 'เลือกคำถามโครงกลางคืนมาถาม 1 ข้อ (ให้คนสัมเลือก)',
            choices: [
                'Q1: หากย้อนเวลากลับไปได้ มีเรื่องอะไรที่อยากกลับไปแก้ไขมั้ย',
                'Q2: เคยสร้าง impact ในแง่บวกให้ใครสักคนมั้ย',
                'Q3: เล่าวิธีมูฟออนจากวันแย่ๆของตัวเองให้ฟังหน่อยได้ไหม'
            ]
        },
        // --- Page 6 ---
        { 
            id: 'q11', 
            label: '11', 
            type: 'text', 
            text: 'จำลอง Session โครงกลางคืน (บันทึกข้อสังเกต: กาลเทศะ, ความเข้ากันได้, potential)' 
        },
        { 
            id: 'q12', 
            label: '12', 
            type: 'score_text', 
            weight: 0, 
            maxScore: 5,
            text: 'กฎค่าย 8 ข้อ (ทวนกฎให้ฟัง) คิดเห็นยังไงกับกฎค่าย? มีข้อไหนที่ควรปรับแก้หรือยืดหยุ่นได้มั้ย?', 
            choices: [
                'ข้อที่ 1 ห้ามใช้สิ่งเสพติดและสิ่งมึนเมาทุกชนิด',
                'ข้อที่ 2 ห้ามใช้โทรศัพท์และอินเทอร์เน็ต ตลอดระยะเวลาการจัดค่าย (ยกเว้นถ่ายรูป)',
                'ข้อที่ 3 ห้ามซื้อ/ขายของจากชาวบ้าน',
                'ข้อที่ 4 ห้ามใช้ไฟฟ้าของชาวบ้าน',
                'ข้อที่ 5 ห้ามทํางานข้ามกลุ่ม',
                'ข้อที่ 6 ห้ามไปไหนคนเดียวโดยไม่แจ้งหัวหน้าทีม',
                'ข้อที่ 7 ห้ามออกนอกพื้นที่พักอาศัยในเวลากลางคืน',
                'ข้อที่ 8 ตรงต่อเวลา'
            ]
        },
        // --- Page 7 (Assessment) ---
        { 
            id: 'assess_club', 
            label: 'Club Fit', 
            type: 'score_text', 
            weight: 0, 
            maxScore: 5,
            isSpecial: true,
            text: '(HTC Style) - คิดว่าเข้ากับชมรมได้มั้ย?' 
        },
        { 
            id: 'assess_camp', 
            label: 'Camp Fit', 
            type: 'score_text', 
            weight: 1.5, 
            maxScore: 5,
            isSpecial: true,
            text: '(Camp) - คิดว่าเหมาะกับค่ายศึกษาแค่ไหน?' 
        },
        { 
            id: 'general', 
            label: 'Note', 
            type: 'text', 
            text: 'โน้ตเพิ่มเติม:' 
        }
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
        const listener = dbRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const dataObject = snapshot.val();
                const dataArray = Object.values(dataObject);
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
            .catch(err => alert('Error: ' + err.message));
    },

    initializeUpload: async () => {
        try {
            const response = await fetch('db.json');
            if (!response.ok) throw new Error('ไม่พบไฟล์ db.json');
            const rawData = await response.json();
            
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
                    table: Math.floor(Math.random() * 5) + 1,
                    status: 'Pending',
                    isCalled: false,
                    isForfeited: false,
                    Online: slot.toLowerCase().includes("online"),
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