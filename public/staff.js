// staff.js (เวอร์ชันแก้ไข столбецซ้ำ)

document.addEventListener('DOMContentLoaded', () => {
    try {
        // --- Elements ---
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

        if (!pendingList || !arrivedList || !dateFilter) {
            console.error("Critical elements are missing from the page. Aborting script.");
            return;
        }

        // --- State ---
        let allData = [];
        let draggedApplicantId = null;

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
            const dateMatch = slotString.match(/วันที่ \d+ มีนาคม/);
            const datePart = dateMatch ? dateMatch[0] : null;
            const timeMatch = slotString.match(/(\d{2}[.:]\d{2})/);
            const timePart = timeMatch ? timeMatch[0] : null;
            let fullDate = null;
            if (datePart && timePart) {
                const day = parseInt(datePart.match(/\d+/)[0], 10);
                const [hour, minute] = timePart.split(/[.:]/).map(Number);
                const now = new Date();
                fullDate = new Date(now.getFullYear(), 2, day, hour, minute);
            }
            return { date: datePart, time: timePart, fullDate: fullDate };
        };

        const renderTimeslotDashboard = () => {
            const selectedDate = dateFilter.value;
            if (!selectedDate) {
                timeslotDashboard.innerHTML = '<p>กรุณาเลือกวันเพื่อแสดงตาราง</p>';
                return;
            }
            
            // --- จุดที่แก้ไข ---
            // 1. ดึงเวลาจากข้อมูล และ "แปลง" รูปแบบให้เป็น HH:MM ทั้งหมด
            const dataTimes = [...new Set(
                allData
                    .map(app => app.interviewSlot)
                    .filter(Boolean)
                    .filter(slot => slot.includes(selectedDate))
                    .map(slot => {
                        const parsedTime = parseDateTime(slot).time;
                        // ถ้ามีเวลา และมีจุด "." ให้เปลี่ยนเป็น ":"
                        return parsedTime ? parsedTime.replace('.', ':') : null;
                    })
            )].filter(Boolean);

            const generatedTimes = generateTimeSlots('16:40', '19:40', 20);
            const allTimesSet = new Set([...dataTimes, ...generatedTimes]);
            const sortedTimes = Array.from(allTimesSet).sort();
            const tables = Array.from({ length: 8 }, (_, i) => i + 1);
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
                    // แปลง time กลับไปเป็น regex pattern เพื่อให้หาได้ทั้ง HH:MM และ HH.MM
                    const timePattern = time.replace(':', '[.:]');
                    const slotStartPattern = `${selectedDate} ${timePattern}`;
                    const applicant = allData.find(app =>
                        app.table === tableNum &&
                        app.interviewSlot &&
                        new RegExp(slotStartPattern).test(app.interviewSlot)
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

        const renderCheckinBoard = () => {
            pendingList.innerHTML = '';
            arrivedList.innerHTML = '';
            const searchTerm = searchBox.value.toLowerCase();
            const selectedSlot = filterSlot.value;
            const selectedStatus = filterStatus.value;
            const filteredData = allData.filter(app => {
                const matchesSearch = (app.firstName?.toLowerCase().includes(searchTerm) || app.lastName?.toLowerCase().includes(searchTerm) || app.nickname?.toLowerCase().includes(searchTerm) || app.faculty?.toLowerCase().includes(searchTerm));
                const matchesSlot = selectedSlot === 'all' || app.interviewSlot === selectedSlot;
                const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;
                return matchesSearch && matchesSlot && matchesStatus;
            });

            filteredData.forEach(app => {
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
                            <select class="table-select-dropdown">${[1,2,3,4,5,6,7,8].map(n => `<option value="${n}" ${n === app.table ? 'selected' : ''}>${n}</option>`).join('')}</select>
                        </div>
                        <div class="action-item">${app.status === 'Pending' ? `<button class="check-in-btn">Check-in</button>` : `<button class="undo-check-in-btn">ยกเลิก Check-in</button>`}</div>
                    </div>`;
                if (app.status === 'Pending') pendingList.appendChild(card);
                else arrivedList.appendChild(card);
            });
            pendingCountEl.textContent = allData.filter(a => a.status === 'Pending').length;
            arrivedCountEl.textContent = allData.filter(a => a.status === 'Arrived').length;
        };

        const populateFilters = () => {
            const dates = [...new Set(allData.map(app => parseDateTime(app.interviewSlot).date))].filter(Boolean);
            const currentValDate = dateFilter.value;
            dateFilter.innerHTML = '';
            dates.forEach(date => {
                const option = document.createElement('option');
                option.value = date;
                option.textContent = date;
                dateFilter.appendChild(option);
            });
            if (currentValDate && dates.includes(currentValDate)) dateFilter.value = currentValDate;
            
            const slots = [...new Set(allData.map(app => app.interviewSlot))].filter(Boolean).sort();
            const currentValSlot = filterSlot.value;
            while (filterSlot.options.length > 1) filterSlot.remove(1);
            slots.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot;
                option.textContent = slot;
                filterSlot.appendChild(option);
            });
            if(currentValSlot) filterSlot.value = currentValSlot;
        };

        const handleAction = (e) => {
            const card = e.target.closest('.staff-card');
            if (!card) return;
            const id = parseInt(card.dataset.id, 10);
            if (e.target.classList.contains('check-in-btn')) Database.updateApplicant(id, { status: 'Arrived' });
            if (e.target.classList.contains('undo-check-in-btn')) Database.updateApplicant(id, { status: 'Pending' });
            if (e.target.classList.contains('table-select-dropdown')) Database.updateApplicant(id, { table: parseInt(e.target.value, 10) });
        };

        const showApplicantModal = (applicantId) => {
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
        
        // --- Event Listeners ---
        searchBox.addEventListener('input', renderCheckinBoard);
        filterSlot.addEventListener('change', renderCheckinBoard);
        filterStatus.addEventListener('change', renderCheckinBoard);
        dateFilter.addEventListener('change', renderTimeslotDashboard);
        document.querySelector('.staff-board').addEventListener('click', handleAction);
        document.querySelector('.staff-board').addEventListener('change', handleAction);
        staffInfoModal.addEventListener('click', (e) => {
            if (e.target === staffInfoModal || e.target.classList.contains('modal-close-btn')) staffInfoModal.classList.add('hidden');
        });
        timeslotDashboard.addEventListener('click', (e) => {
            if (e.target.classList.contains('busy')) showApplicantModal(parseInt(e.target.dataset.applicantId, 10));
        });
        timeslotDashboard.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('busy')) {
                draggedApplicantId = parseInt(e.target.dataset.applicantId, 10);
                e.dataTransfer.setData('text/plain', draggedApplicantId);
                setTimeout(() => e.target.classList.add('dragging'), 0);
            }
        });
        timeslotDashboard.addEventListener('dragend', (e) => e.target.classList.remove('dragging'));
        timeslotDashboard.addEventListener('dragover', (e) => {
            e.preventDefault();
            const targetCell = e.target.closest('td');
            if (targetCell && !targetCell.classList.contains('busy')) targetCell.classList.add('drag-over');
        });
        timeslotDashboard.addEventListener('dragleave', (e) => e.target.closest('td')?.classList.remove('drag-over'));
        timeslotDashboard.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetCell = e.target.closest('td');
            if (targetCell) {
                targetCell.classList.remove('drag-over');
                if (targetCell.classList.contains('busy')) return alert('ไม่สามารถย้ายไปยังช่องที่มีผู้สมัครอื่นอยู่แล้วได้');
                const newTable = parseInt(targetCell.dataset.table, 10);
                const newSlot = targetCell.dataset.slot;
                if (draggedApplicantId && newTable && newSlot) {
                    Database.updateApplicant(draggedApplicantId, { table: newTable, interviewSlot: newSlot });
                }
                draggedApplicantId = null;
            }
        });

        // --- Real-time Listener ---
        console.log("[staff.js] กำลังรอรับข้อมูลจาก Firebase...");
        Database.onDataChange(newData => {
            console.log(`[staff.js] ได้รับข้อมูลใหม่! มีทั้งหมด: ${newData.length} รายการ`);
            
            allData = newData;
            
            populateFilters();
            
            renderCheckinBoard();
            renderTimeslotDashboard();
        });
        
        setInterval(renderTimeslotDashboard, 30000);

    } catch (error) {
        console.error("เกิดข้อผิดพลาดร้ายแรงใน staff.js:", error);
        document.body.innerHTML = `<div style="padding: 20px;"><h1>เกิดข้อผิดพลาด</h1><p>มีปัญหาในการโหลดสคริปต์ของหน้า Staff กรุณาตรวจสอบ Console (F12) เพื่อดูรายละเอียด</p><pre>${error.stack}</pre></div>`;
    }
});