
import { formatCurrency } from '../utils/formatters.js';

export function analyzeCategorySpending(transactions) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

    const currentExpenses = {};
    const lastExpenses = {};

    transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
        .forEach(t => {
            currentExpenses[t.category] = (currentExpenses[t.category] || 0) + t.amount;
        });

    transactions.filter(t => t.type === 'expense' && t.date.startsWith(lastMonth))
        .forEach(t => {
            lastExpenses[t.category] = (lastExpenses[t.category] || 0) + t.amount;
        });

    let highestCategory = null;
    let maxIncrease = 0;

    Object.keys(currentExpenses).forEach(category => {
        const current = currentExpenses[category];
        const last = lastExpenses[category] || 0;
        const increase = current - last;
        const percentIncrease = last > 0 ? (increase / last) * 100 : 0;

        if (increase > maxIncrease && percentIncrease > 20) {
            maxIncrease = increase;
            highestCategory = { name: category, increase, current, last };
        }
    });

    return {
        highestCategory,
        potentialSaving: maxIncrease * 0.3
    };
}

export function detectUnusualSpending(transactions) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentTransactions = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth));

    const historicalAverages = {};
    const last3Months = [];

    for (let i = 1; i <= 3; i++) {
        const monthDate = new Date(new Date().setMonth(new Date().getMonth() - i));
        last3Months.push(monthDate.toISOString().slice(0, 7));
    }

    last3Months.forEach(month => {
        transactions.filter(t => t.type === 'expense' && t.date.startsWith(month))
            .forEach(t => {
                if (!historicalAverages[t.category]) historicalAverages[t.category] = [];
                historicalAverages[t.category].push(t.amount);
            });
    });

    const unusualSpending = [];
    currentTransactions.forEach(transaction => {
        const categoryHistory = historicalAverages[transaction.category] || [];
        if (categoryHistory.length > 0) {
            const average = categoryHistory.reduce((sum, amount) => sum + amount, 0) / categoryHistory.length;
            if (transaction.amount > average * 1.5) {
                unusualSpending.push({
                    ...transaction,
                    averageAmount: average,
                    difference: transaction.amount - average
                });
            }
        }
    });

    return unusualSpending;
}

export function analyzeRecurringExpenses(transactions, recurringTemplates) {
    const activeSubscriptions = recurringTemplates.length;
    const currentMonth = new Date().toISOString().slice(0, 7);

    const usedSubscriptions = recurringTemplates.filter(template => {
        return transactions.some(t =>
            t.recurringTemplateId === template.id &&
            t.date.startsWith(currentMonth)
        );
    }).length;

    const unusedSubscriptions = activeSubscriptions - usedSubscriptions;
    const potentialSaving = unusedSubscriptions * 50;

    return {
        total: activeSubscriptions,
        used: usedSubscriptions,
        unusedSubscriptions,
        potentialSaving
    };
}

export function generateAdvancedSavingsSuggestions(transactions, goals, recurringTemplates) {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const categoryAnalysis = analyzeCategorySpending(transactions);
    const unusualSpending = detectUnusualSpending(transactions);
    const subscriptionAnalysis = analyzeRecurringExpenses(transactions, recurringTemplates);

    const suggestions = {
        primary: '',
        secondary: [],
        savings: 0
    };

    if (categoryAnalysis.highestCategory && categoryAnalysis.potentialSaving > 100) {
        suggestions.primary = `Reduza ${categoryAnalysis.highestCategory.name} em ${formatCurrency(categoryAnalysis.potentialSaving)}`;
        suggestions.savings += categoryAnalysis.potentialSaving;
    } else if (unusualSpending.length > 0) {
        const totalUnusual = unusualSpending.reduce((sum, item) => sum + item.amount, 0);
        suggestions.primary = `Gastos atípicos detectados: ${formatCurrency(totalUnusual)}`;
    } else if (subscriptionAnalysis.unusedSubscriptions > 0) {
        suggestions.primary = `Cancele ${subscriptionAnalysis.unusedSubscriptions} assinaturas não utilizadas`;
        suggestions.savings += subscriptionAnalysis.potentialSaving;
    } else {
        const totalGoals = (goals || []).reduce((sum, goal) => sum + goal.targetAmount, 0);
        const totalSaved = (goals || []).reduce((sum, goal) => sum + goal.savedAmount, 0);
        const remaining = totalGoals - totalSaved;

        if (remaining <= 0) return { primary: 'Metas atingidas! 🎉', secondary: [], savings: 0 };

        const monthlyIncome = transactions
            .filter(t => t.type === 'income' && t.date.startsWith(currentMonth))
            .reduce((sum, t) => sum + t.amount, 0);

        const monthlyExpenses = transactions
            .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
            .reduce((sum, t) => sum + t.amount, 0);

        const availableToSave = monthlyIncome - monthlyExpenses;

        if (availableToSave <= 0) {
            suggestions.primary = 'Reduza gastos primeiro';
        } else {
            const monthsToGoal = Math.ceil(remaining / availableToSave);
            suggestions.primary = `Economize ${formatCurrency(availableToSave)}/mês (${monthsToGoal} meses para meta)`;
        }
    }

    return suggestions;
}

