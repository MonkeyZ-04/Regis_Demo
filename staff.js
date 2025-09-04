// staff.js

document.addEventListener('DOMContentLoaded', async () => {
    // รอให้ข้อมูลโหลดเสร็จก่อนเริ่มทำงาน
    await Database.initialize();

    // Elements
    const pendingList = document.getElementById('pending-list');
    const arrivedList = document.getElementById('arrived-list');
    const pendingCountEl = document.getElementById('pending-count');
    const arrivedCountEl = document.getElementById('arrived-count');
    const searchBox = document.getElementById('search-box');
    const filterSlot = document.getElementById('filter-slot');
    const filterStatus = document.getElementById('filter-status');

    let allData = [];

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

    function renderBoard() {
        // Clear lists
        pendingList.innerHTML = '';
        arrivedList.innerHTML = '';
        
        // Apply filters
        const searchTerm = searchBox.value.toLowerCase();
        const selectedSlot = filterSlot.value;
        const selectedStatus = filterStatus.value;
        
        const filteredData = allData.filter(app => {
            const matchesSearch = 
                app.firstName.toLowerCase().includes(searchTerm) ||
                app.lastName.toLowerCase().includes(searchTerm) ||
                app.nickname.toLowerCase().includes(searchTerm) ||
                app.faculty.toLowerCase().includes(searchTerm);
            
            const matchesSlot = selectedSlot === 'all' || app.interviewSlot === selectedSlot;
            const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;

            return matchesSearch && matchesSlot && matchesStatus;
        });

        let pendingCount = 0;
        let arrivedCount = 0;

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
        slots.forEach(slot => {
            if (!slot) return; //ข้ามรอบเวลาที่ไม่มีค่า
            const option = document.createElement('option');
            option.value = slot;
            option.textContent = slot;
            filterSlot.appendChild(option);
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
        renderBoard();
    }

    // --- Initial Load ---
    allData = Database.getData();
    populateFilterOptions();
    renderBoard();

    // --- Event Listeners ---
    searchBox.addEventListener('input', renderBoard);
    filterSlot.addEventListener('change', renderBoard);
    filterStatus.addEventListener('change', renderBoard);

    document.querySelector('.staff-board').addEventListener('click', handleAction);
    document.querySelector('.staff-board').addEventListener('change', handleAction);

    window.addEventListener('storageUpdated', refreshDataAndRender);
});