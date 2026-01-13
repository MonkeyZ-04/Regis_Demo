// public/admin.js (Version Update: Centralized Config)

document.addEventListener('DOMContentLoaded', () => {
    // Get references to DOM elements
    const adminOverview = document.getElementById('admin-overview');
    const canvasElement = document.getElementById('score-chart');
    const rankedListContainer = document.getElementById('ranked-list-container');
    const tableFilter = document.getElementById('table-filter'); // Filter dropdown

    // Declare variables for chart and data
    let scoreChartCtx;
    let chartInstance;
    let allData = [];

    // --- Safety Check for critical elements ---
    if (!adminOverview || !canvasElement || !rankedListContainer || !tableFilter) {
        console.error("Admin Dashboard Error: One or more critical elements are missing!");
        document.body.innerHTML = '<p style="color: red; padding: 20px;">เกิดข้อผิดพลาด: ไม่พบ Element สำคัญบนหน้าเว็บ (admin.js)</p>';
        return; 
    }
    
    scoreChartCtx = canvasElement.getContext('2d');
    if (!scoreChartCtx) {
        console.error("Admin Dashboard Error: Could not get 2D context for score chart canvas!");
        document.body.innerHTML = '<p style="color: red; padding: 20px;">เกิดข้อผิดพลาด: ไม่สามารถโหลด Canvas ของกราฟได้ (admin.js)</p>';
        return; 
    }

    // --- Helper functions ---

    // ⭐️⭐️⭐️ [แก้ไข] ดึง Config จาก Database.config ใน data.js แทนการ Hardcode ⭐️⭐️⭐️
    // ตรวจสอบว่ามี Database.config หรือไม่ (ป้องกัน Error หากโหลด data.js ไม่ทัน)
    if (typeof Database === 'undefined' || !Database.config) {
        console.error("Critical Error: Database.config not found. Please check data.js");
        alert("ไม่พบการตั้งค่าระบบ (Database.config) กรุณาตรวจสอบไฟล์ data.js");
        return;
    }

    const SCORE_KEYS = Database.config.getScoreKeys();       // รายการ Key ที่เป็นคะแนน เช่น ['q2a', 'q4b', ...]
    const SCORE_LABELS = Database.config.getScoreLabels();   // ชื่อแสดงผล เช่น { q2a: '2a', ... }
    const SCORE_WEIGHTS = Database.config.getScoreWeights(); // น้ำหนักคะแนน เช่น { q2a: 0.5, q4a: 3 }


    // --- Calculate total score using weights ---
    const calculateTotalScore = (scores) => {
        if (!scores || typeof scores !== 'object') return 0; 
        let total = 0;
        
        SCORE_KEYS.forEach(key => {
            const numericScore = parseFloat(scores[key]); 
            
            // Get weight from the centralized config
            const weight = SCORE_WEIGHTS[key] || 0; 

            // Add weighted score only if it's a number and valid (>= 0)
            if (!isNaN(numericScore) && numericScore >= 0) {
                total += (numericScore * weight);
            }
        });
        
        // Round to 2 decimal places
        return Math.round(total * 100) / 100;
    };


    // Format individual scores for display (N/A, -, X, X.5)
    const formatScore = (scoreValue) => {
        const numericScore = parseFloat(scoreValue);
        if (numericScore === -1) return 'N/A'; 
        if (isNaN(numericScore)) return '-';   
        
        if (numericScore % 1 !== 0) {
            return numericScore.toFixed(2).replace(/\.?0+$/, ''); 
        }
        return numericScore.toFixed(0);
    };

    // --- Main Rendering Function ---
    function renderAdminView() {
        const selectedTable = tableFilter.value;

        // Filter data for the Kanban board
        const filteredBoardData = (selectedTable === 'all')
            ? allData 
            : allData.filter(app => app.table == selectedTable);

        // --- Render Overview Board (Kanban) ---
        adminOverview.innerHTML = ''; 
        const columns = {};
        
        const tablesToDisplay = (selectedTable === 'all')
            ? Array.from({ length: 9 }, (_, i) => i + 1)
            : [parseInt(selectedTable, 10)];

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

            if (items.length === 0 && forfeitedItems.length === 0) {
                itemsHtml = '<p class="no-items">ว่าง</p>';
            }

            const activeCount = items.length;
            columnEl.innerHTML = `<h2>โต๊ะ ${tableNumber} (${activeCount})</h2><div class="kanban-items">${itemsHtml}</div>`;
            adminOverview.appendChild(columnEl);
        });

        if (Object.keys(columns).length === 0 && selectedTable !== 'all') {
             adminOverview.innerHTML = `<p style="text-align: center; color: #888;">ยังไม่มีผู้สมัครสำหรับโต๊ะ ${selectedTable}</p>`;
        } else if (allData.length === 0) {
            adminOverview.innerHTML = `<p style="text-align: center; color: #888;">ยังไม่มีข้อมูลผู้สมัคร</p>`;
        }


        // --- Prepare data for Chart and Ranked List ---
        let activeApplicants = allData.filter(app => !app.isForfeited);

        const rankedListApplicants = (selectedTable === 'all')
            ? activeApplicants 
            : activeApplicants.filter(app => app.table == selectedTable);

        // --- Render Score Chart ---
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
                     plugins: {
                         legend: { display: false },
                         title: { display: true, text: 'สรุปคะแนนรวมผู้สมัคร (เรียงจากมากไปน้อย - ไม่รวมผู้สละสิทธิ์)' }
                    }
                 }
             });
        } catch (chartError) {
            console.error("Error initializing chart:", chartError);
            if(canvasElement) canvasElement.parentElement.innerHTML = `<p style="color: red;">เกิดข้อผิดพลาดในการสร้างกราฟ</p>`;
        }

        // --- Render Ranked Score List ---
        rankedListContainer.innerHTML = ''; 

        const applicantsWithScores = rankedListApplicants.map(app => ({
            applicant: app,
            totalScore: calculateTotalScore(app.interviewScores)
        }));

        applicantsWithScores.sort((a, b) => b.totalScore - a.totalScore);

        if (applicantsWithScores.length === 0) {
            rankedListContainer.innerHTML = (selectedTable === 'all')
                ? '<p>ยังไม่มีข้อมูลคะแนนผู้สมัคร</p>'
                : `<p>ยังไม่มีข้อมูลคะแนนผู้สมัครสำหรับโต๊ะ ${selectedTable}</p>`;
        } else {
            applicantsWithScores.forEach(({ applicant, totalScore }, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'ranking-item';
                itemDiv.dataset.applicantId = applicant.id; 
                const scores = applicant.interviewScores || {};
                const imgUrl = applicant.applicantImage || 'placeholder.png'; 

                // Build HTML for score breakdown using Dynamic Keys/Labels
                let breakdownHtml = '<div class="ranking-item-score-breakdown">';
                SCORE_KEYS.forEach(key => {
                    const label = SCORE_LABELS[key] || key; 
                    const scoreValue = formatScore(scores[key]); 
                    breakdownHtml += `<span class="score-pair"><span class="score-label">${label}:</span> <span class="score-value">${scoreValue}</span></span>`;
                });
                breakdownHtml += '</div>';

                itemDiv.innerHTML = `
                    <div class="ranking-item-image">
                        <img src="${imgUrl}" alt="${applicant.nickname}" onerror="this.src='placeholder.png'; this.alt='Placeholder Image';">
                    </div>
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

    // --- Event Listeners ---
    tableFilter.addEventListener('change', renderAdminView);

    rankedListContainer.addEventListener('click', (e) => {
        const targetItem = e.target.closest('.ranking-item');
        if (targetItem && targetItem.dataset.applicantId) {
            const applicantId = targetItem.dataset.applicantId;
            const applicant = allData.find(app => app.id == applicantId); 
            if (applicant && applicant.table) { 
                const url = `interviewer.html?table=${applicant.table}&id=${applicantId}`;
                window.open(url, '_blank');
            } else {
                alert(`เกิดข้อผิดพลาด: ไม่พบข้อมูลผู้สมัครหรือโต๊ะสำหรับ ID: ${applicantId}`);
            }
        }
    });

    // --- Real-time Listener Setup ---
    console.log("Admin elements found, setting up Firebase listener...");
    if (typeof Database !== 'undefined' && Database.onDataChange) {
        Database.onDataChange(newData => {
            console.log("Received data from Firebase:", newData.length, "items");
            allData = newData; 
            try {
                 if (!adminOverview || !scoreChartCtx || !rankedListContainer) {
                    return;
                 }
                renderAdminView(); 
            } catch (renderError) {
                console.error("Error during renderAdminView:", renderError);
                if (rankedListContainer) rankedListContainer.innerHTML = `<p style="color: red;">เกิดข้อผิดพลาดในการแสดงผล: ${renderError.message}</p>`;
            }
        });
    } else {
        console.error("Admin Dashboard Error: Database object not found.");
        if(rankedListContainer) rankedListContainer.innerHTML = '<p style="color: red;">เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล</p>';
    }

});