import { initAuth } from './modules/auth.js';
import { initializeAppLogic } from '../script.js';

document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.add('dark');

    // Inicializar Auth
    initAuth(
        (user) => {
            // Callback de sucesso no login
            console.log('Usuário logado:', user.email);

            // Inicializar a lógica legada da aplicação
            initializeAppLogic(user);
        },
        () => {
            // Callback de logout
            console.log('Usuário deslogado');
            // Limpar listeners se necessário
        }
    );

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        setTimeout(() => {
            // navigator.serviceWorker.register('./sw.js'); // Decoment quando estiver pronto
        }, 1000);
    }
});
