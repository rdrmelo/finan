
import { formatCurrency } from '../utils/formatters.js';
// getBudgetForCategory removed as it is not used here.

// Global state references (to be passed in or managed via a store)
// For now, we'll accept them as arguments or assume they are available via module scope if we were using a singleton store.
// To keep it pure, we will accept data as arguments.

export function updateSummary(transactions) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const cycleTransactions = transactions.filter(t => t.date >= startDate && t.date <= endDate);
    const totalIncome = cycleTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = cycleTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    document.getElementById('balance').textContent = formatCurrency(balance);
    document.getElementById('total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('total-expense').textContent = formatCurrency(totalExpense);
}


export function updateNetWorthCard(transactions, goals) {
    // Calcular saldo do mês atual
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM

    const monthlyIncome = transactions.filter(t =>
        t.type === 'income' && t.date.startsWith(currentMonth)
    ).reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpense = transactions.filter(t =>
        t.type === 'expense' && t.date.startsWith(currentMonth)
    ).reduce((sum, t) => sum + t.amount, 0);

    const monthlyBalance = monthlyIncome - monthlyExpense;
    const totalInGoals = (goals || []).reduce((sum, goal) => sum + goal.savedAmount, 0);
    const netWorth = monthlyBalance + totalInGoals;

    const totalInGoalsEl = document.getElementById('total-in-goals');
    const netWorthEl = document.getElementById('net-worth');

    if (totalInGoalsEl) totalInGoalsEl.textContent = formatCurrency(totalInGoals);
    if (netWorthEl) netWorthEl.textContent = formatCurrency(netWorth);
}

