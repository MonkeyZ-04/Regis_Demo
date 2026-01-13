// staff.js (Version Update: Add "called" status to the dashboard table)

// --- Elements ---
const pendingList = document.getElementById('pending-list');
const arrivedList = document.getElementById('arrived-list');
const onlineList = document.getElementById('online-list');
const pendingCountEl = document.getElementById('pending-count');
const arrivedCountEl = document.getElementById('arrived-count');
const onlineCountEl = document.getElementById('online-count');
const searchBox = document.getElementById('search-box');
const filterSlot = document.getElementById('filter-slot');
const filterStatus = document.getElementById('filter-status');
const timeslotDashboard = document.getElementById('timeslot-dashboard');
const dateSwitchContainer = document.getElementById('date-switch-container');
const staffInfoModal = document.getElementById('staff-info-modal');
const staffModalBody = document.getElementById('staff-modal-body');

if (!pendingList || !arrivedList || !onlineList || !dateSwitchContainer) {
    console.error("Critical elements are missing from the page. Aborting script.");
    throw new Error("Staff.js: Critical elements missing.");
}

// --- State ---
let allData = [];
let draggedApplicantId = null;
let availableDates = [];

// --- Functions ---
const generateTimeSlots = (startStr, endStr, intervalMinutes) => {
    const slots = [];
    const [startHour, startMinute] = startStr.split(':').map(Number);
    const [endHour, endMinute] = endStr.split(':').map(Number);
    let d = new Date();
    d.setHours(startHour, startMinute, 0, 0);
    const endDate = new Date();
    endDate.setHours(endHour, endMinute, 0, 0);
    while (d <= endDate) {
        const hourStr = String(d.getHours()).padStart(2, '0');
        const minuteStr = String(d.getMinutes()).padStart(2, '0');
        slots.push(`${hourStr}:${minuteStr}`);
        d.setMinutes(d.getMinutes() + intervalMinutes);
    }
    return slots;
};

const parseDateTime = (slotString) => {
    if (!slotString) return { date: null, time: null, fullDate: null };
    const dateMatch = slotString.match(/(วันที่|วันที) \d+ มกราคม/);
    const datePart = dateMatch ? dateMatch[0].replace('วันที', 'วันที่') : null;
    const timeMatch = slotString.match(/(\d{2}[.:]\d{2})/);
    const timePart = timeMatch ? timeMatch[0] : null;
    let fullDate = null;
    if (datePart && timePart) {
        const day = parseInt(datePart.match(/\d+/)[0], 10);
        const [hour, minute] = timePart.split(/[.:]/).map(Number);
        const now = new Date();
        fullDate = new Date(now.getFullYear(), 0, day, hour, minute); // 0 = January
    }
    return { date: datePart, time: timePart, fullDate: fullDate };
};

const getSelectedDate = () => {
    const checkedRadio = dateSwitchContainer.querySelector('input[name="date-select"]:checked');
    return checkedRadio ? checkedRadio.value : null;
};

