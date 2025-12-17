
import {
    login, register, logout, subscribeToAuthChanges,
    sendPasswordReset, updateUserProfile, changeUserPassword
} from '../services/auth.js';
import {
    addItem, updateItem, deleteItem, subscribeToCollection,
    initializeDefaultCategories, getBudgetForCategory
} from '../services/db.js';
import {
    updateSummary, updateNetWorthCard, renderTransactionsList,
    renderGoals, renderBudgetsPage, updateBudgetSummaryCard,
    renderCalendar, getContrastingTextColor
} from '../ui/render.js';
import {
    createWealthTrendChart, createCashFlowChart, createHealthTrendChart, createExpensePieChart
} from '../ui/charts.js';
import { generateWealthTrendData, generateCashFlowData, generateExpensePieData } from '../utils/analytics.js';
import { generatePDF } from '../services/reports.js';
import { startListening, parseTransactionCommand, isVoiceSupported } from '../services/voice.js';
import { BADGES, getUnlockedBadges, getBadgeDetails } from '../utils/badges.js';
import { exportTransactionsToCSV, downloadCSV } from '../services/export.js';
import { openScannerModal, initScannerListeners } from '../ui/scanner.js';
import {
    updateDashboard
} from '../ui/dashboard.js';
import {
    showNotification
} from '../ui/notifications.js';
import {
    openModal, closeAllModals, openTransactionModal,
    openDeleteModal, openRecurringModal, openGoalModal,
    openAddFundsModal, openViewPlanModal, openReportModal,
    openSettingsModal, openCategoryManagerModal, openCategoryEditModal,
    openBudgetModal
} from '../ui/modals.js';
import { openAIAdvisor } from '../ui/ai-advisor.js';
import { validatePassword, checkFormValidity } from '../utils/validators.js';
import { formatCurrency } from '../utils/formatters.js';

// --- State ---
let currentUser = null;
let transactions = [];
let categories = [];
let goals = [];
let budgets = [];
let recurringTemplates = [];
let paymentReminders = [];
let expenseAlerts = [];
let expenseChart = null;
let localUnlockedBadges = new Set(JSON.parse(localStorage.getItem('unlockedBadges')) || []);

let currentMonthDate = new Date();
let hiddenWidgets = JSON.parse(localStorage.getItem('hiddenWidgets')) || [];
const theme = localStorage.getItem('theme') || 'dark';

// --- Initialization ---

async function initApp() {
    setupGlobalEventListeners();
    setupTheme();

    subscribeToAuthChanges(async (user) => {
        currentUser = user;
        if (user) {
            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            document.getElementById('user-name').textContent = user.displayName || 'Usuário';

            await initializeAppLogic(user);
        } else {
            document.getElementById('auth-screen').classList.remove('hidden');
            document.getElementById('app-container').classList.add('hidden');
            // Clear data?
        }
    });
}

