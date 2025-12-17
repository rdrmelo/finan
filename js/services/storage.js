import { db } from '../config/firebase.js';
import { collection, doc, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function getStorageKeys(user) {
    if (!user) return null;
    const userPrefix = `finance_data_${user.email}`;
    return {
        TRANSACTIONS_KEY: `${userPrefix}_transactions`,
        RECURRING_KEY: `${userPrefix}_recurring`,
        GOALS_KEY: `${userPrefix}_goals`,
        CATEGORIES_KEY: `${userPrefix}_categories`,
        BUDGETS_KEY: `${userPrefix}_budgets`,
        API_KEY: `${userPrefix}_gemini_api_key`
    };
}

export function loadLocalData(user) {
    const keys = getStorageKeys(user);
    if (!keys) return { transactions: [], recurringTemplates: [], goals: [], categories: [], budgets: [] };

    return {
        transactions: JSON.parse(localStorage.getItem(keys.TRANSACTIONS_KEY)) || [],
        recurringTemplates: JSON.parse(localStorage.getItem(keys.RECURRING_KEY)) || [],
        goals: JSON.parse(localStorage.getItem(keys.GOALS_KEY)) || [],
        categories: JSON.parse(localStorage.getItem(keys.CATEGORIES_KEY)) || [],
        budgets: JSON.parse(localStorage.getItem(keys.BUDGETS_KEY)) || []
    };
}

export function saveLocalData(user, data) {
    const keys = getStorageKeys(user);
    if (!keys) return;

    if (data.transactions) localStorage.setItem(keys.TRANSACTIONS_KEY, JSON.stringify(data.transactions));
    if (data.recurringTemplates) localStorage.setItem(keys.RECURRING_KEY, JSON.stringify(data.recurringTemplates));
    if (data.goals) localStorage.setItem(keys.GOALS_KEY, JSON.stringify(data.goals));
    if (data.categories) localStorage.setItem(keys.CATEGORIES_KEY, JSON.stringify(data.categories));
    if (data.budgets) localStorage.setItem(keys.BUDGETS_KEY, JSON.stringify(data.budgets));
}

export async function initializeDefaultCategories(user) {
    if (!user) return;
    const defaultCategories = [
        { name: 'Alimentação', color: '#f97316' }, { name: 'Moradia', color: '#3b82f6' },
        { name: 'Transporte', color: '#10b981' }, { name: 'Lazer', color: '#8b5cf6' },
        { name: 'Saúde', color: '#ef4444' }, { name: 'Salário', color: '#22c55e' },
        { name: 'Outros', color: '#6b7280' }
    ];
    const batch = writeBatch(db);
    defaultCategories.forEach(cat => {
        const docRef = doc(collection(db, `users/${user.uid}/categories`));
        batch.set(docRef, cat);
    });
    await batch.commit();
}
