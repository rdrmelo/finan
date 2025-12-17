
import { formatCurrency } from '../utils/formatters.js';

// Modal elements cache
export const modals = {
    transaction: document.getElementById('transaction-modal'),
    goal: document.getElementById('goal-modal'),
    addFunds: document.getElementById('add-funds-modal'),
    viewPlan: document.getElementById('view-plan-modal'),
    recurring: document.getElementById('recurring-modal'),
    report: document.getElementById('report-modal'),
    settings: document.getElementById('settings-modal'),
    delete: document.getElementById('delete-modal'),
    budget: document.getElementById('budget-modal'),
    categoryManager: document.getElementById('category-manager-modal'),
    categoryEdit: document.getElementById('category-edit-modal'),
    reminder: document.getElementById('reminder-modal'),
    changePassword: document.getElementById('change-password-modal')
};

export function closeAllModals() {
    Object.values(modals).forEach(modal => {
        if (modal) modal.classList.add('hidden', 'opacity-0');
    });
}

export function openModal(modal) {
    if (modal) modal.classList.remove('hidden', 'opacity-0');
}

export function openTransactionModal(type, transaction = null, categories = [], preFillData = null) {
    const form = document.getElementById('transaction-form');
    form.reset();
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('options-section').classList.toggle('hidden', type === 'income' || !!transaction);
    document.getElementById('installments-count-container').classList.add('hidden');
    document.getElementById('modal-title').textContent = transaction ? 'Editar Transação' : (type === 'income' ? 'Adicionar Receita' : 'Adicionar Despesa');
    document.getElementById('transaction-type').value = type;

    // Popula as opções de categoria 
    populateCategorySuggestions(categories);

    if (transaction) {
        document.getElementById('transaction-id').value = transaction.id;
        document.getElementById('description').value = transaction.description;
        document.getElementById('amount').value = transaction.amount;
        document.getElementById('category').value = transaction.category;
        document.getElementById('date').value = transaction.date;
        document.getElementById('tags').value = (transaction.tags || []).join(', ');
    } else {
        document.getElementById('transaction-id').value = '';
        document.getElementById('tags').value = '';

        if (preFillData) {
            if (preFillData.description) document.getElementById('description').value = preFillData.description;
            if (preFillData.amount) document.getElementById('amount').value = preFillData.amount;
            // Try to match category
            if (preFillData.category && categories.some(c => c.name.toLowerCase() === preFillData.category.toLowerCase())) {
                const match = categories.find(c => c.name.toLowerCase() === preFillData.category.toLowerCase());
                document.getElementById('category').value = match.name;
            }
        }
    }
    updateDateLabel();
    openModal(modals.transaction);
}

export function openDeleteModal(id, type) {
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const modalText = document.getElementById('delete-modal-text');

    if (confirmBtn && modalText) {
        confirmBtn.dataset.id = id;
        confirmBtn.dataset.type = type;

        if (type === 'transaction') modalText.textContent = `Tem certeza que deseja excluir esta transação?`;
        else if (type === 'goal') modalText.textContent = `Tem certeza que deseja excluir este cofrinho?`;
        else if (type === 'category') modalText.textContent = `Tem certeza? Todas as transações nesta categoria serão movidas para "Outros".`;
        else if (type === 'recurring') modalText.textContent = `Tem certeza que deseja parar esta recorrência?`;

        // Abrir modal de exclusão sem fechar outros modais (exceto se for category manager que deve ficar aberto)
        if (modals.delete) modals.delete.classList.remove('hidden', 'opacity-0');
    }
}

export function openRecurringModal(transactions) {
    const listEl = document.getElementById('recurring-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    const uniqueRecurring = new Map();

    transactions.forEach(t => {
        if (t.recurringTemplateId && !uniqueRecurring.has(t.recurringTemplateId)) {
            uniqueRecurring.set(t.recurringTemplateId, t);
        }
    });

    if (uniqueRecurring.size === 0) {
        listEl.innerHTML = '<p class="text-gray-400 text-center py-4">Nenhuma despesa recorrente encontrada.</p>';
    } else {
        Array.from(uniqueRecurring.values()).forEach(transaction => {
            const itemEl = document.createElement('div');
            itemEl.className = 'flex justify-between items-center p-3 bg-slate-800/50 rounded-lg mb-2';

            itemEl.innerHTML = `
                <div>
                    <p class="font-semibold text-gray-200">${transaction.description.replace(/\s\(\d+\/\d+\)/, '')}</p>
                    <p class="text-sm text-gray-400">
                        ${formatCurrency(transaction.amount)} / mês - Categoria: ${transaction.category}
                    </p>
                </div>
                <button data-template-id="${transaction.recurringTemplateId}" class="delete-recurring-btn p-2 text-red-400 hover:text-red-300 transition-colors">&times;</button>
            `;

            listEl.appendChild(itemEl);
        });
    }

    openModal(modals.recurring);
}

export function openGoalModal() {
    document.getElementById('goal-form').reset();
    document.getElementById('action-plan-display').classList.add('hidden');
    // global temporaryActionPlan reset needs to be handled by app/store
    openModal(modals.goal);
}

export function openAddFundsModal(goalId, goals) {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
        document.getElementById('add-funds-form').reset();
        document.getElementById('add-funds-goal-id').value = goalId;
        document.getElementById('add-funds-modal-title').textContent = `Adicionar a: ${goal.name}`;
        openModal(modals.addFunds);
    }
}

