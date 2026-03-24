// public/admin.js

document.addEventListener('DOMContentLoaded', () => {
    const adminOverview = document.getElementById('admin-overview');
    const canvasElement = document.getElementById('score-chart');
    const rankedListContainer = document.getElementById('ranked-list-container');
    const tableFilter = document.getElementById('table-filter');

    let scoreChartCtx;
    let chartInstance;
    let allData = [];

    if (!adminOverview || !canvasElement || !rankedListContainer || !tableFilter) {
        return; 
    }
    
    scoreChartCtx = canvasElement.getContext('2d');
    if (!scoreChartCtx) return; 

    if (typeof Database === 'undefined' || !Database.config) {
        alert("ไม่พบการตั้งค่าระบบ กรุณาตรวจสอบไฟล์ data.js");
        return;
    }

    const SCORE_KEYS = Database.config.getScoreKeys();
    const SCORE_LABELS = Database.config.getScoreLabels();
    const SCORE_WEIGHTS = Database.config.getScoreWeights();

    // ⭐️ Calculate Total Score (with rounding down .5) ⭐️
    const calculateTotalScore = (scores) => {
        if (!scores || typeof scores !== 'object') return 0; 
        let total = 0;
        
        SCORE_KEYS.forEach(key => {
            const numericScore = parseFloat(scores[key]); 
            const weight = SCORE_WEIGHTS[key] || 0; 

            if (!isNaN(numericScore) && numericScore >= 0) {
                // ⭐️ ปัดเศษ .5 ทิ้งก่อนคูณน้ำหนัก (ตาม Requirement)
                const scoreToCalc = Math.floor(numericScore);
                total += (scoreToCalc * weight);
            }
        });
        
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
        const sortedForChart = [...activeApplicants].sort((a, b) => calculateTotalScore(b.interviewScores) - calculateTotalScore(a.interviewScores));
        const chartLabels = sortedForChart.map(app => app.nickname);
        const chartTotalScores = sortedForChart.map(app => calculateTotalScore(app.interviewScores));
        
        if (chartInstance) { chartInstance.destroy(); } 
        try {
            chartInstance = new Chart(scoreChartCtx, {
                 type: 'bar',
                 data: {
                     labels: chartLabels,
                     datasets: [{
                         label: 'คะแนนรวม (N/A = 0)',
                         data: chartTotalScores,
                         backgroundColor: 'rgba(54, 162, 235, 0.6)',
                         borderColor: 'rgba(54, 162, 235, 1)',
                         borderWidth: 1
                    }]
                 },
                 options: {
                     indexAxis: 'y', 
                     scales: { x: { beginAtZero: true } },
                     plugins: { legend: { display: false }, title: { display: true, text: 'สรุปคะแนนรวมผู้สมัคร (เรียงจากมากไปน้อย - ไม่รวมผู้สละสิทธิ์)' } }
                 }
             });
        } catch (chartError) {}

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
});