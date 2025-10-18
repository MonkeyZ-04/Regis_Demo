// interviewer.js (เวอร์ชันอัปเดตล่าสุด)

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const tableSelectionView = document.getElementById('table-selection-view');
    const applicantListView = document.getElementById('applicant-list-view');
    const tableSelect = document.getElementById('table-select');
    const confirmTableBtn = document.getElementById('confirm-table-btn');
    const backToSelectionBtn = document.getElementById('back-to-selection-btn');
    const tableTitle = document.getElementById('table-title');
    const cardsContainer = document.getElementById('applicant-cards-container');
    const scoringModal = document.getElementById('scoring-modal');
    const modalBody = document.getElementById('modal-body');
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

    /**
     * ⭐ [จุดแก้ไขที่ 1]
     * แก้ไขให้มองหา "ตุลาคม" และแก้ "วันที" ที่สะกดผิดเป็น "วันที่"
     */
    const parseDateFromSlot = (slotString) => {
        if (!slotString) return null;
        // 1. มองหา "ตุลาคม" และรองรับ "วันที" (ที่สะกดผิด)
        const dateMatch = slotString.match(/(วันที่|วันที) \d+ ตุลาคม/);
        // 2. แปลง "วันที" -> "วันที่" อัตโนมัติ
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
        
        // --- เพิ่ม logic เลือกวันแรกอัตโนมัติ ---
        if(currentVal && dates.includes(currentVal)) {
             interviewDateFilter.value = currentVal;
        } else if (dates.length > 0) {
            interviewDateFilter.value = dates[0];
        }
        // ---------------------------------
    };

    const renderApplicantCards = () => {
        if (!currentTable) return;
        cardsContainer.innerHTML = '';
        const selectedDate = interviewDateFilter.value;
        
        if (!selectedDate) {
             cardsContainer.innerHTML = '<p>กรุณาเลือกวันสัมภาษณ์</p>';
             return;
        }
        
        const applicantsForTableAndDate = allData.filter(app =>
            app.table === currentTable && parseDateFromSlot(app.interviewSlot) === selectedDate
        );
        if (applicantsForTableAndDate.length === 0) {
            cardsContainer.innerHTML = '<p>ยังไม่มีผู้สมัครสำหรับโต๊ะและวันที่นี้</p>';
            return;
        }
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

    /**
     * ⭐ [จุดแก้ไขที่ 2]
     * เพิ่มลิงก์ PDF เข้าไปใน Modal
     */
    const showScoringModal = (applicantId) => {
        const applicant = allData.find(a => a.id === applicantId);
        if (!applicant) return;

        modalBody.innerHTML = `
            <h2>${applicant.firstName} ${applicant.lastName} (${applicant.nickname})</h2>
            <div class="applicant-details">
                <p><strong>อีเมล:</strong> ${applicant.email}</p>
                <p><strong>เบอร์โทร:</strong> ${applicant.phone}</p>
                <p><strong>Line ID:</strong> ${applicant.contactLine}</p>
                <p><strong>ติดต่อสำรอง:</strong> ${applicant.contactOther}</p>
                <p><strong>รอบสัมภาษณ์:</strong> ${applicant.interviewSlot}</p>
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
        scoringModal.classList.remove('hidden');
    };

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
    cardsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-details-btn')) {
            const card = e.target.closest('.info-card');
            const applicantId = parseInt(card.dataset.applicantId, 10);
            showScoringModal(applicantId);
        }
    });

    scoringModal.addEventListener('click', (e) => {
        if (e.target === scoringModal || e.target.classList.contains('modal-close-btn')) {
            scoringModal.classList.add('hidden');
        }
    });

    modalBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('score-select')) {
            const select = e.target;
            select.className = 'score-select'; 
            const selectedOption = select.options[select.selectedIndex];
            select.classList.add(selectedOption.classList[0]);
        }
    });

    modalBody.addEventListener('submit', (e) => {
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
            scoringModal.classList.add('hidden');
        }
    });
});