export function openViewPlanModal(goalId, goals) {
    const goal = goals.find(g => g.id === goalId);
    if (goal && goal.actionPlan) {
        document.getElementById('view-plan-title').textContent = `Plano para: ${goal.name}`;
        const listEl = document.getElementById('view-plan-list');
        listEl.innerHTML = goal.actionPlan.map(step => `<li class="p-2 bg-gray-100 dark:bg-slate-800/50 rounded border border-gray-700/50 mb-1 text-sm">${step}</li>`).join('');
        openModal(modals.viewPlan);
    }
}

export function openReportModal() {
    const reportForm = document.getElementById('report-form');
    if (reportForm) reportForm.reset();
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    // Trigger change event manually or logic to set visibility
    document.getElementById('report-month-container').classList.remove('hidden');
    document.getElementById('report-year-container').classList.add('hidden');

    document.getElementById('report-month').value = `${year}-${month}`;
    document.getElementById('report-year').value = year;
    openModal(modals.report);
}

export function openSettingsModal() {
    // API key gets loaded from localStorage by app logic, but we can set it here if we assume synchronous access
    // document.getElementById('api-key-input').value = localStorage.getItem('GEMINI_API_KEY') || ''; 
    openModal(modals.settings);
}

export function openCategoryManagerModal(categories) {
    // Render list logic is passed in or handled by callback? 
    // Ideally render logic shouldn't be here. 
    // But we can trigger an event or assume caller renders list before calling this.
    openModal(modals.categoryManager);
}

export function openCategoryEditModal(category = null) {
    const form = document.getElementById('category-edit-form');
    form.reset();
    const modalTitle = document.getElementById('category-edit-modal-title');
    const idInput = document.getElementById('category-edit-id');
    const nameInput = document.getElementById('category-name-input');
    const colorInput = document.getElementById('category-color-input');

    if (category) {
        modalTitle.textContent = 'Editar Categoria';
        idInput.value = category.id;
        nameInput.value = category.name;
        colorInput.value = category.color;
    } else {
        modalTitle.textContent = 'Nova Categoria';
        idInput.value = '';
        colorInput.value = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    }
    openModal(modals.categoryEdit);
}

export function openBudgetModal(categories, budgets, cycleMonthYear) {
    const formInputs = document.getElementById('budget-form-inputs');
    formInputs.innerHTML = '';

    const expenseCategories = categories.filter(c => c.name.toLowerCase() !== 'salário' && c.name.toLowerCase() !== 'cofrinhos');

    expenseCategories.sort((a, b) => a.name.localeCompare(b.name)).forEach(category => {
        const budget = budgets.find(b => b.category === category.name && b.monthYear === cycleMonthYear);
        const value = budget ? budget.amount : '';

        const inputGroup = document.createElement('div');
        inputGroup.innerHTML = `
            <label for="budget-${category.id}" class="block text-sm font-medium text-gray-300">${category.name}</label>
            <div class="mt-1 flex rounded-md shadow-sm">
                <span class="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-600 bg-gray-700 text-gray-300">R$</span>
                <input type="number" id="budget-${category.id}" data-category-name="${category.name}" value="${value}" step="0.01" placeholder="0,00" class="flex-1 block w-full rounded-none rounded-r-md bg-gray-800 border-gray-600 text-white focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm h-10 px-2">
            </div>
        `;
        formInputs.appendChild(inputGroup);
    });

    openModal(modals.budget);
}

// Helpers
function updateDateLabel() {
    const dateLabel = document.getElementById('date-label');
    if (document.getElementById('is-installment').checked) dateLabel.textContent = 'Data da 1ª Parcela';
    else if (document.getElementById('is-recurring').checked) dateLabel.textContent = 'Data de Início da Recorrência';
    else dateLabel.textContent = 'Data';
}

function populateCategorySuggestions(categories) {
    const datalist = document.getElementById('category-suggestions');
    if (!datalist) return;
    datalist.innerHTML = '';

    const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));

    sortedCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        datalist.appendChild(option);
    });
}
