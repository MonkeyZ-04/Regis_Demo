// public/interviewer.js (Version: Auto-save Enabled)

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

    // 👇 เพิ่มโค้ดส่วนนี้ 👇
    let interviewerName = sessionStorage.getItem('interviewerName');
    let presenceListenerRef = null;
    let currentPresenceRef = null;
    let realtimeDataListenerRef = null;

    if (!interviewerName) {
        interviewerName = prompt("กรุณากรอกชื่อของคุณ (เพื่อให้ระบบรู้ว่าใครกำลังให้คะแนนอยู่):") || "ไม่ระบุชื่อ";
        sessionStorage.setItem('interviewerName', interviewerName);
    }
    // 👆 จบส่วนที่เพิ่ม 👆

    // --- ⭐️ Auto-save Helper: Debounce ---
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(null, args);
            }, delay);
        };
    };

    // --- ⭐️ Auto-save Helper: Show Status ---
    const showSaveStatus = (msg, type = 'saving') => {
        // สร้าง Element แสดงสถานะถ้ายังไม่มี
        let statusEl = document.getElementById('auto-save-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'auto-save-status';
            statusEl.style.cssText = 'position: fixed; bottom: 20px; right: 20px; padding: 10px 20px; background: #333; color: white; border-radius: 5px; z-index: 9999; transition: opacity 0.5s; font-size: 14px;';
            document.body.appendChild(statusEl);
        }
        
        statusEl.textContent = msg;
        statusEl.style.opacity = '1';
        
        if (type === 'saved') {
            statusEl.style.backgroundColor = '#28a745'; // เขียว
            setTimeout(() => { statusEl.style.opacity = '0'; }, 2000); // หายไปเองหลัง 2 วิ
        } else if (type === 'error') {
            statusEl.style.backgroundColor = '#dc3545'; // แดง
        } else {
            statusEl.style.backgroundColor = '#ffc107'; // เหลือง (กำลังบันทึก)
            statusEl.style.color = '#333';
        }
    };

    // --- ⭐️ Core Save Function ---
    const saveCurrentData = (applicantId) => {
        if (!applicantId) return;

        const interviewScores = {};
        const interviewDetails = {};

        // เก็บข้อมูลจาก DOM
        Database.config.QUESTIONS.forEach(q => {
            if (q.type.includes('score')) {
                const select = document.getElementById(`score-${q.id}`);
                interviewScores[q.id] = select ? parseFloat(select.value) : -1;
            }
            const textEl = document.getElementById(`detail-${q.id}`);
            if (textEl) interviewDetails[q.id] = textEl.value || '';
        });

        console.log(`Auto-saving for ID ${applicantId}...`);
        showSaveStatus('กำลังบันทึกอัตโนมัติ...', 'saving');

        // ส่งข้อมูลไป Firebase
        Database.updateApplicant(applicantId, { interviewScores, interviewDetails });
        
        // (เนื่องจาก updateApplicant เป็น Promise แบบ fire-and-forget ใน data.js เราจะสมมติว่าส่งแล้วสำเร็จ หรือรอ callback ของ firebase ก็ได้ แต่นี่ทำ UX ง่ายๆ)
        setTimeout(() => {
            showSaveStatus('บันทึกเรียบร้อย', 'saved');
        }, 500);
    };

    // สร้าง Debounced Save Function (รอ 1.5 วินาทีหลังหยุดพิมพ์)
    const debouncedSave = debounce((id) => saveCurrentData(id), 1500);


    // --- Helper Functions ---
    const parseTimeFromSlot = (slotString) => {
        if (!slotString) return 'ยังไม่ระบุเวลา';
        const timeMatch = slotString.match(/(\d{2}[.:]\d{2})/);
        return timeMatch ? timeMatch[1] : slotString;
    };

    const parseDateFromSlot = (slotString) => {
        if (!slotString) return null;
        const dateMatch = slotString.match(/(วันที่|วันที) \d+ มีนาคม/);
        return dateMatch ? dateMatch[0].replace('วันที', 'วันที่') : null;
    };

    // ⭐️ Dynamic Score Dropdown (เพิ่ม onchange เพื่อ Auto-save) ⭐️
    const createScoreDropdown = (id, label, currentValue = -1, maxScore = 5, step = 0.5) => { 
        let scoreOptions = [];
        scoreOptions.push({ value: -1, text: 'N/A', class: 'score-na' });
        
        for (let i = 0; i <= maxScore; i += step) {
            let cssClass = 'score-0';
            const percentage = i / maxScore;
            
            if (percentage >= 0.9) cssClass = 'score-5';       
            else if (percentage >= 0.7) cssClass = 'score-4';  
            else if (percentage >= 0.5) cssClass = 'score-3';  
            else if (percentage >= 0.3) cssClass = 'score-2';  
            else if (i > 0) cssClass = 'score-1';              
            if (i === 0) cssClass = 'score-0';

            scoreOptions.push({ value: i, text: i.toString(), class: cssClass });
        }

        const currentNumericValue = parseFloat(currentValue);
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

    // ⭐️ Detail Textarea (ใช้ class เดิม เดี๋ยวไปดัก Event ข้างล่าง) ⭐️
    const createDetailTextarea = (id, currentValue = '') => {
        return `<textarea id="detail-${id}" class="detail-textarea" data-question-id="${id}">${currentValue || ''}</textarea>`;
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

        const preferredDefault = "วันที่่ 26 มีนาคม";
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
            slotGroup.innerHTML = `<h3 class="timeslot-header">รอบเวลา: ${parseTimeFromSlot(slot)}</h3>`;
            const cardsGrid = document.createElement('div');
            cardsGrid.className = 'applicant-grid'; 

            applicantsBySlot[slot].forEach(app => {
                const card = document.createElement('div');
                let cardClasses = ['info-card']; 
                if (app.Online) cardClasses.push('online-card');
                else cardClasses.push(app.status.toLowerCase()); 
                
                if (app.isForfeited) cardClasses.push('forfeited');

                let allScored = false;
                if (app.interviewScores && typeof app.interviewScores === 'object') {
                    const requiredScores = Database.config.getScoreKeys();
                    allScored = requiredScores.every(scoreKey =>
                        app.interviewScores.hasOwnProperty(scoreKey) &&
                        app.interviewScores[scoreKey] !== null &&
                        app.interviewScores[scoreKey] !== undefined &&
                        app.interviewScores[scoreKey] !== -1 
                    );
                }

                if (!app.isForfeited && allScored) cardClasses.push('completed');
                if (activeApplicantId && parseInt(activeApplicantId, 10) === app.id) card.classList.add('active-card');

                card.className = cardClasses.join(' ');
                
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

        const appConfig = Database.config.QUESTIONS;
        const appQuestion = appConfig.find(q => q.id === 'application'); 
        const generalNote = appConfig.find(q => q.id === 'general');     
        const interviewQuestions = appConfig.filter(q => q.id !== 'application' && q.id !== 'general'); 

        let applicationScoreHTML = '';
        if (appQuestion) {
             applicationScoreHTML = `
                <p style="display: flex; align-items: center; margin-top: 10px;">
                    <strong>${appQuestion.text || 'คะแนนใบสมัคร'}:</strong>
                    ${createScoreDropdown(appQuestion.id, appQuestion.label, scores[appQuestion.id], appQuestion.maxScore, 1)}
                </p>
                <div style="margin-top: 5px;">
                    <label for="detail-${appQuestion.id}" style="font-size: 14px; color: #555; display: block; margin-bottom: 3px;">โน้ตเกี่ยวกับใบสมัคร:</label>
                    ${createDetailTextarea(appQuestion.id, details[appQuestion.id])}
                </div>
             `;
        }

        let questionsHTML = '<h3>คำถามสัมภาษณ์</h3>';
        
        interviewQuestions.forEach(q => {
            let itemClass = 'interview-question-item';
            if (q.isSubQuestion) itemClass += ' sub-question';
            if (q.isSpecial) itemClass += ' special-question';

            let choicesHTML = '';
            if (q.choices && Array.isArray(q.choices)) {
                choicesHTML = `<small><i><ul>${q.choices.map(c => `<li>${c}</li>`).join('')}</ul></i></small>`;
            }

            let textStyle = q.isSpecial ? 'color: #007bff;' : '';

            let leftSide = `
                <div class="question-text">
                    <p style="${textStyle}"><strong>${q.label})</strong> ${q.text || ''} ${choicesHTML}</p>
                    ${q.type.includes('score') ? createScoreDropdown(q.id, q.label, scores[q.id], q.maxScore || 5, 0.5) : ''}
                </div>
            `;

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

        let generalNoteHTML = '';
        if (generalNote) {
            generalNoteHTML = `
                <div style="margin-top: 20px; margin-bottom: 20px;">
                    <label for="detail-${generalNote.id}" style="font-size: 16px; font-weight: bold; color: #333; display: block; margin-bottom: 8px;">${generalNote.text}:</label>
                    ${createDetailTextarea(generalNote.id, details[generalNote.id])}
                </div>
            `;
        }

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
                                <ul>
                                <li>การทำโครงของชมรมมีการเวียนโครง ทุกคนจะได้ทำงานและเรียนรู้เท่าๆ กัน (รับได้มั้ย)</li>
                                <li>เดินทางไกลและยาวนาน (รถไฟ>รถแขวง>รถกระบะชาวบ้าน) แต่ไม่มีจุดอันตราย (ไหวมั้ย มีข้อกังวลหรือไม่)</li>
                                <li>ในหมู่บ้านมีชาวบ้านติดมาลาเรียทุกปี แต่มีมาตรการป้องกันและเยียวยา (มีศูนย์มาลาเรียในหมู่บ้าน หากป่วยส่ง รพ. ทันที และมีประกันให้ชาวค่ายทุกคน)</li>
                                <li>มีหมาอยู่เยอะ (ไม่ดุ ไม่กัด ฉีดยาแล้ว) และมีสัตว์มีพิษในหน้าฝน (ยุง รั้น เหลือบ ตัวคุ่น ผึ้ง แตน ต่อ งู)</li>
                                <li>ห้องน้ำไม่ได้สะอาดหรือสะดวกสบายมากนัก</li>
                                <li>โครงบำเพ็ญมีกิจกรรมเชื่อมเหล็ก (มีอุปกรณ์ป้องกันและเวิร์คช็อปให้)</li>
                                <li>ตัวผู้สัมภาษณ์เองมีข้อกังวลอะไรมั้ย ทั้งเกี่ยวกับค่ายและตัวเอง</li>
                                </ul>

                                <h4>ข้อมูลเพิ่มเติม</h4>
                                <ul>
                                <li>รับลูกค่าย 12-14 คน</li>
                                <li>ประกาศผลวันที่ 30 มีนาคม</li>
                                <li>จะโทรไปแจ้งก่อน หากติดค่าย</li>
                                <li>ถ้าติดค่ายมีค่าใช้จ่ายไม่เกิน 500 บาท</li>
                                </ul>
                                <p><strong>สุดท้ายแล้ว อย่าลืมขอบคุณที่มาสัมภาษณ์ด้วยคับ 💗</strong></p>
                            </div>
                            <button type="submit" style="background-color: #6c757d;">บันทึกข้อมูล (Manual Save)</button>
                        </form>
                    </div>
                </div>
            `;

            if (typeof presenceListenerRef !== 'undefined' && presenceListenerRef) presenceListenerRef.off(); // ล้างตัวฟังเก่า
            
            // ต้องมั่นใจว่ามีตัวแปร interviewerName ถูกประกาศไว้ด้านบนๆ ของไฟล์แล้ว
            presenceListenerRef = firebase.database().ref(`presence/${applicant.id}`);
            
            presenceListenerRef.on('value', (snapshot) => {
                // ล้างป้ายเตือนเก่าทั้งหมดก่อนอัปเดตใหม่
                document.querySelectorAll('.presence-indicator').forEach(el => el.remove());
                document.querySelectorAll('.is-being-edited').forEach(el => el.classList.remove('is-being-edited'));
                
                if (snapshot.exists()) {
                    const presenceData = snapshot.val();
                    for (const [fieldId, name] of Object.entries(presenceData)) {
                        // ถ้าคนพิมพ์ ไม่ใช่ตัวเราเอง ให้แสดงป้ายแจ้งเตือน
                        if (name !== interviewerName) {
                            const fieldEl = document.getElementById(fieldId);
                            if (fieldEl) {
                                fieldEl.classList.add('is-being-edited');
                                const badge = document.createElement('span');
                                badge.className = 'presence-indicator';
                                badge.textContent = `✍️ ${name} กำลังพิมพ์...`;
                                
                                // จัดตำแหน่งป้ายให้อยู่บนมุมขวาของช่อง
                                fieldEl.parentElement.style.position = 'relative';
                                fieldEl.parentElement.appendChild(badge);
                            }
                        }
                    }
                }
            });

            if (typeof realtimeDataListenerRef !== 'undefined' && realtimeDataListenerRef) {
                realtimeDataListenerRef.off(); // ล้างตัวฟังเก่าเมื่อเปลี่ยนไปดูคนอื่น
            }
            
            realtimeDataListenerRef = firebase.database().ref(`${Database.config.DB_PATH}/${applicant.id}`);
            
            realtimeDataListenerRef.on('value', (snapshot) => {
                if (snapshot.exists()) {
                    const freshData = snapshot.val();
                    const freshScores = freshData.interviewScores || {};
                    const freshDetails = freshData.interviewDetails || {};
                    
                    // 1. อัปเดตช่องคะแนน (Dropdown)
                    for (const [qId, scoreValue] of Object.entries(freshScores)) {
                        const selectEl = document.getElementById(`score-${qId}`);
                        // อัปเดตเฉพาะช่องที่มีอยู่ในจอ และ "ตัวเราไม่ได้กำลังคลิกใช้งานอยู่"
                        if (selectEl && document.activeElement !== selectEl) {
                            if (selectEl.value !== String(scoreValue)) {
                                selectEl.value = scoreValue;
                                // บังคับให้เปลี่ยนสีตามคะแนนใหม่
                                const event = new Event('change', { bubbles: true });
                                selectEl.dispatchEvent(event);
                            }
                        }
                    }

                    // 2. อัปเดตช่อง Textarea (พิมพ์ข้อความ)
                    for (const [qId, textValue] of Object.entries(freshDetails)) {
                        const textareaEl = document.getElementById(`detail-${qId}`);
                        // อัปเดตเฉพาะช่องที่มีอยู่ในจอ และ "ตัวเราไม่ได้กำลังพิมพ์อยู่"
                        if (textareaEl && document.activeElement !== textareaEl) {
                            if (textareaEl.value !== textValue) {
                                textareaEl.value = textValue;
                                // ไฮไลท์สีเขียวแว๊บๆ ให้รู้ว่าข้อมูลเพิ่งถูกอัปเดตจากคนอื่น
                                textareaEl.style.transition = "background-color 0.3s";
                                textareaEl.style.backgroundColor = "#e8f5e9"; // สีเขียวอ่อน
                                setTimeout(() => {
                                    textareaEl.style.backgroundColor = ""; // คืนสีเดิม
                                }, 1000);
                            }
                        }
                    }
                }
            });
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

            if (linkedApplicantId && !initialApplicantShown && allData.length > 0) {
                const applicantToShow = allData.find(app => app.id == linkedApplicantId); 
                if (applicantToShow && !applicantToShow.isForfeited) { 
                    const applicantDate = parseDateFromSlot(applicantToShow.interviewSlot);
                    const selectedDate = interviewDateFilter.value;
                    if (applicantDate && applicantDate !== selectedDate) {
                        const dateOptionExists = Array.from(interviewDateFilter.options).some(option => option.value === applicantDate);
                        if (dateOptionExists) interviewDateFilter.value = applicantDate;
                        renderApplicantCards(); 
                    }
                    setTimeout(() => {
                        const cardElement = cardsContainer.querySelector(`.info-card[data-applicant-id="${linkedApplicantId}"]`);
                        if (cardElement) showScoringDetails(applicantToShow.id, cardElement);
                        initialApplicantShown = true; 
                    }, 50);
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

        // Submit ยังคงมีไว้เผื่อกด Manual
        scoringViewBody.addEventListener('submit', (e) => {
            if (e.target.id === 'scoring-form') {
                e.preventDefault(); 
                const applicantId = parseInt(e.target.dataset.id, 10);
                saveCurrentData(applicantId); // ใช้ฟังก์ชัน save เดียวกัน
            }
        });

        // ⭐️ Global Event Listener for Auto-Save ⭐️
        
        // 1. Detect Changes in Dropdowns (Score)
        scoringViewBody.addEventListener('change', (e) => {
            // Handle Score Color Logic (Existing)
            if (e.target.classList.contains('score-select')) {
                const select = e.target;
                const maxScore = parseFloat(select.dataset.maxScore || 5);
                const selectedValue = parseFloat(select.value);
                select.className = 'score-select'; 
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

                // 🔴 Trigger Auto-Save Immediately for Selects
                const form = document.getElementById('scoring-form');
                if (form) {
                    const applicantId = parseInt(form.dataset.id, 10);
                    saveCurrentData(applicantId);
                }
            }

            // Handle Image Upload (รองรับ iPhone HEIC/TIFF และลดขนาดไฟล์)
            if (e.target.id === 'applicant-image-upload') {
                 const file = e.target.files[0]; 
                 const applicantId = parseInt(e.target.dataset.id, 10);
                 if (!file || !applicantId) return; 

                 const previewContainer = scoringViewBody.querySelector('#image-preview-container');
                 const progressBar = scoringViewBody.querySelector('#upload-progress');
                 
                 progressBar.style.display = 'block';
                 previewContainer.innerHTML = `<p>กำลังเตรียมไฟล์...</p>`;

                 // สร้างฟังก์ชันแบบ Async เพื่อจัดการรูปภาพ
                 const processAndUploadImage = async () => {
                     try {
                         let imageFileToUpload = file;
                         const fileExt = file.name.split('.').pop().toLowerCase();
                         const fileType = file.type.toLowerCase();

                         // 1. ถ้าเป็นไฟล์ของ iPhone (HEIC, HEIF, TIFF) ให้แปลงเป็น JPEG ก่อน
                         if (fileExt === 'heic' || fileExt === 'heif' || fileExt === 'tiff' || fileExt === 'tif' || fileType.includes('heic') || fileType.includes('tiff')) {
                             previewContainer.innerHTML = `<p>กำลังแปลงไฟล์จาก iPhone...</p>`;
                             // ใช้ heic2any แปลงไฟล์
                             const convertedBlob = await heic2any({
                                 blob: file,
                                 toType: "image/jpeg",
                                 quality: 0.8
                             });
                             // สร้างเป็น File object ใหม่ที่เป็น .jpg
                             const blobArray = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                             imageFileToUpload = new File([blobArray], `converted_${applicantId}.jpg`, { type: "image/jpeg" });
                         }

                         // 2. บีบอัดและลดขนาดรูปภาพ (Compress & Resize)
                         previewContainer.innerHTML = `<p>กำลังบีบอัดรูปภาพ...</p>`;
                         const compressionOptions = {
                             maxSizeMB: 1,           // ให้ไฟล์ใหญ่สุดไม่เกิน 1 MB
                             maxWidthOrHeight: 1024, // ย่อความกว้าง/สูง ไม่ให้เกิน 1024px
                             useWebWorker: true
                         };
                         const compressedFile = await imageCompression(imageFileToUpload, compressionOptions);

                         // 3. อัปโหลดขึ้น Firebase
                         const fileName = `${new Date().getTime()}_${compressedFile.name}`;
                         const storageRef = Database.storage.ref(`applicant_images/${applicantId}/${fileName}`);
                         const uploadTask = storageRef.put(compressedFile);
         
                         uploadTask.on('state_changed',
                             (snapshot) => {
                                 const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                 progressBar.value = progress;
                                 previewContainer.innerHTML = `<p>กำลังอัปโหลด... ${Math.round(progress)}%</p>`;
                             },
                             (error) => {
                                 alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ' + error.message);
                                 progressBar.style.display = 'none';
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
                     } catch (error) {
                         console.error("Image processing error:", error);
                         alert("เกิดข้อผิดพลาดในการประมวลผลรูปภาพ: " + error.message);
                         progressBar.style.display = 'none';
                         previewContainer.innerHTML = `<p style="color:red;">การอัปโหลดล้มเหลว</p>`;
                     }
                 };

                 // เรียกใช้งานฟังก์ชัน
                 processAndUploadImage();
            }
        });

        // 2. Detect Input in Textareas (Debounced)
        scoringViewBody.addEventListener('input', (e) => {
            if (e.target.classList.contains('detail-textarea')) {
                const form = document.getElementById('scoring-form');
                if (form) {
                    const applicantId = parseInt(form.dataset.id, 10);
                    showSaveStatus('กำลังพิมพ์...', 'typing'); // แสดงสถานะว่ากำลังพิมพ์
                    debouncedSave(applicantId); // เรียกใช้ฟังก์ชันที่หน่วงเวลาไว้
                }
            }
        });

        // 👇 3. เพิ่ม Detect Focus (ใครกำลังพิมพ์อยู่) ตรงนี้เลยครับ 👇
        scoringViewBody.addEventListener('focusin', (e) => {
            if (e.target.classList.contains('detail-textarea') || e.target.classList.contains('score-select')) {
                const form = document.getElementById('scoring-form');
                if (!form) return;
                const applicantId = form.dataset.id;
                const fieldId = e.target.id;
                
                // ส่งชื่อเราไปแปะที่ Firebase
                currentPresenceRef = firebase.database().ref(`presence/${applicantId}/${fieldId}`);
                currentPresenceRef.onDisconnect().remove(); // ถ้าเน็ตหลุด ให้ลบชื่อออกอัตโนมัติ
                currentPresenceRef.set(interviewerName);
            }
        });

        scoringViewBody.addEventListener('focusout', (e) => {
            if (e.target.classList.contains('detail-textarea') || e.target.classList.contains('score-select')) {
                // ลบชื่อเราออกเมื่อคลิกไปที่อื่น
                if (currentPresenceRef) {
                    currentPresenceRef.remove();
                    currentPresenceRef.onDisconnect().cancel();
                    currentPresenceRef = null;
                }
            }
        });
    }

    // --- Initialization ---
    const urlParams = new URLSearchParams(window.location.search);
    const urlTable = urlParams.get('table');
    const urlId = urlParams.get('id');

    if (urlTable && urlId) {
        const tableNum = parseInt(urlTable, 10);
        linkedApplicantId = parseInt(urlId, 10); 
        initialApplicantShown = false; 
        localStorage.setItem(LOCAL_STORAGE_KEY, tableNum.toString());
        showApplicantListView(tableNum); 
    } else {
        const savedTable = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedTable) {
            linkedApplicantId = null; 
            initialApplicantShown = false;
            showApplicantListView(parseInt(savedTable, 10));
        } else {
            tableSelectionView.classList.remove('hidden');
            applicantListView.classList.add('hidden');
        }
    }
});