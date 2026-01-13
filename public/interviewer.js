// interviewer.js (เวอร์ชันอัปเดต: สลับวันที่อัตโนมัติเมื่อเปิด Link ตรง)

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const tableSelectionView = document.getElementById('table-selection-view'); //
    const applicantListView = document.getElementById('applicant-list-view'); //
    const tableSelect = document.getElementById('table-select'); //
    const confirmTableBtn = document.getElementById('confirm-table-btn'); //
    const backToSelectionBtn = document.getElementById('back-to-selection-btn'); //
    const tableTitle = document.getElementById('table-title'); //
    const cardsContainer = document.getElementById('applicant-cards-container'); //
    const scoringViewBody = document.getElementById('scoring-view-body'); //
    const interviewDateFilter = document.getElementById('interview-date-filter'); //

    // --- State ---
    let currentTable = null;
    let allData = [];
    let unsubscribe = null;
    const LOCAL_STORAGE_KEY = 'interviewer_selected_table'; // Key for localStorage
    let linkedApplicantId = null; // Stores ID from URL parameter
    let initialApplicantShown = false; // Flag to show linked applicant only once per view load

    // --- Helper Functions ---
    // Extracts time (HH:MM) from a full slot string
    const parseTimeFromSlot = (slotString) => {
        if (!slotString) return 'ยังไม่ระบุเวลา';
        const timeMatch = slotString.match(/(\d{2}[.:]\d{2})/);
        return timeMatch ? timeMatch[1] : slotString;
    };

    // Extracts date ("วันที่ DD ตุลาคม") from a full slot string
    const parseDateFromSlot = (slotString) => {
        if (!slotString) return null;
        // Allows for "วันที่" or "วันที"
        const dateMatch = slotString.match(/(วันที่|วันที) \d+ ตุลาคม/);
        // Corrects typo if found
        return dateMatch ? dateMatch[0].replace('วันที', 'วันที่') : null;
    };

    // Creates HTML for a score dropdown select element
    const createScoreDropdown = (id, label, currentValue = 0) => {
        let scoreOptions = [];
        // Determine score range based on the ID
        if (id === 'score-application') {
            // Application score: 0-10 with 0.5 steps
            scoreOptions.push({ value: -1, text: 'N/A', class: 'score-na' }); // N/A option
            for (let i = 0; i <= 10; i += 0.5) {
                // Assign CSS class based on score range for coloring
                let cssClass = 'score-0';
                if (i >= 9) cssClass = 'score-5'; // Blue
                else if (i >= 7) cssClass = 'score-4'; // Green
                else if (i >= 5) cssClass = 'score-3'; // Yellow
                else if (i >= 3) cssClass = 'score-2'; // Red
                else if (i >= 1) cssClass = 'score-1'; // Light Grey
                scoreOptions.push({ value: i, text: i.toString(), class: cssClass });
            }
        } else {
            // Standard interview question scores: 0-5
            scoreOptions = [
                { value: -1, text: 'N/A', class: 'score-na' }, // N/A option
                { value: 0, text: '0', class: 'score-0' }, { value: 1, text: '1', class: 'score-1' },
                { value: 2, text: '2', class: 'score-2' }, { value: 3, text: '3', class: 'score-3' },
                { value: 4, text: '4', class: 'score-4' }, { value: 5, text: '5', class: 'score-5' },
            ];
        }

        // Convert potentially string currentValue to number for comparison
        const currentNumericValue = parseFloat(currentValue);

        // Generate <option> HTML tags
        let optionsHTML = scoreOptions.map(opt =>
            // Use == for comparison as currentValue might be "3.5" vs number 3.5
            `<option value="${opt.value}" class="${opt.class}" ${opt.value == currentNumericValue ? 'selected' : ''}>${opt.text}</option>`
        ).join('');

        // Determine the initial CSS class for the <select> element based on the current value
        const initialClass = scoreOptions.find(opt => opt.value == currentNumericValue)?.class || 'score-na';
        const sizeClass = 'score-select'; // Base class
        // Return the complete <select> HTML
        return `
            <select id="${id}" class="${sizeClass} ${initialClass}" style="width: 70px; margin-left: 10px;">
                ${optionsHTML}
            </select>
        `;
    };

    // Creates HTML for a textarea element
    const createDetailTextarea = (id, currentValue = '') => {
        const textarea = document.createElement('textarea');
        textarea.id = id;
        textarea.className = 'detail-textarea';
        textarea.textContent = currentValue; // Set initial text content
        return textarea.outerHTML;
    };


    // --- Rendering Functions ---

    // Populates the date filter dropdown and selects the default (preferring Day 22)
    const populateDateFilter = () => {
        // Get unique dates from all applicant data
        const dates = [...new Set(allData.map(app => parseDateFromSlot(app.interviewSlot)))].filter(Boolean);
        const currentVal = interviewDateFilter.value; // Remember currently selected value if exists
        interviewDateFilter.innerHTML = ''; // Clear existing options
        // Add options for each unique date
        dates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            interviewDateFilter.appendChild(option);
        });

        // Set the default selected date
        const preferredDefault = "วันที่ 22 ตุลาคม";
        if (dates.includes(preferredDefault)) {
            interviewDateFilter.value = preferredDefault; // Select Day 22 if available
        } else if (currentVal && dates.includes(currentVal)) {
            interviewDateFilter.value = currentVal; // Keep previous selection if Day 22 not found
        } else if (dates.length > 0) {
            interviewDateFilter.value = dates[0]; // Otherwise select the first available date
        }
    };

    // Renders the list of applicant cards on the left pane
    const renderApplicantCards = () => {
        if (!currentTable) return; // Don't render if no table is selected
        // Get ID of the currently active card (if any) before clearing
        const activeApplicantId = document.querySelector('.info-card.active-card')?.dataset.applicantId;
        cardsContainer.innerHTML = ''; // Clear previous card list
        const selectedDate = interviewDateFilter.value; // Get currently selected date

        // Handle case where no date is selected
        if (!selectedDate) {
             cardsContainer.innerHTML = '<p>กรุณาเลือกวันสัมภาษณ์</p>';
             // Clear scoring view only if no card was previously active
             if (!activeApplicantId) {
                 scoringViewBody.innerHTML = '<p>กรุณาเลือกผู้สมัครเพื่อดูรายละเอียด</p>';
             }
             return;
        }

        // Filter applicants for the current table and selected date
        const applicantsForTableAndDate = allData.filter(app =>
            app.table === currentTable && parseDateFromSlot(app.interviewSlot) === selectedDate
        );
        // Handle case where no applicants are found for the selection
        if (applicantsForTableAndDate.length === 0) {
            cardsContainer.innerHTML = '<p>ยังไม่มีผู้สมัครสำหรับโต๊ะและวันที่นี้</p>';
            if (!activeApplicantId) {
                scoringViewBody.innerHTML = '<p>ยังไม่มีผู้สมัครสำหรับโต๊ะและวันที่นี้</p>';
            }
            return;
        }

        // Clear scoring view if no card was previously active
        if (!activeApplicantId) {
            scoringViewBody.innerHTML = '<p>กรุณาเลือกผู้สมัครเพื่อดูรายละเอียด</p>';
        }

        // Group applicants by their specific interview slot time
        const applicantsBySlot = applicantsForTableAndDate.reduce((acc, app) => {
            const slot = app.interviewSlot || 'Unscheduled';
            if (!acc[slot]) acc[slot] = [];
            acc[slot].push(app);
            return acc;
        }, {});
        const sortedSlots = Object.keys(applicantsBySlot).sort(); // Sort slots chronologically

        // Render each slot group and the cards within it
        sortedSlots.forEach(slot => {
            const slotGroup = document.createElement('div');
            slotGroup.className = 'timeslot-group';
            const slotTitle = document.createElement('h3');
            slotTitle.className = 'timeslot-header';
            slotTitle.textContent = `รอบเวลา: ${parseTimeFromSlot(slot)}`;
            slotGroup.appendChild(slotTitle);
            const cardsGrid = document.createElement('div');
            cardsGrid.className = 'applicant-grid'; // Grid layout for cards in a slot

            applicantsBySlot[slot].forEach(app => {
                const card = document.createElement('div');
                let cardClasses = ['info-card']; // Base class
                // Add status-specific classes
                if (app.Online) {
                    cardClasses.push('online-card');
                } else {
                    cardClasses.push(app.status.toLowerCase()); // 'pending' or 'arrived'
                }
                // Add forfeited class if applicable
                if (app.isForfeited) {
                    cardClasses.push('forfeited');
                }

                // Check if all required scores are present
                const requiredScores = [
                    'application', 'q2a', 'q2b', 'q4a', 'q4b',
                    'q5', 'q6', 'q7a', 'q7b', 'q8a', 'q8b',
                    'q13', // Include Q13
                    'qSpecial'
                ];
                let allScored = false;
                if (app.interviewScores && typeof app.interviewScores === 'object') {
                    allScored = requiredScores.every(scoreKey =>
                        app.interviewScores.hasOwnProperty(scoreKey) &&
                        app.interviewScores[scoreKey] !== null &&
                        app.interviewScores[scoreKey] !== undefined
                    );
                }
                // Add 'completed' class if not forfeited and all scores are present
                if (!app.isForfeited && allScored) {
                    cardClasses.push('completed');
                }

                card.className = cardClasses.join(' '); // Apply all classes

                // Restore active state if this card was previously selected
                if (activeApplicantId && parseInt(activeApplicantId, 10) === app.id) {
                    card.classList.add('active-card');
                }

                card.dataset.applicantId = app.id; // Store ID for click events
                // Card content
                card.innerHTML = `
                    <h4>${app.firstName} ${app.lastName} (${app.nickname})</h4>
                    <p><strong>สถานะ:</strong> ${app.isForfeited ? 'สละสิทธิ์' : app.status}</p>
                    <p><strong>คณะ:</strong> ${app.faculty}</p>
                    <p><strong>ชั้นปี:</strong> ${app.year}</p>
                `;
                // Add click listener to show details (disabled if forfeited)
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
        // Find applicant data
        const applicant = allData.find(a => a.id === applicantId);
        // Handle cases where applicant not found or is forfeited
        if (!applicant || applicant.isForfeited) {
             scoringViewBody.innerHTML = '<p>ไม่สามารถแสดงข้อมูลผู้ที่สละสิทธิ์แล้ว</p>';
             // Ensure no card remains visually active if forfeited applicant somehow triggered this
              document.querySelectorAll('.info-card.active-card').forEach(card => card.classList.remove('active-card'));
             return;
        }
        // Get existing scores and details, or use empty objects if none exist
        const scores = applicant.interviewScores || {};
        const details = applicant.interviewDetails || {};
        // Visually mark the clicked card as active
        document.querySelectorAll('.info-card.active-card').forEach(card => card.classList.remove('active-card'));
        if (clickedCardElement) {
            clickedCardElement.classList.add('active-card');
        }
        // Prepare display strings/elements
        const onlineStatus = applicant.Online ? '<span style="color: purple; font-weight: bold;"> (Online Interview ⭐️)</span>' : '';
        const displaySlot = applicant.Online ? 'Online Special' : (applicant.interviewSlot || 'N/A');
        const imagePreviewHTML = applicant.applicantImage
            ? `<img src="${applicant.applicantImage}" alt="Applicant Photo">` // Show image if URL exists
            : `<p>ยังไม่มีรูปภาพ</p>`; // Placeholder text if no image

        // Generate the HTML for the scoring/details view
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
                                    <p><strong>13)</strong> กฎค่าย 9 ข้อ ตั้งมาเพื่อจุดประสงค์ที่อยากรบกวนชาวบ้านให้น้อยที่สุด (ทวนกฎค่ายให้ฟัง) คิดเห็นยังไงกับกฎค่าย มีคำถามเกี่ยวกับกฎค่ายหรือรู้สึกว่ามีข้อไหนที่ควรปรับแก้หรือยืดหยุ่นได้มั้ย? <small><i><strong>กฎค่าย 9 ข้อ</strong><ul>
                                        <li>ข้อที่ 1 ห้ามมีความสัมพันธ์เชิงชู้สาว</li>
                                        <li>ข้อที่ 2 ห้ามใช้สิ่งเสพติดและสิ่งมึนเมาทุกชนิด</li>
                                        <li>ข้อที่ 3 ห้ามใช้โทรศัพท์ขณะทํากิจกรรม (ยกเว้นถ่ายรูป)</li>
                                        <li>ข้อที่ 4 ห้ามซื้อ/ขายของจากชาวบ้าน</li>
                                        <li>ข้อที่ 5 ห้ามใช้ไฟฟ้าของโรงเรียน</li>
                                        <li>ข้อที่ 6 ห้ามทำงานข้ามโครง</li>
                                        <li>ข้อที่ 7 ห้ามไปไหนคนเดียวตอนโครงเรียน</li>
                                        <li>ข้อที่ 8 ห้ามออกนอกพื้นที่โรงเรียน (ยกเว้นขอบเขตพื้นที่ของบางกิจกรรม)</li>
                                        <li>ข้อที่ 9 ตรงต่อเวลา</li>
                                    </ul></i></small></p>
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
                                <ul><li>รับลูกค่าย 11-13 คน</li><li>ประกาศผลวันที่ 27 ตุลาคม</li><li>จะโทรไปแจ้งหากติดค่าย</li><li>ถ้าติดค่ายมีค่าใช้จ่ายไม่เกิน 500 บาท</li></ul>
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

    // Switches view to the applicant list for the given table number
    const showApplicantListView = (tableNumber) => {
        currentTable = tableNumber;
        tableTitle.textContent = `รายชื่อผู้สมัครโต๊ะ ${currentTable}`;
        tableSelectionView.classList.add('hidden'); // Hide selection view
        applicantListView.classList.remove('hidden'); // Show list view

        // Stop previous listener if exists and start new one
        if (unsubscribe) unsubscribe();
        unsubscribe = Database.onDataChange(newData => {
            const isFirstLoad = allData.length === 0;
            allData = newData; // Update local data cache

            if (isFirstLoad) {
                populateDateFilter(); // Set up date filter on first load
            }

            renderApplicantCards(); // Render cards based on the new data and current date filter

            // --- Attempt to show linked applicant after cards are rendered ---
            if (linkedApplicantId && !initialApplicantShown && allData.length > 0) {
                console.log(`Attempting to show linked applicant ID: ${linkedApplicantId}`);
                const applicantToShow = allData.find(app => app.id == linkedApplicantId); // Find applicant data

                if (applicantToShow && !applicantToShow.isForfeited) { // If found and not forfeited
                    const applicantDate = parseDateFromSlot(applicantToShow.interviewSlot);
                    const selectedDate = interviewDateFilter.value;

                    // 1. Check if the applicant's date matches the currently selected date filter
                    if (applicantDate && applicantDate === selectedDate) {
                        const cardElement = cardsContainer.querySelector(`.info-card[data-applicant-id="${linkedApplicantId}"]`);
                        if (cardElement) {
                            console.log(`Applicant ${linkedApplicantId} found on selected date ${selectedDate}. Showing details.`);
                            showScoringDetails(applicantToShow.id, cardElement); // Show details directly
                            initialApplicantShown = true; // Mark as shown
                        } else {
                            console.warn(`Card element for applicant ID ${linkedApplicantId} not found even though date matches.`);
                            if(scoringViewBody) scoringViewBody.innerHTML = `<p>พบข้อผิดพลาด: ไม่พบการ์ดผู้สมัคร ID ${linkedApplicantId}</p>`;
                             initialApplicantShown = true;
                        }
                    } else if (applicantDate && applicantDate !== selectedDate) {
                        // 2. Date mismatch, try switching the date filter
                        console.log(`Applicant ${linkedApplicantId} date (${applicantDate}) mismatch with selected date (${selectedDate}). Attempting to switch.`);
                        const dateOptionExists = Array.from(interviewDateFilter.options).some(option => option.value === applicantDate);

                        if (dateOptionExists) {
                            interviewDateFilter.value = applicantDate; // Change dropdown selection
                            renderApplicantCards(); // Re-render cards for the new date

                            // Use setTimeout to allow DOM to update before finding the card
                            setTimeout(() => {
                                const cardElement = cardsContainer.querySelector(`.info-card[data-applicant-id="${linkedApplicantId}"]`);
                                if (cardElement) {
                                     console.log(`Applicant ${linkedApplicantId} found after switching to date ${applicantDate}. Showing details.`);
                                    showScoringDetails(applicantToShow.id, cardElement);
                                } else {
                                     console.warn(`Card element for applicant ID ${linkedApplicantId} still not found after switching date.`);
                                      if(scoringViewBody) scoringViewBody.innerHTML = `<p>พบข้อผิดพลาดหลังสลับวันที่: ไม่พบการ์ดผู้สมัคร ID ${linkedApplicantId}</p>`;
                                }
                                initialApplicantShown = true; // Mark as handled
                            }, 0); // Delay of 0ms is enough to yield to browser rendering

                        } else {
                             // Applicant's date doesn't exist in the filter (shouldn't happen if data is consistent)
                             console.warn(`Applicant ${linkedApplicantId}'s date (${applicantDate}) is not available in the date filter options.`);
                             if(scoringViewBody) scoringViewBody.innerHTML = `<p>ไม่พบวันที่ (${applicantDate}) ของผู้สมัคร ID ${linkedApplicantId} ในตัวเลือก</p>`;
                             initialApplicantShown = true;
                        }
                    } else {
                         // Applicant found, but has no assigned date
                         console.warn(`Linked applicant ID ${linkedApplicantId} found but has no interview date.`);
                         if(scoringViewBody) scoringViewBody.innerHTML = `<p>ผู้สมัคร ID ${linkedApplicantId} ยังไม่มีการกำหนดวันสัมภาษณ์</p>`;
                         initialApplicantShown = true;
                    }

                } else if (applicantToShow && applicantToShow.isForfeited) {
                    // Linked applicant is forfeited
                    console.warn(`Linked applicant ID ${linkedApplicantId} is forfeited.`);
                    if(scoringViewBody) scoringViewBody.innerHTML = `<p>ผู้สมัคร ID ${linkedApplicantId} ได้สละสิทธิ์แล้ว</p>`;
                    initialApplicantShown = true;
                } else {
                    // Linked applicant ID not found in the dataset
                    console.warn(`Linked applicant ID ${linkedApplicantId} not found in current data set.`);
                    if(scoringViewBody) scoringViewBody.innerHTML = `<p>ไม่พบข้อมูลผู้สมัคร ID ${linkedApplicantId}</p>`;
                    initialApplicantShown = true;
                }
            }
        });
    };

    // --- Event Listeners ---

    // Confirm button on table selection screen
    confirmTableBtn.addEventListener('click', () => {
        const selectedTable = parseInt(tableSelect.value, 10);
        if (selectedTable) {
            localStorage.setItem(LOCAL_STORAGE_KEY, selectedTable.toString()); // Save selected table
            linkedApplicantId = null; // Clear any direct link ID if user selects manually
            initialApplicantShown = false;
            showApplicantListView(selectedTable); // Show the list view
        }
    });

    // Back button on applicant list screen
    backToSelectionBtn.addEventListener('click', () => {
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear saved table
        linkedApplicantId = null; // Clear direct link ID
        initialApplicantShown = false;
        // Reset state and switch views
        currentTable = null;
        allData = [];
        tableSelectionView.classList.remove('hidden');
        applicantListView.classList.add('hidden');
        if (scoringViewBody) {
             scoringViewBody.innerHTML = '<p>กรุณาเลือกโต๊ะและผู้สมัคร</p>'; // Reset scoring view
        }
        if (unsubscribe) {
            unsubscribe(); // Stop listening to Firebase data changes
            unsubscribe = null;
        }
    });

    // Date filter dropdown change
    interviewDateFilter.addEventListener('change', () => {
        renderApplicantCards(); // Re-render cards for the new date
        scoringViewBody.innerHTML = '<p>กรุณาเลือกผู้สมัครเพื่อดูรายละเอียด</p>'; // Clear details view
        // Deselect any active card visually
        document.querySelectorAll('.info-card.active-card').forEach(card => {
            card.classList.remove('active-card');
        });
    });

    // Event listeners for the scoring view body (delegated)
    if (scoringViewBody) {

        // Handle click on the "Upload Image" button
        scoringViewBody.addEventListener('click', (e) => {
            if (e.target.id === 'upload-image-btn') {
                // Trigger click on the hidden file input
                const uploadInput = scoringViewBody.querySelector('#applicant-image-upload');
                if (uploadInput) uploadInput.click();
            }
        });

        // Handle form submission (saving scores and details)
        scoringViewBody.addEventListener('submit', (e) => {
            if (e.target.id === 'scoring-form') {
                e.preventDefault(); // Prevent default form submission
                const applicantId = parseInt(e.target.dataset.id, 10);
                if (!applicantId) return; // Exit if no applicant ID found

                // Function to safely get score values (uses parseFloat for .5 scores)
                const getScoreValue = (id) => {
                    const select = document.getElementById(id);
                    return select ? parseFloat(select.value) : -1; // Default to N/A (-1)
                };

                // Collect all scores into an object
                const interviewScores = {
                    application: getScoreValue('score-application'),
                    q2a: getScoreValue('score-q2a'), q2b: getScoreValue('score-q2b'),
                    q4a: getScoreValue('score-q4a'), q4b: getScoreValue('score-q4b'),
                    q5: getScoreValue('score-q5'), q6: getScoreValue('score-q6'),
                    q7a: getScoreValue('score-q7a'), q7b: getScoreValue('score-q7b'),
                    q8a: getScoreValue('score-q8a'), q8b: getScoreValue('score-q8b'),
                    q13: getScoreValue('score-q13'), // Include Q13 score
                    qSpecial: getScoreValue('score-qSpecial'),
                };

                // Collect all details/notes into an object
                const interviewDetails = {
                    application: document.getElementById('detail-application')?.value || '',
                    q1: document.getElementById('detail-q1')?.value || '',
                    q2a: document.getElementById('detail-q2a')?.value || '', q2b: document.getElementById('detail-q2b')?.value || '',
                    q3: document.getElementById('detail-q3')?.value || '',
                    q4a: document.getElementById('detail-q4a')?.value || '', q4b: document.getElementById('detail-q4b')?.value || '',
                    q5: document.getElementById('detail-q5')?.value || '', q6: document.getElementById('detail-q6')?.value || '',
                    q7a: document.getElementById('detail-q7a')?.value || '', q7b: document.getElementById('detail-q7b')?.value || '',
                    q8a: document.getElementById('detail-q8a')?.value || '', q8b: document.getElementById('detail-q8b')?.value || '',
                    q9: document.getElementById('detail-q9')?.value || '',
                    q10: document.getElementById('detail-q10')?.value || '',
                    q11: document.getElementById('detail-q11')?.value || '',
                    q12: document.getElementById('detail-q12')?.value || '',
                    q13: document.getElementById('detail-q13')?.value || '',
                    general: document.getElementById('detail-general')?.value || ''
                };

                // Log data being saved (for debugging)
                console.log("Saving Scores:", interviewScores);
                console.log("Saving Details:", interviewDetails);
                // Send update to Firebase via data.js
                Database.updateApplicant(applicantId, { interviewScores, interviewDetails });
                alert('บันทึกข้อมูลสัมภาษณ์เรียบร้อย!'); // Confirmation message
            }
        });

        // Handle changes within the scoring view (score dropdowns, file input)
        scoringViewBody.addEventListener('change', (e) => {
            // Update score dropdown background color based on selection
            if (e.target.classList.contains('score-select')) {
                const select = e.target;
                select.className = 'score-select'; // Reset base class
                // Reapply specific styles if needed
                if (select.id === 'score-application') {
                    select.style.width = '70px';
                    select.style.marginLeft = '10px';
                }

                const selectedOption = select.options[select.selectedIndex];
                const selectedValue = parseFloat(selectedOption.value);
                let cssClass = 'score-na'; // Default class

                // Determine CSS class based on score value (consistent with createScoreDropdown)
                 if (select.id === 'score-application') {
                    if (selectedValue >= 9) cssClass = 'score-5';
                    else if (selectedValue >= 7) cssClass = 'score-4';
                    else if (selectedValue >= 5) cssClass = 'score-3';
                    else if (selectedValue >= 3) cssClass = 'score-2';
                    else if (selectedValue >= 1) cssClass = 'score-1';
                    else if (selectedValue >= 0) cssClass = 'score-0';
                 } else { // Standard 0-5
                    if (selectedValue === 5) cssClass = 'score-5';
                    else if (selectedValue === 4) cssClass = 'score-4';
                    else if (selectedValue === 3) cssClass = 'score-3';
                    else if (selectedValue === 2) cssClass = 'score-2';
                    else if (selectedValue === 1) cssClass = 'score-1';
                    else if (selectedValue === 0) cssClass = 'score-0';
                 }
                select.classList.add(cssClass); // Add the new color class
            }

            // Handle image file selection and upload to Firebase Storage
            if (e.target.id === 'applicant-image-upload') {
                const file = e.target.files[0]; // Get the selected file
                const applicantId = parseInt(e.target.dataset.id, 10);
                if (!file || !applicantId) return; // Exit if no file or ID

                const previewContainer = scoringViewBody.querySelector('#image-preview-container');
                const progressBar = scoringViewBody.querySelector('#upload-progress');

                // Create a unique file path in Storage
                const fileName = `${new Date().getTime()}_${file.name}`;
                const storageRef = Database.storage.ref(`applicant_images/${applicantId}/${fileName}`);
                // Start the upload task
                const uploadTask = storageRef.put(file);

                // Show progress bar and initial status message
                progressBar.style.display = 'block';
                previewContainer.innerHTML = `<p>กำลังอัปโหลด... 0%</p>`;

                // Listen for state changes, errors, and completion of the upload.
                uploadTask.on('state_changed',
                    (snapshot) => {
                        // Update progress bar
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        progressBar.value = progress;
                        previewContainer.innerHTML = `<p>กำลังอัปโหลด... ${Math.round(progress)}%</p>`;
                    },
                    (error) => {
                        // Handle unsuccessful uploads
                        console.error('Upload failed:', error);
                        alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ' + error.message);
                        progressBar.style.display = 'none';
                        previewContainer.innerHTML = `<p>การอัปโหลดล้มเหลว</p>`;
                    },
                    () => {
                        // Handle successful uploads on complete
                        progressBar.style.display = 'none';
                        previewContainer.innerHTML = `<p>อัปโหลดสำเร็จ! กำลังบันทึก...</p>`;

                        // Get the download URL
                        uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                            console.log('File available at', downloadURL);
                            // Update the applicant's record in Realtime Database with the image URL
                            Database.updateApplicant(applicantId, { applicantImage: downloadURL });
                            // Display the uploaded image in the preview container
                            previewContainer.innerHTML = `<img src="${downloadURL}" alt="Applicant Photo">`;
                        });
                    }
                );
            }
        });

    } else {
        console.warn("Could not attach listeners: Element 'scoring-view-body' not found.");
    }

    // --- Initialization Logic (Check URL Params first, then localStorage) ---
    const urlParams = new URLSearchParams(window.location.search);
    const urlTable = urlParams.get('table');
    const urlId = urlParams.get('id');

    if (urlTable && urlId) {
        // Direct link scenario: Use table and ID from URL
        console.log(`Direct link detected: table=${urlTable}, id=${urlId}`);
        const tableNum = parseInt(urlTable, 10);
        linkedApplicantId = parseInt(urlId, 10); // Store the target applicant ID
        initialApplicantShown = false; // Reset flag to ensure we try to show them
        // Save the table from the URL to localStorage so refresh works
        localStorage.setItem(LOCAL_STORAGE_KEY, tableNum.toString());
        showApplicantListView(tableNum); // Show the applicant list view directly
    } else {
        // Normal load: Check if a table was saved in localStorage
        const savedTable = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedTable) {
            // Saved table found: Show that table's list view
            console.log(`Found saved table: ${savedTable}. Skipping selection.`);
            linkedApplicantId = null; // Ensure no linked ID interferes
            initialApplicantShown = false;
            showApplicantListView(parseInt(savedTable, 10));
        } else {
            // No saved table and no direct link: Show the initial table selection screen
            console.log("No saved table or direct link. Showing table selection.");
            tableSelectionView.classList.remove('hidden');
            applicantListView.classList.add('hidden');
        }
    }

}); // End DOMContentLoaded wrapper