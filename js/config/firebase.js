// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCuC5fISsGDgQ_OLKOxAreX3XQmR-E0954",
    authDomain: "controle-de-insumos-c603c.firebaseapp.com",
    projectId: "controle-de-insumos-c603c",
    storageBucket: "controle-de-insumos-c603c.firebasestorage.app",
    messagingSenderId: "922286381004",
    appId: "1:922286381004:web:1ccad6c7a4fd049fa1af69",
    measurementId: "G-VTDD65M55L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
