// staff.js (เวอร์ชันอัปเดต: ใช้ Date Switch แทน Dropdown)

document.addEventListener('DOMContentLoaded', () => {
    try {
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
        // --- [ ⭐️ แก้ไข ⭐️ ] ---
        // เปลี่ยนจาก dateFilter (select) เป็น dateSwitchContainer (div)
        const dateSwitchContainer = document.getElementById('date-switch-container');
        // --- [ ⭐️ จบ ⭐️ ] ---
        const staffInfoModal = document.getElementById('staff-info-modal');
        const staffModalBody = document.getElementById('staff-modal-body');

        // ตรวจสอบ Element สำคัญ (ใช้ dateSwitchContainer แทน dateFilter)
        if (!pendingList || !arrivedList || !onlineList || !dateSwitchContainer) {
            console.error("Critical elements are missing from the page. Aborting script.");
            return;
        }

        // --- State ---
        let allData = [];
        let draggedApplicantId = null;
        let availableDates = []; // เก็บวันที่ทั้งหมดที่มี

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
            const dateMatch = slotString.match(/(วันที่|วันที) \d+ ตุลาคม/);
            const datePart = dateMatch ? dateMatch[0].replace('วันที', 'วันที่') : null;
            const timeMatch = slotString.match(/(\d{2}[.:]\d{2})/);
            const timePart = timeMatch ? timeMatch[0] : null;
            let fullDate = null;
            if (datePart && timePart) {
                const day = parseInt(datePart.match(/\d+/)[0], 10);
                const [hour, minute] = timePart.split(/[.:]/).map(Number);
                const now = new Date();
                fullDate = new Date(now.getFullYear(), 9, day, hour, minute); // 9 = ตุลาคม
            }
            return { date: datePart, time: timePart, fullDate: fullDate };
        };

        // --- [ ⭐️ ใหม่ ⭐️ ] ---
        // ฟังก์ชันสำหรับอ่านค่าวันที่ที่ถูกเลือกจาก Radio Buttons
        const getSelectedDate = () => {
            const checkedRadio = dateSwitchContainer.querySelector('input[name="date-select"]:checked');
            return checkedRadio ? checkedRadio.value : null;
        };
        // --- [ ⭐️ จบ ⭐️ ] ---

        const renderTimeslotDashboard = () => {
            // --- [ ⭐️ แก้ไข ⭐️ ] ---
            // อ่านค่าวันที่จาก getSelectedDate() แทน dateFilter.value
            const selectedDate = getSelectedDate();
            // --- [ ⭐️ จบ ⭐️ ] ---
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
            const allTimesSet = new Set([...dataTimes, ...generatedTimes]);
            const excludedTimes = ['18:50', '19:10', '19:30', '19:50', '20:10', '20:30'];
            const sortedTimes = Array.from(allTimesSet)
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
                        !app.Online &&
                        app.table === tableNum &&
                        app.interviewSlot &&
                        new RegExp(slotStartPattern, 'i').test(app.interviewSlot)
                    );

                    const slotForCell = applicant ? applicant.interviewSlot : `${selectedDate} ${time}`;
                    const cellAttributes = `data-table="${tableNum}" data-slot="${slotForCell}"`;
                    if (applicant) {
                        const statusClass = applicant.status === 'Arrived' ? 'arrived-in-table' : '';
                        tableHTML += `<td class="busy ${statusClass}" ${cellAttributes} data-applicant-id="${applicant.id}" draggable="true">${applicant.nickname}</td>`;
                    } else {
                        tableHTML += `<td class="available" ${cellAttributes}>ว่าง</td>`;
                    }
                });
                tableHTML += '</tr>';
            });
            tableHTML += '</tbody></table>';
            timeslotDashboard.innerHTML = tableHTML;
        };

        const renderCheckinBoard = () => { // ไม่ต้องรับ allDates แล้ว เพราะจะกรองตาม selectedDate ทีหลัง
            pendingList.innerHTML = '';
            arrivedList.innerHTML = '';
            onlineList.innerHTML = '';
            const searchTerm = searchBox.value.toLowerCase();
            const selectedSlot = filterSlot.value;
            const selectedStatus = filterStatus.value;
            // --- [ ⭐️ แก้ไข ⭐️ ] ---
            // อ่านค่าวันที่จาก getSelectedDate()
            const selectedDate = getSelectedDate();
            // --- [ ⭐️ จบ ⭐️ ] ---

            // กรองข้อมูลตาม selectedDate ก่อน ถ้ามีค่า (Online ไม่ต้องกรอง)
            const dateFilteredData = selectedDate ?
                allData.filter(app => app.Online || (parseDateTime(app.interviewSlot).date === selectedDate))
                : allData; // ถ้าไม่มี selectedDate ก็แสดงทั้งหมด (ไม่ควรเกิดขึ้นกับ radio)

            // กรองข้อมูลตาม Search, Slot, Status
            const filteredData = dateFilteredData.filter(app => {
                const nameFacultyMatch = `${app.firstName} ${app.lastName} ${app.nickname} ${app.faculty}`.toLowerCase();
                const matchesSearch = nameFacultyMatch.includes(searchTerm);

                const slotToCompare = app.Online ? 'Online Special' : app.interviewSlot;
                const matchesSlot = selectedSlot === 'all' || slotToCompare === selectedSlot || (app.Online && selectedSlot === 'Online Special');

                const statusToCompare = app.Online ? 'Online' : app.status;
                const matchesStatus = selectedStatus === 'all' || statusToCompare === selectedStatus;

                return matchesSearch && matchesSlot && matchesStatus;
            });

            // สร้าง Card และแยกใส่ List (เหมือนเดิม)
            filteredData.forEach(app => {
                const currentDate = parseDateTime(app.interviewSlot).date;
                // ใช้ availableDates ที่เก็บไว้ตอน populateFilters
                const dateOptions = availableDates.length > 0 ?
                    availableDates.map(date =>
                        `<option value="${date}" ${date === currentDate ? 'selected' : ''}>${date || 'N/A'}</option>`
                    ).join('') :
                    `<option value="">${currentDate || 'N/A'}</option>`;

                const card = document.createElement('div');
                card.className = `staff-card ${app.Online ? 'online' : app.status.toLowerCase()}`;
                card.dataset.id = app.id;
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
                            <label>วันที่:</label>
                            <select class="date-select-dropdown">${dateOptions}</select>
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
                } else {
                    arrivedList.appendChild(card);
                }
            });

            // อัปเดตการนับจำนวน (เหมือนเดิม)
            pendingCountEl.textContent = allData.filter(a => !a.Online && a.status === 'Pending').length;
            arrivedCountEl.textContent = allData.filter(a => !a.Online && a.status === 'Arrived').length;
            onlineCountEl.textContent = allData.filter(a => a.Online).length;
        };

        const populateFilters = () => { // ไม่ต้องรับ allDates แล้ว
            // --- [ ⭐️ แก้ไข ⭐️ ] ---
            // ดึงวันที่จาก allData มาเก็บไว้ใน availableDates
            availableDates = [...new Set(allData.filter(a => !a.Online).map(app => parseDateTime(app.interviewSlot).date))].filter(Boolean);
            // ไม่ต้องสร้าง options ให้ dateFilter แล้ว
            // ตรวจสอบว่ามี radio button ที่ checked หรือไม่ ถ้าไม่มีให้ check อันแรก
            if (!dateSwitchContainer.querySelector('input[name="date-select"]:checked') && availableDates.length > 0) {
                 const firstRadio = dateSwitchContainer.querySelector('input[name="date-select"]');
                 if (firstRadio) firstRadio.checked = true;
            }
            // --- [ ⭐️ จบ ⭐️ ] ---

            // Populate Filter Slot และ Status (เหมือนเดิม)
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
            // (โค้ดส่วนนี้เหมือนเดิม)
            const card = e.target.closest('.staff-card');
            if (!card) return;
            const id = parseInt(card.dataset.id, 10);
            const applicant = allData.find(app => app.id === id);

            if (applicant && applicant.Online && (e.target.classList.contains('check-in-btn') || e.target.classList.contains('undo-check-in-btn') || e.target.classList.contains('table-select-dropdown') || e.target.classList.contains('date-select-dropdown'))) {
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
            if (e.target.classList.contains('date-select-dropdown')) {
                const newDate = e.target.value;
                if (applicant && applicant.interviewSlot) {
                    const { time } = parseDateTime(applicant.interviewSlot);
                    if (time) {
                        const newSlot = `${newDate} ${time}`;
                        Database.updateApplicant(id, { interviewSlot: newSlot });
                    } else {
                        console.warn(`Applicant ${id} has no time part in their slot "${applicant.interviewSlot}". Cannot update date.`);
                    }
                }
            }
        };

        const showApplicantModal = (applicantId) => {
            // (โค้ดส่วนนี้เหมือนเดิม)
            const applicant = allData.find(app => app.id === applicantId);
            if (!applicant) return;
            staffModalBody.innerHTML = `
                <h2>${applicant.nickname} ${applicant.Online ? '⭐️ (Online)' : ''}</h2>
                <p><strong>ชื่อจริง-นามสกุล:</strong> ${applicant.prefix} ${applicant.firstName} ${applicant.lastName}</p>
                <p><strong>คณะ:</strong> ${applicant.faculty} (${applicant.year})</p>
                <p><strong>เบอร์โทร:</strong> ${applicant.phone}</p>
                <p><strong>ช่องทางติดต่อ:</strong> ${applicant.contactOther || applicant.contactLine || 'ไม่มีข้อมูล'}</p>
                <p><strong>รอบสัมภาษณ์:</strong> ${applicant.Online ? 'Online Special' : (applicant.interviewSlot || 'N/A')}</p>
            `;
            staffInfoModal.classList.remove('hidden');
        }

        // --- Event Listeners ---
        // (ลบ getDates() ออก ไม่ต้องส่ง date ไป renderCheckinBoard แล้ว)
        searchBox.addEventListener('input', renderCheckinBoard);
        filterSlot.addEventListener('change', renderCheckinBoard);
        filterStatus.addEventListener('change', renderCheckinBoard);

        // --- [ ⭐️ แก้ไข ⭐️ ] ---
        // เปลี่ยน Event Listener จาก dateFilter เป็น dateSwitchContainer
        dateSwitchContainer.addEventListener('change', (e) => {
             if (e.target.type === 'radio' && e.target.name === 'date-select') {
                 console.log("Date switched to:", e.target.value);
                 renderTimeslotDashboard(); // อัปเดตตาราง
                 renderCheckinBoard();     // อัปเดตบอร์ด
             }
        });
        // --- [ ⭐️ จบ ⭐️ ] ---

        document.querySelector('.staff-board').addEventListener('click', handleAction);
        document.querySelector('.staff-board').addEventListener('change', handleAction);
        staffInfoModal.addEventListener('click', (e) => {
            if (e.target === staffInfoModal || e.target.classList.contains('modal-close-btn')) staffInfoModal.classList.add('hidden');
        });
        timeslotDashboard.addEventListener('click', (e) => {
             const targetCell = e.target.closest('td.busy');
             if (targetCell && targetCell.dataset.applicantId) {
                showApplicantModal(parseInt(targetCell.dataset.applicantId, 10));
             }
        });

        // Drag and Drop listeners (เหมือนเดิม)
        timeslotDashboard.addEventListener('dragstart', (e) => {
            const targetCell = e.target.closest('td.busy');
            if (targetCell && targetCell.dataset.applicantId) {
                draggedApplicantId = parseInt(targetCell.dataset.applicantId, 10);
                 const applicant = allData.find(app => app.id === draggedApplicantId);
                 if (applicant && applicant.Online) {
                     e.preventDefault();
                     draggedApplicantId = null;
                     console.warn("Cannot drag Online applicant.");
                     return;
                 }
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
                // --- [ ⭐️ แก้ไข ⭐️ ] ---
                // อ่านวันที่จาก getSelectedDate() แทน dateFilter.value
                const newDate = getSelectedDate();
                // --- [ ⭐️ จบ ⭐️ ] ---
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

        // --- Real-time Listener (ปรับปรุง) ---
        console.log("[staff.js] กำลังรอรับข้อมูล...");
        Database.onDataChange(newData => {
            console.log(`[staff.js] ได้รับข้อมูลใหม่! มีทั้งหมด: ${newData.length} รายการ`);
            allData = newData;

            populateFilters();       // สร้าง Filter ต่างๆ (รวมถึงเช็ค radio button)
            renderCheckinBoard();    // แสดงผล Board ตามวันที่เลือก (หรือวันแรก)
            renderTimeslotDashboard(); // แสดงผลตารางตามวันที่เลือก (หรือวันแรก)
        });

    } catch (error) {
        console.error("เกิดข้อผิดพลาดร้ายแรงใน staff.js:", error);
        document.body.innerHTML = `<div style="padding: 20px;"><h1>เกิดข้อผิดพลาด</h1><p>มีปัญหาในการโหลดสคริปต์ของหน้า Staff กรุณาตรวจสอบ Console (F12) เพื่อดูรายละเอียด</p><pre>${error.stack}</pre></div>`;
    }
});