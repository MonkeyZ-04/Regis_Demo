// public/interviewer.js (Version Update: Fully Dynamic Rendering)

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const tableSelectionView = document.getElementById('table-selection-view'); 
    const applicantListView = document.getElementById('applicant-list-view'); 
    const tableSelect = document.getElementById('table-select'); 
    const confirmTableBtn = document.getElementById('confirm-table-btn'); 
    const backToSelectionBtn = document.getElementById('back-to-selection-btn'); 
    const tableTitle = document.getElementById('table-title'); 
    const cardsContainer = document.getElementById('applicant-cards-container'); 
    const scoringViewBody = document.getElementById('scoring-view-body'); 
    const interviewDateFilter = document.getElementById('interview-date-filter'); 

    // --- State ---
    let currentTable = null;
    let allData = [];
    let unsubscribe = null;
    const LOCAL_STORAGE_KEY = 'interviewer_selected_table'; 
    let linkedApplicantId = null; 
    let initialApplicantShown = false; 

    // --- Helper Functions ---
    const parseTimeFromSlot = (slotString) => {
        if (!slotString) return 'ยังไม่ระบุเวลา';
        const timeMatch = slotString.match(/(\d{2}[.:]\d{2})/);
        return timeMatch ? timeMatch[1] : slotString;
    };

    const parseDateFromSlot = (slotString) => {
        if (!slotString) return null;
        const dateMatch = slotString.match(/(วันที่|วันที) \d+ มกราคม/);
        return dateMatch ? dateMatch[0].replace('วันที', 'วันที่') : null;
    };

    // ⭐️ Dynamic Score Dropdown Creator ⭐️
    const createScoreDropdown = (id, label, currentValue = -1, maxScore = 5) => {
        let scoreOptions = [];
        scoreOptions.push({ value: -1, text: 'N/A', class: 'score-na' });
        
        // Loop สร้างคะแนนตาม maxScore
        const step = 0.5; // หรือ 1 ตามต้องการ
        for (let i = 0; i <= maxScore; i += step) {
            // คำนวณ Class สี โดยอิงสัดส่วนคะแนนเต็ม
            let cssClass = 'score-0';
            const percentage = i / maxScore;
            
            if (percentage >= 0.9) cssClass = 'score-5';       // 90-100% -> เขียวเข้ม
            else if (percentage >= 0.7) cssClass = 'score-4';  // 70-89% -> เขียวอ่อน
            else if (percentage >= 0.5) cssClass = 'score-3';  // 50-69% -> เหลือง
            else if (percentage >= 0.3) cssClass = 'score-2';  // 30-49% -> ส้ม
            else if (i > 0) cssClass = 'score-1';              // >0 -> เทาขาว
            
            // กรณี 0 คะแนนใช้ score-0
            if (i === 0) cssClass = 'score-0';

            scoreOptions.push({ value: i, text: i.toString(), class: cssClass });
        }

        const currentNumericValue = parseFloat(currentValue);
        // หา Class เริ่มต้น
        const initialOption = scoreOptions.find(opt => opt.value == currentNumericValue);
        const initialClass = initialOption ? initialOption.class : 'score-na';
        
        const optionsHTML = scoreOptions.map(opt =>
            `<option value="${opt.value}" class="${opt.class}" ${opt.value == currentNumericValue ? 'selected' : ''}>${opt.text}</option>`
        ).join('');

        return `
            <select id="score-${id}" class="score-select ${initialClass}" data-max-score="${maxScore}" style="width: 70px; margin-left: 10px;">
                ${optionsHTML}
            </select>
        `;
    };

    const createDetailTextarea = (id, currentValue = '') => {
        return `<textarea id="detail-${id}" class="detail-textarea">${currentValue || ''}</textarea>`;
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

        const preferredDefault = "วันที่ 15 มกราคม";
        if (dates.includes(preferredDefault)) {
            interviewDateFilter.value = preferredDefault; 
        } else if (currentVal && dates.includes(currentVal)) {
            interviewDateFilter.value = currentVal; 
        } else if (dates.length > 0) {
            interviewDateFilter.value = dates[0]; 
        }
    };

    const renderApplicantCards = () => {
        if (!currentTable) return; 
        const activeApplicantId = document.querySelector('.info-card.active-card')?.dataset.applicantId;
        cardsContainer.innerHTML = ''; 
        const selectedDate = interviewDateFilter.value; 

        if (!selectedDate) {
             cardsContainer.innerHTML = '<p>กรุณาเลือกวันสัมภาษณ์</p>';
             if (!activeApplicantId) scoringViewBody.innerHTML = '<p>กรุณาเลือกผู้สมัครเพื่อดูรายละเอียด</p>';
             return;
        }

        const applicantsForTableAndDate = allData.filter(app =>
            app.table === currentTable && parseDateFromSlot(app.interviewSlot) === selectedDate
        );
        if (applicantsForTableAndDate.length === 0) {
            cardsContainer.innerHTML = '<p>ยังไม่มีผู้สมัครสำหรับโต๊ะและวันที่นี้</p>';
            if (!activeApplicantId) scoringViewBody.innerHTML = '<p>ยังไม่มีผู้สมัครสำหรับโต๊ะและวันที่นี้</p>';
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
            slotGroup.innerHTML = `<h3 class="timeslot-header">รอบเวลา: ${parseTimeFromSlot(slot)}</h3>`;
            const cardsGrid = document.createElement('div');
            cardsGrid.className = 'applicant-grid'; 

            applicantsBySlot[slot].forEach(app => {
                const card = document.createElement('div');
                let cardClasses = ['info-card']; 
                if (app.Online) cardClasses.push('online-card');
                else cardClasses.push(app.status.toLowerCase()); 
                
                if (app.isForfeited) cardClasses.push('forfeited');

                // Check completion dynamically
                let allScored = false;
                if (app.interviewScores && typeof app.interviewScores === 'object') {
                    const requiredScores = Database.config.getScoreKeys();
                    allScored = requiredScores.every(scoreKey =>
                        app.interviewScores.hasOwnProperty(scoreKey) &&
                        app.interviewScores[scoreKey] !== null &&
                        app.interviewScores[scoreKey] !== undefined &&
                        app.interviewScores[scoreKey] !== -1 // Ensure not N/A (Optional check)
                    );
                }

                if (!app.isForfeited && allScored) cardClasses.push('completed');
                if (activeApplicantId && parseInt(activeApplicantId, 10) === app.id) card.classList.add('active-card');

                card.dataset.applicantId = app.id; 
                card.innerHTML = `
                    <h4>${app.firstName} ${app.lastName} (${app.nickname})</h4>
                    <p><strong>สถานะ:</strong> ${app.isForfeited ? 'สละสิทธิ์' : app.status}</p>
                    <p><strong>คณะ:</strong> ${app.faculty}</p>
                    <p><strong>ชั้นปี:</strong> ${app.year}</p>
                `;
                card.addEventListener('click', () => {
                    if (!app.isForfeited) showScoringDetails(app.id, card);
                });
                cardsGrid.appendChild(card);
            });
            slotGroup.appendChild(cardsGrid);
            cardsContainer.appendChild(slotGroup);
        });
    };

    // ⭐️ Displays the detailed scoring form (REFACTORED TO BE DYNAMIC) ⭐️
    const showScoringDetails = (applicantId, clickedCardElement) => {
        const applicant = allData.find(a => a.id === applicantId);
        if (!applicant || applicant.isForfeited) {
             scoringViewBody.innerHTML = '<p>ไม่สามารถแสดงข้อมูลผู้ที่สละสิทธิ์แล้ว</p>';
              document.querySelectorAll('.info-card.active-card').forEach(card => card.classList.remove('active-card'));
             return;
        }
        
        const scores = applicant.interviewScores || {};
        const details = applicant.interviewDetails || {};
        
        document.querySelectorAll('.info-card.active-card').forEach(card => card.classList.remove('active-card'));
        if (clickedCardElement) clickedCardElement.classList.add('active-card');
        
        const onlineStatus = applicant.Online ? '<span style="color: purple; font-weight: bold;"> (Online Interview ⭐️)</span>' : '';
        const displaySlot = applicant.Online ? 'Online Special' : (applicant.interviewSlot || 'N/A');
        const imagePreviewHTML = applicant.applicantImage
            ? `<img src="${applicant.applicantImage}" alt="Applicant Photo">` 
            : `<p>ยังไม่มีรูปภาพ</p>`; 

        // 1. แยกคำถามตามประเภทเพื่อจัด Layout
        const appConfig = Database.config.QUESTIONS;
        const appQuestion = appConfig.find(q => q.id === 'application'); // ใบสมัคร (Top Info)
        const generalNote = appConfig.find(q => q.id === 'general');     // Note (Bottom)
        const interviewQuestions = appConfig.filter(q => q.id !== 'application' && q.id !== 'general'); // คำถามสัมภาษณ์

        // 2. สร้าง HTML สำหรับ Top Info (Grid Div 4)
        // ถ้ามี config สำหรับ application ให้สร้าง dropdown, ถ้าไม่มีก็เว้นว่าง
        let applicationScoreHTML = '';
        if (appQuestion) {
             applicationScoreHTML = `
                <p style="display: flex; align-items: center; margin-top: 10px;">
                    <strong>${appQuestion.text || 'คะแนนใบสมัคร'}:</strong>
                    ${createScoreDropdown(appQuestion.id, appQuestion.label, scores[appQuestion.id], appQuestion.maxScore)}
                </p>
                <div style="margin-top: 5px;">
                    <label for="detail-${appQuestion.id}" style="font-size: 14px; color: #555; display: block; margin-bottom: 3px;">โน้ตเกี่ยวกับใบสมัคร:</label>
                    ${createDetailTextarea(appQuestion.id, details[appQuestion.id])}
                </div>
             `;
        }

        // 3. สร้าง HTML สำหรับคำถามสัมภาษณ์ (Grid Div 6) - Loop Dynamic
        let questionsHTML = '<h3>คำถามสัมภาษณ์</h3>';
        
        interviewQuestions.forEach(q => {
            // Check styles
            let itemClass = 'interview-question-item';
            if (q.isSubQuestion) itemClass += ' sub-question';
            if (q.isSpecial) itemClass += ' special-question';

            // Check choices (bullet points)
            let choicesHTML = '';
            if (q.choices && Array.isArray(q.choices)) {
                choicesHTML = `<small><i><ul>${q.choices.map(c => `<li>${c}</li>`).join('')}</ul></i></small>`;
            }

            // Text Color
            let textStyle = q.isSpecial ? 'color: #007bff;' : '';

            // Build Left Side (Text + Score)
            let leftSide = `
                <div class="question-text">
                    <p style="${textStyle}"><strong>${q.label})</strong> ${q.text || ''} ${choicesHTML}</p>
                    ${q.type.includes('score') ? createScoreDropdown(q.id, q.label, scores[q.id], q.maxScore || 5) : ''}
                </div>
            `;

            // Build Right Side (Detail/Textarea)
            // Special Case: ถ้าเป็น score_only อาจจะจัด Layout ต่าง (แต่ในที่นี้ใช้ Grid เดิม)
            let rightSideClass = 'question-input-area';
            if (q.type === 'score_only') rightSideClass += ' score-only';

            let rightSide = `
                 <div class="${rightSideClass}">
                    ${createDetailTextarea(q.id, details[q.id])}
                 </div>
            `;

            questionsHTML += `
                <div class="${itemClass}">
                    ${leftSide}
                    ${rightSide}
                </div>
            `;
        });

        // 4. สร้าง HTML สำหรับ General Note (Bottom)
        let generalNoteHTML = '';
        if (generalNote) {
            generalNoteHTML = `
                <div style="margin-top: 20px; margin-bottom: 20px;">
                    <label for="detail-${generalNote.id}" style="font-size: 16px; font-weight: bold; color: #333; display: block; margin-bottom: 8px;">${generalNote.text}:</label>
                    ${createDetailTextarea(generalNote.id, details[generalNote.id])}
                </div>
            `;
        }

        // 5. ประกอบร่างทั้งหมด
        if (scoringViewBody) {
            scoringViewBody.innerHTML = `
                <div class="applicant-details-grid-parent">
 
                    <div class="grid-div1"><h2>${applicant.firstName} ${applicant.lastName} (${applicant.nickname})${onlineStatus}</h2></div>
                
                    <div class="grid-div4"><div class="details-info-p-tags">
                        <p><strong>อีเมล:</strong> ${applicant.email || '-'}</p>
                        <p><strong>เบอร์โทร:</strong> ${applicant.phone || '-'}</p>
                        <p><strong>Line ID:</strong> ${applicant.contactLine || '-'}</p>
                        <p><strong>ติดต่อสำรอง:</strong> ${applicant.contactOther || '-'}</p>
                        <p><strong>รอบสัมภาษณ์:</strong> ${displaySlot}</p>
                        <p><a href="${applicant.applicationUrl}" target="_blank" rel="noopener noreferrer">ดูใบสมัคร (PDF)</a></p>
                       
                        ${applicationScoreHTML}
                    </div></div>
                    
                    <div class="grid-div5"><div class="details-image-area">
                        <h3>รูปภาพประกอบ</h3>
                        <div id="image-preview-container">${imagePreviewHTML}</div>
                        <progress id="upload-progress" value="0" max="100" style="width: 100%; display: none;"></progress> 
                        <input type="file" id="applicant-image-upload" accept="image/*" style="display: none;" data-id="${applicant.id}"> 
                        <button type="button" id="upload-image-btn" class="image-btn upload">อัปโหลดรูป</button> 
                    </div></div>
         
                    <div class="grid-div6">
                        <form id="scoring-form" data-id="${applicant.id}">
                            ${questionsHTML}
                            
                            ${generalNoteHTML}

                            <hr>
                            <div class="closing-remarks">
                                <h4>สิ่งที่ควรบอก / Concerns:</h4>
                                <ul><li>การเวียนโครง (โอเคมั้ย?)</li><li>การเดินทางไกล/นาน/โค้งเยอะ (ไหวมั้ย? กังวล?)</li><li>แมลง (แมงมุม, กิ้งกือ, ตะขาบ)</li><li>ห้องน้ำไม่สะดวกสบาย</li><li>ผู้สมัครมีข้อกังวลอื่น ๆ ?</li></ul>
                                <h4>ข้อมูลเพิ่มเติม:</h4>
                                <ul><li>รับลูกค่าย 11-13 คน</li><li>ประกาศผลวันที่ 18 มกราคม</li><li>จะโทรไปแจ้งหากติดค่าย</li><li>ถ้าติดค่ายมีค่าใช้จ่าย 300 บาท</li></ul>
                                <p><strong>สุดท้ายแล้ว อย่าลืมขอบคุณที่มาสัมภาษณ์ด้วยคับ 💗</strong></p>
                            </div>
                            <button type="submit">บันทึกข้อมูลสัมภาษณ์</button>
                        </form>
                    </div>
                </div>
            `;
        } else {
             console.error("Element with ID 'scoring-view-body' not found!");
             alert("เกิดข้อผิดพลาด: ไม่พบส่วนแสดงรายละเอียด (scoring-view-body)");
        }
    };

    const showApplicantListView = (tableNumber) => {
        currentTable = tableNumber;
        tableTitle.textContent = `รายชื่อผู้สมัครโต๊ะ ${currentTable}`;
        tableSelectionView.classList.add('hidden'); 
        applicantListView.classList.remove('hidden'); 

        if (unsubscribe) unsubscribe();
        unsubscribe = Database.onDataChange(newData => {
            const isFirstLoad = allData.length === 0;
            allData = newData; 

            if (isFirstLoad) populateDateFilter(); 
            renderApplicantCards(); 

            // --- Attempt to show linked applicant after cards are rendered ---
            if (linkedApplicantId && !initialApplicantShown && allData.length > 0) {
                const applicantToShow = allData.find(app => app.id == linkedApplicantId); 
                if (applicantToShow && !applicantToShow.isForfeited) { 
                    const applicantDate = parseDateFromSlot(applicantToShow.interviewSlot);
                    const selectedDate = interviewDateFilter.value;

                    if (applicantDate && applicantDate !== selectedDate) {
                        const dateOptionExists = Array.from(interviewDateFilter.options).some(option => option.value === applicantDate);
                        if (dateOptionExists) interviewDateFilter.value = applicantDate;
                        renderApplicantCards(); // Re-render with correct date
                    }
                    
                    // Delay slightly to ensure DOM is ready
                    setTimeout(() => {
                        const cardElement = cardsContainer.querySelector(`.info-card[data-applicant-id="${linkedApplicantId}"]`);
                        if (cardElement) showScoringDetails(applicantToShow.id, cardElement);
                        initialApplicantShown = true; 
                    }, 50);

                } else if (applicantToShow && applicantToShow.isForfeited) {
                    if(scoringViewBody) scoringViewBody.innerHTML = `<p>ผู้สมัคร ID ${linkedApplicantId} ได้สละสิทธิ์แล้ว</p>`;
                    initialApplicantShown = true;
                } else {
                    if(scoringViewBody) scoringViewBody.innerHTML = `<p>ไม่พบข้อมูลผู้สมัคร ID ${linkedApplicantId}</p>`;
                    initialApplicantShown = true;
                }
            }
        });
    };

    // --- Event Listeners ---

    confirmTableBtn.addEventListener('click', () => {
        const selectedTable = parseInt(tableSelect.value, 10);
        if (selectedTable) {
            localStorage.setItem(LOCAL_STORAGE_KEY, selectedTable.toString()); 
            linkedApplicantId = null; 
            initialApplicantShown = false;
            showApplicantListView(selectedTable); 
        }
    });

    backToSelectionBtn.addEventListener('click', () => {
        localStorage.removeItem(LOCAL_STORAGE_KEY); 
        linkedApplicantId = null; 
        initialApplicantShown = false;
        currentTable = null;
        allData = [];
        tableSelectionView.classList.remove('hidden');
        applicantListView.classList.add('hidden');
        if (scoringViewBody) scoringViewBody.innerHTML = '<p>กรุณาเลือกโต๊ะและผู้สมัคร</p>'; 
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    });

    interviewDateFilter.addEventListener('change', () => {
        renderApplicantCards(); 
        scoringViewBody.innerHTML = '<p>กรุณาเลือกผู้สมัครเพื่อดูรายละเอียด</p>'; 
        document.querySelectorAll('.info-card.active-card').forEach(card => card.classList.remove('active-card'));
    });

    if (scoringViewBody) {
        scoringViewBody.addEventListener('click', (e) => {
            if (e.target.id === 'upload-image-btn') {
                const uploadInput = scoringViewBody.querySelector('#applicant-image-upload');
                if (uploadInput) uploadInput.click();
            }
        });

        // ⭐️ Generic Submit Handler (Works with any config) ⭐️
        scoringViewBody.addEventListener('submit', (e) => {
            if (e.target.id === 'scoring-form') {
                e.preventDefault(); 
                const applicantId = parseInt(e.target.dataset.id, 10);
                if (!applicantId) return; 

                const interviewScores = {};
                const interviewDetails = {};

                // Loop ตาม Config เพื่อดึงค่า
                Database.config.QUESTIONS.forEach(q => {
                    if (q.type.includes('score')) {
                        const select = document.getElementById(`score-${q.id}`);
                        interviewScores[q.id] = select ? parseFloat(select.value) : -1;
                    }
                    const textEl = document.getElementById(`detail-${q.id}`);
                    if (textEl) interviewDetails[q.id] = textEl.value || '';
                });

                console.log("Saving Scores (Dynamic):", interviewScores);
                console.log("Saving Details (Dynamic):", interviewDetails);
                
                Database.updateApplicant(applicantId, { interviewScores, interviewDetails });
                alert('บันทึกข้อมูลสัมภาษณ์เรียบร้อย!'); 
            }
        });

        // ⭐️ Dynamic Color Change on Selection ⭐️
        scoringViewBody.addEventListener('change', (e) => {
            if (e.target.classList.contains('score-select')) {
                const select = e.target;
                const maxScore = parseFloat(select.dataset.maxScore || 5);
                const selectedValue = parseFloat(select.value);

                // Reset Class
                select.className = 'score-select'; 
                
                // Calculate color class dynamically
                let cssClass = 'score-na';
                if (selectedValue >= 0) {
                     const percentage = selectedValue / maxScore;
                     if (percentage >= 0.9) cssClass = 'score-5';
                     else if (percentage >= 0.7) cssClass = 'score-4';
                     else if (percentage >= 0.5) cssClass = 'score-3';
                     else if (percentage >= 0.3) cssClass = 'score-2';
                     else if (selectedValue > 0) cssClass = 'score-1';
                     else cssClass = 'score-0';
                }
                select.classList.add(cssClass);
            }

            if (e.target.id === 'applicant-image-upload') {
                const file = e.target.files[0]; 
                const applicantId = parseInt(e.target.dataset.id, 10);
                if (!file || !applicantId) return; 

                const previewContainer = scoringViewBody.querySelector('#image-preview-container');
                const progressBar = scoringViewBody.querySelector('#upload-progress');

                const fileName = `${new Date().getTime()}_${file.name}`;
                const storageRef = Database.storage.ref(`applicant_images/${applicantId}/${fileName}`);
                const uploadTask = storageRef.put(file);

                progressBar.style.display = 'block';
                previewContainer.innerHTML = `<p>กำลังอัปโหลด... 0%</p>`;

                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        progressBar.value = progress;
                        previewContainer.innerHTML = `<p>กำลังอัปโหลด... ${Math.round(progress)}%</p>`;
                    },
                    (error) => {
                        console.error('Upload failed:', error);
                        alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ' + error.message);
                        progressBar.style.display = 'none';
                        previewContainer.innerHTML = `<p>การอัปโหลดล้มเหลว</p>`;
                    },
                    () => {
                        progressBar.style.display = 'none';
                        previewContainer.innerHTML = `<p>อัปโหลดสำเร็จ! กำลังบันทึก...</p>`;

                        uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                            Database.updateApplicant(applicantId, { applicantImage: downloadURL });
                            previewContainer.innerHTML = `<img src="${downloadURL}" alt="Applicant Photo">`;
                        });
                    }
                );
            }
        });

    } else {
        console.warn("Could not attach listeners: Element 'scoring-view-body' not found.");
    }

    // --- Initialization Logic ---
    const urlParams = new URLSearchParams(window.location.search);
    const urlTable = urlParams.get('table');
    const urlId = urlParams.get('id');

    if (urlTable && urlId) {
        console.log(`Direct link detected: table=${urlTable}, id=${urlId}`);
        const tableNum = parseInt(urlTable, 10);
        linkedApplicantId = parseInt(urlId, 10); 
        initialApplicantShown = false; 
        localStorage.setItem(LOCAL_STORAGE_KEY, tableNum.toString());
        showApplicantListView(tableNum); 
    } else {
        const savedTable = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedTable) {
            console.log(`Found saved table: ${savedTable}. Skipping selection.`);
            linkedApplicantId = null; 
            initialApplicantShown = false;
            showApplicantListView(parseInt(savedTable, 10));
        } else {
            console.log("No saved table or direct link. Showing table selection.");
            tableSelectionView.classList.remove('hidden');
            applicantListView.classList.add('hidden');
        }
    }
});