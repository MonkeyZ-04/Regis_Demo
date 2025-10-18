// interviewer.js (เวอร์ชันอัปเดต - Split-Screen)

document.addEventListener('DOMContentLoaded', () => {
    // --- [ ⭐️ แก้ไข Elements ⭐️ ] ---
    const tableSelectionView = document.getElementById('table-selection-view');
    const applicantListView = document.getElementById('applicant-list-view');
    const tableSelect = document.getElementById('table-select');
    const confirmTableBtn = document.getElementById('confirm-table-btn');
    const backToSelectionBtn = document.getElementById('back-to-selection-btn');
    const tableTitle = document.getElementById('table-title');
    const cardsContainer = document.getElementById('applicant-cards-container');
    
    // (ลบ const scoringModal และ modalBody)
    // (เพิ่ม)
    const scoringViewBody = document.getElementById('scoring-view-body'); 
    
    // --- [ ⭐️ จบ ⭐️ ] ---

    // --- State ---
    let currentTable = null;
    let allData = [];
    let unsubscribe = null;

    // (Map สำหรับแสดงผล Date Key)
    const DATE_DISPLAY_MAP = {
        "2025-10-22": "วันที่ 22 ตุลาคม",
        "2025-10-24": "วันที่ 24 ตุลาคม",
        "RESERVE": "เวลาสำรอง"
    };

    // (ฟังก์ชัน createScoreDropdown - เหมือนเดิม)
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
    // (populateDateFilter - เหมือนเดิม)
    const populateDateFilter = () => {
        const dates = [...new Set(allData.map(app => app.interviewDate))].filter(Boolean).filter(d => d !== 'RESERVE');
        const currentVal = interviewDateFilter.value;
        interviewDateFilter.innerHTML = '';
        
        dates.forEach(dateKey => {
            const option = document.createElement('option');
            option.value = dateKey;
            option.textContent = DATE_DISPLAY_MAP[dateKey] || dateKey;
            interviewDateFilter.appendChild(option);
        });
        
        if(currentVal && dates.includes(currentVal)) {
             interviewDateFilter.value = currentVal;
        } else if (dates.length > 0) {
            interviewDateFilter.value = dates[0];
        }
    };

    // (renderApplicantCards - เหมือนเดิม)
    const renderApplicantCards = () => {
        if (!currentTable) return;
        cardsContainer.innerHTML = '';
        const selectedDate = interviewDateFilter.value;
        
        if (!selectedDate) {
             cardsContainer.innerHTML = '<p>กรุณาเลือกวันสัมภาษณ์</p>';
             return;
        }
        
        const applicantsForTableAndDate = allData.filter(app =>
            app.table === currentTable && app.interviewDate === selectedDate
        );

        if (applicantsForTableAndDate.length === 0) {
            cardsContainer.innerHTML = '<p>ยังไม่มีผู้สมัครสำหรับโต๊ะและวันที่นี้</p>';
            
            // ⭐️ [เพิ่ม] ถ้าไม่มีผู้สมัคร ให้เคลียร์ฟอร์มด้านขวาด้วย ⭐️
            scoringViewBody.innerHTML = '<p class="placeholder-text">ไม่มีผู้สมัครสำหรับโต๊ะและวันที่นี้</p>';
            return;
        }
        
        const applicantsBySlot = applicantsForTableAndDate.reduce((acc, app) => {
            const slot = app.interviewTime || 'Unscheduled';
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
            slotTitle.textContent = `รอบเวลา: ${slot}`;
            slotGroup.appendChild(slotTitle);
            
            const cardsGrid = document.createElement('div');
            cardsGrid.className = 'applicant-grid';
            applicantsBySlot[slot].forEach(app => {
                const card = document.createElement('div');
                card.className = `info-card ${app.status.toLowerCase()}`;
                card.dataset.applicantId = app.id;
                card.innerHTML = `
                    <h4>${app.firstName} ${app.lastName} (${app.nickname})</h4>
                    <p><strong>สถานะ:</strong> ${app.status}</p>
                    <p><strong>คณะ:</strong> ${app.faculty}</p>
                    <p><strong>ชั้นปี:</strong> ${app.year}</p>
                    <button class="view-details-btn">ดูรายละเอียดและให้คะแนน</button>
                `;
                cardsGrid.appendChild(card);
            });
            slotGroup.appendChild(cardsGrid);
            cardsContainer.appendChild(slotGroup);
        });
    };

    // --- [ ⭐️ ตรรกะหลักที่แก้ไข ⭐️ ] ---
    // (เปลี่ยนชื่อจาก showScoringModal เป็น showScoringDetails)
    const showScoringDetails = (applicantId, clickedCardElement) => {
        const applicant = allData.find(a => a.id === applicantId);
        if (!applicant) return;

        // (1. ไฮไลต์ Card ที่เลือก)
        // ลบ active class ออกจาก card อื่นๆ ก่อน
        document.querySelectorAll('.info-card.active-card').forEach(card => {
            card.classList.remove('active-card');
        });
        // เพิ่ม active class ให้ card ที่เพิ่งคลิก
        if (clickedCardElement) {
            clickedCardElement.classList.add('active-card');
        }

        // (2. อัปเดตเนื้อหาใน Pane ด้านขวา)
        // (แทนที่ modalBody.innerHTML)
        scoringViewBody.innerHTML = ` 
            <h2>${applicant.firstName} ${applicant.lastName} (${applicant.nickname})</h2>
            <div class="applicant-details">
                <p><strong>อีเมล:</strong> ${applicant.email}</p>
                <p><strong>เบอร์โทร:</strong> ${applicant.phone}</p>
                <p><strong>Line ID:</strong> ${applicant.contactLine}</p>
                <p><strong>ติดต่อสำรอง:</strong> ${applicant.contactOther}</p>
                <p><strong>รอบสัมภาษณ์:</strong> ${applicant.interviewSlotOriginal}</p>
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
                    <textarea id="notes">${applicant.notes}</textarea>
                </div>
                <button type="submit">บันทึกคะแนน</button>
            </form>
        `;
        
        // (3. ลบตรรกะการเปิด Modal)
        // scoringModal.classList.remove('hidden'); (ลบ)
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
                renderApplicantCards();

                // ⭐️ [เพิ่ม] เคลียร์ฟอร์มด้านขวาเมื่อข้อมูลโหลดใหม่ ⭐️
                scoringViewBody.innerHTML = '<p class="placeholder-text">กรุณาเลือก "ดูรายละเอียด" จากผู้สมัครด้านซ้าย</p>';
            });
        }
    });

    backToSelectionBtn.addEventListener('click', () => {
        currentTable = null;
        allData = [];
        tableSelectionView.classList.remove('hidden');
        applicantListView.classList.add('hidden');
        if (unsubscribe) unsubscribe();
    });

    interviewDateFilter.addEventListener('change', renderApplicantCards);
    
    // ⭐️ [แก้ไข] Event Listener นี้จะเรียกฟังก์ชันใหม่ ⭐️
    cardsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-details-btn')) {
            const card = e.target.closest('.info-card');
            const applicantId = parseInt(card.dataset.applicantId, 10);
            showScoringDetails(applicantId, card); // ส่ง 'card' ไปด้วยเพื่อไฮไลต์
        }
    });

    // ⭐️ [ลบ] Event Listener ของ Modal ทิ้ง ⭐️
    // scoringModal.addEventListener('click', (e) => { ... });

    // ⭐️ [แก้ไข] เปลี่ยน Event Listener จาก modalBody เป็น scoringViewBody ⭐️
    scoringViewBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('score-select')) {
            const select = e.target;
            select.className = 'score-select'; 
            const selectedOption = select.options[select.selectedIndex];
            select.classList.add(selectedOption.classList[0]);
        }
    });

    // ⭐️ [แก้ไข] เปลี่ยน Event Listener จาก modalBody เป็น scoringViewBody ⭐️
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
            
        }
    });
});