export function calculateExecutiveKPIs(transactions, goals) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

    const currentIncome = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount, 0);

    const currentExpenses = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount, 0);

    const lastIncome = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(lastMonth))
        .reduce((sum, t) => sum + t.amount, 0);

    const lastExpenses = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(lastMonth))
        .reduce((sum, t) => sum + t.amount, 0);

    const currentBalance = currentIncome - currentExpenses;
    const lastBalance = lastIncome - lastExpenses;
    const monthlyROI = lastBalance > 0 ? (((currentBalance - lastBalance) / lastBalance) * 100).toFixed(1) + '%' : '0%';

    const savingsRate = currentIncome > 0 ? (((currentIncome - currentExpenses) / currentIncome) * 100).toFixed(1) + '%' : '0%';

    const burnRate = currentExpenses;

    const score = calculateFinancialScore(currentIncome, currentExpenses, goals, transactions);

    const wealthGrowth = calculateWealthGrowth(transactions);

    const expenseEfficiency = calculateExpenseEfficiency(transactions);

    const diversification = calculateDiversification(transactions);

    const liquidity = currentExpenses > 0 ? (currentBalance / currentExpenses).toFixed(1) + ' meses' : '∞';

    return {
        monthlyROI,
        savingsRate,
        burnRate,
        financialScore: score,
        wealthGrowth: wealthGrowth + '%',
        expenseEfficiency: expenseEfficiency + '%',
        diversification: diversification + '%',
        liquidity
    };
}

export function calculateFinancialScore(income, expenses, goals, transactions) {
    let score = 500;

    const savingsRate = income > 0 ? (income - expenses) / income : 0;
    score += Math.min(200, savingsRate * 400);

    const totalGoals = (goals || []).reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalSaved = (goals || []).reduce((sum, goal) => sum + goal.savedAmount, 0);
    const goalsProgress = totalGoals > 0 ? totalSaved / totalGoals : 0;
    score += Math.min(150, goalsProgress * 150);

    const consistencyBonus = calculateConsistencyBonus(transactions);
    score += consistencyBonus;

    const diversificationBonus = calculateDiversification(transactions) / 2;
    score += diversificationBonus;

    return Math.round(Math.min(1000, Math.max(300, score)));
}

function calculateConsistencyBonus(transactions) {
    const last3Months = [];
    for (let i = 0; i < 3; i++) {
        const monthDate = new Date(new Date().setMonth(new Date().getMonth() - i));
        const monthStr = monthDate.toISOString().slice(0, 7);
        const monthIncome = transactions
            .filter(t => t.type === 'income' && t.date.startsWith(monthStr))
            .reduce((sum, t) => sum + t.amount, 0);
        const monthExpenses = transactions
            .filter(t => t.type === 'expense' && t.date.startsWith(monthStr))
            .reduce((sum, t) => sum + t.amount, 0);

        const savingsRate = monthIncome > 0 ? (monthIncome - monthExpenses) / monthIncome : 0;
        last3Months.push(savingsRate);
    }

    if (last3Months.length < 3) return 0;

    const positiveSavings = last3Months.filter(rate => rate > 0).length;
    return (positiveSavings / last3Months.length) * 100;
}

export function calculateWealthGrowth(transactions) {
    const last6Months = [];
    for (let i = 0; i < 6; i++) {
        const monthDate = new Date(new Date().setMonth(new Date().getMonth() - i));
        const monthStr = monthDate.toISOString().slice(0, 7);
        const monthBalance = transactions
            .filter(t => t.date.startsWith(monthStr))
            .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
        last6Months.push(monthBalance);
    }

    if (last6Months.length < 2) return 0;

    const firstMonth = last6Months[last6Months.length - 1];
    const lastMonth = last6Months[0];

    if (firstMonth <= 0) return 0;

    return ((lastMonth - firstMonth) / Math.abs(firstMonth) * 100).toFixed(1);
}

export function calculateExpenseEfficiency(transactions) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentExpenses = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount, 0);

    const avgExpenses = calculateAverageExpenses(transactions);

    if (avgExpenses === 0) return 100;

    const efficiency = Math.max(0, 100 - ((currentExpenses - avgExpenses) / avgExpenses * 100));
    return Math.round(Math.min(100, efficiency));
}

