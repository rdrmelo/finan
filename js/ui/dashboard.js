
import {
    calculateExecutiveKPIs,
    generateWealthTrendData,
    generateCashFlowData,
    generateExecutiveInsights,
    calculateHealthMetrics,
    generateHealthHistory,
    generateHealthRecommendations
} from '../services/analysis.js';
import {
    createWealthTrendChart,
    createCashFlowChart,
    createHealthTrendChart
} from './charts.js';
import { formatCurrency } from '../utils/formatters.js';

export function updateDashboard(transactions, goals, budgets, recurringTemplates) {
    // Executive Dashboard (Charts & KPIs)
    // Note: budgets is not currently used in executive dashboard
    updateExecutiveDashboard(transactions, goals, recurringTemplates);
}

export function updateExecutiveDashboard(transactions, goals, recurringTemplates) {
    try {
        if (!transactions) return;

        const kpis = calculateExecutiveKPIs(transactions, goals);

        // Update KPIs
        const ids = {
            'monthly-roi': kpis.monthlyROI,
            'savings-rate': kpis.savingsRate,
            'burn-rate': formatCurrency(kpis.burnRate),
            'financial-score': kpis.financialScore,
            'wealth-growth': kpis.wealthGrowth,
            'expense-efficiency': kpis.expenseEfficiency,
            'diversification': kpis.diversification,
            'liquidity': kpis.liquidity
        };

        Object.entries(ids).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });

        // Update Goals Card
        updateExecutiveGoals(goals);

        // Update Charts
        const wealthCtx = document.getElementById('wealthTrendChart');
        if (wealthCtx) {
            const wealthData = generateWealthTrendData(transactions);
            // We attach the chart instance to the canvas element itself for easier tracking in this module context if needed
            // or reliance on createWealthTrendChart to handle cleanup if it checks ctx.chart
            createWealthTrendChart(wealthCtx, wealthData.labels, wealthData.values);
        }

        const cashCtx = document.getElementById('cashFlowChart');
        if (cashCtx) {
            const cashData = generateCashFlowData(transactions);
            createCashFlowChart(cashCtx, cashData.labels, cashData.income, cashData.expenses);
        }

        // Update Health Report
        updateHealthReport(transactions);

        // Update Insights
        updateExecutiveInsights(kpis);

    } catch (error) {
        console.error('Erro ao atualizar dashboard executivo:', error);
    }
}

function updateExecutiveGoals(goals) {
    const container = document.getElementById('executive-goals-container');
    if (!container) return;

    if (!goals || goals.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-8">Nenhuma meta cadastrada ainda.<br>Vá para a aba "Cofrinhos" para criar suas metas.</p>';
        return;
    }

    container.innerHTML = '';
    goals.slice(0, 3).forEach(goal => {
        const progress = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;
        const progressColor = progress >= 100 ? 'green' : progress >= 50 ? 'blue' : 'yellow';

        const goalElement = document.createElement('div');
        goalElement.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-400">${goal.name}</span>
                <span class="font-mono text-${progressColor}-400">${progress.toFixed(0)}%</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2">
                <div class="bg-${progressColor}-400 h-2 rounded-full" style="width: ${Math.min(progress, 100)}%"></div>
            </div>
        `;
        container.appendChild(goalElement);
    });
}

function updateExecutiveInsights(kpis) {
    const insights = generateExecutiveInsights(kpis);
    const container = document.getElementById('executive-insights');

    if (container && insights.length > 0) {
        container.innerHTML = insights.map(insight =>
            `<div class="p-3 bg-${insight.color}-500/20 rounded-lg border border-${insight.color}-400/30">
                <p class="text-${insight.color}-300 font-semibold">${insight.icon} ${insight.title}</p>
                <p class="text-gray-400">${insight.description}</p>
            </div>`
        ).join('');
    }
}

// Health Report Section
function updateHealthReport(transactions) {
    try {
        const healthData = calculateHealthMetrics(transactions);

        updateHealthScore(healthData.score);
        updateHealthIndicators(healthData.indicators);
        updateHealthRecommendationsUI(healthData); // Renamed to avoid recursion confusion

        const healthCtx = document.getElementById('healthTrendChart');
        if (healthCtx) {
            const healthHistory = generateHealthHistory(transactions);
            createHealthTrendChart(healthCtx, healthHistory.labels, healthHistory.scores);
        }

    } catch (error) {
        console.error('Erro ao atualizar relatório de saúde:', error);
    }
}

function updateHealthScore(score) {
    const scoreDisplay = document.getElementById('health-score-display');
    const scoreBadge = document.getElementById('health-score-badge');

    if (scoreDisplay) scoreDisplay.textContent = score;

    if (scoreBadge) {
        scoreBadge.className = 'px-3 py-1 rounded-full border';

        if (score >= 80) {
            scoreBadge.classList.add('bg-green-500/20', 'text-green-300', 'border-green-400/30');
        } else if (score >= 60) {
            scoreBadge.classList.add('bg-blue-500/20', 'text-blue-300', 'border-blue-400/30');
        } else if (score >= 40) {
            scoreBadge.classList.add('bg-yellow-500/20', 'text-yellow-300', 'border-yellow-400/30');
        } else {
            scoreBadge.classList.add('bg-red-500/20', 'text-red-300', 'border-red-400/30');
        }
    }
}

function updateHealthIndicators(indicators) {
    const indicatorMap = {
        'emergency-fund': indicators.emergencyFund,
        'debt-ratio': indicators.debtRatio,
        'savings-consistency': indicators.savingsConsistency,
        'expense-control': indicators.expenseControl
    };

    Object.entries(indicatorMap).forEach(([key, indicator]) => {
        const iconEl = document.getElementById(`${key}-icon`);
        const statusEl = document.getElementById(`${key}-status`);

        if (iconEl) {
            iconEl.className = `w-3 h-3 rounded-full bg-${indicator.color}-400`;
        }

        if (statusEl) {
            statusEl.textContent = indicator.status;
            statusEl.className = `text-sm font-semibold text-${indicator.color}-400`;
        }
    });
}

function updateHealthRecommendationsUI(healthData) {
    const recommendations = generateHealthRecommendations(healthData);
    const container = document.getElementById('health-recommendations');

    if (container && recommendations.length > 0) {
        container.innerHTML = recommendations.map((rec, index) =>
            `<div class="p-4 bg-${rec.color}-500/10 rounded-lg border border-${rec.color}-400/20">
                <div class="flex items-start space-x-3">
                    <div class="w-6 h-6 rounded-full bg-${rec.color}-500 flex items-center justify-center text-xs font-bold text-white">${index + 1}</div>
                    <div>
                        <h5 class="font-semibold text-${rec.color}-300 mb-1">${rec.title}</h5>
                        <p class="text-sm text-gray-400">${rec.description}</p>
                    </div>
                </div>
            </div>`
        ).join('');
    }
}
