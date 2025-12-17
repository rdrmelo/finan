import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { auth } from "./firebaseConfig.js";

// Mapped exports to match app.js imports
export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const register = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const subscribeToAuthChanges = (callback) => onAuthStateChanged(auth, callback);
export const verifyEmail = (user) => sendEmailVerification(user);
export const sendPasswordReset = (email) => sendPasswordResetEmail(auth, email);
export const updateUserProfile = (user, data) => updateProfile(user, data);
export const changeUserPassword = (user, newPassword) => updatePassword(user, newPassword);
