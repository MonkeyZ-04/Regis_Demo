// public/interviewer.js (Version Update: Dynamic Submission)

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

    const createScoreDropdown = (id, label, currentValue = 0) => {
        let scoreOptions = [];
        // Note: Logic นี้ยังคงต้องมี hardcode เล็กน้อยเรื่อง range ของแต่ละข้อ
        // หรือถ้าอยากให้ dynamic สุดๆ สามารถเพิ่ม property range ลงใน Config ได้
        if (id === 'score-application') {
            scoreOptions.push({ value: -1, text: 'N/A', class: 'score-na' }); 
            for (let i = 0; i <= 10; i += 0.5) {
                let cssClass = 'score-0';
                if (i >= 9) cssClass = 'score-5'; 
                else if (i >= 7) cssClass = 'score-4'; 
                else if (i >= 5) cssClass = 'score-3'; 
                else if (i >= 3) cssClass = 'score-2'; 
                else if (i >= 1) cssClass = 'score-1'; 
                scoreOptions.push({ value: i, text: i.toString(), class: cssClass });
            }
        } else {
            scoreOptions = [
                { value: -1, text: 'N/A', class: 'score-na' }, 
                { value: 0, text: '0', class: 'score-0' }, { value: 1, text: '1', class: 'score-1' },
                { value: 2, text: '2', class: 'score-2' }, { value: 3, text: '3', class: 'score-3' },
                { value: 4, text: '4', class: 'score-4' }, { value: 5, text: '5', class: 'score-5' },
            ];
        }

        const currentNumericValue = parseFloat(currentValue);

        let optionsHTML = scoreOptions.map(opt =>
            `<option value="${opt.value}" class="${opt.class}" ${opt.value == currentNumericValue ? 'selected' : ''}>${opt.text}</option>`
        ).join('');

        const initialClass = scoreOptions.find(opt => opt.value == currentNumericValue)?.class || 'score-na';
        const sizeClass = 'score-select'; 
        return `
            <select id="${id}" class="${sizeClass} ${initialClass}" style="width: 70px; margin-left: 10px;">
                ${optionsHTML}
            </select>
        `;
    };

    const createDetailTextarea = (id, currentValue = '') => {
        const textarea = document.createElement('textarea');
        textarea.id = id;
        textarea.className = 'detail-textarea';
        textarea.textContent = currentValue; 
        return textarea.outerHTML;
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
             if (!activeApplicantId) {
                 scoringViewBody.innerHTML = '<p>กรุณาเลือกผู้สมัครเพื่อดูรายละเอียด</p>';
             }
             return;
        }

        const applicantsForTableAndDate = allData.filter(app =>
            app.table === currentTable && parseDateFromSlot(app.interviewSlot) === selectedDate
        );
        if (applicantsForTableAndDate.length === 0) {
            cardsContainer.innerHTML = '<p>ยังไม่มีผู้สมัครสำหรับโต๊ะและวันที่นี้</p>';
            if (!activeApplicantId) {
                scoringViewBody.innerHTML = '<p>ยังไม่มีผู้สมัครสำหรับโต๊ะและวันที่นี้</p>';
            }
            return;
        }

        if (!activeApplicantId) {
            scoringViewBody.innerHTML = '<p>กรุณาเลือกผู้สมัครเพื่อดูรายละเอียด</p>';
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
                let cardClasses = ['info-card']; 
                if (app.Online) {
                    cardClasses.push('online-card');
                } else {
                    cardClasses.push(app.status.toLowerCase()); 
                }
                if (app.isForfeited) {
                    cardClasses.push('forfeited');
                }

                // --- Check completion dynamically using Config ---
                let allScored = false;
                if (app.interviewScores && typeof app.interviewScores === 'object') {
                    const requiredScores = Database.config.getScoreKeys(); // Use config here
                    allScored = requiredScores.every(scoreKey =>
                        app.interviewScores.hasOwnProperty(scoreKey) &&
                        app.interviewScores[scoreKey] !== null &&
                        app.interviewScores[scoreKey] !== undefined
                    );
                }

                if (!app.isForfeited && allScored) {
                    cardClasses.push('completed');
                }

                card.className = cardClasses.join(' '); 

                if (activeApplicantId && parseInt(activeApplicantId, 10) === app.id) {
                    card.classList.add('active-card');
                }

                card.dataset.applicantId = app.id; 
                card.innerHTML = `
                    <h4>${app.firstName} ${app.lastName} (${app.nickname})</h4>
                    <p><strong>สถานะ:</strong> ${app.isForfeited ? 'สละสิทธิ์' : app.status}</p>
                    <p><strong>คณะ:</strong> ${app.faculty}</p>
                    <p><strong>ชั้นปี:</strong> ${app.year}</p>
                `;
                card.addEventListener('click', () => {
                    if (!app.isForfeited) {
                         showScoringDetails(app.id, card);
                    }
                });
                cardsGrid.appendChild(card);
            });
            slotGroup.appendChild(cardsGrid);
            cardsContainer.appendChild(slotGroup);
        });
    };

    // Displays the detailed scoring form for a selected applicant
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
        if (clickedCardElement) {
            clickedCardElement.classList.add('active-card');
        }
        const onlineStatus = applicant.Online ? '<span style="color: purple; font-weight: bold;"> (Online Interview ⭐️)</span>' : '';
        const displaySlot = applicant.Online ? 'Online Special' : (applicant.interviewSlot || 'N/A');
        const imagePreviewHTML = applicant.applicantImage
            ? `<img src="${applicant.applicantImage}" alt="Applicant Photo">` 
            : `<p>ยังไม่มีรูปภาพ</p>`; 

        // หมายเหตุ: ส่วน HTML นี้ยังคงรูปแบบเดิมเนื่องจากมี Text เฉพาะทางเยอะ
        // แต่เราเปลี่ยน ID ของ textarea และ select ให้ตรงกับ pattern ของ Database.config (q1, q2a, ...)
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
                       
                        <p style="display: flex; align-items: center; margin-top: 10px;">
                            <strong>คะแนนใบสมัคร:</strong>
                            ${createScoreDropdown('score-application', 'Score Application', scores.application)}
                        </p>
                        <div style="margin-top: 5px;">
                            <label for="detail-application" style="font-size: 14px; color: #555; display: block; margin-bottom: 3px;">โน้ตเกี่ยวกับใบสมัคร:</label>
                            ${createDetailTextarea('detail-application', details.application)}
                        </div>
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
                            <h3>คำถามสัมภาษณ์</h3>

                          
                            <div class="interview-question-item">
                                <div class="question-text"><p><strong>1)</strong> เวลาว่างชอบทำอะไรหรือมีงานอดิเรกที่ชอบทำมั้ย > ทำไมถึงชอบ?</p></div>
                                <div class="question-input-area">${createDetailTextarea('detail-q1', details.q1)}</div>
                            </div>
                            <div class="interview-question-item">
                                <div class="question-text">
                                    <p><strong>2a)</strong> โดยปกติแล้วเรามีวิธีรับมือกับงานที่ท้าทายความสามารถยังไง?</p>
                                    ${createScoreDropdown('score-q2a', 'Score Q2a', scores.q2a)}
                                </div>
                                <div class="question-input-area">
                                    ${createDetailTextarea('detail-q2a', details.q2a)}
                                </div>
                            </div>
                            <div class="interview-question-item sub-question">
                                <div class="question-text">
                                    <p><strong>2b)</strong> แล้วถ้าเป็นงานที่เราไม่คุ้นเคยจะรับมือยังไง?</p>
                                    ${createScoreDropdown('score-q2b', 'Score Q2b', scores.q2b)}
                                </div>
                                <div class="question-input-area">
                                    ${createDetailTextarea('detail-q2b', details.q2b)}
                                </div>
                            </div>
                            <div class="interview-question-item">
                                <div class="question-text"><p><strong>3)</strong> ตอนนี้มีงานอะไรที่รับผิดชอบอยู่บ้าง? วางแผนกิจกรรมมหาลัยในปีหน้า ๆ ไว้ยังไงบ้าง?</p></div>
                                <div class="question-input-area">${createDetailTextarea('detail-q3', details.q3)}</div>
                            </div>
                            <div class="interview-question-item">
                                <div class="question-text">
                                     <p><strong>4a)</strong> ถ้าทำงานกลุ่มกับเพื่อนแล้วเพื่อนทำส่วนที่รับผิดชอบไม่ทัน?</p>
                                     ${createScoreDropdown('score-q4a', 'Score Q4a', scores.q4a)}
                                </div>
                                <div class="question-input-area">
                                     ${createDetailTextarea('detail-q4a', details.q4a)}
                                </div>
                            </div>
                            <div class="interview-question-item sub-question">
                                <div class="question-text">
                                     <p><strong>4b)</strong> ถ้าเป็นเราในตอนนี้จะมีวิธีจัดการยังไง?</p>
                                     ${createScoreDropdown('score-q4b', 'Score Q4b', scores.q4b)}
                                </div>
                                <div class="question-input-area">
                                     ${createDetailTextarea('detail-q4b', details.q4b)}
                                </div>
                            </div>
                          
                            <div class="interview-question-item">
                                <div class="question-text">
                                     <p><strong>5)</strong> ก่อนหน้านี้เคยได้ยิน /เคยศึกษาเกี่ยวกับวิถีชีวิตความเป็นอยู่และปัญหากลุ่มชาติพันธุ์มาก่อนมั้ย?</p>
                                     ${createScoreDropdown('score-q5', 'Score Q5', scores.q5)}
                                </div>
                                <div class="question-input-area">
                                     ${createDetailTextarea('detail-q5', details.q5)}
                                </div>
                            </div>
                         
                            <div class="interview-question-item">
                                <div class="question-text">
                                    <p><strong>6)</strong> คาดหวังอะไรกับการได้ไปทำกิจกรรมอาสากับค่ายเรา?</p>
                                    ${createScoreDropdown('score-q6', 'Score Q6', scores.q6)}
                                </div>
                                <div class="question-input-area">
                                    ${createDetailTextarea('detail-q6', details.q6)}
                                </div>
                            </div>
                           
                            <div class="interview-question-item">
                                <div class="question-text">
                                    <p><strong>7a)</strong> นอกจากค่ายอาสาของชมรมแล้ว เราคิดว่าชมรมสามารถช่วยเหลือชาวเขาในรูปแบบอื่น ๆ ได้ยังไงบ้าง?</p>
                                     ${createScoreDropdown('score-q7a', 'Score Q7a', scores.q7a)}
                                </div>
                                <div class="question-input-area">
                                     ${createDetailTextarea('detail-q7a', details.q7a)}
                                </div>
                            </div>
                           
                             <div class="interview-question-item sub-question">
                                <div class="question-text">
                                     <p><strong>7b)</strong> แล้วถ้าหากติดค่ายอาสา ลงค่ายมาจะสะดวกมาสานต่อกิจกรรมนี้มั้ย?</p>
                                     ${createScoreDropdown('score-q7b', 'Score Q7b', scores.q7b)}
                                </div>
                                <div class="question-input-area">
                                     ${createDetailTextarea('detail-q7b', details.q7b)}
                                </div>
                            </div>
                           
                            <div class="interview-question-item">
                                <div class="question-text">
                                     <p><strong>8a)</strong> รู้จักชมรมของเรามาก่อนมั้ย > รู้จักแค่ไหน > ชอบอะไรในชมรมเรา?</p>
                                     ${createScoreDropdown('score-q8a', 'Score Q8a', scores.q8a)}
                                </div>
                                <div class="question-input-area">
                                     ${createDetailTextarea('detail-q8a', details.q8a)}
                                </div>
                            </div>
                          
                             <div class="interview-question-item sub-question">
                                <div class="question-text">
                                     <p><strong>8b)</strong> คิดว่าทำไมถึงต้องเป็นค่ายนี้?</p>
                                     ${createScoreDropdown('score-q8b', 'Score Q8b', scores.q8b)}
                                </div>
                                <div class="question-input-area">
                                     ${createDetailTextarea('detail-q8b', details.q8b)}
                                </div>
                            </div>
                            
                            <div class="interview-question-item">
                                <div class="question-text"><p><strong>9)</strong> คำถามเลือกจากโครงที่ชอบสุด 1 ข้อ <small><i><ul>
                                    <li>(สอน) ถ้าได้ขึ้นไปสอนน้องๆ อยากสอนวิชาอะไร ลองเสนอกิจกรรมการเรียนการสอนที่อยากทำ</li>
                                    <li>(สอน) ถ้าเกิดน้องๆเขินอายกับพวกเรา เราจะมีวิธีเข้าหาน้องๆอย่างไร</li>
                                    <li>(บำเพ็ญ) ถ้าได้มีโอกาสเป็นโครงบำเพ็ญ สามารถสร้างอะไรก็ได้ 1 อย่างบนค่าย อยากสร้างอะไรในระยะเวลาที่ขึ้นค่าย 8 วัน</li>
                                    <li>(เรียน) ถ้าได้มีโอกาสไปพูดคุยกับชาวบ้าน สิ่งไหนที่เราอยากนำไปแลกเปลี่ยนเรียนรู้กับชาวบ้าน</li>
                                    <li>(สวัส) ถ้าวันนั้นโครงอื่นๆทำงานหนักมาก ในฐานะโครงสวัสเราจะทำเมนู/เครื่องดื่มอะไรให้ชาวค่ายได้กิน</li>
                                </ul></i></small></p></div>
                                <div class="question-input-area">${createDetailTextarea('detail-q9', details.q9)}</div>
                            </div>
                         
                            <div class="interview-question-item">
                                <div class="question-text"><p><strong>10)</strong> คำถามเลือกจากโครงที่ชอบน้อยที่สุด 1 ข้อ <small><i><ul>
                                    <li>(สอน) ถ้าเกิดเราเจอเด็กดื้อมากๆ ไม่ยอมฟัง คอยกวนเด็กคนอื่นตลอดเวลาเราจะทำยังไง</li>
                                    <li>(สอน) ถ้าเกิดเราเจอเด็กที่ไม่จอยกับกิจกรรม ปลีกตัวออกจากกลุ่มเพื่อน งอแงไม่ยอมเข้าห้อง เราจะทำยังไง</li>
                                    <li>(บำเพ็ญ)ถ้าเราได้ทำงานที่ไม่เคยทำมาก่อน แล้วทำผิดพลาด เราจะมีวิธีการแก้ไขอย่างไร</li>
                                    <li>(เรียน)ถ้าวันไปโครงเรียน ชาวบ้านให้ชิมของนู่นนี่ แล้วก็ยื่นแอลกอฮอล์ให้ชิม แต่กฎค่ายห้าม เราจะมีวิธีการรับมือยังไง</li>
                                    <li>(เรียน)หากมีชาวบ้านทักทายโดยใช้ภาษากะเหรี่ยง พูดภาษาไทยไม่ได้ เราจะมีวิธีสื่อสารกับเค้ายังไง</li>
                                    <li>(สวัส) ถ้าเนื้อสัตว์ไม่พอในการทำอาหาร เราจะมีวิธีแก้ปัญหายังไง</li>
                                    <li>(สวัส)ถ้าเราคำนวณปริมาณอาหารมื้อเที่ยงผิดพลาด ไม่เพียงพอต่อชาวค่าย เราจะมีวิธีแก้ปัญหายังไง</li>
                                </ul></i></small></p></div>
                                <div class="question-input-area">${createDetailTextarea('detail-q10', details.q10)}</div>
                            </div>
                         
                            <div class="interview-question-item">
                                <div class="question-text"><p><strong>11)</strong> เลือกคำถามโครงกลางคืนมาถาม 1 ข้อ <small><i><ul>
                                    <li>Q1: หากย้อนเวลากลับไปได้ มีเรื่องอะไรที่อยากกลับไปแก้ไขมั้ย (เรื่องเล็กหรือใหญ่ก็ได้)</li>
                                    <li>Q2: เคยสร้าง impact ในแง่บวกให้ใครสักคนมั้ย ถ้าเคยช่วยเล่าสิ่งที่เราเคยทำให้คนอื่นรู้สึกดีให้ฟังหน่อยได้มั้ย</li>
                                    <li>Q3: เล่าวิธีมูฟออนจากวันแย่ๆของตัวเองให้ฟังหน่อยได้ไหม ปกติผ่านมาได้ยังไง</li>
                                </ul></i></small></p></div>
                                <div class="question-input-area">${createDetailTextarea('detail-q11', details.q11)}</div>
                            </div>
                           
                            <div class="interview-question-item">
                                <div class="question-text"><p><strong>12)</strong> ในแต่ละวันจะมีการร้องเพลงและพูดคุยกันตาม topic ต่างๆ เราสามารถแลกเปลี่ยนหรือรับฟังทุกคนได้มั้ย โอเครึป่าว?</p></div>
                                <div class="question-input-area">${createDetailTextarea('detail-q12', details.q12)}</div>
                            </div>
                        
                            <div class="interview-question-item">
                                <div class="question-text">
                                    <p><strong>13)</strong> กฎค่าย 9 ข้อ ตั้งมาเพื่อจุดประสงค์ที่อยากรบกวนชาวบ้านให้น้อยที่สุด (ทวนกฎค่ายให้ฟัง) คิดเห็นยังไงกับกฎค่าย มีคำถามเกี่ยวกับกฎค่ายหรือรู้สึกว่ามีข้อไหนที่ควรปรับแก้หรือยืดหยุ่นได้มั้ย?</p>
                                    ${createScoreDropdown('score-q13', 'Score Q13', scores.q13)} 
                                </div>
                                <div class="question-input-area">${createDetailTextarea('detail-q13', details.q13)}</div> 
                            </div>
                         
                            <div class="interview-question-item special-question">
                                <div class="question-text"><p><strong>[พิเศษ]</strong> คิดว่าเข้ากับชมรมได้มั้ย? [ประเมินจากผู้สัมภาษณ์]</p></div>
                                <div class="question-input-area score-only">
                                     ${createScoreDropdown('score-qSpecial', 'Score QSpecial', scores.qSpecial)}
                                </div>
                            </div>
                          
                             <div style="margin-top: 20px; margin-bottom: 20px;">
                                <label for="detail-general" style="font-size: 16px; font-weight: bold; color: #333; display: block; margin-bottom: 8px;">โน้ตเพิ่มเติม / สรุป:</label>
                                ${createDetailTextarea('detail-general', details.general)}
                            </div>
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

            if (isFirstLoad) {
                populateDateFilter(); 
            }

            renderApplicantCards(); 

            // --- Attempt to show linked applicant after cards are rendered ---
            if (linkedApplicantId && !initialApplicantShown && allData.length > 0) {
                const applicantToShow = allData.find(app => app.id == linkedApplicantId); 

                if (applicantToShow && !applicantToShow.isForfeited) { 
                    const applicantDate = parseDateFromSlot(applicantToShow.interviewSlot);
                    const selectedDate = interviewDateFilter.value;

                    if (applicantDate && applicantDate === selectedDate) {
                        const cardElement = cardsContainer.querySelector(`.info-card[data-applicant-id="${linkedApplicantId}"]`);
                        if (cardElement) {
                            showScoringDetails(applicantToShow.id, cardElement); 
                            initialApplicantShown = true; 
                        } else {
                             initialApplicantShown = true;
                        }
                    } else if (applicantDate && applicantDate !== selectedDate) {
                        const dateOptionExists = Array.from(interviewDateFilter.options).some(option => option.value === applicantDate);

                        if (dateOptionExists) {
                            interviewDateFilter.value = applicantDate; 
                            renderApplicantCards(); 

                            setTimeout(() => {
                                const cardElement = cardsContainer.querySelector(`.info-card[data-applicant-id="${linkedApplicantId}"]`);
                                if (cardElement) {
                                    showScoringDetails(applicantToShow.id, cardElement);
                                } 
                                initialApplicantShown = true; 
                            }, 0); 

                        } else {
                             initialApplicantShown = true;
                        }
                    } else {
                         initialApplicantShown = true;
                    }

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
        if (scoringViewBody) {
             scoringViewBody.innerHTML = '<p>กรุณาเลือกโต๊ะและผู้สมัคร</p>'; 
        }
        if (unsubscribe) {
            unsubscribe(); 
            unsubscribe = null;
        }
    });

    interviewDateFilter.addEventListener('change', () => {
        renderApplicantCards(); 
        scoringViewBody.innerHTML = '<p>กรุณาเลือกผู้สมัครเพื่อดูรายละเอียด</p>'; 
        document.querySelectorAll('.info-card.active-card').forEach(card => {
            card.classList.remove('active-card');
        });
    });

    if (scoringViewBody) {

        scoringViewBody.addEventListener('click', (e) => {
            if (e.target.id === 'upload-image-btn') {
                const uploadInput = scoringViewBody.querySelector('#applicant-image-upload');
                if (uploadInput) uploadInput.click();
            }
        });

        // ⭐️⭐️⭐️ [แก้ไข] Logic การ Submit แบบ Dynamic ⭐️⭐️⭐️
        scoringViewBody.addEventListener('submit', (e) => {
            if (e.target.id === 'scoring-form') {
                e.preventDefault(); 
                const applicantId = parseInt(e.target.dataset.id, 10);
                if (!applicantId) return; 

                const interviewScores = {};
                const interviewDetails = {};

                // วน Loop ผ่าน Config เพื่อเก็บค่า (ไม่ต้องเขียน Hardcode ทีละบรรทัด)
                Database.config.QUESTIONS.forEach(q => {
                    // 1. เก็บ Scores
                    if (q.type.includes('score')) {
                        const select = document.getElementById(`score-${q.id}`);
                        // ถ้าหาไม่เจอ หรือเป็นค่าว่าง ให้เป็น -1 (N/A)
                        interviewScores[q.id] = select ? parseFloat(select.value) : -1;
                    }
                    
                    // 2. เก็บ Details (Textarea)
                    const textEl = document.getElementById(`detail-${q.id}`);
                    if (textEl) {
                        interviewDetails[q.id] = textEl.value || '';
                    }
                });

                console.log("Saving Scores (Dynamic):", interviewScores);
                console.log("Saving Details (Dynamic):", interviewDetails);
                
                Database.updateApplicant(applicantId, { interviewScores, interviewDetails });
                alert('บันทึกข้อมูลสัมภาษณ์เรียบร้อย!'); 
            }
        });

        scoringViewBody.addEventListener('change', (e) => {
            if (e.target.classList.contains('score-select')) {
                const select = e.target;
                select.className = 'score-select'; 
                if (select.id === 'score-application') {
                    select.style.width = '70px';
                    select.style.marginLeft = '10px';
                }

                const selectedOption = select.options[select.selectedIndex];
                const selectedValue = parseFloat(selectedOption.value);
                let cssClass = 'score-na'; 

                 if (select.id === 'score-application') {
                    if (selectedValue >= 9) cssClass = 'score-5';
                    else if (selectedValue >= 7) cssClass = 'score-4';
                    else if (selectedValue >= 5) cssClass = 'score-3';
                    else if (selectedValue >= 3) cssClass = 'score-2';
                    else if (selectedValue >= 1) cssClass = 'score-1';
                    else if (selectedValue >= 0) cssClass = 'score-0';
                 } else { 
                    if (selectedValue === 5) cssClass = 'score-5';
                    else if (selectedValue === 4) cssClass = 'score-4';
                    else if (selectedValue === 3) cssClass = 'score-3';
                    else if (selectedValue === 2) cssClass = 'score-2';
                    else if (selectedValue === 1) cssClass = 'score-1';
                    else if (selectedValue === 0) cssClass = 'score-0';
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
                            console.log('File available at', downloadURL);
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