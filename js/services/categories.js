import { db } from '../config/firebase.js';
import { collection, doc, setDoc, writeBatch, deleteDoc, onSnapshot, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showNotification } from '../utils/ui.js';

export async function addCategory(user, categoryData) {
    if (!user) return;
    try {
        const docRef = doc(collection(db, `users/${user.uid}/categories`));
        await setDoc(docRef, categoryData);
        showNotification('Categoria adicionada com sucesso!', 'success');
        return true;
    } catch (error) {
        console.error('Erro ao adicionar categoria:', error);
        showNotification('Erro ao adicionar categoria.', 'error');
        throw error;
    }
}

export async function updateCategory(user, id, updatedData, categories, transactions) {
    if (!user) return;
    try {
        const docRef = doc(db, `users/${user.uid}/categories`, id);
        await setDoc(docRef, updatedData, { merge: true });

        // Atualizar transações se o nome da categoria mudou
        const category = categories.find(c => c.id === id);
        if (category && category.name !== updatedData.name) {
            const batch = writeBatch(db);
            const transactionsToUpdate = transactions.filter(t => t.category === category.name);

            transactionsToUpdate.forEach(transaction => {
                const transactionRef = doc(db, `users/${user.uid}/transactions`, transaction.id);
                batch.update(transactionRef, { category: updatedData.name });
            });

            await batch.commit();
        }

        showNotification('Categoria atualizada com sucesso!', 'success');
        return true;
    } catch (error) {
        console.error('Erro ao atualizar categoria:', error);
        showNotification('Erro ao atualizar categoria.', 'error');
        throw error;
    }
}

export async function deleteCategory(user, id, categories, transactions) {
    if (!user) return;
    const categoryToDelete = categories.find(c => c.id === id);
    if (!categoryToDelete) return;

    if (categoryToDelete.name.toLowerCase() === 'outros') {
        showNotification('A categoria "Outros" não pode ser excluída.', 'error');
        return;
    }

    try {
        // Verificar se existe categoria "Outros", se não, criar
        let othersCategory = categories.find(c => c.name.toLowerCase() === 'outros');
        if (!othersCategory) {
            const othersDocRef = doc(collection(db, `users/${user.uid}/categories`));
            const othersData = { name: 'Outros', color: '#6b7280' };
            await setDoc(othersDocRef, othersData);
            othersCategory = { id: othersDocRef.id, ...othersData };
        }

        // Atualizar transações que usam esta categoria
        const batch = writeBatch(db);
        const transactionsToUpdate = transactions.filter(t => t.category === categoryToDelete.name);

        transactionsToUpdate.forEach(transaction => {
            const transactionRef = doc(db, `users/${user.uid}/transactions`, transaction.id);
            batch.update(transactionRef, { category: othersCategory.name });
        });

        // Deletar a categoria
        const categoryRef = doc(db, `users/${user.uid}/categories`, id);
        batch.delete(categoryRef);

        await batch.commit();
        showNotification('Categoria excluída com sucesso!', 'success');
        return true;
    } catch (error) {
        console.error('Erro ao excluir categoria:', error);
        showNotification('Erro ao excluir categoria.', 'error');
        throw error;
    }
}

export function getCategoryColor(categories, categoryName) {
    if (!categories || categories.length === 0) return '#6b7280';
    const category = categories.find(c => c.name === categoryName);
    return category ? category.color : '#6b7280';
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

export function subscribeToCategories(user, callback) {
    if (!user) return () => { };

    const q = query(collection(db, `users/${user.uid}/categories`));
    return onSnapshot(q, (snapshot) => {
        const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (categories.length === 0) {
            initializeDefaultCategories(user);
        }

        callback(categories);
    });
}
