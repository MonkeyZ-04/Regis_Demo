// staff.js

document.addEventListener('DOMContentLoaded', async () => {
    // รอให้ข้อมูลโหลดเสร็จก่อนเริ่มทำงาน
    await Database.initialize();

    // Elements
    const shuffleBtn = document.getElementById('shuffle-btn'); // <-- Element ใหม่
    const pendingList = document.getElementById('pending-list');
    const arrivedList = document.getElementById('arrived-list');
    const pendingCountEl = document.getElementById('pending-count');
    const arrivedCountEl = document.getElementById('arrived-count');
    const searchBox = document.getElementById('search-box');
    const filterSlot = document.getElementById('filter-slot');
    const filterStatus = document.getElementById('filter-status');
    const timeslotDashboard = document.getElementById('timeslot-dashboard');
    const dateFilter = document.getElementById('date-filter');
    const staffInfoModal = document.getElementById('staff-info-modal');
    const staffModalBody = document.getElementById('staff-modal-body');

    let allData = [];

    // --- ฟังก์ชันสำหรับ Dashboard (เหมือนเดิม) ---
    function parseDateTime(slotString) {
        if (!slotString) return { date: null, time: null, fullDate: null };
        
        const dateMatch = slotString.match(/วันที่ \d+ มีนาคม/);
        const datePart = dateMatch ? dateMatch[0] : null;

        const timeMatch = slotString.match(/(\d{2}[.:]\d{2})/);
        const timePart = timeMatch ? timeMatch[1] : null;

        let fullDate = null;
        if (datePart && timePart) {
            const day = parseInt(datePart.match(/\d+/)[0], 10);
            const [hour, minute] = timePart.split(/[.:]/).map(Number);
            const now = new Date();
            fullDate = new Date(now.getFullYear(), 2, day, hour, minute); // Month 2 is March
        }

        return { date: datePart, time: timePart, fullDate: fullDate };
    }

    function renderTimeslotDashboard() {
        const selectedDate = dateFilter.value;
        const slots = [...new Set(allData.map(app => app.interviewSlot))]
            .filter(Boolean)
            .filter(slot => selectedDate === 'all' || slot.includes(selectedDate))
            .sort();
        
        const tables = Array.from({ length: 8 }, (_, i) => i + 1);
        const now = new Date();

        let tableHTML = '<table><thead><tr><th>โต๊ะ \\ เวลา</th>';
        slots.forEach(slot => {
            const { fullDate, time } = parseDateTime(slot);
            const endTime = fullDate ? new Date(fullDate.getTime() + 15 * 60000) : null;
            const isCurrentSlot = fullDate && now >= fullDate && now < endTime;
            
            tableHTML += `<th class="${isCurrentSlot ? 'current-slot-header' : ''}">${time || slot}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';

        tables.forEach(tableNum => {
            tableHTML += `<tr><td><strong>โต๊ะ ${tableNum}</strong></td>`;
            slots.forEach(slot => {
                const applicant = allData.find(app => app.table === tableNum && app.interviewSlot === slot);
                if (applicant) {
                    const statusClass = applicant.status === 'Arrived' ? 'arrived-in-table' : '';
                    tableHTML += `<td class="busy ${statusClass}" data-applicant-id="${applicant.id}">${applicant.nickname}</td>`;
                } else {
                    tableHTML += '<td class="available">ว่าง</td>';
                }
            });
            tableHTML += '</tr>';
        });

        tableHTML += '</tbody></table>';
        timeslotDashboard.innerHTML = tableHTML;
    }

    function showApplicantModal(applicantId) {
        const applicant = allData.find(app => app.id === applicantId);
        if (!applicant) return;

        staffModalBody.innerHTML = `
            <h2>${applicant.nickname}</h2>
            <p><strong>ชื่อจริง-นามสกุล:</strong> ${applicant.prefix} ${applicant.firstName} ${applicant.lastName}</p>
            <p><strong>คณะ:</strong> ${applicant.faculty} (${applicant.year})</p>
            <p><strong>เบอร์โทร:</strong> ${applicant.phone}</p>
            <p><strong>ช่องทางติดต่อ:</strong> ${applicant.contactOther || applicant.contactLine || 'ไม่มีข้อมูล'}</p>
        `;
        staffInfoModal.classList.remove('hidden');
    }
    
    // ... โค้ดส่วนที่เหลือเหมือนเดิมทั้งหมด ...
    // --- ฟังก์ชันสำหรับ Check-in Board ---

    function createApplicantCard(app) {
        const card = document.createElement('div');
        card.className = `staff-card ${app.status.toLowerCase()}`;
        card.dataset.id = app.id;
        
        card.innerHTML = `
            <div class="card-main-info">
                <h4>${app.firstName} ${app.lastName} (${app.nickname})</h4>
                <p>${app.faculty} - ${app.year}</p>
                <p class="interview-slot">รอบ: ${app.interviewSlot}</p>
            </div>
            <div class="card-actions">
                <div class="action-item">
                    <label>โต๊ะ:</label>
                    <select class="table-select-dropdown">
                        ${[1,2,3,4,5,6,7,8].map(n => `<option value="${n}" ${n === app.table ? 'selected' : ''}>${n}</option>`).join('')}
                    </select>
                </div>
                <div class="action-item">
                    ${app.status === 'Pending' ? 
                        `<button class="check-in-btn">Check-in</button>` : 
                        `<button class="undo-check-in-btn">ยกเลิก Check-in</button>`
                    }
                </div>
            </div>
        `;
        return card;
    }

    function renderCheckinBoard() {
        pendingList.innerHTML = '';
        arrivedList.innerHTML = '';
        
        const searchTerm = searchBox.value.toLowerCase();
        const selectedSlot = filterSlot.value;
        const selectedStatus = filterStatus.value;
        
        const filteredData = allData.filter(app => {
            const matchesSearch = 
                (app.firstName && app.firstName.toLowerCase().includes(searchTerm)) ||
                (app.lastName && app.lastName.toLowerCase().includes(searchTerm)) ||
                (app.nickname && app.nickname.toLowerCase().includes(searchTerm)) ||
                (app.faculty && app.faculty.toLowerCase().includes(searchTerm));
            
            const matchesSlot = selectedSlot === 'all' || app.interviewSlot === selectedSlot;
            const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;

            return matchesSearch && matchesSlot && matchesStatus;
        });

        filteredData.forEach(app => {
            const card = createApplicantCard(app);
            if (app.status === 'Pending') {
                pendingList.appendChild(card);
            } else {
                arrivedList.appendChild(card);
            }
        });

        pendingCountEl.textContent = allData.filter(a => a.status === 'Pending').length;
        arrivedCountEl.textContent = allData.filter(a => a.status === 'Arrived').length;
    }

    function populateFilterOptions() {
        const slots = [...new Set(allData.map(app => app.interviewSlot))];
        slots.sort();
        while (filterSlot.options.length > 1) {
            filterSlot.remove(1);
        }
        slots.forEach(slot => {
            if (!slot) return;
            const option = document.createElement('option');
            option.value = slot;
            option.textContent = slot;
            filterSlot.appendChild(option);
        });
    }

    function populateDateFilter() {
        const dates = [...new Set(allData.map(app => parseDateTime(app.interviewSlot).date))].filter(Boolean);
        dateFilter.innerHTML = '';
        dates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            dateFilter.appendChild(option);
        });
    }

    function handleAction(e) {
        const card = e.target.closest('.staff-card');
        if (!card) return;
        const id = parseInt(card.dataset.id, 10);

        if (e.target.classList.contains('check-in-btn')) {
            Database.updateApplicant(id, { status: 'Arrived' });
        }
        if (e.target.classList.contains('undo-check-in-btn')) {
            Database.updateApplicant(id, { status: 'Pending' });
        }
        if (e.target.classList.contains('table-select-dropdown')) {
            const newTable = parseInt(e.target.value, 10);
            Database.updateApplicant(id, { table: newTable });
        }
    }

    function refreshDataAndRender() {
        allData = Database.getData();
        renderCheckinBoard();
        renderTimeslotDashboard();
    }

    // --- Initial Load ---
    allData = Database.getData();
    populateDateFilter();
    populateFilterOptions();
    renderCheckinBoard();
    renderTimeslotDashboard();

    // --- Event Listeners ---

    // ⭐️ Event Listener ใหม่สำหรับปุ่ม Shuffle ⭐️
    shuffleBtn.addEventListener('click', () => {
        if (confirm('คุณต้องการสุ่มโต๊ะใหม่ทั้งหมดหรือไม่? การกระทำนี้จะเปลี่ยนโต๊ะของผู้สมัครทุกคน')) {
            Database.shuffleAllTables();
            alert('สุ่มโต๊ะใหม่เรียบร้อยแล้ว!');
        }
    });

    searchBox.addEventListener('input', renderCheckinBoard);
    filterSlot.addEventListener('change', renderCheckinBoard);
    filterStatus.addEventListener('change', renderCheckinBoard);
    dateFilter.addEventListener('change', renderTimeslotDashboard);

    document.querySelector('.staff-board').addEventListener('click', handleAction);
    document.querySelector('.staff-board').addEventListener('change', handleAction);
    
    timeslotDashboard.addEventListener('click', (e) => {
        if (e.target.classList.contains('busy')) {
            const applicantId = parseInt(e.target.dataset.applicantId, 10);
            showApplicantModal(applicantId);
        }
    });
    
    staffInfoModal.addEventListener('click', (e) => {
        if (e.target === staffInfoModal || e.target.classList.contains('modal-close-btn')) {
            staffInfoModal.classList.add('hidden');
        }
    });

    window.addEventListener('storageUpdated', refreshDataAndRender);
    
    setInterval(renderTimeslotDashboard, 10000);
});