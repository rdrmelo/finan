import { initAuth } from './modules/auth.js';
import { loadLocalData, saveLocalData } from './services/storage.js';
import { updateDashboardUI, switchPage, openModal, closeAllModals, modals, updateCategorySuggestions } from './components/dashboard.js';
import { addTransaction, updateTransaction, deleteTransaction } from './services/transactions.js';
import { addCategory, updateCategory, deleteCategory } from './services/categories.js';
import { setBudget } from './services/budgets.js';
import { addFundsToGoal, deleteGoal } from './services/goals.js';
import { formatCurrency } from './utils/formatters.js';

let state = {
    user: null,
    transactions: [],
    recurringTemplates: [],
    goals: [],
    categories: [],
    budgets: []
};

document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.add('dark');

    initAuth(
        (user) => {
            console.log('Usuário logado:', user.email);
            state.user = user;
            loadData();
            initializeUI();
        },
        () => {
            console.log('Usuário deslogado');
            state.user = null;
            // Redirect or show login
        }
    );

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker registrado'))
            .catch(err => console.error('Erro ao registrar SW:', err));
    }
});

function loadData() {
    const data = loadLocalData(state.user);
    state = { ...state, ...data };
    refreshUI();
}

function refreshUI() {
    updateDashboardUI(state.user, state.transactions, state.goals, state.categories, state.budgets);
}

function initializeUI() {
    setupNavigation();
    setupModals();
    setupForms();

    // Initial page
    switchPage('dashboard');
}

function setupNavigation() {
    ['dashboard', 'executive', 'goals', 'budgets', 'calendar', 'settings'].forEach(page => {
        const btn = document.getElementById(`nav-${page}`);
        if (btn) btn.addEventListener('click', () => switchPage(page));
    });
}

function setupModals() {
    document.getElementById('add-income-btn')?.addEventListener('click', () => openTransactionModal('income'));
    document.getElementById('add-expense-btn')?.addEventListener('click', () => openTransactionModal('expense'));

    // Close buttons
    // Delegate click to close modals if clicking outside content
    Object.values(modals).forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeAllModals();
            });
        }
    });

    // Specific cancel buttons
    document.querySelectorAll('.close-modal-btn, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
}

function openTransactionModal(type, transaction = null) {
    const form = document.getElementById('transaction-form');
    if (!form) return;

    form.reset();
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('options-section').classList.toggle('hidden', type === 'income' || !!transaction);
    document.getElementById('modal-title').textContent = transaction ? 'Editar Transação' : (type === 'income' ? 'Adicionar Receita' : 'Adicionar Despesa');
    document.getElementById('transaction-type').value = type;

    updateCategorySuggestions(state.categories);

    if (transaction) {
        document.getElementById('transaction-id').value = transaction.id;
        document.getElementById('description').value = transaction.description;
        document.getElementById('amount').value = transaction.amount;
        document.getElementById('category').value = transaction.category;
        document.getElementById('date').value = transaction.date;
    } else {
        document.getElementById('transaction-id').value = '';
    }

    openModal(modals.transaction);
}

function setupForms() {
    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
        transactionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('transaction-id').value;
            const data = {
                type: document.getElementById('transaction-type').value,
                description: document.getElementById('description').value,
                amount: parseFloat(document.getElementById('amount').value),
                category: document.getElementById('category').value,
                date: document.getElementById('date').value
            };

            if (id) {
                await updateTransaction(state.user, id, data);
                // Update local state (simplified, ideally re-fetch or exact update)
                const index = state.transactions.findIndex(t => t.id === id);
                if (index !== -1) state.transactions[index] = { ...state.transactions[index], ...data };
            } else {
                await addTransaction(state.user, data);
                // We need to fetch ID or add optimistically. For now, reload data
                // Optimistic add (with temp ID) or reload:
                // Ideally loadData() again from storage/cache
                state.transactions.push({ ...data, id: Date.now().toString() }); // Temporary
            }

            saveLocalData(state.user, state);
            refreshUI();
            closeAllModals();
        });
    }

    // LIST CLICKS (Delegation)
    document.getElementById('transactions-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.dataset.id;

        if (btn.classList.contains('delete-btn')) {
            if (confirm('Excluir transação?')) {
                deleteTransaction(state.user, id);
                state.transactions = state.transactions.filter(t => t.id !== id);
                saveLocalData(state.user, state);
                refreshUI();
            }
        }
    });
}