// ================================================
// [ Dashboard ]
// ⭐️ [Updated] Add .called-in-table class ⭐️
// ================================================
const renderTimeslotDashboard = () => {
    const selectedDate = getSelectedDate();
    if (!selectedDate) {
        timeslotDashboard.innerHTML = '<p>กรุณาเลือกวันเพื่อแสดงตาราง</p>';
        return;
    }

    const dataTimes = [...new Set(
        allData
            .filter(app => !app.Online)
            .map(app => app.interviewSlot)
            .filter(Boolean)
            .filter(slot => slot.includes(selectedDate))
            .map(slot => {
                const parsedTime = parseDateTime(slot).time;
                return parsedTime ? parsedTime.replace('.', ':') : null;
            })
    )].filter(Boolean);

    const generatedTimes = generateTimeSlots('16:30', '20:30', 20);
    const allTimeSet = new Set([...dataTimes, ...generatedTimes]);
    const excludedTimes = ['18:50', '19:10', '19:30', '19:50', '20:10', '20:30'];
    const sortedTimes = Array.from(allTimeSet)
                      .sort((a,b) => a.localeCompare(b))
                      .filter(time => !excludedTimes.includes(time));
    const tables = Array.from({ length: 9 }, (_, i) => i + 1);
    const now = new Date();

    let tableHTML = '<table><thead><tr><th>โต๊ะ \\ เวลา</th>';
    sortedTimes.forEach(time => {
        const { fullDate } = parseDateTime(`${selectedDate} ${time}`);
        const endTime = fullDate ? new Date(fullDate.getTime() + 20 * 60000) : null;
        const isCurrentSlot = fullDate && now >= fullDate && now < endTime;
        tableHTML += `<th class="${isCurrentSlot ? 'current-slot-header' : ''}">${time}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    tables.forEach(tableNum => {
        tableHTML += `<tr><td><strong>โต๊ะ ${tableNum}</strong></td>`;
        sortedTimes.forEach(time => {
            const timePattern = time.replace(':', '[.:]');
            const slotStartPattern = `${selectedDate}.*${timePattern}`;

            const applicant = allData.find(app =>
                app.table === tableNum &&
                app.interviewSlot &&
                new RegExp(slotStartPattern, 'i').test(app.interviewSlot)
            );

            const slotForCell = applicant ? applicant.interviewSlot : `${selectedDate} ${time}`;
            const cellAttributes = `data-table="${tableNum}" data-slot="${slotForCell}"`;
            if (applicant) {
                // ⭐️ Build list of classes ⭐️
                let statusClasses = ['busy'];
                if (applicant.isForfeited) { // ⭐️ 1. เช็กสละสิทธิ์ก่อน (สำคัญสุด)
                    statusClasses.push('forfeited-in-table');
                } else if (applicant.Online) { // 2. เช็ก Online
                    statusClasses.push('online-in-table');
                } else if (applicant.status === 'Arrived') { // 3. เช็ก Arrived
                    statusClasses.push('arrived-in-table');
                } else if (applicant.status === 'Pending' && applicant.isCalled) { // ⭐️ Check for called status here ⭐️
                    statusClasses.push('called-in-table');
                }

                tableHTML += `<td class="${statusClasses.join(' ')}" ${cellAttributes} data-applicant-id="${applicant.id}" draggable="true">${applicant.nickname} ${applicant.Online ? '⭐️' : ''}</td>`;
            } else {
                tableHTML += `<td class="available" ${cellAttributes}>ว่าง</td>`;
            }
        });
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';
    timeslotDashboard.innerHTML = tableHTML;
};
// ⭐️ [End Update] ⭐️

// ================================================
// [ Check-in Board ]
// ================================================
const renderCheckinBoard = () => {
    pendingList.innerHTML = '';
    arrivedList.innerHTML = '';
    onlineList.innerHTML = '';

    const searchTerm = searchBox.value.toLowerCase();
    const selectedSlot = filterSlot.value;
    const selectedStatus = filterStatus.value;

    const filteredData = allData.filter(app => {
        const nameFacultyMatch = `${app.firstName} ${app.lastName} ${app.nickname} ${app.faculty}`.toLowerCase();
        const matchesSearch = nameFacultyMatch.includes(searchTerm);
        const slotToCompare = app.Online ? 'Online Special' : app.interviewSlot;
        const matchesSlot = selectedSlot === 'all' || slotToCompare === selectedSlot;
        const statusToCompare = app.Online ? 'Online' : app.status;
        const matchesStatus = selectedStatus === 'all' || statusToCompare === selectedStatus;
        return matchesSearch && matchesSlot && matchesStatus;
    });

    const allTimeSlots = [...new Set(
        allData
            .filter(a => !a.Online && a.interviewSlot)
            .map(a => a.interviewSlot)
    )].sort((a, b) => {
        const parsedA = parseDateTime(a);
        const parsedB = parseDateTime(b);
        if (parsedA.fullDate && parsedB.fullDate) return parsedA.fullDate - parsedB.fullDate;
        return a.localeCompare(b);
    });

    const slotsByDate = allTimeSlots.reduce((acc, slot) => {
        const date = parseDateTime(slot).date;
        if (!date) return acc;
        if (!acc[date]) acc[date] = [];
        acc[date].push(slot);
        return acc;
    }, {});

    const sortedDates = Object.keys(slotsByDate).sort((a, b) => {
         const dayA = parseInt(a.match(/\d+/)[0], 10);
         const dayB = parseInt(b.match(/\d+/)[0], 10);
         return dayA - dayB;
    });

    filteredData.forEach(app => {
        let slotOptionsHTML = '<option value="">-- ย้ายรอบ --</option>';
        sortedDates.forEach(date => {
            slotOptionsHTML += `<optgroup label="${date}">`;
            slotsByDate[date].forEach(slot => {
                const isSelected = (slot === app.interviewSlot);
                const time = parseDateTime(slot).time || 'N/A';
                slotOptionsHTML += `<option value="${slot}" ${isSelected ? 'selected' : ''}>${time}</option>`;
            });
            slotOptionsHTML += `</optgroup>`;
        });

        const card = document.createElement('div');
        card.className = `staff-card ${app.Online ? 'online' : app.status.toLowerCase()}`;
        card.dataset.id = app.id;
        if (app.isForfeited) { // ⭐️ 1. เช็กสละสิทธิ์ก่อน
            card.classList.add('forfeited');
        } else if (app.status === 'Pending' && app.isCalled) { // 2. ค่อยเช็ก Called
            card.classList.add('called');
        }
        
        const displaySlot = app.Online ? 'Online Special' : (app.interviewSlot || 'ยังไม่กำหนดรอบ');

        card.innerHTML = `
            <div class="card-main-info">
                <h4>${app.firstName} ${app.lastName} (${app.nickname}) ${app.Online ? '⭐️' : ''}</h4>
                <p>${app.faculty} - ${app.year}</p>
                <p class="interview-slot">รอบ: ${displaySlot}</p>
            </div>
            <div class="card-actions">
                ${!app.Online ? `
                <div class="action-item">
                    <label>ย้ายรอบ:</label>
                    <select class="slot-select-dropdown">${slotOptionsHTML}</select>
                </div>
                <div class="action-item">
                    <label>โต๊ะ:</label>
                    <select class="table-select-dropdown">${[1,2,3,4,5,6,7,8,9].map(n => `<option value="${n}" ${n === app.table ? 'selected' : ''}>${n}</option>`).join('')}</select>
                </div>` : '<p style="font-size: 12px; color: purple; text-align: right;"><i>Online Interview</i></p>'
                }
                <div class="action-item">${!app.Online && app.status === 'Pending' ? `<button class="check-in-btn">Check-in</button>` : ''}</div>
                <div class="action-item">${!app.Online && app.status === 'Arrived' ? `<button class="undo-check-in-btn">ยกเลิก Check-in</button>` : ''}</div>
            </div>`;

        if (app.Online) {
            onlineList.appendChild(card);
        } else if (app.status === 'Pending') {
            pendingList.appendChild(card);
        } else { // Arrived
            arrivedList.appendChild(card);
        }
    });

    pendingCountEl.textContent = allData.filter(a => !a.Online && a.status === 'Pending').length;
    arrivedCountEl.textContent = allData.filter(a => !a.Online && a.status === 'Arrived').length;
    onlineCountEl.textContent = allData.filter(a => a.Online).length;
};
// ================================================

const populateFilters = () => {
    availableDates = [...new Set(allData.filter(a => !a.Online).map(app => parseDateTime(app.interviewSlot).date))].filter(Boolean);
    let isAnyRadioChecked = dateSwitchContainer.querySelector('input[name="date-select"]:checked');
    if (!isAnyRadioChecked && availableDates.length > 0) {
        const firstDateWithValue = availableDates[0];
        const radioToSelect = dateSwitchContainer.querySelector(`input[name="date-select"][value="${firstDateWithValue}"]`);
        if (radioToSelect) radioToSelect.checked = true;
        else {
            const firstRadio = dateSwitchContainer.querySelector('input[name="date-select"]');
            if (firstRadio) firstRadio.checked = true;
        }
    } else if (!isAnyRadioChecked && availableDates.length === 0) {
         const firstRadio = dateSwitchContainer.querySelector('input[name="date-select"]');
         if (firstRadio) firstRadio.checked = true;
    }

    const slots = [...new Set(allData.filter(a => !a.Online).map(app => app.interviewSlot))].filter(Boolean).sort();
    const currentValSlot = filterSlot.value;
    while (filterSlot.options.length > 1) filterSlot.remove(1);
    const onlineOptionSlot = document.createElement('option');
    onlineOptionSlot.value = 'Online Special';
    onlineOptionSlot.textContent = 'Online Special';
    filterSlot.appendChild(onlineOptionSlot);
    slots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        filterSlot.appendChild(option);
    });
    if (currentValSlot) filterSlot.value = currentValSlot;
    const currentValStatus = filterStatus.value;
     if (!filterStatus.querySelector('option[value="Online"]')) {
         const onlineOptionStatus = document.createElement('option');
         onlineOptionStatus.value = 'Online';
         onlineOptionStatus.textContent = 'Online';
         filterStatus.appendChild(onlineOptionStatus);
     }
     if (currentValStatus) filterStatus.value = currentValStatus;
};

const handleAction = (e) => {
    const card = e.target.closest('.staff-card');
    if (!card) return;
    const id = parseInt(card.dataset.id, 10);
    const applicant = allData.find(app => app.id === id);

    if (applicant && applicant.Online && (e.target.classList.contains('check-in-btn') || e.target.classList.contains('undo-check-in-btn') || e.target.classList.contains('table-select-dropdown') || e.target.classList.contains('slot-select-dropdown'))) {
        console.warn("Cannot modify Online applicant through standard actions.");
        return;
    }
    if (e.target.classList.contains('check-in-btn')) {
        Database.updateApplicant(id, { status: 'Arrived' });
    }
    if (e.target.classList.contains('undo-check-in-btn')) {
        Database.updateApplicant(id, { status: 'Pending' });
    }
    if (e.target.classList.contains('table-select-dropdown')) {
        Database.updateApplicant(id, { table: parseInt(e.target.value, 10) });
    }
    if (e.target.classList.contains('slot-select-dropdown')) {
        const newSlot = e.target.value;
        if (newSlot && newSlot !== applicant.interviewSlot) {
            const destinationSlotData = allData.find(a => a.interviewSlot === newSlot);
            let newTable = applicant.table;
            if (destinationSlotData && destinationSlotData.table) {
                newTable = destinationSlotData.table;
            } else {
                 console.warn(`ไม่พบข้อมูลโต๊ะสำหรับรอบ: ${newSlot}. จะพยายามคงโต๊ะเดิมไว้`);
            }
            console.log(`ย้ายผู้สมัคร ${id} ไปรอบใหม่: ${newSlot} (โต๊ะ: ${newTable})`);
            Database.updateApplicant(id, {
                interviewSlot: newSlot,
                table: newTable
            });
        }
    }
};

const showApplicantModal = (applicantId) => {
    const applicant = allData.find(app => app.id === applicantId);
    if (!applicant) return;
    const isCurrentlyCalled = applicant.isCalled === true;
    const isForfeited = applicant.isForfeited === true;

    staffModalBody.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: ${isForfeited ? '#adb5bd' : '#007bff'}; ${isForfeited ? 'text-decoration: line-through;' : ''}">
                ${applicant.nickname} ${applicant.Online ? '⭐️ (Online)' : ''}
            </h2>
            </div>
        <p><strong>ชื่อจริง-นามสกุล:</strong> ${applicant.prefix} ${applicant.firstName} ${applicant.lastName}</p>
        <p><strong>คณะ:</strong> ${applicant.faculty} (${applicant.year})</p>
        <p><strong>เบอร์โทร:</strong> ${applicant.phone}</p>
        <p><strong>ช่องทางติดต่อ:</strong> ${applicant.contactOther || applicant.contactLine || 'ไม่มีข้อมูล'}</p>
        <p><strong>รอบสัมภาษณ์:</strong> ${applicant.Online ? 'Online Special' : (applicant.interviewSlot || 'N/A')}</p>

        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px; display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;">
            
            <button 
                class="${isForfeited ? 'undo-forfeit-btn' : 'forfeit-btn'} modal-action-btn" 
                data-id="${applicantId}"
                style="margin-right: auto;" /* ดันไปทางซ้าย */
            >
                ${isForfeited ? 'ยกเลิกสละสิทธิ์' : 'สละสิทธิ์'}
            </button>
        
            ${!applicant.Online && applicant.status === 'Pending' ? `
                ${isCurrentlyCalled ?
                    `<button class="undo-call-btn modal-action-btn" data-id="${applicantId}">ยกเลิกการโทร</button>` :
                    `<button class="mark-called-btn modal-action-btn" data-id="${applicantId}">โทรแล้ว</button>`
                }
            ` : ''}
        </div>
        `;
    staffInfoModal.classList.remove('hidden');
}

// --- Event Listeners ---
searchBox.addEventListener('input', renderCheckinBoard);
filterSlot.addEventListener('change', renderCheckinBoard);
filterStatus.addEventListener('change', renderCheckinBoard);

dateSwitchContainer.addEventListener('change', (e) => {
     if (e.target.type === 'radio' && e.target.name === 'date-select') {
         console.log("Date switched to:", e.target.value);
         renderTimeslotDashboard();
     }
});

document.querySelector('.staff-board').addEventListener('click', handleAction);
document.querySelector('.staff-board').addEventListener('change', handleAction);

staffInfoModal.addEventListener('click', (e) => {
    if (e.target === staffInfoModal || e.target.classList.contains('modal-close-btn')) {
        staffInfoModal.classList.add('hidden');
        return;
    }
    if (e.target.classList.contains('mark-called-btn')) {
        const id = parseInt(e.target.dataset.id, 10);
        if (id) {
            console.log(`Marking applicant ${id} as called.`);
            Database.updateApplicant(id, { isCalled: true });
            staffInfoModal.classList.add('hidden');
        }
    }
    if (e.target.classList.contains('undo-call-btn')) {
        const id = parseInt(e.target.dataset.id, 10);
        if (id) {
            console.log(`Undoing call for applicant ${id}.`);
            Database.updateApplicant(id, { isCalled: false });
            staffInfoModal.classList.add('hidden');
        }
    }

    if (e.target.classList.contains('forfeit-btn')) {
        if (!confirm('คุณยืนยันที่จะ "สละสิทธิ์" ผู้สมัครคนนี้ใช่หรือไม่?')) return;
        
        const id = parseInt(e.target.dataset.id, 10);
        if (id) {
            console.log(`Marking applicant ${id} as FORFEITED.`);
            Database.updateApplicant(id, { isForfeited: true });
            staffInfoModal.classList.add('hidden');
        }
    }

    // ⭐️ [เพิ่มใหม่] Logic สำหรับปุ่มยกเลิกสละสิทธิ์
    if (e.target.classList.contains('undo-forfeit-btn')) {
        const id = parseInt(e.target.dataset.id, 10);
        if (id) {
            console.log(`UNDOING forfeit for applicant ${id}.`);
            Database.updateApplicant(id, { isForfeited: false });
            staffInfoModal.classList.add('hidden');
        }
    }
});


timeslotDashboard.addEventListener('click', (e) => {
     const targetCell = e.target.closest('td.busy');
     if (targetCell && targetCell.dataset.applicantId) {
        showApplicantModal(parseInt(targetCell.dataset.applicantId, 10));
     }
});

// Drag and Drop listeners
timeslotDashboard.addEventListener('dragstart', (e) => {
    const targetCell = e.target.closest('td.busy');
    if (targetCell && targetCell.dataset.applicantId) {
        draggedApplicantId = parseInt(targetCell.dataset.applicantId, 10);
         const applicant = allData.find(app => app.id === draggedApplicantId);
        e.dataTransfer.setData('text/plain', draggedApplicantId);
        setTimeout(() => targetCell.classList.add('dragging'), 0);
    } else {
         e.preventDefault();
    }
});
timeslotDashboard.addEventListener('dragend', (e) => e.target.closest('td')?.classList.remove('dragging'));
timeslotDashboard.addEventListener('dragover', (e) => {
    e.preventDefault();
    const targetCell = e.target.closest('td');
    if (targetCell && targetCell.classList.contains('available')) {
        targetCell.classList.add('drag-over');
    }
});
timeslotDashboard.addEventListener('dragleave', (e) => e.target.closest('td')?.classList.remove('drag-over'));
timeslotDashboard.addEventListener('drop', (e) => {
    e.preventDefault();
    const targetCell = e.target.closest('td');
    if (targetCell) {
        targetCell.classList.remove('drag-over');
        if (!targetCell.classList.contains('available')) return alert('ไม่สามารถย้ายไปยังช่องที่มีผู้สมัครอื่นอยู่แล้วได้');
        const newTable = parseInt(targetCell.dataset.table, 10);
        const newDate = getSelectedDate();
        const newTimeMatch = targetCell.dataset.slot.match(/(\d{2}[.:]\d{2})/);
        const newTime = newTimeMatch ? newTimeMatch[0] : null;
        if (draggedApplicantId && newTable && newDate && newTime) {
            const newSlot = `${newDate} ${newTime}`;
            Database.updateApplicant(draggedApplicantId, { table: newTable, interviewSlot: newSlot });
        } else {
            console.error("Drop failed: Missing data for update.", { draggedApplicantId, newTable, newDate, newTime });
        }
        draggedApplicantId = null;
    }
});

// --- Real-time Listener ---
console.log("[staff.js] กำลังรอรับข้อมูล...");
Database.onDataChange(newData => {
    console.log(`[staff.js] ได้รับข้อมูลใหม่! มีทั้งหมด: ${newData.length} รายการ`);
    allData = newData;
    populateFilters();
    renderCheckinBoard();
    renderTimeslotDashboard();
});