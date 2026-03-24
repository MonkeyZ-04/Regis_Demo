// public/data.js

// ==========================================
// 1. Firebase Configuration (รวมศูนย์ที่นี่)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAMV5RKEvHYh1keA_QZxM5c7xBPhQXZfnE",
  authDomain: "raincamp-779ce.firebaseapp.com",
  projectId: "raincamp-779ce",
  storageBucket: "raincamp-779ce.firebasestorage.app",
  databaseURL: "https://raincamp-779ce-default-rtdb.asia-southeast1.firebasedatabase.app",
  messagingSenderId: "577670678118",
  appId: "1:577670678118:web:b982365d2c2e2af7118fa7",
  measurementId: "G-R8G3LEC1VZ"
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
            text: 'คะแนนใบสมัคร (ข้อ 1-5 ในกระดาษ เต็ม 10)' 
        },
        // --- คำถามสัมภาษณ์ 14 ข้อ ---
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
            weight: 1, 
            maxScore: 5,
            text: 'โดยปกติแล้วเรามีวิธีรับมือกับงานที่ยากและสำคัญยังไง เช่นอาจไม่มั่นใจว่าตัวเองจะสามารถทำได้มั้ย' 
        },
        { 
            id: 'q2b', 
            label: '2b', 
            type: 'score_text', 
            weight: 1, 
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
        { 
            id: 'q4a', 
            label: '4a', 
            type: 'score_text', 
            weight: 1, 
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
        { 
            id: 'q5a', 
            label: '5a', 
            type: 'score_text', 
            weight: 1, 
            maxScore: 5,
            text: 'ก่อนหน้านี้เคยได้ยิน/เคยศึกษาเกี่ยวกับวิถีชีวิตความเป็นอยู่และปัญหากลุ่มชาติพันธุ์มาก่อนมั้ย?' 
        },
        { 
            id: 'q5b', 
            label: '5b', 
            type: 'score_text', 
            weight: 1, 
            maxScore: 5,
            isSubQuestion: true,
            text: 'เล่าให้ฟังถึงมุมมองของเราต่อกลุ่มชาติพันธุ์หน่อย' 
        },
        { 
            id: 'q6', 
            label: '6', 
            type: 'score_text', 
            weight: 1, 
            maxScore: 5,
            text: 'คาดหวังอะไรกับการได้ไปทำกิจกรรมอาสากับค่ายเรา' 
        },
        { 
            id: 'q7a', 
            label: '7a', 
            type: 'score_text', 
            weight: 1, 
            maxScore: 5,
            text: 'นอกจากค่ายอาสาของชมรมแล้ว เราคิดว่าชมรมสามารถช่วยเหลือชาวเขาในรูปแบบอื่น ๆ ได้ยังไงบ้าง ลองเสนอไอเดีย' 
        },
        { 
            id: 'q7b', 
            label: '7b', 
            type: 'score_text', 
            weight: 1, 
            maxScore: 5,
            isSubQuestion: true,
            text: 'แล้วถ้าหากติดค่ายอาสา ลงค่ายมาจะสะดวกมาสานต่อกิจกรรมนี้มั้ย?' 
        },
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
            text: 'เลือกคำถามจากโครงที่ **ชอบสุด** 1 ข้อ (ให้ผู้สมัครเลือก)',
            choices: [
                '(สอน) อยากสอนวิชาอะไร ลองเสนอกิจกรรม',
                '(สอน) น้องๆเขินอาย จะมีวิธีเข้าหาอย่างไร',
                '(บำเพ็ญ) สร้างอะไรก็ได้ 1 อย่าง อยากสร้างอะไร',
                '(เรียน) อยากนำอะไรไปแลกเปลี่ยนเรียนรู้กับชาวบ้าน',
                '(สวัส) จะทำเมนู/เครื่องดื่มอะไรให้ชาวค่ายกิน'
            ]
        },
        { 
            id: 'q10', 
            label: '10', 
            type: 'text', 
            text: 'เลือกคำถามจากโครงที่ **ชอบน้อยที่สุด** 1 ข้อ',
            choices: [
                '(สอน) เจอเด็กดื้อมากๆ ไม่ยอมฟัง คอยกวน',
                '(สอน) เด็กไม่จอย ปลีกตัว งอแง',
                '(บำเพ็ญ) ทำงานที่ไม่เคยทำ เช่นเชื่อมเหล็ก แล้วพลาด',
                '(เรียน) ชาวบ้านยื่นแอลกอฮอล์ให้ชิม แต่กฎค่ายห้าม',
                '(เรียน) ชาวบ้านทักทายภาษากะเหรี่ยง พูดไทยไม่ได้',
                '(สวัส) เนื้อสัตว์ไม่พอทำอาหาร',
                '(สวัส) คำนวณปริมาณอาหารเที่ยงพลาด ไม่พอ'
            ]
        },
        { 
            id: 'q11', 
            label: '11', 
            type: 'text', 
            text: 'ในแต่ละวันจะมีการร้องเพลงและพูดคุยกันตาม topic ต่างๆ เราสามารถแลกเปลี่ยนหรือรับฟังทุกคนได้มั้ย โอเคป่าว?' 
        },
        { 
            id: 'q12', 
            label: '12', 
            type: 'text', 
            text: 'เลือกคำถามโครงกลางคืนมาถาม 1 ข้อ',
            choices: [
                'Q1: สิ่งเล็ก ๆ ที่เราชอบในตัวเองคืออะไร',
                'Q2: ถ้าไม่มีใครตัดสิน อยากลองทำอะไรที่สุด',
                'Q3: เล่าวิธีมูฟออนจากวันแย่ๆของตัวเองให้ฟังหน่อยได้ไหม ปกติผ่านมาได้ยังไง'
            ]
        },
        { 
            id: 'q13', 
            label: '13', 
            type: 'text', 
            text: 'จำลอง Session โครงกลางคืน (บันทึกข้อสังเกต: กาลเทศะ, ความเข้ากันได้, potential)' 
        },
        { 
            id: 'q14', 
            label: '14', 
            type: 'score_text', 
            weight: 1, 
            maxScore: 5,
            text: 'กฎค่าย 9 ข้อ คิดเห็นยังไงกับกฎค่าย มีข้อไหนที่ควรปรับแก้หรือยืดหยุ่นได้มั้ย?', 
            choices: [
                'ข้อ 1 ห้ามมีความสัมพันธ์เชิงชู้สาว',
                'ข้อ 2 ห้ามใช้สิ่งเสพติดและสิ่งมึนเมาทุกชนิด',
                'ข้อ 3 ห้ามใช้โทรศัพท์ขณะทำกิจกรรม (ยกเว้นถ่ายรูป)',
                'ข้อ 4 ห้ามซื้อ/ขายของจากชาวบ้าน',
                'ข้อ 5 ห้ามใช้ไฟฟ้าของโรงเรียน',
                'ข้อ 6 ห้ามทำงานข้ามโครง',
                'ข้อ 7 ห้ามไปไหนคนเดียวตอนโครงเรียน',
                'ข้อ 8 ห้ามออกนอกพื้นที่โรงเรียน (ยกเว้นขอบเขตของกิจกรรม)',
                'ข้อ 9 ตรงต่อเวลา'
            ]
        },
        // --- การประเมินรวม ---
        { 
            id: 'assess_club', 
            label: 'Club Fit', 
            type: 'score_text', 
            weight: 0, 
            maxScore: 5,
            isSpecial: true,
            text: 'คิดว่าเข้ากับชมรมได้มั้ย? (ประเมินจากผู้สัมภาษณ์)' 
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
                    table: Math.floor(Math.random() * 8) + 1,
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