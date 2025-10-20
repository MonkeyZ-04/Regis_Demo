// admin.js

document.addEventListener('DOMContentLoaded', () => {
    const adminOverview = document.getElementById('admin-overview');
    const scoreChartCtx = document.getElementById('score-chart').getContext('2d');
    let chartInstance;
    let allData = [];

    function renderAdminView() {
        // --- Render Overview Board ---
        adminOverview.innerHTML = '';
        const columns = {};
        for (let i = 1; i <= 9; i++) {
            columns[`table-${i}`] = [];
        }
        allData.forEach(item => {
            if (item.table && columns[`table-${item.table}`]) {
                columns[`table-${item.table}`].push(item);
            }
        });

        for (const [columnId, items] of Object.entries(columns)) {
            const tableNumber = columnId.split('-')[1];
            const columnEl = document.createElement('div');
            columnEl.className = 'kanban-column';
            let itemsHtml = items.map(app =>
                `<div class="applicant-card small ${app.status.toLowerCase()}">
                    ${app.nickname} <span class="status ${app.status.toLowerCase()}">${app.status.charAt(0)}</span>
                </div>`
            ).join('');
            if (items.length === 0) itemsHtml = '<p class="no-items">ว่าง</p>';

            columnEl.innerHTML = `<h2>โต๊ะ ${tableNumber} (${items.length})</h2><div class="kanban-items">${itemsHtml}</div>`;
            adminOverview.appendChild(columnEl);
        }

        // --- Render Score Chart ---
        const sortedData = [...allData].sort((a, b) => {
            const totalScoreB = Object.values(b.scores).reduce((s, v) => s + v, 0);
            const totalScoreA = Object.values(a.scores).reduce((s, v) => s + v, 0);
            return totalScoreB - totalScoreA;
        });

        const labels = sortedData.map(app => app.nickname);
        const totalScores = sortedData.map(app =>
            Object.values(app.scores).reduce((sum, score) => sum + score, 0)
        );

        if (chartInstance) {
            chartInstance.destroy();
        }
        chartInstance = new Chart(scoreChartCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'คะแนนรวม',
                    data: totalScores,
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
                    title: {
                        display: true,
                        text: 'สรุปคะแนนรวมผู้สมัคร (เรียงจากมากไปน้อย)'
                    }
                }
            }
        });
    }

    // --- Real-time Listener ---
    Database.onDataChange(newData => {
        allData = newData;
        renderAdminView();
    });
});