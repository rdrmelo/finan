
import {
    collection,
    doc,
    addDoc,
    setDoc,
    deleteDoc,
    writeBatch,
    query,
    onSnapshot,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebaseConfig.js";


const COLL_USERS = 'users';
const COLL_TRANSACTIONS = 'transactions';
const COLL_CATEGORIES = 'categories';
const COLL_GOALS = 'goals';
const COLL_BUDGETS = 'budgets';
const COLL_RECURRING = 'recurringTemplates';

// --- Transactions ---

export async function addTransaction(userId, transactionData) {
    const colRef = collection(db, `${COLL_USERS}/${userId}/${COLL_TRANSACTIONS}`);
    return await addDoc(colRef, transactionData);
}

export async function updateTransaction(userId, transactionId, transactionData) {
    const docRef = doc(db, `${COLL_USERS}/${userId}/${COLL_TRANSACTIONS}`, transactionId);
    return await setDoc(docRef, transactionData, { merge: true });
}

export async function deleteTransaction(userId, transactionId) {
    const docRef = doc(db, `${COLL_USERS}/${userId}/${COLL_TRANSACTIONS}`, transactionId);
    return await deleteDoc(docRef);
}

// --- Categories ---

export async function addCategory(userId, categoryData) {
    const colRef = collection(db, `${COLL_USERS}/${userId}/${COLL_CATEGORIES}`);
    // If id is provided in data, use setDoc, else addDoc. 
    // script.js uses addCategory with generated doc ref sometimes or implicit.
    // Let's use addDoc for auto ID, or setDoc if we want to specify ID.
    // script.js uses: const docRef = doc(collection(db...)); await setDoc(docRef, categoryData);
    // effectively addDoc but with explicit set.
    return await addDoc(colRef, categoryData);
}

export async function updateCategory(userId, categoryId, categoryData, transactionsToUpdate = null) {
    const docRef = doc(db, `${COLL_USERS}/${userId}/${COLL_CATEGORIES}`, categoryId);
    await setDoc(docRef, categoryData, { merge: true });

    // If there are transactions to update (cascade name change)
    if (transactionsToUpdate && transactionsToUpdate.length > 0) {
        const batch = writeBatch(db);
        transactionsToUpdate.forEach(transaction => {
            const tRef = doc(db, `${COLL_USERS}/${userId}/${COLL_TRANSACTIONS}`, transaction.id);
            batch.update(tRef, { category: categoryData.name });
        });
        await batch.commit();
    }
}

export async function deleteCategory(userId, categoryId, transactionsToUpdate = null, othersCategoryName = 'Outros') {
    const batch = writeBatch(db);

    // Update transactions to 'Outros'
    if (transactionsToUpdate && transactionsToUpdate.length > 0) {
        transactionsToUpdate.forEach(transaction => {
            const tRef = doc(db, `${COLL_USERS}/${userId}/${COLL_TRANSACTIONS}`, transaction.id);
            batch.update(tRef, { category: othersCategoryName });
        });
    }

    const catRef = doc(db, `${COLL_USERS}/${userId}/${COLL_CATEGORIES}`, categoryId);
    batch.delete(catRef);

    await batch.commit();
}

export async function initializeDefaultCategories(userId) {
    const defaultCategories = [
        { name: 'Alimentação', color: '#f97316' }, { name: 'Moradia', color: '#3b82f6' },
        { name: 'Transporte', color: '#10b981' }, { name: 'Lazer', color: '#8b5cf6' },
        { name: 'Saúde', color: '#ef4444' }, { name: 'Salário', color: '#22c55e' },
        { name: 'Outros', color: '#6b7280' }
    ];
    const batch = writeBatch(db);
    defaultCategories.forEach(cat => {
        const docRef = doc(collection(db, `${COLL_USERS}/${userId}/${COLL_CATEGORIES}`));
        batch.set(docRef, cat);
    });
    await batch.commit();
}

// --- Goals ---

export async function addFundsToGoal(userId, goalId, newSavedAmount, transactionData) {
    const batch = writeBatch(db);

    // Update Goal
    const goalRef = doc(db, `${COLL_USERS}/${userId}/${COLL_GOALS}`, goalId);
    batch.update(goalRef, { savedAmount: newSavedAmount });

    // Add Transaction
    const transRef = doc(collection(db, `${COLL_USERS}/${userId}/${COLL_TRANSACTIONS}`));
    batch.set(transRef, transactionData);

    await batch.commit();
}

export async function deleteGoal(userId, goalId) {
    const docRef = doc(db, `${COLL_USERS}/${userId}/${COLL_GOALS}`, goalId);
    return await deleteDoc(docRef);
}

// --- General ---

export function subscribeToCollection(userId, collectionName, callback) {
    const q = query(collection(db, `${COLL_USERS}/${userId}/${collectionName}`));
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(data);
    });
}

// --- Generic Wrappers ---

export async function addItem(userId, collectionName, data) {
    const colRef = collection(db, `users/${userId}/${collectionName}`);
    return await addDoc(colRef, data);
}

export async function updateItem(userId, collectionName, docId, data) {
    const docRef = doc(db, `users/${userId}/${collectionName}`, docId);
    return await setDoc(docRef, data, { merge: true });
}

export async function deleteItem(userId, collectionName, docId) {
    const docRef = doc(db, `users/${userId}/${collectionName}`, docId);
    return await deleteDoc(docRef);
}

export function getBudgetForCategory(budgets, categoryName, monthYear) {
    if (!budgets) return null;
    return budgets.find(b => b.category === categoryName && b.monthYear === monthYear);
}
