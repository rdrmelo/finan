import { formatCurrency } from '../utils/formatters.js';
import { getCategoryColor } from '../services/categories.js';
import { updateCharts } from './charts.js';

export function updateDashboardUI(user, transactions, goals, categories, budgets) {
    if (!user) return;

    updateSummary(transactions);
    updateNetWorthCard(transactions, goals);
    renderRecentTransactions(transactions, categories);
    renderGoals(goals);

    // Update charts
    updateCharts(transactions);
}

export function updateSummary(transactions) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));

    const totalIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const balanceEl = document.getElementById('balance');
    const incomeEl = document.getElementById('total-income');
    const expenseEl = document.getElementById('total-expense');

    if (balanceEl) balanceEl.textContent = formatCurrency(balance);
    if (incomeEl) incomeEl.textContent = formatCurrency(totalIncome);
    if (expenseEl) expenseEl.textContent = formatCurrency(totalExpense);
}

export function updateNetWorthCard(transactions, goals) {
    // Calculate current month balance
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyIncome = transactions.filter(t => t.type === 'income' && t.date.startsWith(currentMonth)).reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth)).reduce((sum, t) => sum + t.amount, 0);
    const monthlyBalance = monthlyIncome - monthlyExpense;

    const totalInGoals = (goals || []).reduce((sum, goal) => sum + goal.savedAmount, 0);
    const netWorth = monthlyBalance + totalInGoals;

    const goalsEl = document.getElementById('total-in-goals');
    const netWorthEl = document.getElementById('net-worth');

    if (goalsEl) goalsEl.textContent = formatCurrency(totalInGoals);
    if (netWorthEl) netWorthEl.textContent = formatCurrency(netWorth);
}

export function renderRecentTransactions(transactions, categories) {
    const listElement = document.getElementById('transactions-list');
    if (!listElement) return;

    listElement.innerHTML = '';

    // Show last 5 transactions
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    if (sortedTransactions.length === 0) {
        listElement.innerHTML = '<p class="text-center text-gray-500 py-4">Nenhuma transação recente.</p>';
        return;
    }

    sortedTransactions.forEach(t => {
        const item = document.createElement('div');
        item.className = `flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors`;

        const sign = t.type === 'income' ? '+' : '-';
        const amountColor = t.type === 'income' ? 'text-green-400' : 'text-red-400';

        // Fix date timezone issue
        const dateParts = t.date.split('-');
        const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        const formattedDate = date.toLocaleDateString('pt-BR');

        const recurringIcon = t.recurringTemplateId ? '<span class="text-blue-400" title="Despesa Recorrente"> 🔄</span>' : '';
        const categoryColor = getCategoryColor(categories, t.category);

        // Simplified text color logic (assuming dark mode or specific colors)
        const categoryTextColor = '#fff';

        item.innerHTML = `
            <div class="flex items-center gap-4">
                <div>
                    <p class="font-semibold text-gray-200">${t.description}${recurringIcon}</p>
                    <div class="flex items-center gap-2 text-sm">
                        <span style="background-color: ${categoryColor}20; color: ${categoryColor}; border: 1px solid ${categoryColor}40" class="px-2 py-0.5 rounded-full text-xs font-semibold">
                            ${t.category}
                        </span>
                        <span class="text-gray-400">•</span>
                        <span class="text-gray-400">${formattedDate}</span>
                    </div>
                </div>
            </div>
            <div class="text-right">
                <p class="font-mono font-bold ${amountColor}">${sign} ${formatCurrency(t.amount)}</p>
                <div class="flex gap-2 mt-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button data-id="${t.id}" class="edit-btn text-xs text-cyan-400 hover:underline">Editar</button>
                    <button data-id="${t.id}" class="delete-btn text-xs text-red-400 hover:underline">Excluir</button>
                </div>
            </div>
        `;
        listElement.appendChild(item);
    });
}

export function renderGoals(goals) {
    const listEl = document.getElementById('goals-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    if (!goals || goals.length === 0) {
        listEl.innerHTML = '<p class="text-center col-span-full text-gray-400 py-8">Crie seu primeiro cofrinho para começar a poupar!</p>';
        return;
    }

    goals.forEach(goal => {
        const progress = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;
        const card = document.createElement('div');
        card.className = 'glass-card flex flex-col justify-between p-4 rounded-xl relative group';

        const planButton = goal.actionPlan ? `<button data-id="${goal.id}" class="view-plan-btn text-sm text-indigo-400 hover:underline">Ver Plano</button>` : '';

        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-mono text-xl font-bold text-white">${goal.name}</h3>
                    <div class="flex items-center space-x-2">
                        ${planButton}
                        <button data-id="${goal.id}" class="delete-goal-btn text-red-400 hover:text-red-600 transition-colors p-1" title="Excluir">&times;</button>
                    </div>
                </div>
                <p class="text-sm mb-4 text-gray-300">Guardado: <span class="font-semibold text-green-400">${formatCurrency(goal.savedAmount)}</span> de ${formatCurrency(goal.targetAmount)}</p>
                <div class="w-full bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-green-500 to-emerald-400" style="width: ${Math.min(progress, 100)}%;"></div>
                </div>
                <p class="text-right text-sm font-semibold font-mono text-gray-400">${progress.toFixed(1)}%</p>
            </div>
            <div class="mt-4">
                <button data-id="${goal.id}" class="add-funds-btn btn w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 transition-colors">Adicionar Dinheiro</button>
            </div>
        `;
        listEl.appendChild(card);
    });
}

export function updateCategorySuggestions(categories) {
    const datalist = document.getElementById('category-suggestions');
    if (!datalist) return;

    datalist.innerHTML = '';
    const sortedCategories = [...(categories || [])].sort((a, b) => a.name.localeCompare(b.name));

    sortedCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        datalist.appendChild(option);
    });
}

export function switchPage(page) {
    const pages = ['dashboard', 'executive', 'goals', 'budgets', 'calendar', 'settings'];
    pages.forEach(p => {
        const pageEl = document.getElementById(`${p}-page`);
        const navEl = document.getElementById(`nav-${p}`);
        if (pageEl) pageEl.classList.toggle('hidden', p !== page);
        if (navEl) navEl.classList.toggle('active', p === page);
    });

    // Mobile nav update (simplified)
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('text-blue-400');
        if (item.getAttribute('href') === `#${page}`) {
            item.classList.add('text-blue-400');
        }
    });
}

export const modals = {
    transaction: 'transaction-modal',
    recurring: 'recurring-modal',
    goal: 'goal-modal',
    addFunds: 'add-funds-modal',
    report: 'report-modal',
    viewPlan: 'view-plan-modal',
    reminder: 'reminder-modal',
    categoryManager: 'category-manager-modal',
    categoryEdit: 'category-edit-modal',
    budget: 'budget-modal',
    expenseAlerts: 'expense-alerts-modal',
    delete: 'delete-confirm-modal'
};

export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('hidden', 'opacity-0');
}

export function closeAllModals() {
    Object.values(modals).forEach(id => {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('hidden', 'opacity-0');
    });
}
