// public/admin.js

document.addEventListener('DOMContentLoaded', () => {
    const adminOverview = document.getElementById('admin-overview');
    const rankedListContainer = document.getElementById('ranked-list-container');
    const tableFilter = document.getElementById('table-filter');

    let allData = [];

    // เช็คแค่ element ที่มีอยู่จริง
    if (!adminOverview || !rankedListContainer || !tableFilter) {
        return; 
    }

    if (typeof Database === 'undefined' || !Database.config) {
        alert("ไม่พบการตั้งค่าระบบ กรุณาตรวจสอบไฟล์ data.js");
        return;
    }

    const SCORE_KEYS = Database.config.getScoreKeys();
    const SCORE_LABELS = Database.config.getScoreLabels();
    const SCORE_WEIGHTS = Database.config.getScoreWeights();

    // ⭐️ Calculate Total Score (with Custom Algorithm) ⭐️
    const calculateTotalScore = (scores) => {
        if (!scores || typeof scores !== 'object') return 0; 
        
        let baseScore = 0;        
        let appScoreTotal = 0;    
        let assessClubScore = -1; 
        
        SCORE_KEYS.forEach(key => {
            const numericScore = parseFloat(scores[key]); 
            const weight = SCORE_WEIGHTS[key] || 0; 

            if (!isNaN(numericScore) && numericScore >= 0) {
                const scoreToCalc = Math.floor(numericScore);
                
                if (key === 'application') {
                    appScoreTotal = (scoreToCalc * weight);
                } else if (key === 'assess_club') {
                    assessClubScore = scoreToCalc;
                } else {
                    baseScore += (scoreToCalc * weight);
                }
            }
        });
        
        let multiplier = 1; 
        if (assessClubScore === 0) multiplier = 0;
        else if (assessClubScore === 1) multiplier = 0.875;
        else if (assessClubScore === 2) multiplier = 0.9375;
        else if (assessClubScore === 3) multiplier = 1;
        else if (assessClubScore === 4) multiplier = 1.0625;
        else if (assessClubScore === 5) multiplier = 1.125;

        let adjustedBaseScore = baseScore * multiplier;
        let total = adjustedBaseScore + appScoreTotal;
        return Math.round(total * 100) / 100;
    };

    const formatScore = (scoreValue) => {
        const numericScore = parseFloat(scoreValue);
        if (numericScore === -1) return 'N/A'; 
        if (isNaN(numericScore)) return '-';   
        if (numericScore % 1 !== 0) {
            return numericScore.toFixed(2).replace(/\.?0+$/, ''); 
        }
        return numericScore.toFixed(0);
    };

    function renderAdminView() {
        const selectedTable = tableFilter.value;
        const filteredBoardData = (selectedTable === 'all') ? allData : allData.filter(app => app.table == selectedTable);

        adminOverview.innerHTML = ''; 
        const columns = {};
        const tablesToDisplay = (selectedTable === 'all') ? Array.from({ length: 9 }, (_, i) => i + 1) : [parseInt(selectedTable, 10)];

        tablesToDisplay.forEach(tableNum => { columns[`table-${tableNum}`] = []; });
        filteredBoardData.forEach(item => {
            if (!item.isForfeited && item.table && columns[`table-${item.table}`]) {
                columns[`table-${item.table}`].push(item);
            }
        });

        Object.entries(columns).forEach(([columnId, items]) => {
            const tableNumber = columnId.split('-')[1];
            const columnEl = document.createElement('div');
            columnEl.className = 'kanban-column';
            let itemsHtml = items.map(app => {
                let cardClasses = ['applicant-card', 'small'];
                cardClasses.push(app.status ? app.status.toLowerCase() : 'pending');
                if (app.status === 'Pending' && app.isCalled) { cardClasses.push('called'); }
                return `<div class="${cardClasses.join(' ')}">${app.nickname} <span class="status ${app.status ? app.status.toLowerCase() : 'pending'}">${app.status ? app.status.charAt(0) : 'P'}</span></div>`;
            }).join('');
            
            const forfeitedItems = allData.filter(app => app.isForfeited && app.table == tableNumber);
            if (forfeitedItems.length > 0) {
                 itemsHtml += '<hr style="border-top: 1px dashed #ccc; margin: 10px 0;">'; 
                 itemsHtml += forfeitedItems.map(app => `<div class="applicant-card small forfeited">${app.nickname} <span class="status pending">F</span></div>`).join('');
            }
            if (items.length === 0 && forfeitedItems.length === 0) itemsHtml = '<p class="no-items">ว่าง</p>';
            const activeCount = items.length;
            columnEl.innerHTML = `<h2>โต๊ะ ${tableNumber} (${activeCount})</h2><div class="kanban-items">${itemsHtml}</div>`;
            adminOverview.appendChild(columnEl);
        });

        let activeApplicants = allData.filter(app => !app.isForfeited);
        const rankedListApplicants = (selectedTable === 'all') ? activeApplicants : activeApplicants.filter(app => app.table == selectedTable);

        rankedListContainer.innerHTML = ''; 
        const applicantsWithScores = rankedListApplicants.map(app => ({
            applicant: app,
            totalScore: calculateTotalScore(app.interviewScores)
        }));
        applicantsWithScores.sort((a, b) => b.totalScore - a.totalScore);

        if (applicantsWithScores.length === 0) {
            rankedListContainer.innerHTML = (selectedTable === 'all') ? '<p>ยังไม่มีข้อมูลคะแนนผู้สมัคร</p>' : `<p>ยังไม่มีข้อมูลคะแนนผู้สมัครสำหรับโต๊ะ ${selectedTable}</p>`;
        } else {
            applicantsWithScores.forEach(({ applicant, totalScore }, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'ranking-item';
                itemDiv.dataset.applicantId = applicant.id; 
                const scores = applicant.interviewScores || {};
                const imgUrl = applicant.applicantImage || 'placeholder.png'; 

                let breakdownHtml = '<div class="ranking-item-score-breakdown">';
                SCORE_KEYS.forEach(key => {
                    const label = SCORE_LABELS[key] || key; 
                    const scoreValue = formatScore(scores[key]); 
                    breakdownHtml += `<span class="score-pair"><span class="score-label">${label}:</span> <span class="score-value">${scoreValue}</span></span>`;
                });
                breakdownHtml += '</div>';

                itemDiv.innerHTML = `
                    <div class="ranking-item-image"><img src="${imgUrl}" alt="${applicant.nickname}" onerror="this.src='placeholder.png';"></div>
                    <div class="ranking-item-info">
                        <div class="ranking-item-header">
                             <span class="ranking-number">${index + 1}.</span>
                             <span class="ranking-name">${applicant.firstName} (${applicant.nickname} ปี ${(applicant.year || '').replace(/[^0-9]/g, '')}) โต๊ะ ${applicant.table}</span>
                             <span class="ranking-total-score">รวม: ${formatScore(totalScore)}</span>
                             
                             <button onclick="event.stopPropagation(); showApplicantChart(${applicant.id});" style="background-color: #6f42c1; color: white; border: none; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 12px; margin-left: 10px;">📊 ดูกราฟวิเคราะห์</button>

                        </div>
                        ${breakdownHtml}
                    </div>
                `;
                rankedListContainer.appendChild(itemDiv);
            });
        }
    }

    tableFilter.addEventListener('change', renderAdminView);
    rankedListContainer.addEventListener('click', (e) => {
        const targetItem = e.target.closest('.ranking-item');
        if (targetItem && targetItem.dataset.applicantId) {
            const applicantId = targetItem.dataset.applicantId;
            const applicant = allData.find(app => app.id == applicantId); 
            if (applicant && applicant.table) { 
                window.open(`interviewer.html?table=${applicant.table}&id=${applicantId}`, '_blank');
            }
        }
    });

    if (typeof Database !== 'undefined' && Database.onDataChange) {
        Database.onDataChange(newData => {
            allData = newData; 
            if (adminOverview) renderAdminView(); 
        });
    }

    // ==========================================
    // [ ระบบวิเคราะห์คะแนน Radar Chart รายบุคคล ]
    // ==========================================
    let radarChartInstance = null;

    const scoreCategories = {
        'การรับมือและแก้ปัญหา': { ids: ['q2a', 'q2b'], color: '#ff9f40' },
        'การทำงานเป็นทีม': { ids: ['q4a', 'q4b'], color: '#4bc0c0' },
        'ความเข้าใจชาติพันธุ์': { ids: ['q5a', 'q5b'], color: '#9966ff' },
        'แรงจูงใจและความตั้งใจ': { ids: ['q6', 'q7a', 'q7b'], color: '#ff6384' },
        'ความเข้ากับชมรม (Club Fit)': { ids: ['q8a', 'q8b', 'assess_club'], color: '#36a2eb' },
        'กฎระเบียบและการปรับตัว': { ids: ['q14'], color: '#ffcd56' }
    };

    window.showApplicantChart = (applicantId) => {
        const applicant = allData.find(a => a.id === applicantId);
        if (!applicant) return;

        document.getElementById('chart-applicant-name').innerText = `วิเคราะห์คะแนน: ${applicant.firstName} (${applicant.nickname})`;
        
        const scores = applicant.interviewScores || {};
        const labels = Object.keys(scoreCategories);
        const dataPoints = [];
        const borderColors = [];
        
        let detailsHTML = '';

        labels.forEach(catName => {
            const cat = scoreCategories[catName];
            let total = 0, count = 0;
            let scoreBreakdown = '';
            
            cat.ids.forEach(qId => {
                if (scores[qId] !== undefined) {
                    const s = parseFloat(scores[qId]);
                    if (s >= 0) { // ข้าม N/A (-1)
                        total += s;
                        count++;
                        scoreBreakdown += `<span style="font-size: 12px; background: #eee; padding: 2px 5px; border-radius: 3px; margin-right: 3px;">${qId}: ${s}</span>`;
                    }
                }
            });
            
            const avg = count > 0 ? (total / count).toFixed(2) : 0; 
            dataPoints.push(avg);
            borderColors.push(cat.color);

            detailsHTML += `
                <div style="border-left: 4px solid ${cat.color}; padding-left: 10px; background: #f9f9f9; border-radius: 4px; padding-top: 5px; padding-bottom: 5px;">
                    <strong style="color: ${cat.color}; font-size: 14px;">${catName}: ${avg} / 5</strong>
                    <div style="margin-top: 4px;">${scoreBreakdown || '<span style="color:#aaa; font-size: 12px;">ยังไม่มีคะแนน</span>'}</div>
                </div>
            `;
        });

        document.getElementById('chart-details').innerHTML = detailsHTML;

        // ⭐️ ต้องลบ class hidden เพื่อแสดง Modal ก่อน ไม่งั้น Chart.js จะวาดกราฟไม่ขึ้น (ขนาด 0x0)
        document.getElementById('chart-modal').classList.remove('hidden');

        // วาดกราฟ Radar
        const ctx = document.getElementById('radarChart').getContext('2d');
        if (radarChartInstance) radarChartInstance.destroy(); 

        radarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'คะแนนเฉลี่ยประเมินทักษะ (เต็ม 5)',
                    data: dataPoints,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)', 
                    borderColor: 'rgba(54, 162, 235, 1)',
                    pointBackgroundColor: borderColors, 
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: borderColors,
                    borderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { display: true },
                        suggestedMin: 0,
                        suggestedMax: 5,
                        ticks: { stepSize: 1, backdropColor: 'transparent' }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    };

    // ปิด Modal
    const closeChartBtn = document.getElementById('close-chart-btn');
    const chartModal = document.getElementById('chart-modal');
    if(closeChartBtn && chartModal) {
        closeChartBtn.addEventListener('click', () => chartModal.classList.add('hidden'));
        chartModal.addEventListener('click', (e) => {
            if (e.target === chartModal) chartModal.classList.add('hidden');
        });
    }

    // ==========================================
    // [ ระบบเปรียบเทียบกราฟรายบุคคล (Current vs Winter) ]
    // ==========================================
    let winterData = [];
    let compareRadarChartInstance = null;

    // ฟังก์ชันคำนวณคะแนนเฉลี่ย (รองรับข้อแตกต่างของข้อมูล Winter)
// ฟังก์ชันคำนวณคะแนนเฉลี่ย (เพิ่มตัวแปร isWinter เข้ามาเช็ค)
    const getRadarDataPoints = (scores, isWinter = false) => {
        const dataPoints = [];
        Object.keys(scoreCategories).forEach(catName => {
            const cat = scoreCategories[catName];
            let total = 0, count = 0;
            
            // ⭐️ ถ้าเป็นข้อมูล Winter และหมวดนี้คือความเข้าใจชาติพันธุ์ ให้ใช้ q5 ตรงๆ
            if (isWinter && catName === 'ความเข้าใจชาติพันธุ์') {
                if (scores['q5'] !== undefined) {
                    const num = parseFloat(scores['q5']);
                    if (!isNaN(num) && num >= 0) {
                        total += num;
                        count++;
                    }
                }
            } else {
                // สำหรับข้อมูลปัจจุบัน หรือหมวดอื่นๆ ให้ใช้ตาม scoreCategories ปกติ
                cat.ids.forEach(qId => {
                    if (scores[qId] !== undefined) {
                        const num = parseFloat(scores[qId]);
                        if (!isNaN(num) && num >= 0) { 
                            total += num;
                            count++;
                        }
                    }
                });
            }
            dataPoints.push(count > 0 ? (total / count).toFixed(2) : 0);
        });
        return dataPoints;
    };

    const populateCurrentDropdown = () => {
        const select = document.getElementById('compare-current-select');
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- เลือกผู้สมัครปัจจุบัน --</option>';
        
        allData.filter(a => !a.isForfeited).forEach(app => {
            const opt = document.createElement('option');
            opt.value = app.id;
            opt.textContent = `${app.firstName} (${app.nickname}) - โต๊ะ ${app.table}`;
            select.appendChild(opt);
        });
        if (currentVal) select.value = currentVal;
    };

    const populateWinterDropdown = () => {
        const select = document.getElementById('compare-winter-select');
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- เลือกผู้สมัคร Winter --</option>';
        
        winterData.forEach(app => {
            const opt = document.createElement('option');
            opt.value = app.id;
            opt.textContent = `${app.firstName} (${app.nickname}) - ${app.faculty || 'ไม่ระบุคณะ'}`;
            select.appendChild(opt);
        });
        if (currentVal) select.value = currentVal;
    };

    const updateCompareRadarChart = () => {
        const currentSelect = document.getElementById('compare-current-select');
        const winterSelect = document.getElementById('compare-winter-select');
        if (!currentSelect || !winterSelect) return;

        const currentId = parseInt(currentSelect.value, 10);
        const winterId = parseInt(winterSelect.value, 10);

        const currentApp = allData.find(a => a.id === currentId);
        const winterApp = winterData.find(a => a.id === winterId);

        const labels = Object.keys(scoreCategories);
        const datasets = [];

        if (currentApp) {
            datasets.push({
                label: `ปัจจุบัน: ${currentApp.nickname}`,
                // ส่ง false ไปบอกว่าเป็นข้อมูลปัจจุบัน
                data: getRadarDataPoints(currentApp.interviewScores || {}, false),
                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                borderColor: 'rgba(0, 123, 255, 1)',
                pointBackgroundColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 2,
                pointRadius: 4
            });
        }

        if (winterApp) {
            datasets.push({
                label: `Winter 2025: ${winterApp.nickname}`,
                // ⭐️ ส่ง true ไปบอกว่าเป็นข้อมูล Winter ให้ไปดึง q5 แทน
                data: getRadarDataPoints(winterApp.interviewScores || {}, true),
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                borderColor: 'rgba(255, 159, 64, 1)',
                pointBackgroundColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 2,
                pointRadius: 4
            });
        }

        const ctx = document.getElementById('compareRadarChart').getContext('2d');
        if (compareRadarChartInstance) compareRadarChartInstance.destroy();

        if (datasets.length === 0) return;

        compareRadarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: { labels: labels, datasets: datasets },
            options: {
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { display: true },
                        suggestedMin: 0,
                        suggestedMax: 5,
                        ticks: { stepSize: 1, backdropColor: 'transparent' }
                    }
                },
                plugins: {
                    legend: { position: 'top', labels: { font: { family: 'Sarabun', size: 14 } } }
                }
            }
        });
    };

    const fetchWinterData = async () => {
        try {
            const response = await fetch('winter.json');
            if (!response.ok) throw new Error('Network error');
            const data = await response.json();
            winterData = data.applicants.filter(app => app !== null);
            populateWinterDropdown();
        } catch (error) {
            console.error('Error fetching winter.json:', error);
        }
    };

    document.getElementById('compare-current-select')?.addEventListener('change', updateCompareRadarChart);
    document.getElementById('compare-winter-select')?.addEventListener('change', updateCompareRadarChart);

    fetchWinterData();

    const originalRenderAdminView = renderAdminView;
    renderAdminView = () => {
        originalRenderAdminView();
        populateCurrentDropdown();
        updateCompareRadarChart(); 
    };
});