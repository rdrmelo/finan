import { db } from '../config/firebase.js';
import { collection, doc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showNotification } from '../utils/ui.js';
import { handleOfflineAction } from './offline.js';
import { saveLocalData } from './storage.js';

export async function setBudget(user, categoryName, amount, monthYear, budgets, allData) {
    if (!user) return;

    const existingBudget = budgets.find(b => b.categoryName === categoryName && b.monthYear === monthYear);
    let budgetData;

    if (existingBudget) {
        existingBudget.amount = amount;
        budgetData = { ...existingBudget, _action: 'update' };
    } else {
        budgetData = { id: Date.now().toString() + Math.random().toString(36).substr(2, 9), categoryName, amount, monthYear };
        budgets.push(budgetData);
    }

    try {
        if (navigator.onLine) {
            if (existingBudget) {
                await setDoc(doc(db, `users/${user.uid}/budgets`, existingBudget.id), budgetData, { merge: true });
            } else {
                await addDoc(collection(db, `users/${user.uid}/budgets`), budgetData);
            }
        } else {
            handleOfflineAction('Orçamento', 'budgets', budgetData);
        }
    } catch (error) {
        console.error('Erro ao salvar orçamento:', error);
        handleOfflineAction('Orçamento', 'budgets', budgetData);
    }

    // Save locally
    saveLocalData(user, { ...allData, budgets });
}

export function getBudgetForCategory(budgets, categoryName, monthYear) {
    return budgets.find(b => b.categoryName === categoryName && b.monthYear === monthYear);
}
