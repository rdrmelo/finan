
export function generateWealthTrendData(transactions) {
    const data = { labels: [], values: [] };

    // Last 6 months
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toISOString().slice(0, 7);

        // Cumulative balance up to end of that month
        // We need end of month date string
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const nextMonth = new Date(year, month, 1); // 1st of next month
        const endOfMonth = new Date(nextMonth - 1).toISOString().slice(0, 10);

        const cumulativeBalance = transactions
            .filter(t => t.date <= endOfMonth)
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

export function generateExpensePieData(transactions, categories, currentMonth) {
    const categoryExpenses = {};
    const colors = [];
    const labels = [];
    const data = [];

    transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
        .forEach(t => {
            categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
        });

    // Sort by amount desc
    const sortedEntries = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1]);

    sortedEntries.forEach(([catName, amount]) => {
        const category = categories.find(c => c.name === catName);
        labels.push(catName);
        data.push(amount);
        colors.push(category ? category.color : '#cbd5e1');
    });

    if (labels.length === 0) {
        labels.push('Sem dados');
        data.push(1);
        colors.push('#f1f5f9');
    }

    return { labels, data, colors };
}
