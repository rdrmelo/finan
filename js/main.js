import { initAuth } from './modules/auth.js';
import { loadLocalData, saveLocalData } from './services/storage.js';
import { updateDashboardUI, switchPage, openModal, closeAllModals, modals, updateCategorySuggestions } from './components/dashboard.js';
import { addTransaction, updateTransaction, deleteTransaction, subscribeToTransactions } from './services/transactions.js';
import { addCategory, updateCategory, deleteCategory, subscribeToCategories } from './services/categories.js';
import { setBudget, subscribeToBudgets } from './services/budgets.js';
import { addFundsToGoal, deleteGoal, subscribeToGoals } from './services/goals.js';
import { formatCurrency } from './utils/formatters.js';

let state = {
    user: null,
    transactions: [],
    recurringTemplates: [],
    goals: [],
    categories: [],
    budgets: []
};

let unsubscribeListeners = [];

document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.add('dark');

    initAuth(
        (user) => {
            console.log('Usuário logado:', user.email);
            state.user = user;

            // 1. Carregar dados locais primeiro (para cache/offline imediato)
            const localData = loadLocalData(user);
            state = { ...state, ...localData };
            refreshUI();

            // 2. Conectar ao Firestore para atualizações em tempo real
            setupFirestoreListeners(user);

            initializeUI();
        },
        () => {
            console.log('Usuário deslogado');
            state.user = null;
            // Limpar listeners antigos
            unsubscribeListeners.forEach(unsub => unsub());
            unsubscribeListeners = [];
            // Redirect or show login logic is handled in auth.js via UI toggle
        }
    );

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker registrado'))
            .catch(err => console.error('Erro ao registrar SW:', err));
    }
});

function setupFirestoreListeners(user) {
    // Limpar listeners anteriores se existirem
    unsubscribeListeners.forEach(unsub => unsub());
    unsubscribeListeners = [];

    // Transactions Listener
    const unsubTransactions = subscribeToTransactions(user, (transactions) => {
        state.transactions = transactions;
        saveLocalData(state.user, state);
        refreshUI();
    });
    unsubscribeListeners.push(unsubTransactions);

    // Categories Listener
    const unsubCategories = subscribeToCategories(user, (categories) => {
        state.categories = categories;
        saveLocalData(state.user, state);
        refreshUI();
    });
    unsubscribeListeners.push(unsubCategories);

    // Goals Listener
    const unsubGoals = subscribeToGoals(user, (goals) => {
        state.goals = goals;
        saveLocalData(state.user, state);
        refreshUI();
    });
    unsubscribeListeners.push(unsubGoals);

    // Budgets Listener
    const unsubBudgets = subscribeToBudgets(user, (budgets) => {
        state.budgets = budgets;
        saveLocalData(state.user, state);
        refreshUI();
    });
    unsubscribeListeners.push(unsubBudgets);

    // Note: Add listeners for recurringTemplates if needed
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
            } else {
                await addTransaction(state.user, data);
            }
            // State updates will flow via Firestore listener
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
                // State updates will flow via Firestore listener
            }
        }
    });
}
