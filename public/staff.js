// staff.js (เวอร์ชันอัปเดต - แก้บั๊ก Pop-up + ใช้ English Key)

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

        // Map สำหรับแปลง Key ภาษาอังกฤษกลับเป็นไทยเพื่อแสดงผล
        const DATE_DISPLAY_MAP = {
            "2025-10-22": "วันที่ 22 ตุลาคม",
            "2025-10-24": "วันที่ 24 ตุลาคม",
            "RESERVE": "เวลาสำรอง"
        };
        
        // (ฟังก์ชัน parseDateTime ไม่จำเป็นต้องใช้แล้ว)

        const renderTimeslotDashboard = () => {
            const selectedDate = dateFilter.value; // e.g., "2025-10-22"
            if (!selectedDate) {
                timeslotDashboard.innerHTML = '<p>กรุณาเลือกวันเพื่อแสดงตาราง</p>';
                return;
            }
            
            // Hardcode เวลาตามที่ผู้ใช้ระบุ
            const sortedTimes = [
                '16:30', '16:50', '17:10', '17:30', '17:50', '18:10', 
                '18:30', '19:00', '19:20', '19:40', '20:00', '20:20'
            ];

            const tables = Array.from({ length: 8 }, (_, i) => i + 1);
            const now = new Date();

            let tableHTML = '<table><thead><tr><th>โต๊ะ \\ เวลา</th>';
            sortedTimes.forEach(time => {
                const dateParts = selectedDate.split('-').map(Number); // [2025, 10, 22]
                const timeParts = time.split(':').map(Number); // [16, 30]
                const fullDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
                
                const endTime = fullDate ? new Date(fullDate.getTime() + 15 * 60000) : null; 
                const isCurrentSlot = fullDate && now >= fullDate && now < endTime;
                tableHTML += `<th class="${isCurrentSlot ? 'current-slot-header' : ''}">${time}</th>`;
            });
            tableHTML += '</tr></thead><tbody>';

            tables.forEach(tableNum => {
                tableHTML += `<tr><td><strong>โต๊ะ ${tableNum}</strong></td>`;
                sortedTimes.forEach(time => { // time คือ "16:30"
                    
                    // ตรรกะการค้นหาผู้สมัคร (ใช้ English Key)
                    const applicant = allData.find(app =>
                        app.table === tableNum &&
                        app.interviewDate === selectedDate && 
                        app.interviewTime === time           
                    );

                    // แก้ data attribute สำหรับลากวาง
                    const cellAttributes = `data-table="${tableNum}" data-time="${time}" data-date="${selectedDate}"`;
                    
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

        const renderCheckinBoard = (allDates) => {
            pendingList.innerHTML = '';
            arrivedList.innerHTML = '';
            const searchTerm = searchBox.value.toLowerCase();
            const selectedSlot = filterSlot.value;
            const selectedStatus = filterStatus.value;
            
            const filteredData = allData.filter(app => {
                const matchesSearch = (app.firstName?.toLowerCase().includes(searchTerm) || app.lastName?.toLowerCase().includes(searchTerm) || app.nickname?.toLowerCase().includes(searchTerm) || app.faculty?.toLowerCase().includes(searchTerm));
                const matchesSlot = selectedSlot === 'all' || app.interviewSlotOriginal === selectedSlot;
                const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;
                return matchesSearch && matchesSlot && matchesStatus;
            });

            filteredData.forEach(app => {
                const currentDateKey = app.interviewDate;
                
                const dateOptions = allDates.length > 0 ? 
                    allDates.map(dateKey => // dateKey คือ "2025-10-22"
                        `<option value="${dateKey}" ${dateKey === currentDateKey ? 'selected' : ''}>${DATE_DISPLAY_MAP[dateKey] || dateKey}</option>`
                    ).join('') : 
                    `<option value="">${DATE_DISPLAY_MAP[currentDateKey] || 'N/A'}</option>`;

                const card = document.createElement('div');
                card.className = `staff-card ${app.status.toLowerCase()}`;
                card.dataset.id = app.id;
                
                card.innerHTML = `
                    <div class="card-main-info">
                        <h4>${app.firstName} ${app.lastName} (${app.nickname})</h4>
                        <p>${app.faculty} - ${app.year}</p>
                        <p class="interview-slot">รอบ: ${app.interviewSlotOriginal}</p>
                    </div>
                    <div class="card-actions">
                        <div class="action-item">
                            <label>วันที่:</label>
                            <select class="date-select-dropdown">${dateOptions}</select>
                        </div>
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

        const populateFilters = (allDates) => {
            const dates = allDates.filter(d => d !== 'RESERVE');

            const currentValDate = dateFilter.value;
            dateFilter.innerHTML = ''; 
            
            dates.forEach(dateKey => {
                const option = document.createElement('option');
                option.value = dateKey; // "2025-10-22"
                option.textContent = DATE_DISPLAY_MAP[dateKey] || dateKey; // "วันที่ 22 ตุลาคม"
                dateFilter.appendChild(option);
            });
            
            if (currentValDate && dates.includes(currentValDate)) {
                dateFilter.value = currentValDate;
            } 
            else if (dates.length > 0) {
                dateFilter.value = dates[0]; 
            }
            
            const slots = [...new Set(allData.map(app => app.interviewSlotOriginal))].filter(Boolean).sort();
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
                const newDateKey = e.target.value; // e.g., "2025-10-24"
                const applicant = allData.find(app => app.id === id);
                
                if (applicant) {
                    const newDateDisplay = DATE_DISPLAY_MAP[newDateKey] || newDateKey; // "วันที่ 24 ตุลาคม"
                    
                    let timePart = applicant.interviewTime || ''; // "16:30"
                    
                    const timeMatch = applicant.interviewSlotOriginal.match(/(\d{2}[.:]\d{2}\s*-\s*\d{2}[.:]\d{2}\s*น\.)/);
                    if (timeMatch) {
                        timePart = timeMatch[0]; // "16.30 - 16.45 น."
                    } else if (timePart) {
                         timePart = timePart.replace(':', '.'); // "16.30"
                    } else if (applicant.interviewDate === 'RESERVE') {
                        timePart = ''; 
                    }

                    const newOriginalSlot = `${newDateDisplay} ${timePart}`.trim();

                    Database.updateApplicant(id, { 
                        interviewDate: newDateKey, 
                        interviewSlotOriginal: newOriginalSlot 
                    });
                }
            }
        };

        // ⭐️ [จุดที่แก้ไข] แก้บั๊ก lastName ⭐️
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
            staffInfoModal.classList.remove('hidden'); // บรรทัดนี้จะทำงานได้แล้ว
        }
        
        // --- Event Listeners ---
        const getDates = () => [...new Set(allData.map(app => app.interviewDate))].filter(Boolean);
        
        searchBox.addEventListener('input', () => renderCheckinBoard(getDates()));
        filterSlot.addEventListener('change', () => renderCheckinBoard(getDates()));
        filterStatus.addEventListener('change', () => renderCheckinBoard(getDates()));
        
        dateFilter.addEventListener('change', renderTimeslotDashboard);
        document.querySelector('.staff-board').addEventListener('click', handleAction);
        document.querySelector('.staff-board').addEventListener('change', handleAction);
        staffInfoModal.addEventListener('click', (e) => {
            if (e.target === staffInfoModal || e.target.classList.contains('modal-close-btn')) staffInfoModal.classList.add('hidden');
        });
        
        // Event Listener สำหรับ Pop-up (อันนี้ถูกต้องอยู่แล้ว)
        timeslotDashboard.addEventListener('click', (e) => {
            if (e.target.classList.contains('busy')) {
                showApplicantModal(parseInt(e.target.dataset.applicantId, 10));
            }
        });

        // (ตรรกะ Drag-Drop)
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
                const newTime = targetCell.dataset.time; // "17:10"
                const newDateKey = targetCell.dataset.date; // "2025-10-22"
                
                if (draggedApplicantId && newTable && newTime && newDateKey) {
                    const newDateDisplay = DATE_DISPLAY_MAP[newDateKey] || newDateKey;
                    
                    const [hour, minute] = newTime.split(':').map(Number);
                    const dateParts = newDateKey.split('-').map(Number);
                    const startDate = new Date(dateParts[0], dateParts[1]-1, dateParts[2], hour, minute);
                    const endDate = new Date(startDate.getTime() + 15 * 60000);
                    const newTimeDisplay = `${newTime.replace(':', '.')} - ${String(endDate.getHours()).padStart(2, '0')}.${String(endDate.getMinutes()).padStart(2, '0')} น.`;
                    
                    const newOriginalSlot = `${newDateDisplay} ${newTimeDisplay}`;

                    Database.updateApplicant(draggedApplicantId, {
                        table: newTable,
                        interviewDate: newDateKey,
                        interviewTime: newTime,
                        interviewSlotOriginal: newOriginalSlot
                    });
                }
                draggedApplicantId = null;
            }
        });


        // --- Real-time Listener ---
        console.log("[staff.js] กำลังรอรับข้อมูล...");
        Database.onDataChange(newData => {
            console.log(`[staff.js] ได้รับข้อมูลใหม่! มีทั้งหมด: ${newData.length} รายการ`);
            
            allData = newData; 
            const allDates = [...new Set(allData.map(app => app.interviewDate))].filter(Boolean);
            
            populateFilters(allDates);
            renderCheckinBoard(allDates);
            renderTimeslotDashboard();
        });
        
        setInterval(renderTimeslotDashboard, 30000); 

    } catch (error) {
        console.error("เกิดข้อผิดพลาดร้ายแรงใน staff.js:", error);
        document.body.innerHTML = `<div style="padding: 20px;"><h1>เกิดข้อผิดพลาด</h1><p>มีปัญหาในการโหลดสคริปต์ของหน้า Staff กรุณาตรวจสอบ Console (F12) เพื่อดูรายละเอียด</p><pre>${error.stack}</pre></div>`;
    }
});