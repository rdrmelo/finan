
import { formatCurrency, formatCurrencyForCharts } from '../utils/formatters.js';

export function createWealthTrendChart(ctx, labels, data) {
    if (ctx.chart) ctx.chart.destroy();

    ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Patrimônio Líquido',
                data: data,
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                datalabels: { display: false },
                legend: { display: false }
            },
            scales: {
                y: {
                    ticks: {
                        color: '#a0a0a0',
                        callback: function (value) { return formatCurrencyForCharts(value); }
                    },
                    grid: { color: 'rgba(0, 212, 255, 0.1)' }
                },
                x: {
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(0, 212, 255, 0.1)' }
                }
            }
        }
    });
    return ctx.chart;
}

export function createCashFlowChart(ctx, labels, incomeData, expensesData) {
    if (ctx.chart) ctx.chart.destroy();

    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: incomeData,
                    backgroundColor: '#22c55e',
                    borderRadius: 4
                },
                {
                    label: 'Despesas',
                    data: expensesData,
                    backgroundColor: '#ef4444',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#a0a0a0' }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: '#a0a0a0',
                        callback: function (value) { return formatCurrency(value); }
                    },
                    grid: { color: 'rgba(0, 212, 255, 0.1)' }
                },
                x: {
                    ticks: { color: '#a0a0a0' },
                    grid: { display: false }
                }
            }
        }
    });
    return ctx.chart;
}

export function createHealthTrendChart(ctx, labels, scores) {
    if (ctx.chart) ctx.chart.destroy();

    ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Score de Saúde',
                data: scores,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        color: '#a0a0a0',
                        callback: function (value) { return value + '%'; }
                    },
                    grid: { color: 'rgba(139, 92, 246, 0.1)' }
                },
                x: {
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(139, 92, 246, 0.1)' }
                }
            }
        }
    });
    return ctx.chart;
}

export function createExpensePieChart(ctx, labels, data, colors) {
    if (ctx.chart) ctx.chart.destroy();

    ctx.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#a0a0a0' }
                }
            },
            cutout: '70%'
        }
    });
    return ctx.chart;
}