export function renderTransactionsList(transactionsToRender, categories) {
    const listElement = document.getElementById('transactions-list');
    if (!listElement) return;

    listElement.innerHTML = '';
    if (transactionsToRender.length === 0) {
        listElement.innerHTML = '<p class="text-center text-gray-400 py-8">Nenhuma transação encontrada.</p>';
        return;
    }

    transactionsToRender.forEach(t => {
        const item = document.createElement('div');
        item.className = `flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 mb-2 hover:bg-white/10 transition-colors`;

        const sign = t.type === 'income' ? '+' : '-';
        const amountColor = t.type === 'income' ? 'text-green-400' : 'text-red-400';
        const date = new Date(t.date + 'T00:00:00');
        const formattedDate = date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        const recurringIcon = t.recurringTemplateId ? '<span class="text-blue-400" title="Despesa Recorrente"> 🔄</span>' : '';

        // Find category color
        const categoryObj = categories.find(c => c.name === t.category);
        const categoryColor = categoryObj ? categoryObj.color : '#888888';
        const categoryTextColor = getContrastingTextColor(categoryColor);

        const tagsHtml = (t.tags && t.tags.length > 0) ?
            `<div class="flex flex-wrap gap-1 mt-1">${t.tags.map(tag => `<span class="px-1.5 py-0.5 rounded text-[10px] bg-gray-700 text-gray-300 border border-gray-600">${tag}</span>`).join('')}</div>` : '';

        item.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl" style="background-color: ${categoryColor}20;">
                    ${t.type === 'income' ? '💰' : '💸'}
                </div>
                <div>
                    <p class="font-semibold text-gray-200">${t.description}${recurringIcon}</p>
                    <div class="flex items-center gap-2 text-sm mt-1">
                        <span style="background-color: ${categoryColor}; color: ${categoryTextColor}" class="px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm">${t.category}</span>
                        <span class="text-gray-500">•</span>
                        <span class="text-gray-400">${formattedDate}</span>
                    </div>
                    ${tagsHtml}
                </div>
            </div>
            <div class="text-right">
                <p class="font-mono font-bold ${amountColor} text-lg">${sign} ${formatCurrency(t.amount)}</p>
                <div class="flex gap-3 justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button data-id="${t.id}" class="edit-btn text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        Editar
                    </button>
                    <button data-id="${t.id}" class="delete-btn text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Excluir
                    </button>
                </div>
            </div>
        `;
        listElement.appendChild(item);
    });
}

export function getContrastingTextColor(hexColor) {
    if (!hexColor) return '#000000';
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
}

export function renderGoals(goals) {
    const listEl = document.getElementById('goals-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    if (!goals || goals.length === 0) {
        listEl.innerHTML = '<div class="col-span-full text-center py-10 bg-gray-800/30 rounded-xl border border-gray-700 border-dashed"><p class="text-gray-400 mb-2">Você ainda não tem cofrinhos.</p><p class="text-sm text-gray-500">Crie metas para organizar suas economias!</p></div>';
        return;
    }

    goals.forEach(goal => {
        const progress = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;
        const card = document.createElement('div');
        card.className = 'glass-card flex flex-col justify-between group hover:border-cyan-500/30 transition-all duration-300';

        const planButton = goal.actionPlan ? `<button data-id="${goal.id}" class="view-plan-btn text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>Ver Plano</button>` : '';

        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <h3 class="font-mono text-xl font-bold text-gray-100">${goal.name}</h3>
                    </div>
                    <div class="flex items-center space-x-2">
                        ${planButton}
                        <button data-id="${goal.id}" class="delete-goal-btn text-gray-500 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-white/5" title="Excluir meta">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>
                
                <div class="flex justify-between items-end mb-2">
                    <div>
                        <p class="text-xs text-gray-400 uppercase tracking-wider">Guardado</p>
                        <p class="font-semibold text-green-400 text-lg">${formatCurrency(goal.savedAmount)}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-gray-400 uppercase tracking-wider">Meta</p>
                        <p class="font-semibold text-gray-300">${formatCurrency(goal.targetAmount)}</p>
                    </div>
                </div>
                
                <div class="relative w-full bg-gray-700/50 rounded-full h-3 mb-2 overflow-hidden">
                    <div class="progress-bar-fill h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden" style="background: linear-gradient(90deg, #10b981, #3b82f6); width: ${Math.min(progress, 100)}%;">
                        <div class="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full animate-shimmer"></div>
                    </div>
                </div>
                
                <div class="flex justify-between items-center text-xs">
                    <span class="text-gray-400">${progress < 50 ? 'Continue assim!' : progress < 100 ? 'Quase lá!' : 'Conquista desbloqueada! 🎉'}</span>
                    <span class="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">${progress.toFixed(1)}%</span>
                </div>
            </div>
            
            <div class="mt-6 pt-4 border-t border-white/5">
                <button data-id="${goal.id}" class="add-funds-btn btn btn-primary w-full flex items-center justify-center gap-2 py-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    Adicionar Dinheiro
                </button>
            </div>
        `;
        listEl.appendChild(card);
    });
}

export function renderBudgetsPage(categories, budgets, transactions) {
    const listEl = document.getElementById('budgets-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const expenseCategories = categories.filter(c => c.name.toLowerCase() !== 'salário' && c.name.toLowerCase() !== 'cofrinhos');

    if (expenseCategories.length === 0) {
        listEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center col-span-full">Adicione categorias de despesa para criar orçamentos.</p>';
        return;
    }

    let budgetsFound = false;

    expenseCategories.forEach(category => {
        // Encontrar orçamento para esta categoria e mês
        const budget = budgets.find(b => b.category === category.name && b.monthYear === currentMonth);

        if (!budget || budget.amount <= 0) return;

        budgetsFound = true;
        const spentAmount = transactions
            .filter(t => t.type === 'expense' && t.category === category.name && t.date >= startDate && t.date <= endDate)
            .reduce((sum, t) => sum + t.amount, 0);

        const percentage = (spentAmount / budget.amount) * 100;

        let progressBarColor = 'bg-green-500';
        if (percentage > 75) progressBarColor = 'bg-yellow-500';
        if (percentage >= 100) progressBarColor = 'bg-red-500';

        const card = document.createElement('div');
        card.className = 'card-transition bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg rounded-xl p-6';

        card.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-3">
                    <span class="w-4 h-4 rounded-full" style="background-color: ${category.color}"></span>
                    <h3 class="font-bold text-lg text-gray-200">${category.name}</h3>
                </div>
                <span class="text-sm font-bold bg-gray-800 px-2 py-1 rounded ${percentage >= 100 ? 'text-red-400' : percentage > 75 ? 'text-yellow-400' : 'text-green-400'}">
                    ${percentage.toFixed(0)}%
                </span>
            </div>
            
            <div class="flex justify-between text-sm text-gray-400 mb-2">
                <span>Gasto: ${formatCurrency(spentAmount)}</span>
                <span>Limite: ${formatCurrency(budget.amount)}</span>
            </div>
            
            <div class="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                <div class="progress-bar-fill h-3 rounded-full ${progressBarColor} transition-all duration-1000" style="width: ${Math.min(percentage, 100)}%;"></div>
            </div>
            
            <p class="text-xs text-right mt-2 ${percentage >= 100 ? 'text-red-400 font-bold' : 'text-gray-500'}">
                ${percentage >= 100 ? 'Orçamento estourado!' : `Restam ${formatCurrency(Math.max(0, budget.amount - spentAmount))}`}
            </p>
        `;
        listEl.appendChild(card);
    });

    if (!budgetsFound) {
        listEl.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center p-10 bg-white/5 rounded-xl border border-dashed border-gray-600">
            <div class="p-4 bg-gray-700/50 rounded-full mb-4">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 36v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            </div>
            <p class="text-gray-300 font-medium text-lg">Nenhum orçamento definido</p>
            <p class="text-gray-500 text-sm mb-6 text-center max-w-md">Defina limites de gastos para suas categorias e mantenha suas finanças sob controle.</p>
            <button id="create-first-budget-btn" class="btn btn-primary">Definir Orçamentos</button>
        </div>`;

        // Add listener optionally if element exists (caller should handle or we add basic delegation)
        const btn = document.getElementById('create-first-budget-btn');
        if (btn) btn.addEventListener('click', () => document.getElementById('manage-budgets-btn').click());
    }
}

export function updateBudgetSummaryCard(budgets, transactions, categories) {
    const summaryEl = document.getElementById('budget-summary');
    if (!summaryEl) return;

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const relevantBudgets = budgets.filter(b => b.monthYear === currentMonth && b.amount > 0);

    if (relevantBudgets.length === 0) {
        summaryEl.textContent = 'N/A';
        return;
    }

    let withinLimitCount = 0;
    relevantBudgets.forEach(budget => {
        const spentAmount = transactions
            .filter(t => t.type === 'expense' && t.category === budget.category && t.date >= startDate && t.date <= endDate)
            .reduce((sum, t) => sum + t.amount, 0);

        if (spentAmount <= budget.amount) {
            withinLimitCount++;
        }
    });

    summaryEl.textContent = `${withinLimitCount} / ${relevantBudgets.length}`;

    // Color code
    if (withinLimitCount === relevantBudgets.length) summaryEl.className = 'text-green-400 font-bold';
    else if (withinLimitCount >= relevantBudgets.length / 2) summaryEl.className = 'text-yellow-400 font-bold';
    else summaryEl.className = 'text-red-400 font-bold';
}

export function renderCalendar(date, transactions) {
    const grid = document.getElementById('calendar-grid');
    const title = document.getElementById('month-year-title');
    if (!grid || !title) return;

    grid.innerHTML = '';

    const year = date.getFullYear();
    const month = date.getMonth();

    title.textContent = new Date(year, month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'font-bold text-center py-2 text-xs text-gray-400 bg-gray-800/50 rounded-t-sm';
        dayHeader.textContent = day;
        grid.appendChild(dayHeader);
    });

    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'bg-gray-800/20 rounded-sm min-h-[60px]';
        grid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const dayTransactions = transactions.filter(t => t.date === currentDateStr);
        const dayTotal = dayTransactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

        const hasIncome = dayTransactions.some(t => t.type === 'income');
        const hasExpense = dayTransactions.some(t => t.type === 'expense');

        let indicators = '';
        if (hasIncome) indicators += '<span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>';
        if (hasExpense) indicators += '<span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>';

        cell.className = `p-1 bg-gray-800/40 rounded-sm min-h-[60px] relative hover:bg-gray-700/50 transition-colors cursor-pointer border border-transparent hover:border-gray-600`;
        cell.innerHTML = `
            <div class="flex justify-between items-start">
                <span class="font-bold text-sm ${dayTotal > 0 ? 'text-green-400' : dayTotal < 0 ? 'text-red-400' : 'text-gray-400'}">${day}</span>
                <div class="flex gap-0.5">${indicators}</div>
            </div>
            ${dayTotal !== 0 ? `<div class="text-[10px] sm:text-xs font-mono mt-1 ${dayTotal > 0 ? 'text-green-300' : 'text-red-300'}">${formatCurrency(Math.abs(dayTotal), 0).replace('R$', '')}</div>` : ''}
        `;

        // Add click handler to show transactions for this day
        if (dayTransactions.length > 0) {
            // We can add data attributes for the global event listener to pick up
            cell.dataset.date = currentDateStr;
            cell.dataset.action = 'view-day-details'; // Marker for event delegation
        }

        grid.appendChild(cell);
    }
}