function calculateAverageExpenses(transactions) {
    const last3Months = [];
    for (let i = 1; i <= 3; i++) {
        const monthDate = new Date(new Date().setMonth(new Date().getMonth() - i));
        const monthStr = monthDate.toISOString().slice(0, 7);
        const monthExpenses = transactions
            .filter(t => t.type === 'expense' && t.date.startsWith(monthStr))
            .reduce((sum, t) => sum + t.amount, 0);
        last3Months.push(monthExpenses);
    }

    return last3Months.length > 0 ? last3Months.reduce((sum, exp) => sum + exp, 0) / last3Months.length : 0;
}

export function calculateDiversification(transactions) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const categoryExpenses = {};

    transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
        .forEach(t => {
            categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
        });

    const categories = Object.keys(categoryExpenses);
    const totalExpenses = Object.values(categoryExpenses).reduce((sum, amount) => sum + amount, 0);

    if (categories.length === 0 || totalExpenses === 0) return 100;

    const maxCategoryPercent = Math.max(...Object.values(categoryExpenses)) / totalExpenses;
    const diversificationScore = Math.max(0, 100 - (maxCategoryPercent * 100));

    return Math.round(diversificationScore);
}

export function generateExecutiveInsights(kpis) {
    const insights = [];

    // Insight sobre taxa de poupança
    const savingsRate = parseFloat(kpis.savingsRate);
    if (savingsRate > 20) {
        insights.push({
            icon: '✓',
            title: 'Meta de poupança atingida',
            description: `Você economizou ${kpis.savingsRate} da renda este mês`,
            color: 'green'
        });
    } else if (savingsRate < 10) {
        insights.push({
            icon: '⚠️',
            title: 'Taxa de poupança baixa',
            description: `Apenas ${kpis.savingsRate} da renda foi poupada`,
            color: 'yellow'
        });
    }

    // Insight sobre crescimento
    const wealthGrowth = parseFloat(kpis.wealthGrowth);
    if (wealthGrowth > 10) {
        insights.push({
            icon: '📈',
            title: 'Crescimento consistente',
            description: `Patrimônio cresceu ${kpis.wealthGrowth} nos últimos 6 meses`,
            color: 'blue'
        });
    }

    // Insight sobre eficiência
    const efficiency = parseFloat(kpis.expenseEfficiency);
    if (efficiency < 70) {
        insights.push({
            icon: '⚠️',
            title: 'Atenção: Gastos elevados',
            description: 'Despesas acima da média histórica',
            color: 'yellow'
        });
    }

    return insights.slice(0, 3);
}

export function calculateHealthMetrics(transactions) {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const monthlyIncome = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount, 0);

    const currentBalance = monthlyIncome - monthlyExpenses;

    const indicators = {
        emergencyFund: calculateEmergencyFundStatus(currentBalance, monthlyExpenses),
        debtRatio: calculateDebtRatio(monthlyIncome, monthlyExpenses),
        savingsConsistency: calculateSavingsConsistencyHealth(transactions),
        expenseControl: calculateExpenseControlHealth(transactions, monthlyExpenses)
    };

    const score = calculateOverallHealthScore(indicators);

    return { score, indicators };
}

function calculateEmergencyFundStatus(balance, expenses) {
    if (expenses === 0) return { status: 'Adequada', color: 'green', score: 100 };

    const monthsOfExpenses = balance / expenses;

    if (monthsOfExpenses >= 6) {
        return { status: 'Excelente', color: 'green', score: 100 };
    } else if (monthsOfExpenses >= 3) {
        return { status: 'Adequada', color: 'blue', score: 80 };
    } else if (monthsOfExpenses >= 1) {
        return { status: 'Insuficiente', color: 'yellow', score: 50 };
    } else {
        return { status: 'Crítica', color: 'red', score: 20 };
    }
}

function calculateDebtRatio(income, expenses) {
    if (income === 0) return { status: 'N/A', color: 'gray', score: 50 };

    const ratio = expenses / income;

    if (ratio <= 0.3) {
        return { status: 'Baixa', color: 'green', score: 100 };
    } else if (ratio <= 0.5) {
        return { status: 'Moderada', color: 'blue', score: 80 };
    } else if (ratio <= 0.7) {
        return { status: 'Alta', color: 'yellow', score: 50 };
    } else {
        return { status: 'Crítica', color: 'red', score: 20 };
    }
}

