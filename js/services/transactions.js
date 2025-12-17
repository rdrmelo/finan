import { db } from '../config/firebase.js';
import { collection, doc, setDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showNotification } from '../utils/ui.js';
import { handleOfflineAction } from './offline.js';

export async function addTransaction(user, transactionData) {
    if (!user) {
        showNotification('Usuário não autenticado. Faça login novamente.', 'error');
        return;
    }

    try {
        if (navigator.onLine) {
            await addDoc(collection(db, `users/${user.uid}/transactions`), transactionData);
            showNotification('Transação adicionada com sucesso!', 'success');
        } else {
            handleOfflineAction('Transação', 'transactions', transactionData);
        }
    } catch (error) {
        console.error('Erro ao adicionar transação:', error);
        handleOfflineAction('Transação', 'transactions', transactionData);
    }
}

export async function updateTransaction(user, id, transactionData) {
    if (!user) return;

    try {
        if (navigator.onLine) {
            await setDoc(doc(db, `users/${user.uid}/transactions`, id), transactionData, { merge: true });
        } else {
            handleOfflineAction('Atualização', 'transactions', { ...transactionData, id, _action: 'update' });
        }
    } catch (error) {
        console.error('Erro ao atualizar transação:', error);
        handleOfflineAction('Atualização', 'transactions', { ...transactionData, id, _action: 'update' });
    }
}

export async function deleteTransaction(user, id) {
    if (!user) return;

    try {
        if (navigator.onLine) {
            await deleteDoc(doc(db, `users/${user.uid}/transactions`, id));
        } else {
            handleOfflineAction('Exclusão', 'transactions', { id, _action: 'delete' });
        }
    } catch (error) {
        console.error('Erro ao excluir transação:', error);
        handleOfflineAction('Exclusão', 'transactions', { id, _action: 'delete' });
    }
}

export function filterTransactionsByMonth(transactions, monthYear) {
    return transactions.filter(t => t.date.startsWith(monthYear));
}
