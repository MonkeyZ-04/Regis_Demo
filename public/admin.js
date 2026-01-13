// admin.js (Version Update: Click Ranked Item opens Interviewer page in new tab)

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
        // Display error prominently if elements are missing
        document.body.innerHTML = '<p style="color: red; padding: 20px;">เกิดข้อผิดพลาด: ไม่พบ Element สำคัญบนหน้าเว็บ (admin.js)</p>';
        return; // Stop script execution
    }
    // Get chart context only if canvas exists
    scoreChartCtx = canvasElement.getContext('2d');
    if (!scoreChartCtx) {
        console.error("Admin Dashboard Error: Could not get 2D context for score chart canvas!");
        document.body.innerHTML = '<p style="color: red; padding: 20px;">เกิดข้อผิดพลาด: ไม่สามารถโหลด Canvas ของกราฟได้ (admin.js)</p>';
        return; // Stop script execution
    }

    // --- Helper functions ---

    // Define the keys used for scoring
    const SCORE_KEYS = [
        'application', 'q2a', 'q2b', 'q4a', 'q4b',
        'q5', 'q6', 'q7a', 'q7b', 'q8a', 'q8b',
        'q13', 'qSpecial'
    ];
    // Define display labels for score keys (optional)
    const SCORE_LABELS = {
        'application': 'ใบสมัคร', 'q2a': '2a', 'q2b': '2b', 'q4a': '4a', 'q4b': '4b',
        'q5': '5', 'q6': '6', 'q7a': '7a', 'q7b': '7b', 'q8a': '8a', 'q8b': '8b',
        'q13': '13', 'qSpecial': 'พิเศษ'
    };

    // --- [MODIFIED] Define weights for each score key based on user request ---
    const SCORE_WEIGHTS = {
        'application': 1,   // (Assuming 1x multiplier as it wasn't specified by user)
        'q2a': 0.5,
        'q2b': 0.5,
        'q4a': 3,
        'q4b': 2,
        'q5': 2,
        'q6': 2,
        'q7a': 1,
        'q7b': 1,
        'q8a': 0.5,
        'q8b': 0.5,
        'q13': 2,
        'qSpecial': 2.5
    };


    // --- [MODIFIED] Calculate total score using weights, treating N/A (-1) and missing scores as 0 ---
    const calculateTotalScore = (scores) => {
        if (!scores || typeof scores !== 'object') return 0; // Return 0 if no scores object
        let total = 0;
        SCORE_KEYS.forEach(key => {
            const numericScore = parseFloat(scores[key]); // Use parseFloat for .5 scores
            
            // Get weight from the new weights object. Default to 0 if key not in weights.
            const weight = SCORE_WEIGHTS[key] || 0; 

            // Add weighted score only if it's a number and greater than or equal to 0
            if (!isNaN(numericScore) && numericScore >= 0) {
                total += (numericScore * weight);
            }
        });
        
        // Since multipliers like 0.5 and 2.5 exist, results can have 2 decimal places (e.g., 3.5 * 0.5 = 1.75)
        // Round to 2 decimal places to handle this accurately.
        return Math.round(total * 100) / 100;
    };


    // Format individual scores for display (N/A, -, X, X.5)
    const formatScore = (scoreValue) => {
        const numericScore = parseFloat(scoreValue);
        if (numericScore === -1) return 'N/A'; // N/A is explicitly -1
        if (isNaN(numericScore)) return '-';   // If missing or not a number, show '-'
        
        // Check if the number has decimal places after potential calculation (e.g., total score)
        if (numericScore % 1 !== 0) {
             // If it has decimals, show up to 2 decimal places (e.g., 1.75)
            return numericScore.toFixed(2).replace(/\.?0+$/, ''); // Show 1.75, or 7.5 (not 7.50)
        }
        // Otherwise, show integer
        return numericScore.toFixed(0);
    };

    // --- Main Rendering Function ---
    function renderAdminView() {
        // --- Get selected table filter value ---
        const selectedTable = tableFilter.value;

        // --- Filter data for the Kanban board based on dropdown ---
        const filteredBoardData = (selectedTable === 'all')
            ? allData // Show all if "all" is selected
            : allData.filter(app => app.table == selectedTable); // Filter by table number

        // --- Render Overview Board (Kanban) ---
        adminOverview.innerHTML = ''; // Clear previous board
        const columns = {};
        // Determine which tables to display based on the filter
        const tablesToDisplay = (selectedTable === 'all')
            ? Array.from({ length: 9 }, (_, i) => i + 1) // Array [1, 2, ..., 9]
            : [parseInt(selectedTable, 10)]; // Array with only the selected table number

        // Initialize column arrays
        tablesToDisplay.forEach(tableNum => { columns[`table-${tableNum}`] = []; });

        // Populate columns with active applicants relevant to the board filter
        filteredBoardData.forEach(item => {
            if (!item.isForfeited && item.table && columns[`table-${item.table}`]) {
                columns[`table-${item.table}`].push(item);
            }
        });

        // Generate HTML for each column
        Object.entries(columns).forEach(([columnId, items]) => {
            const tableNumber = columnId.split('-')[1];
            const columnEl = document.createElement('div');
            columnEl.className = 'kanban-column';

            // Generate cards for active applicants
            let itemsHtml = items.map(app => {
                let cardClasses = ['applicant-card', 'small'];
                cardClasses.push(app.status ? app.status.toLowerCase() : 'pending');
                if (app.status === 'Pending' && app.isCalled) { cardClasses.push('called'); }
                return `<div class="${cardClasses.join(' ')}">${app.nickname} <span class="status ${app.status ? app.status.toLowerCase() : 'pending'}">${app.status ? app.status.charAt(0) : 'P'}</span></div>`;
            }).join('');

            // Find and add forfeited applicants for this table number from the original data
            const forfeitedItems = allData.filter(app => app.isForfeited && app.table == tableNumber);
            if (forfeitedItems.length > 0) {
                 itemsHtml += '<hr style="border-top: 1px dashed #ccc; margin: 10px 0;">'; // Separator
                 itemsHtml += forfeitedItems.map(app => `<div class="applicant-card small forfeited">${app.nickname} <span class="status pending">F</span></div>`).join('');
            }

            // Display "ว่าง" only if both active and forfeited lists are empty
            if (items.length === 0 && forfeitedItems.length === 0) {
                itemsHtml = '<p class="no-items">ว่าง</p>';
            }

            const activeCount = items.length; // Header count shows active applicants
            columnEl.innerHTML = `<h2>โต๊ะ ${tableNumber} (${activeCount})</h2><div class="kanban-items">${itemsHtml}</div>`;
            adminOverview.appendChild(columnEl);
        });

        // Handle cases where no columns are displayed due to filter or no data
        if (Object.keys(columns).length === 0 && selectedTable !== 'all') {
             adminOverview.innerHTML = `<p style="text-align: center; color: #888;">ยังไม่มีผู้สมัครสำหรับโต๊ะ ${selectedTable}</p>`;
        } else if (allData.length === 0) {
            adminOverview.innerHTML = `<p style="text-align: center; color: #888;">ยังไม่มีข้อมูลผู้สมัคร</p>`;
        }


        // --- Prepare data for Chart and Ranked List ---
        // Always filter out forfeited applicants first for calculations/ranking
        let activeApplicants = allData.filter(app => !app.isForfeited);

        // Filter active applicants further based on selectedTable for the Ranked List display
        const rankedListApplicants = (selectedTable === 'all')
            ? activeApplicants // Use all active if "all" selected
            : activeApplicants.filter(app => app.table == selectedTable); // Filter by table

        // --- Render Score Chart (uses ALL active applicants, regardless of table filter) ---
        const sortedForChart = [...activeApplicants].sort((a, b) => calculateTotalScore(b.interviewScores) - calculateTotalScore(a.interviewScores));
        const chartLabels = sortedForChart.map(app => app.nickname);
        const chartTotalScores = sortedForChart.map(app => calculateTotalScore(app.interviewScores));
        if (chartInstance) { chartInstance.destroy(); } // Clear previous chart
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
                     indexAxis: 'y', // Horizontal bars
                     scales: { x: { beginAtZero: true } },
                     plugins: {
                         legend: { display: false },
                         title: {
                             display: true,
                             text: 'สรุปคะแนนรวมผู้สมัคร (เรียงจากมากไปน้อย - ไม่รวมผู้สละสิทธิ์)'
                        }
                    }
                 }
             });
        } catch (chartError) {
            console.error("Error initializing chart:", chartError);
            if(canvasElement) canvasElement.parentElement.innerHTML = `<p style="color: red;">เกิดข้อผิดพลาดในการสร้างกราฟ</p>`;
        }

        // --- Render Ranked Score List (uses filtered rankedListApplicants) ---
        rankedListContainer.innerHTML = ''; // Clear previous list content

        // Create an array of objects containing applicant data and their total score
        const applicantsWithScores = rankedListApplicants.map(app => ({
            applicant: app,
            totalScore: calculateTotalScore(app.interviewScores)
        }));

        // Sort the array by total score in descending order
        applicantsWithScores.sort((a, b) => b.totalScore - a.totalScore);

        // Generate and display HTML for the ranked list
        if (applicantsWithScores.length === 0) {
            // Display message based on whether a filter is active
            rankedListContainer.innerHTML = (selectedTable === 'all')
                ? '<p>ยังไม่มีข้อมูลคะแนนผู้สมัคร</p>'
                : `<p>ยังไม่มีข้อมูลคะแนนผู้สมัครสำหรับโต๊ะ ${selectedTable}</p>`;
        } else {
            applicantsWithScores.forEach(({ applicant, totalScore }, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'ranking-item';
                itemDiv.dataset.applicantId = applicant.id; // Store ID for click event
                const scores = applicant.interviewScores || {};
                const imgUrl = applicant.applicantImage || 'placeholder.png'; // Use placeholder if no image

                // Build HTML for score breakdown
                let breakdownHtml = '<div class="ranking-item-score-breakdown">';
                SCORE_KEYS.forEach(key => {
                    const label = SCORE_LABELS[key] || key; // Get display label or use key
                    const scoreValue = formatScore(scores[key]); // Format score value
                    breakdownHtml += `<span class="score-pair"><span class="score-label">${label}:</span> <span class="score-value">${scoreValue}</span></span>`;
                });
                breakdownHtml += '</div>';

                // --- ⭐️ [MODIFIED] Construct the HTML for the ranking item ---
                // Added applicant.year ( stripping non-digits) and moved applicant.table
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
                rankedListContainer.appendChild(itemDiv); // Add the item to the container
            });
        }
    }

    // --- Event Listeners ---

    // Re-render the view when the table filter dropdown changes
    tableFilter.addEventListener('change', renderAdminView);

    // Handle clicks on the ranked list container (event delegation)
    rankedListContainer.addEventListener('click', (e) => {
        // Find the closest ancestor element with the class 'ranking-item'
        const targetItem = e.target.closest('.ranking-item');
        // If such an item is found and it has an applicant ID stored in its dataset
        if (targetItem && targetItem.dataset.applicantId) {
            const applicantId = targetItem.dataset.applicantId;
            // Find the full applicant data using the ID
            const applicant = allData.find(app => app.id == applicantId); // Use == for safety
            if (applicant && applicant.table) { // Ensure applicant and table number exist
                // Construct the URL for the interviewer page with table and ID parameters
                const url = `interviewer.html?table=${applicant.table}&id=${applicantId}`;
                // Open the URL in a new browser tab
                window.open(url, '_blank');
            } else {
                console.error(`Could not find applicant data or table for ID: ${applicantId} to generate link.`);
                alert(`เกิดข้อผิดพลาด: ไม่พบข้อมูลผู้สมัครหรือโต๊ะสำหรับ ID: ${applicantId}`);
            }
        }
    });

    // --- Real-time Listener Setup ---
    console.log("Admin elements found, setting up Firebase listener...");
    // Check if the Database object from data.js is available
    if (typeof Database !== 'undefined' && Database.onDataChange) {
        // Listen for data changes at the specified database path
        Database.onDataChange(newData => {
            console.log("Received data from Firebase:", newData.length, "items");
            allData = newData; // Update the local data cache
            try {
                // Check elements again just before rendering (extra safety)
                 if (!adminOverview || !scoreChartCtx || !rankedListContainer) {
                    console.warn("Elements became unavailable before rendering!");
                    return;
                 }
                renderAdminView(); // Re-render the entire admin view with the new data
            } catch (renderError) {
                console.error("Error during renderAdminView:", renderError);
                // Display error message if rendering fails
                if (rankedListContainer) rankedListContainer.innerHTML = `<p style="color: red;">เกิดข้อผิดพลาดในการแสดงผล: ${renderError.message}</p>`;
                else if (adminOverview) adminOverview.innerHTML = `<p style="color: red;">เกิดข้อผิดพลาดในการแสดงผล: ${renderError.message}</p>`;
            }
        });
    } else {
        // Log error and display message if Database object isn't found
        console.error("Admin Dashboard Error: Database object not found. Make sure data.js is loaded before admin.js");
        if(rankedListContainer) rankedListContainer.innerHTML = '<p style="color: red;">เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล</p>';
        else if(adminOverview) adminOverview.innerHTML = '<p style="color: red;">เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล</p>';
    }

}); // End DOMContentLoaded wrapper