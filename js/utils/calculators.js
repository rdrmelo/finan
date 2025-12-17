import { formatCurrency } from './formatters.js';

export function analyzeCategorySpending(transactions) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

    const currentExpenses = {};
    const lastExpenses = {};

    // Agrupar gastos por categoria
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
        potentialSaving: maxIncrease * 0.3 // Sugestão de reduzir 30% do aumento
    };
}

export function detectUnusualSpending(transactions) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentTransactions = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth));

    // Calcular média histórica por categoria
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

    // Detectar gastos anômalos (>150% da média histórica)
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

export function analyzeRecurringExpenses(recurringTemplates, transactions) {
    // Analisar templates recorrentes vs uso real
    const activeSubscriptions = recurringTemplates.length;
    const currentMonth = new Date().toISOString().slice(0, 7);

    const usedSubscriptions = recurringTemplates.filter(template => {
        return transactions.some(t =>
            t.recurringTemplateId === template.id &&
            t.date.startsWith(currentMonth)
        );
    }).length;

    const unusedSubscriptions = activeSubscriptions - usedSubscriptions;
    const potentialSaving = unusedSubscriptions * 50; // Estimativa média de R$50 por assinatura

    return {
        total: activeSubscriptions,
        used: usedSubscriptions,
        unusedSubscriptions,
        potentialSaving
    };
}

export function calculateExecutiveKPIs(transactions, goals) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

    // Calcular receitas e despesas mensais
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

    // ROI Mensal
    const currentBalance = currentIncome - currentExpenses;
    const lastBalance = lastIncome - lastExpenses;
    const monthlyROI = lastBalance > 0 ? (((currentBalance - lastBalance) / lastBalance) * 100).toFixed(1) + '%' : '0%';

    // Taxa de Poupança
    const savingsRate = currentIncome > 0 ? (((currentIncome - currentExpenses) / currentIncome) * 100).toFixed(1) + '%' : '0%';

    // Burn Rate (média de gastos mensais)
    const burnRate = currentExpenses;

    // Score Financeiro (baseado em múltiplos fatores)
    const score = calculateFinancialScore(currentIncome, currentExpenses, goals, transactions);

    // Crescimento Patrimonial (últimos 6 meses)
    const wealthGrowth = calculateWealthGrowth(transactions);

    // Eficiência de Gastos
    const expenseEfficiency = calculateExpenseEfficiency(transactions);

    // Diversificação (baseada em categorias)
    const diversification = calculateDiversification(transactions);

    // Liquidez (meses de reserva)
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
    let score = 500; // Base score

    // Fator de poupança (0-200 pontos)
    const savingsRate = income > 0 ? (income - expenses) / income : 0;
    score += Math.min(200, savingsRate * 400);

    // Fator de metas (0-150 pontos)
    const totalGoals = (goals || []).reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalSaved = (goals || []).reduce((sum, goal) => sum + goal.savedAmount, 0);
    const goalsProgress = totalGoals > 0 ? totalSaved / totalGoals : 0;
    score += Math.min(150, goalsProgress * 150);

    // Fator de consistência (0-100 pontos)
    const consistencyBonus = calculateConsistencyBonus(transactions);
    score += consistencyBonus;

    // Fator de diversificação (0-50 pontos)
    const diversificationBonus = calculateDiversification(transactions) / 2;
    score += diversificationBonus;

    return Math.round(Math.min(1000, Math.max(300, score)));
}

export function calculateWealthGrowth(transactions) {
    // Simular crescimento patrimonial baseado em transações
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
    // Calcular eficiência baseada na variação de gastos
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentExpenses = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount, 0);

    const avgExpenses = calculateAverageExpenses(transactions);

    if (avgExpenses === 0) return 100;

    const efficiency = Math.max(0, 100 - ((currentExpenses - avgExpenses) / avgExpenses * 100));
    return Math.round(Math.min(100, efficiency));
}

export function calculateAverageExpenses(transactions) {
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

    // Calcular índice de diversificação (baseado na distribuição)
    const maxCategoryPercent = Math.max(...Object.values(categoryExpenses)) / totalExpenses;
    const diversificationScore = Math.max(0, 100 - (maxCategoryPercent * 100));

    return Math.round(diversificationScore);
}

export function calculateConsistencyBonus(transactions) {
    // Bonus baseado na consistência de poupança
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

    // Verificar se houve poupança consistente
    const positiveSavings = last3Months.filter(rate => rate > 0).length;
    return (positiveSavings / last3Months.length) * 100;
}
