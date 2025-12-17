import { db } from '../config/firebase.js';
import { doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showNotification } from '../utils/ui.js';
import { handleOfflineAction } from './offline.js';
import { addTransaction } from './transactions.js';

export async function deleteGoal(user, id) {
    if (!user) return;

    try {
        if (navigator.onLine) {
            await deleteDoc(doc(db, `users/${user.uid}/goals`, id));
        } else {
            handleOfflineAction('Exclusão', 'goals', { id, _action: 'delete' });
        }
    } catch (error) {
        console.error('Erro ao excluir meta:', error);
        handleOfflineAction('Exclusão', 'goals', { id, _action: 'delete' });
    }
}

export async function addFundsToGoal(user, goalId, amount, goals) {
    if (!user) {
        showNotification('Usuário não autenticado. Faça login novamente.', 'error');
        return;
    }

    const goal = goals.find(g => g.id === goalId);
    if (goal) {
        try {
            // Atualizar o valor salvo na meta
            const newSavedAmount = (goal.savedAmount || 0) + amount;
            await setDoc(doc(db, `users/${user.uid}/goals`, goalId),
                { savedAmount: newSavedAmount }, { merge: true });

            // Adicionar transação
            await addTransaction(user, {
                type: 'expense',
                description: `Cofrinho: ${goal.name}`,
                amount: amount,
                category: 'Cofrinhos',
                date: new Date().toISOString().split('T')[0],
                goalId: goalId
            });

            showNotification('Dinheiro adicionado ao cofrinho com sucesso!', 'success');
            return true;
        } catch (error) {
            console.error('Erro ao adicionar fundos:', error);
            showNotification('Erro ao adicionar fundos ao cofrinho.', 'error');
            throw error;
        }
    }
}