function calculateSavingsConsistencyHealth(transactions) {
    const last6Months = [];

    for (let i = 0; i < 6; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toISOString().slice(0, 7);

        const income = transactions
            .filter(t => t.type === 'income' && t.date.startsWith(monthStr))
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = transactions
            .filter(t => t.type === 'expense' && t.date.startsWith(monthStr))
            .reduce((sum, t) => sum + t.amount, 0);

        last6Months.push(income - expenses);
    }

    const positiveSavings = last6Months.filter(balance => balance > 0).length;
    const consistency = (positiveSavings / last6Months.length) * 100;

    if (consistency >= 80) {
        return { status: 'Excelente', color: 'green', score: 100 };
    } else if (consistency >= 60) {
        return { status: 'Boa', color: 'blue', score: 80 };
    } else if (consistency >= 40) {
        return { status: 'Regular', color: 'yellow', score: 60 };
    } else {
        return { status: 'Ruim', color: 'red', score: 30 };
    }
}

function calculateExpenseControlHealth(transactions, currentExpenses) {
    const avgExpenses = calculateAverageExpenses(transactions);

    if (avgExpenses === 0) return { status: 'N/A', color: 'gray', score: 50 };

    const variation = ((currentExpenses - avgExpenses) / avgExpenses) * 100;

    if (variation <= -10) {
        return { status: 'Excelente', color: 'green', score: 100 };
    } else if (variation <= 5) {
        return { status: 'Bom', color: 'blue', score: 80 };
    } else if (variation <= 15) {
        return { status: 'Regular', color: 'yellow', score: 60 };
    } else {
        return { status: 'Ruim', color: 'red', score: 30 };
    }
}

function calculateOverallHealthScore(indicators) {
    const scores = [
        indicators.emergencyFund.score * 0.3,
        indicators.debtRatio.score * 0.25,
        indicators.savingsConsistency.score * 0.25,
        indicators.expenseControl.score * 0.2
    ];

    return Math.round(scores.reduce((sum, score) => sum + score, 0));
}

export function generateHealthHistory(transactions) {
    const data = { labels: [], scores: [] };

    const currentHealthData = calculateHealthMetrics(transactions);
    const currentScore = currentHealthData.score;

    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);

        let score;
        if (i === 0) {
            score = currentScore;
        } else {
            const progressFactor = (6 - i) / 6;
            const baseScore = Math.max(30, currentScore - (i * 3));
            const variation = Math.sin(i * 0.3) * 5;
            score = Math.max(30, Math.min(100, baseScore + variation));
        }

        data.labels.push(date.toLocaleDateString('pt-BR', { month: 'short' }));
        data.scores.push(Math.round(score));
    }

    return data;
}

export function generateHealthRecommendations(healthData) {
    const recommendations = [];

    if (healthData.indicators.emergencyFund.score < 80) {
        recommendations.push({
            title: 'Aumentar Reserva de Emergência',
            description: 'Sua reserva está abaixo do ideal. Tente poupar pelo menos 3-6 meses de despesas.',
            color: 'blue'
        });
    }

    if (healthData.indicators.debtRatio.score < 70) {
        recommendations.push({
            title: 'Reduzir Gastos Mensais',
            description: 'Seus gastos estão altos em relação à renda. Considere revisar categorias não essenciais.',
            color: 'yellow'
        });
    }

    if (healthData.indicators.savingsConsistency.score < 70) {
        recommendations.push({
            title: 'Melhorar Consistência de Poupança',
            description: 'Estabeleça uma meta fixa de poupança mensal para criar um hábito consistente.',
            color: 'green'
        });
    }

    if (healthData.indicators.expenseControl.score < 70) {
        recommendations.push({
            title: 'Controlar Variação de Gastos',
            description: 'Seus gastos variam muito mês a mês. Tente manter um padrão de consumo mais estável.',
            color: 'red'
        });
    }

    return recommendations;
}

export function generateWealthTrendData(transactions) {
    const data = { labels: [], values: [] };

    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toISOString().slice(0, 7);

        const cumulativeBalance = transactions
            .filter(t => t.date <= monthStr + '-31')
            .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

        data.labels.push(date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        data.values.push(Math.max(0, cumulativeBalance));
    }

    return data;
}

export function generateCashFlowData(transactions) {
    const data = { labels: [], income: [], expenses: [] };

    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toISOString().slice(0, 7);

        const monthIncome = transactions
            .filter(t => t.type === 'income' && t.date.startsWith(monthStr))
            .reduce((sum, t) => sum + t.amount, 0);

        const monthExpenses = transactions
            .filter(t => t.type === 'expense' && t.date.startsWith(monthStr))
            .reduce((sum, t) => sum + t.amount, 0);

        data.labels.push(date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        data.income.push(monthIncome);
        data.expenses.push(monthExpenses);
    }

    return data;
}
