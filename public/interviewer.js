// interviewer.js (เวอร์ชันอัปเดต: ใช้ Pane ด้านขวาแทน Modal)

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const tableSelectionView = document.getElementById('table-selection-view');
    const applicantListView = document.getElementById('applicant-list-view');
    const tableSelect = document.getElementById('table-select');
    const confirmTableBtn = document.getElementById('confirm-table-btn');
    const backToSelectionBtn = document.getElementById('back-to-selection-btn');
    const tableTitle = document.getElementById('table-title');
    const cardsContainer = document.getElementById('applicant-cards-container');
    // --- [ ⭐️ แก้ไข ⭐️ ] ---
    // ลบ scoringModal และ modalBody ออก
    // สมมติว่ามี Element ใหม่สำหรับ Pane ด้านขวา
    const scoringViewBody = document.getElementById('scoring-view-body'); // <--- สมมติว่า ID นี้
    // --- [ ⭐️ จบ ⭐️ ] ---
    const interviewDateFilter = document.getElementById('interview-date-filter');

    // --- State ---
    let currentTable = null;
    let allData = [];
    let unsubscribe = null;

    // --- Helper Functions ---
    const parseTimeFromSlot = (slotString) => {
        if (!slotString) return 'ยังไม่ระบุเวลา';
        const timeMatch = slotString.match(/(\d{2}[.:]\d{2})/);
        return timeMatch ? timeMatch[1] : slotString;
    };

    const parseDateFromSlot = (slotString) => {
        if (!slotString) return null;
        const dateMatch = slotString.match(/(วันที่|วันที) \d+ ตุลาคม/);
        return dateMatch ? dateMatch[0].replace('วันที', 'วันที่') : null;
    };

    const createScoreDropdown = (id, label, currentValue) => {
        const scoreOptions = [
            { value: 0, class: 'score-0' },
            { value: 1, class: 'score-1' },
            { value: 2, class: 'score-2' },
            { value: 3, class: 'score-3' },
            { value: 4, class: 'score-4' },
            { value: 5, class: 'score-5' },
        ];

        let optionsHTML = scoreOptions.map(opt =>
            `<option value="${opt.value}" class="${opt.class}" ${opt.value === currentValue ? 'selected' : ''}>${opt.value}</option>`
        ).join('');

        const initialClass = scoreOptions.find(opt => opt.value === currentValue)?.class || 'score-1';

        return `
            <div class="score-item">
                <label for="${id}">${label}:</label>
                <select id="${id}" class="score-select ${initialClass}">
                    ${optionsHTML}
                </select>
            </div>
        `;
    };


    // --- Rendering Functions ---
    const populateDateFilter = () => {
        const dates = [...new Set(allData.map(app => parseDateFromSlot(app.interviewSlot)))].filter(Boolean);
        const currentVal = interviewDateFilter.value;
        interviewDateFilter.innerHTML = '';
        dates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            interviewDateFilter.appendChild(option);
        });

        if(currentVal && dates.includes(currentVal)) {
             interviewDateFilter.value = currentVal;
        } else if (dates.length > 0) {
            interviewDateFilter.value = dates[0];
        }
    };

    const renderApplicantCards = () => {
        if (!currentTable) return;
        cardsContainer.innerHTML = ''; // ล้างการ์ดเก่า
        const selectedDate = interviewDateFilter.value;

        if (!selectedDate) {
             cardsContainer.innerHTML = '<p>กรุณาเลือกวันสัมภาษณ์</p>';
             scoringViewBody.innerHTML = '<p>กรุณาเลือกผู้สมัครเพื่อดูรายละเอียด</p>'; // เคลียร์ Pane ขวาด้วย
             return;
        }

        const applicantsForTableAndDate = allData.filter(app =>
            app.table === currentTable && parseDateFromSlot(app.interviewSlot) === selectedDate
        );
        if (applicantsForTableAndDate.length === 0) {
            cardsContainer.innerHTML = '<p>ยังไม่มีผู้สมัครสำหรับโต๊ะและวันที่นี้</p>';
            scoringViewBody.innerHTML = '<p>ยังไม่มีผู้สมัครสำหรับโต๊ะและวันที่นี้</p>'; // เคลียร์ Pane ขวาด้วย
            return;
        }

        // --- [ ⭐️ แก้ไข ⭐️ ] ---
        // เคลียร์ Pane ขวา เมื่อ render การ์ดใหม่ (ยังไม่มีใครถูกเลือก)
        scoringViewBody.innerHTML = '<p>กรุณาเลือกผู้สมัครเพื่อดูรายละเอียด</p>';
        // --- [ ⭐️ จบ ⭐️ ] ---


        const applicantsBySlot = applicantsForTableAndDate.reduce((acc, app) => {
            const slot = app.interviewSlot || 'Unscheduled';
            if (!acc[slot]) acc[slot] = [];
            acc[slot].push(app);
            return acc;
        }, {});
        const sortedSlots = Object.keys(applicantsBySlot).sort();
        sortedSlots.forEach(slot => {
            const slotGroup = document.createElement('div');
            slotGroup.className = 'timeslot-group';
            const slotTitle = document.createElement('h3');
            slotTitle.className = 'timeslot-header';
            slotTitle.textContent = `รอบเวลา: ${parseTimeFromSlot(slot)}`;
            slotGroup.appendChild(slotTitle);
            const cardsGrid = document.createElement('div');
            cardsGrid.className = 'applicant-grid';
            applicantsBySlot[slot].forEach(app => {
                const card = document.createElement('div');
                if (app.Online) {
                    card.className = 'info-card online-card'; 
                } else {
                    card.className = `info-card ${app.status.toLowerCase()}`;
                }
                card.dataset.applicantId = app.id;
                card.innerHTML = `
                    <h4>${app.firstName} ${app.lastName} (${app.nickname})</h4>
                    <p><strong>สถานะ:</strong> ${app.status}</p>
                    <p><strong>คณะ:</strong> ${app.faculty}</p>
                    <p><strong>ชั้นปี:</strong> ${app.year}</p>
                `;
                // --- [ ⭐️ แก้ไข ⭐️ ] ---
                // เพิ่ม Event Listener ให้กับ Card โดยตรง
                card.addEventListener('click', () => {
                    showScoringDetails(app.id, card); // ส่ง app.id และตัว card element ไปด้วย
                });
                // --- [ ⭐️ จบ ⭐️ ] ---
                cardsGrid.appendChild(card);
            });
            slotGroup.appendChild(cardsGrid);
            cardsContainer.appendChild(slotGroup);
        });
    };


    // --- [ ⭐️ ตรรกะหลักที่แก้ไข ⭐️ ] ---
    // (เปลี่ยนชื่อจาก showScoringModal เป็น showScoringDetails)
    // (เพิ่ม parameter: clickedCardElement)
    const showScoringDetails = (applicantId, clickedCardElement) => {
        const applicant = allData.find(a => a.id === applicantId);
        if (!applicant) {
             scoringViewBody.innerHTML = '<p>เกิดข้อผิดพลาด: ไม่พบข้อมูลผู้สมัคร</p>';
             return;
        }

        // (1. ไฮไลต์ Card ที่เลือก)
        document.querySelectorAll('.info-card.active-card').forEach(card => {
            card.classList.remove('active-card');
        });
        if (clickedCardElement) {
            clickedCardElement.classList.add('active-card');
        }

        // (2. อัปเดตเนื้อหาใน Pane ด้านขวา)
        const onlineStatus = applicant.Online ? '<span style="color: purple; font-weight: bold;"> (Online Interview ⭐️)</span>' : '';
        // ใช้ applicant.interviewSlot แทน applicant.interviewSlotOriginal
        const displaySlot = applicant.Online ? 'Online Special' : (applicant.interviewSlot || 'N/A');

        // ตรวจสอบว่า scoringViewBody มีอยู่จริงหรือไม่ ก่อนจะ innerHTML
        if (scoringViewBody) {
            scoringViewBody.innerHTML = `
                <h2>${applicant.firstName} ${applicant.lastName} (${applicant.nickname})${onlineStatus}</h2>
                <div class="applicant-details">
                    <p><strong>อีเมล:</strong> ${applicant.email || '-'}</p>
                    <p><strong>เบอร์โทร:</strong> ${applicant.phone || '-'}</p>
                    <p><strong>Line ID:</strong> ${applicant.contactLine || '-'}</p>
                    <p><strong>ติดต่อสำรอง:</strong> ${applicant.contactOther || '-'}</p>
                    <p><strong>รอบสัมภาษณ์:</strong> ${displaySlot}</p> 
                    <p><a href="${applicant.applicationUrl}" target="_blank" rel="noopener noreferrer">ดูใบสมัคร (PDF)</a></p>
                </div>
                <hr>
                <h3>ให้คะแนน (0-5)</h3>
                <form id="scoring-form" data-id="${applicant.id}">
                        ${createScoreDropdown('passion', 'Passion', applicant.scores.passion)}
                        ${createScoreDropdown('teamwork', 'Teamwork', applicant.scores.teamwork)}
                        ${createScoreDropdown('attitude', 'Attitude', applicant.scores.attitude)}
                        ${createScoreDropdown('creativity', 'Creativity', applicant.scores.creativity)}
                    <div class="score-item">
                        <label for="notes">หมายเหตุ:</label>
                        <textarea id="notes">${applicant.notes || ''}</textarea> 
                    </div>
                    <button type="submit">บันทึกคะแนน</button>
                </form>
            `;
        } else {
             console.error("Element with ID 'scoring-view-body' not found!");
             alert("เกิดข้อผิดพลาด: ไม่พบส่วนแสดงรายละเอียด (scoring-view-body)");
        }

        // (3. ลบตรรกะการเปิด Modal - ไม่ต้องทำอะไรเพิ่ม)
    };
    // --- [ ⭐️ จบ ⭐️ ] ---


    // --- Event Listeners ---
    confirmTableBtn.addEventListener('click', () => {
        const selectedTable = parseInt(tableSelect.value, 10);
        if (selectedTable) {
            currentTable = selectedTable;
            tableTitle.textContent = `รายชื่อผู้สมัครโต๊ะ ${currentTable}`;
            tableSelectionView.classList.add('hidden');
            applicantListView.classList.remove('hidden');

            unsubscribe = Database.onDataChange(newData => {
                const isFirstLoad = allData.length === 0;
                allData = newData;
                if (isFirstLoad) {
                    populateDateFilter();
                }
                renderApplicantCards(); // เรียก render การ์ดใหม่เสมอเมื่อข้อมูลเปลี่ยน
            });
        }
    });

    backToSelectionBtn.addEventListener('click', () => {
        currentTable = null;
        allData = []; // ล้างข้อมูลเมื่อกลับไปเลือกโต๊ะ
        tableSelectionView.classList.remove('hidden');
        applicantListView.classList.add('hidden');
        if (scoringViewBody) { // เคลียร์ Pane ขวาด้วย
             scoringViewBody.innerHTML = '<p>กรุณาเลือกโต๊ะและผู้สมัคร</p>';
        }
        if (unsubscribe) unsubscribe(); // หยุด listener
    });

    interviewDateFilter.addEventListener('change', renderApplicantCards);

    // --- [ ⭐️ แก้ไข ⭐️ ] ---
    // ลบ Event Listener ของ cardsContainer ออก เพราะเราใส่ Listener ให้แต่ละ Card โดยตรงแล้ว
    // cardsContainer.addEventListener('click', (e) => { ... }); (ลบ)

    // ลบ Event Listener ของ scoringModal ออก
    // scoringModal.addEventListener('click', (e) => { ... }); (ลบ)

    // เปลี่ยน Event Listener ของ modalBody เป็น scoringViewBody
    if (scoringViewBody) {
        // 1. Listener สำหรับเปลี่ยนสี Dropdown คะแนน
        scoringViewBody.addEventListener('change', (e) => {
            if (e.target.classList.contains('score-select')) {
                const select = e.target;
                select.className = 'score-select';
                const selectedOption = select.options[select.selectedIndex];
                select.classList.add(selectedOption.classList[0]);
            }
        });

        // 2. Listener สำหรับบันทึกคะแนน
        scoringViewBody.addEventListener('submit', (e) => {
            if (e.target.id === 'scoring-form') {
                e.preventDefault();
                const applicantId = parseInt(e.target.dataset.id, 10);
                const scores = {
                    passion: parseInt(document.getElementById('passion').value, 10),
                    teamwork: parseInt(document.getElementById('teamwork').value, 10),
                    attitude: parseInt(document.getElementById('attitude').value, 10),
                    creativity: parseInt(document.getElementById('creativity').value, 10)
                };
                const notes = document.getElementById('notes').value;
                Database.updateApplicant(applicantId, { scores, notes });
                alert('บันทึกคะแนนเรียบร้อย!');
                // ไม่ต้องปิด Modal แล้ว
            }
        });
    } else {
        console.warn("Could not attach listeners: Element 'scoring-view-body' not found.");
    }
    // --- [ ⭐️ จบ ⭐️ ] ---

    // โหลดข้อมูลครั้งแรก (ถ้าไม่ได้เลือกโต๊ะไว้)
    // เราจะรอให้ผู้ใช้เลือกโต๊ะก่อน แล้วค่อยโหลดข้อมูลใน confirmTableBtn listener

});