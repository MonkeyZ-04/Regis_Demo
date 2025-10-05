// interviewer.js

document.addEventListener('DOMContentLoaded', async () => {
    // รอให้ข้อมูลโหลดเสร็จก่อนเริ่มทำงาน
    await Database.initialize();
    
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
    const interviewDateFilter = document.getElementById('interview-date-filter'); // Element ใหม่

    let currentTable = null;

    function parseTimeFromSlot(slotString) {
        if (!slotString) return 'ยังไม่ระบุเวลา';
        const timeMatch = slotString.match(/(\d{2}[.:]\d{2})/);
        return timeMatch ? timeMatch[1] : slotString;
    }

    function parseDateFromSlot(slotString) {
        if (!slotString) return null;
        const dateMatch = slotString.match(/วันที่ \d+ มีนาคม/);
        return dateMatch ? dateMatch[0] : null;
    }

    // --- ฟังก์ชันใหม่สำหรับสร้างตัวเลือกวันที่ ---
    function populateDateFilter() {
        const allData = Database.getData();
        const dates = [...new Set(allData.map(app => parseDateFromSlot(app.interviewSlot)))].filter(Boolean);
        
        interviewDateFilter.innerHTML = ''; // Clear existing options
        dates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            interviewDateFilter.appendChild(option);
        });

        // Trigger render for the first time
        renderApplicantCards();
    }

    function renderApplicantCards() {
        if (!currentTable) return;
        cardsContainer.innerHTML = '';
        const allData = Database.getData();
        const selectedDate = interviewDateFilter.value;

        // กรองผู้สมัครตามโต๊ะและวันที่ที่เลือก
        const applicantsForTableAndDate = allData.filter(app => 
            app.table === currentTable && parseDateFromSlot(app.interviewSlot) === selectedDate
        );

        if (applicantsForTableAndDate.length === 0) {
            cardsContainer.innerHTML = '<p>ยังไม่มีผู้สมัครสำหรับโต๊ะและวันที่นี้</p>';
            return;
        }

        // จัดกลุ่มผู้สมัครตามช่วงเวลา
        const applicantsBySlot = applicantsForTableAndDate.reduce((acc, app) => {
            const slot = app.interviewSlot || 'Unscheduled';
            if (!acc[slot]) {
                acc[slot] = [];
            }
            acc[slot].push(app);
            return acc;
        }, {});

        // เรียงลำดับช่วงเวลา
        const sortedSlots = Object.keys(applicantsBySlot).sort();

        // แสดงผลแต่ละกลุ่มช่วงเวลา
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
    }
    
    function showScoringModal(applicantId) {
        const applicant = Database.getData().find(a => a.id === applicantId);
        if (!applicant) return;

        modalBody.innerHTML = `
            <h2>${applicant.firstName} ${applicant.lastName} (${applicant.nickname})</h2>
            <div class="applicant-details">
                <p><strong>อีเมล:</strong> ${applicant.email}</p>
                <p><strong>เบอร์โทร:</strong> ${applicant.phone}</p>
                <p><strong>Line ID:</strong> ${applicant.contactLine}</p>
                <p><strong>ติดต่อสำรอง:</strong> ${applicant.contactOther}</p>
                <p><strong>รอบสัมภาษณ์:</strong> ${applicant.interviewSlot}</p>
                <p><a href="${applicant.applicationUrl}" target="_blank">ดูใบสมัคร (PDF)</a></p>
            </div>
            <hr>
            <h3>ให้คะแนน</h3>
            <form id="scoring-form" data-id="${applicant.id}">
                <div class="score-item">
                    <label for="passion">Passion (0-10):</label>
                    <input type="number" id="passion" min="0" max="10" value="${applicant.scores.passion}">
                </div>
                <div class="score-item">
                    <label for="teamwork">Teamwork (0-10):</label>
                    <input type="number" id="teamwork" min="0" max="10" value="${applicant.scores.teamwork}">
                </div>
                <div class="score-item">
                    <label for="attitude">Attitude (0-10):</label>
                    <input type="number" id="attitude" min="0" max="10" value="${applicant.scores.attitude}">
                </div>
                <div class="score-item">
                    <label for="creativity">Creativity (0-10):</label>
                    <input type="number" id="creativity" min="0" max="10" value="${applicant.scores.creativity}">
                </div>
                <div class="score-item">
                    <label for="notes">หมายเหตุ:</label>
                    <textarea id="notes">${applicant.notes}</textarea>
                </div>
                <button type="submit">บันทึกคะแนน</button>
            </form>
        `;
        scoringModal.classList.remove('hidden');
    }

    // --- Event Listeners ---
    confirmTableBtn.addEventListener('click', () => {
        const selectedTable = parseInt(tableSelect.value, 10);
        if (selectedTable) {
            currentTable = selectedTable;
            tableTitle.textContent = `รายชื่อผู้สมัครโต๊ะ ${currentTable}`;
            tableSelectionView.classList.add('hidden');
            applicantListView.classList.remove('hidden');
            populateDateFilter(); // สร้างตัวเลือกวันที่และ render ครั้งแรก
        }
    });

    backToSelectionBtn.addEventListener('click', () => {
        currentTable = null;
        tableSelectionView.classList.remove('hidden');
        applicantListView.classList.add('hidden');
    });

    // Event listener ใหม่สำหรับตัวเลือกวันที่
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
    
    window.addEventListener('storageUpdated', () => {
        if(currentTable){
            renderApplicantCards();
        }
    });
});