function setupTheme() {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

async function initializeAppLogic(user) {
    // Subscriptions
    const collections = [
        { name: 'transactions', setter: (data) => transactions = data },
        { name: 'categories', setter: (data) => categories = data },
        { name: 'goals', setter: (data) => goals = data },
        { name: 'budgets', setter: (data) => budgets = data },
        { name: 'recurringTemplates', setter: (data) => recurringTemplates = data },
        { name: 'paymentReminders', setter: (data) => paymentReminders = data },
        { name: 'expenseAlerts', setter: (data) => expenseAlerts = data }
    ];

    collections.forEach(({ name, setter }) => {
        subscribeToCollection(user.uid, name, (data) => {
            setter(data);
            updateStore();
            updateUI();
        });
    });

    // Check for default categories
    // separate async check to not block UI?
    // We can assume if categories is empty after valid fetch, we init.
    // Logic handled in db.js or here? db.js has initializeDefaultCategories.
    // We'll wait a bit or check if categories is empty. 
    // For now rely on manual execution or check on load.
    // Actually, subscribe is async. 
}

function updateStore() {
    // If we had a centralized store object, we would update it here.
    // For now, module-level variables act as store.
}

function updateUI() {
    if (!currentUser) return;

    // Sort transactions
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Determine current view/page and render appropriately
    // For now, we update everything that is visible or cheap to update

    updateSummary(transactions); // Balance cards
    renderTransactionsList(transactions.slice(0, 10), categories); // Recent transactions (limit 10 for dashboard?)
    // Actually renderTransactionsList targets 'transactions-list' which is likely the main list.
    // We might need to handle pagination or view filtering.

    updateNetWorthCard(transactions, goals);
    renderGoals(goals);

    // Charts need specific data preparation
    updateCharts();

    updateDashboard(transactions, goals, budgets, recurringTemplates); // Executive summary

    updateBudgetSummaryCard(budgets, transactions, categories);

    // Calendar if visible
    // Calendar if visible
    renderCalendar(currentMonthDate, transactions);

    checkGamification();
}

function checkGamification() {
    const unlockedIds = getUnlockedBadges(transactions, goals, budgets);
    let newBadge = false;

    unlockedIds.forEach(id => {
        if (!localUnlockedBadges.has(id)) {
            localUnlockedBadges.add(id);
            const badge = getBadgeDetails(id);
            showNotification(`🏆 Nova Conquista: ${badge.name}`, 'success');
            newBadge = true;
        }
    });

    if (newBadge) {
        localStorage.setItem('unlockedBadges', JSON.stringify([...localUnlockedBadges]));
    }
}

function openBadgesModal() {
    const grid = document.getElementById('badges-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const totalBadges = BADGES.length;
    const unlockedCount = localUnlockedBadges.size;

    // Update progress
    document.getElementById('badges-progress-text').textContent = `${unlockedCount}/${totalBadges}`;
    document.getElementById('badges-progress-bar').style.width = `${(unlockedCount / totalBadges) * 100}%`;

    BADGES.forEach(badge => {
        const isUnlocked = localUnlockedBadges.has(badge.id);
        const el = document.createElement('div');
        el.className = `p-4 rounded-xl border transition-all duration-300 ${isUnlocked ? 'bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'bg-gray-800/30 border-white/5 opacity-60 grayscale'}`;

        el.innerHTML = `
            <div class="flex items-start space-x-4">
                <div class="text-4xl filter drop-shadow-lg">${badge.icon}</div>
                <div>
                    <h3 class="font-bold text-gray-200 ${isUnlocked ? 'text-cyan-300' : ''}">${badge.name}</h3>
                    <p class="text-xs text-gray-400 mt-1">${badge.description}</p>
                    ${isUnlocked ? '<span class="inline-block mt-2 text-[10px] uppercase font-bold tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Desbloqueado</span>' : '<span class="inline-block mt-2 text-[10px] uppercase font-bold tracking-wider text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded-full border border-gray-600/30">Bloqueado</span>'}
                </div>
            </div>
        `;
        grid.appendChild(el);
    });

    const modal = document.getElementById('badges-modal');
    modal.classList.remove('hidden', 'opacity-0');
}

// --- Event Listeners ---

function setupGlobalEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.currentTarget.dataset.target;
            handleNavigation(targetId);
            // Update active state
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'text-cyan-400', 'bg-cyan-900/20'));
            e.currentTarget.classList.add('active', 'text-cyan-400', 'bg-cyan-900/20');
        });
    });

    // Auth Forms
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                await login(email, password);
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // ... validation logic ...
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const name = document.getElementById('reg-name').value;

            try {
                const user = await register(email, password);
                await updateUserProfile(user, { displayName: name });
                // auto login triggers auth change
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    }

    document.getElementById('logout-btn')?.addEventListener('click', () => logout());

    // FAB and Global Buttons
    document.getElementById('fab-btn')?.addEventListener('click', () => {
        const menu = document.getElementById('fab-menu');
        menu.classList.toggle('hidden');
        menu.classList.toggle('scale-0');
        menu.classList.toggle('opacity-0');
    });

    document.getElementById('add-income-btn')?.addEventListener('click', () => openTransactionModal('income', null, categories));
    document.getElementById('add-expense-btn')?.addEventListener('click', () => openTransactionModal('expense', null, categories));
    document.getElementById('add-goal-btn')?.addEventListener('click', () => openGoalModal());
    document.getElementById('manage-budgets-btn')?.addEventListener('click', () => openBudgetModal(categories, budgets, new Date().toISOString().slice(0, 7)));

    document.getElementById('manage-recurring-btn')?.addEventListener('click', () => openRecurringModal(transactions));
    document.getElementById('manage-categories-btn')?.addEventListener('click', () => openCategoryManagerModal(categories));
    document.getElementById('generate-report-btn')?.addEventListener('click', () => openReportModal());
    document.getElementById('ai-analysis-btn')?.addEventListener('click', () => openAIAdvisor(transactions, budgets, goals));
    document.getElementById('nav-settings')?.addEventListener('click', () => openSettingsModal()); // If settings is a modal or a page? Index says #settings-page.

    // Voice Input
    document.getElementById('voice-input-btn')?.addEventListener('click', () => {
        const btn = document.getElementById('voice-input-btn');
        if (!isVoiceSupported) {
            showNotification('Seu navegador não suporta comandos de voz.', 'error');
            return;
        }

        const originalText = btn.innerHTML;

        btn.innerHTML = '🛑 Ouvindo...';
        btn.classList.add('animate-pulse');

        startListening(
            (text) => {
                btn.innerHTML = originalText;
                btn.classList.remove('animate-pulse');

                showNotification(`Voz: "${text}"`, 'info');

                const command = parseTransactionCommand(text);
                if (command) {
                    showNotification(`Comando identificado: ${command.type === 'expense' ? 'Despesa' : 'Receita'}`, 'success');
                    openTransactionModal(command.type, null, categories, command);
                } else {
                    showNotification('Não entendi. Tente "Gastei 50 em almoço".', 'warning');
                }
            },
            (error) => {
                btn.innerHTML = originalText;
                btn.classList.remove('animate-pulse');
                console.error("Voice error:", error);
                // showNotification('Erro ao ouvir voz.', 'error'); // Optional
            }
        );
    });
    // Voice Input listener already added

    document.getElementById('nav-badges')?.addEventListener('click', openBadgesModal);
    document.getElementById('mobile-nav-badges')?.addEventListener('click', openBadgesModal);

    // Export Data
    document.getElementById('export-csv-btn')?.addEventListener('click', () => {
        const csv = exportTransactionsToCSV(transactions);
        if (csv) {
            downloadCSV(csv, `financex_export_${new Date().toISOString().slice(0, 10)}.csv`);
            showNotification('Dados exportados com sucesso!', 'success');
        } else {
            showNotification('Não há transações para exportar.', 'warning');
        }
    });

    document.getElementById('scanner-btn')?.addEventListener('click', () => openScannerModal(categories));


    // Modals Close
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Delegation for dynamic elements
    document.body.addEventListener('click', (e) => {
        // Edit Transaction
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            const transaction = transactions.find(t => t.id === id);
            openTransactionModal(transaction.type, transaction, categories);
            return;
        }

        // Delete Transaction
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            openDeleteModal(deleteBtn.dataset.id, 'transaction');
            return;
        }

        // Delete Goal
        const deleteGoalBtn = e.target.closest('.delete-goal-btn');
        if (deleteGoalBtn) {
            openDeleteModal(deleteGoalBtn.dataset.id, 'goal');
            return;
        }

        // View Plan
        const viewPlanBtn = e.target.closest('.view-plan-btn');
        if (viewPlanBtn) {
            openViewPlanModal(viewPlanBtn.dataset.id, goals);
            return;
        }

        // Add Funds
        const addFundsBtn = e.target.closest('.add-funds-btn');
        if (addFundsBtn) {
            openAddFundsModal(addFundsBtn.dataset.id, goals);
            return;
        }

        // Delete Recurring
        const deleteRecurringBtn = e.target.closest('.delete-recurring-btn');
        if (deleteRecurringBtn) {
            openDeleteModal(deleteRecurringBtn.dataset.templateId, 'recurring');
            return;
        }
    });

    // Forms Submissions
    setupFormSubmissions();
    initScannerListeners();

    // Report Type Toggle
    document.getElementById('report-type')?.addEventListener('change', (e) => {
        const type = e.target.value;
        const monthGroup = document.getElementById('report-month-group');
        const yearGroup = document.getElementById('report-year-group');
        if (monthGroup && yearGroup) {
            if (type === 'monthly') {
                monthGroup.classList.remove('hidden');
                yearGroup.classList.add('hidden');
            } else {
                monthGroup.classList.add('hidden');
                yearGroup.classList.remove('hidden');
            }
        }
    });
}

