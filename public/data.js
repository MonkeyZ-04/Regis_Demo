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
    
    // ตั้งค่าคำถามและน้ำหนักคะแนนที่นี่ที่เดียว (เพิ่ม Text และ maxScore)
    QUESTIONS: [
        { 
            id: 'application', 
            label: 'ใบสมัคร', 
            type: 'score_text', 
            weight: 1, 
            maxScore: 10,
            text: 'คะแนนใบสมัครและภาพรวม' 
        },
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
            weight: 0.5, 
            maxScore: 5,
            text: 'โดยปกติแล้วเรามีวิธีรับมือกับงานที่ท้าทายความสามารถยังไง?' 
        },
        { 
            id: 'q2b', 
            label: '2b', 
            type: 'score_text', 
            weight: 0.5, 
            maxScore: 5,
            isSubQuestion: true,
            text: 'แล้วถ้าเป็นงานที่เราไม่คุ้นเคยจะรับมือยังไง?' 
        },
        { 
            id: 'q3', 
            label: '3', 
            type: 'text', 
            text: 'ตอนนี้มีงานอะไรที่รับผิดชอบอยู่บ้าง? วางแผนกิจกรรมมหาลัยในปีหน้า ๆ ไว้ยังไงบ้าง?' 
        },
        { 
            id: 'q4a', 
            label: '4a', 
            type: 'score_text', 
            weight: 3, 
            maxScore: 5,
            text: 'ถ้าทำงานกลุ่มกับเพื่อนแล้วเพื่อนทำส่วนที่รับผิดชอบไม่ทัน?' 
        },
        { 
            id: 'q4b', 
            label: '4b', 
            type: 'score_text', 
            weight: 2, 
            maxScore: 5,
            isSubQuestion: true,
            text: 'ถ้าเป็นเราในตอนนี้จะมีวิธีจัดการยังไง?' 
        },
        { 
            id: 'q5', 
            label: '5', 
            type: 'score_text', 
            weight: 2, 
            maxScore: 5,
            text: 'ก่อนหน้านี้เคยได้ยิน /เคยศึกษาเกี่ยวกับวิถีชีวิตความเป็นอยู่และปัญหากลุ่มชาติพันธุ์มาก่อนมั้ย?' 
        },
        { 
            id: 'q6', 
            label: '6', 
            type: 'score_text', 
            weight: 2, 
            maxScore: 5,
            text: 'คาดหวังอะไรกับการได้ไปทำกิจกรรมอาสากับค่ายเรา?' 
        },
        { 
            id: 'q7a', 
            label: '7a', 
            type: 'score_text', 
            weight: 1, 
            maxScore: 5,
            text: 'นอกจากค่ายอาสาของชมรมแล้ว เราคิดว่าชมรมสามารถช่วยเหลือชาวเขาในรูปแบบอื่น ๆ ได้ยังไงบ้าง?' 
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
            weight: 0.5, 
            maxScore: 5,
            text: 'รู้จักชมรมของเรามาก่อนมั้ย > รู้จักแค่ไหน > ชอบอะไรในชมรมเรา?' 
        },
        { 
            id: 'q8b', 
            label: '8b', 
            type: 'score_text', 
            weight: 0.5, 
            maxScore: 5,
            isSubQuestion: true,
            text: 'คิดว่าทำไมถึงต้องเป็นค่ายนี้?' 
        },
        { 
            id: 'q9', 
            label: '9', 
            type: 'text', 
            text: 'คำถามเลือกจากโครงที่ชอบสุด 1 ข้อ',
            choices: [
                '(สอน) ถ้าได้ขึ้นไปสอนน้องๆ อยากสอนวิชาอะไร ลองเสนอกิจกรรมการเรียนการสอนที่อยากทำ',
                '(สอน) ถ้าเกิดน้องๆเขินอายกับพวกเรา เราจะมีวิธีเข้าหาน้องๆอย่างไร',
                '(บำเพ็ญ) ถ้าได้มีโอกาสเป็นโครงบำเพ็ญ สามารถสร้างอะไรก็ได้ 1 อย่างบนค่าย อยากสร้างอะไรในระยะเวลาที่ขึ้นค่าย 8 วัน',
                '(เรียน) ถ้าได้มีโอกาสไปพูดคุยกับชาวบ้าน สิ่งไหนที่เราอยากนำไปแลกเปลี่ยนเรียนรู้กับชาวบ้าน',
                '(สวัส) ถ้าวันนั้นโครงอื่นๆทำงานหนักมาก ในฐานะโครงสวัสเราจะทำเมนู/เครื่องดื่มอะไรให้ชาวค่ายได้กิน'
            ]
        },
        { 
            id: 'q10', 
            label: '10', 
            type: 'text', 
            text: 'คำถามเลือกจากโครงที่ชอบน้อยที่สุด 1 ข้อ',
            choices: [
                '(สอน) ถ้าเกิดเราเจอเด็กดื้อมากๆ ไม่ยอมฟัง คอยกวนเด็กคนอื่นตลอดเวลาเราจะทำยังไง',
                '(สอน) ถ้าเกิดเราเจอเด็กที่ไม่จอยกับกิจกรรม ปลีกตัวออกจากกลุ่มเพื่อน งอแงไม่ยอมเข้าห้อง เราจะทำยังไง',
                '(บำเพ็ญ)ถ้าเราได้ทำงานที่ไม่เคยทำมาก่อน แล้วทำผิดพลาด เราจะมีวิธีการแก้ไขอย่างไร',
                '(เรียน)ถ้าวันไปโครงเรียน ชาวบ้านให้ชิมของนู่นนี่ แล้วก็ยื่นแอลกอฮอล์ให้ชิม แต่กฎค่ายห้าม เราจะมีวิธีการรับมือยังไง',
                '(เรียน)หากมีชาวบ้านทักทายโดยใช้ภาษากะเหรี่ยง พูดภาษาไทยไม่ได้ เราจะมีวิธีสื่อสารกับเค้ายังไง',
                '(สวัส) ถ้าเนื้อสัตว์ไม่พอในการทำอาหาร เราจะมีวิธีแก้ปัญหายังไง',
                '(สวัส)ถ้าเราคำนวณปริมาณอาหารมื้อเที่ยงผิดพลาด ไม่เพียงพอต่อชาวค่าย เราจะมีวิธีแก้ปัญหายังไง'
            ]
        },
        { 
            id: 'q11', 
            label: '11', 
            type: 'text', 
            text: 'เลือกคำถามโครงกลางคืนมาถาม 1 ข้อ',
            choices: [
                'Q1: หากย้อนเวลากลับไปได้ มีเรื่องอะไรที่อยากกลับไปแก้ไขมั้ย (เรื่องเล็กหรือใหญ่ก็ได้)',
                'Q2: เคยสร้าง impact ในแง่บวกให้ใครสักคนมั้ย ถ้าเคยช่วยเล่าสิ่งที่เราเคยทำให้คนอื่นรู้สึกดีให้ฟังหน่อยได้มั้ย',
                'Q3: เล่าวิธีมูฟออนจากวันแย่ๆของตัวเองให้ฟังหน่อยได้ไหม ปกติผ่านมาได้ยังไง'
            ]
        },
        { 
            id: 'q12', 
            label: '12', 
            type: 'text', 
            text: 'ในแต่ละวันจะมีการร้องเพลงและพูดคุยกันตาม topic ต่างๆ เราสามารถแลกเปลี่ยนหรือรับฟังทุกคนได้มั้ย โอเครึป่าว?' 
        },
        { 
            id: 'q13', 
            label: '13', 
            type: 'score_text', 
            weight: 2, 
            maxScore: 5,
            text: 'กฎค่าย 9 ข้อ ตั้งมาเพื่อจุดประสงค์ที่อยากรบกวนชาวบ้านให้น้อยที่สุด (ทวนกฎค่ายให้ฟัง) คิดเห็นยังไงกับกฎค่าย มีคำถามเกี่ยวกับกฎค่ายหรือรู้สึกว่ามีข้อไหนที่ควรปรับแก้หรือยืดหยุ่นได้มั้ย?' 
        },
        { 
            id: 'qSpecial', 
            label: 'พิเศษ', 
            type: 'score_only', 
            weight: 2.5, 
            maxScore: 5,
            isSpecial: true,
            text: '[พิเศษ] คิดว่าเข้ากับชมรมได้มั้ย? [ประเมินจากผู้สัมภาษณ์]' 
        },
        { 
            id: 'general', 
            label: 'Note', 
            type: 'text', 
            text: 'โน้ตเพิ่มเติม / สรุป:' 
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