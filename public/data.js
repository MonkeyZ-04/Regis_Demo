// data.js

// 1. ใส่ firebaseConfig ที่ได้มาจาก Firebase Console
// PASTE YOUR FIREBASE CONFIG HERE
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
    const firebaseConfig = {
    };

// 2. Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const applicantsCollection = db.collection('applicants');

const Database = {
    // ฟังก์ชันนี้ไม่จำเป็นแล้ว แต่คงไว้เพื่อให้โค้ดเดิมไม่ error
    initialize: async () => {
        return Promise.resolve();
    },

    // ฟังก์ชันนี้จะถูกใช้โดย shuffleAllTables
    getData: async () => {
        try {
            const snapshot = await applicantsCollection.get();
            // Firestore ใช้ id เป็น string แต่โค้ดเราใช้ number
            // เราจึงต้องแปลง id (ที่เป็นชื่อ doc) กลับเป็น number ด้วย
            return snapshot.docs.map(doc => ({ ...doc.data(), id: parseInt(doc.id, 10) }));
        } catch (error) {
            console.error("Error getting data from Firestore: ", error);
            return [];
        }
    },

    // ไม่ใช้แล้ว
    saveData: (data) => {
        console.warn("saveData is deprecated when using Firestore.");
    },

    // อัปเดตข้อมูลของผู้สมัครทีละคนบน Firestore
    updateApplicant: (id, updatedFields) => {
        const docId = String(id); // Firestore ใช้ Document ID เป็น string
        applicantsCollection.doc(docId).update(updatedFields)
            .catch(error => {
                console.error(`Error updating applicant ${id}: `, error);
            });
    },

    // ฟังก์ชันสุ่มโต๊ะที่แก้ไขให้ทำงานกับ Firestore
    shuffleAllTables: async () => {
        console.log("Shuffling tables...");
        let allData = await Database.getData();

        const applicantsBySlot = {};
        allData.forEach(applicant => {
            if (!applicantsBySlot[applicant.interviewSlot]) {
                applicantsBySlot[applicant.interviewSlot] = [];
            }
            applicantsBySlot[applicant.interviewSlot].push(applicant);
        });

        // ใช้ batch write เพื่อประสิทธิภาพที่ดี
        const batch = db.batch();
        for (const slot in applicantsBySlot) {
            const applicants = applicantsBySlot[slot];
            let tables = Array.from({ length: 8 }, (_, i) => i + 1);
            // สุ่ม Array (ฟังก์ชันนี้ต้องเอามาจาก data.js ตัวเก่า)
            for (let i = tables.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [tables[i], tables[j]] = [tables[j], tables[i]];
            }

            applicants.forEach((applicant, index) => {
                const newTable = tables[index % 8];
                const docRef = applicantsCollection.doc(String(applicant.id));
                batch.update(docRef, { table: newTable });
            });
        }

        await batch.commit();
        console.log("Tables shuffled and updated in Firestore.");
        // ไม่ต้องส่ง event เพราะ Firestore จะอัปเดตเอง
    },

    // ⭐ ฟังก์ชันใหม่ที่สำคัญที่สุด: สำหรับติดตามข้อมูลแบบ Real-time ⭐
    onDataChange: (callback) => {
        // orderBy('id') เพื่อให้ข้อมูลเรียงตาม ID เสมอ
        return applicantsCollection.onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: parseInt(doc.id, 10) }));
            console.log('[data.js] ข้อมูลมาถึงแล้ว! มีทั้งหมด:', data.length, 'รายการ');
            callback(data); // ส่งข้อมูลที่อัปเดตแล้วกลับไป
        }, error => {
            console.error("Error listening to data changes: ", error);
        });
    }
};