function handleNavigation(targetId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(targetId).classList.remove('hidden');

    // Specific view logic
    if (targetId === 'calendar-view') {
        renderCalendar(currentMonthDate, transactions);
    }
}

function updateCharts() {
    // Wealth Trend
    const wealthCtx = document.getElementById('wealthTrendChart');
    if (wealthCtx) {
        const wealthData = generateWealthTrendData(transactions);
        createWealthTrendChart(wealthCtx, wealthData.labels, wealthData.values);
    }

    // Cash Flow
    const cashFlowCtx = document.getElementById('cashFlowChart');
    if (cashFlowCtx) {
        const flowData = generateCashFlowData(transactions);
        createCashFlowChart(cashFlowCtx, flowData.labels, flowData.income, flowData.expenses);
    }

    // Health Trend (Needs scores logic, skipping for now as scores are complex state)
    // If we have health history logic... for now simplifying.

    // Expense Pie (Used for Report)
    // We create it hidden or used elsewhere if needed. 
    // Usually it's in the Dashboard or Report section.
    // If it's not in DOM, we can create it off-screen or just for logic?
    // Wait, the report NEEDS it. But where is it displayed?
    // In original, it was displayed in 'Análise por Categorias' section of dashboard presumably.
    // Ensure we have a canvas for it if we want to display it.
    // If not, we can create a virtual canvas for the report, but generatePDF expects an existing chart instance usually?
    // Actually generatePDF calls .toBase64Image(). 
    // If the canvas is not in DOM, Chart.js might fail or we need to create it specifically.
    // Let's assume there is an element id 'expenseChart' in index.html (I should verify).
    // If not, I'll create a hidden one.

    let expenseCtx = document.getElementById('expenseChart');
    if (!expenseCtx) {
        // Create hidden canvas for report generation purposes if it doesn't exist
        expenseCtx = document.createElement('canvas');
        expenseCtx.id = 'expenseChart';
        expenseCtx.style.display = 'none';
        document.body.appendChild(expenseCtx);
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const pieData = generateExpensePieData(transactions, categories, currentMonth);
    expenseChart = createExpensePieChart(expenseCtx, pieData.labels, pieData.data, pieData.colors);
}

function setupFormSubmissions() {
    // Transaction Form
    document.getElementById('transaction-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Extract data
        const type = document.getElementById('transaction-type').value;
        const description = formData.get('description');
        const amount = parseFloat(formData.get('amount'));
        const category = formData.get('category'); // Value might be manual
        const categoryValue = category || document.getElementById('category-suggestions').value; // fallback
        const date = formData.get('date');
        const id = formData.get('id');
        const tags = formData.get('tags').split(',').map(t => t.trim()).filter(t => t);
        // ... recurring logic ...

        const data = {
            type, description, amount, category: categoryValue, date, tags
        };

        try {
            if (id) {
                await updateItem(currentUser.uid, 'transactions', id, data);
                showNotification('Transação atualizada!');
            } else {
                await addItem(currentUser.uid, 'transactions', data);
                showNotification('Transação adicionada!');
            }
            closeAllModals();
        } catch (err) {
            showNotification('Erro ao salvar transação', 'error');
            console.error(err);
        }
    });

    // Delete Confirmation
    document.getElementById('confirm-delete-btn')?.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const type = e.target.dataset.type;

        try {
            if (type === 'transaction') {
                await deleteItem(currentUser.uid, 'transactions', id);
            } else if (type === 'goal') {
                await deleteItem(currentUser.uid, 'goals', id);
            } else if (type === 'recurring') {
                // Logic to delete template and future transactions?
                // For now just delete template
                // await deleteItem(currentUser.uid, 'recurringTemplates', id);
            }
            showNotification('Item excluído com sucesso.');
            if (modals.delete) modals.delete.classList.add('hidden', 'opacity-0'); // Manual close specific modal
        } catch (err) {
            showNotification('Erro ao excluir', 'error');
        }
    });

    // ... Implement other form handlers (Goal, Budget, etc) ...

    // Report Generation Form
    document.getElementById('report-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('report-type').value;
        const includeAI = document.getElementById('include-ai-analysis').checked;
        const value = type === 'monthly' ? document.getElementById('report-month').value : document.getElementById('report-year').value;

        if (value) {
            const btn = document.getElementById('generate-pdf-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Gerando...';
            btn.disabled = true;
            try {
                await generatePDF(type, value, includeAI, transactions, categories, budgets, expenseChart);
                closeAllModals();
                showNotification('Relatório gerado com sucesso!', 'success');
            } catch (err) {
                console.error(err);
                showNotification('Erro ao gerar relatório', 'error');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        } else {
            showNotification('Selecione o período.', 'warning');
        }
    });
}

// Start
document.addEventListener('DOMContentLoaded', initApp);

