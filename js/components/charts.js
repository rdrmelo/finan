import { formatCurrency, formatCurrencyForCharts, formatCurrencyForDatalabels } from '../utils/formatters.js';

if (window.Chart && window.ChartDataLabels) {
    Chart.register(ChartDataLabels);
}

let expenseChart = null;
let balanceHistoryChart = null;
let futureExpensesChart = null;

export function updateCharts(transactions) {
    updateExpenseChart(transactions);
    updateBalanceHistoryChart(transactions);
    // Future expenses chart is async and usually updated separately/periodically
    // updateFutureExpensesChart is not called here to avoid overhead on every update
}

export function updateExpenseChart(transactions) {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;

    if (expenseChart) expenseChart.destroy();

    const currentMonth = new Date().toISOString().slice(0, 7);
    const expensesByCategory = {};

    transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
        .forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        });

    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);
    const backgroundColors = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#22c55e', '#6b7280', '#eab308', '#db2777', '#06b6d4'];

    if (labels.length === 0) {
        // Show empty state or clear chart
        return;
    }

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#9ca3af', font: { family: "'Inter', sans-serif" }, padding: 20, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    padding: 12,
                    titleFont: { family: "'Inter', sans-serif", size: 13 },
                    bodyFont: { family: "'Inter', sans-serif", size: 13 },
                    callbacks: {
                        label: function (context) {
                            return ` ${context.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold' },
                    formatter: (value, ctx) => {
                        let sum = 0;
                        let dataArr = ctx.chart.data.datasets[0].data;
                        dataArr.map(data => { sum += data; });
                        let percentage = (value * 100 / sum).toFixed(0) + "%";
                        return percentage;
                    },
                    display: (context) => {
                        return context.dataset.data[context.dataIndex] > (context.dataset.data.reduce((a, b) => a + b, 0) * 0.05); // Only show > 5%
                    }
                }
            }
        }
    });

    // Update centre text (Total) if possible or handled in HTML
    const centerText = document.querySelector('.chart-center-text h3');
    if (centerText) {
        const total = data.reduce((a, b) => a + b, 0);
        centerText.textContent = formatCurrency(total);
    }
}

export function updateBalanceHistoryChart(transactions) {
    const ctx = document.getElementById('balanceHistoryChart');
    if (!ctx) return;

    if (balanceHistoryChart) balanceHistoryChart.destroy();

    // Sort transactions
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Last 30 days
    const today = new Date();
    const labels = [];
    const data = [];
    let currentBalance = 0;

    // Calculate initial balance (before 30 days ago)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    currentBalance = sortedTransactions
        .filter(t => new Date(t.date) < thirtyDaysAgo)
        .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayTransactions = sortedTransactions.filter(t => t.date === dateStr);
        const dayNet = dayTransactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
        currentBalance += dayNet;

        labels.push(`${date.getDate()}/${date.getMonth() + 1}`);
        data.push(currentBalance);
    }

    balanceHistoryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Saldo',
                data: data,
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: context => formatCurrency(context.raw)
                    }
                },
                datalabels: { display: false }
            },
            scales: {
                x: { display: false }, // Simplificar visual
                y: { display: false }  // Simplificar visual
            }
        }
    });
}

// Re-export specific formatting needed for other charts if constructed outside
export { formatCurrencyForCharts };
