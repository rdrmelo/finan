import { auth, db } from '../config/firebase.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    validatePassword,
    updatePasswordStrength,
    validateEmail,
    updateEmailValidation,
    validateFullName,
    updateFullNameValidation,
    updateConfirmPasswordValidation
} from '../utils/validators.js';

let unsubscribeListeners = [];

export function initAuth(onLoginSuccess, onLogout) {
    const splashScreen = document.getElementById('splash-screen');
    const authSection = document.getElementById('auth-section');
    const mainApp = document.getElementById('main-app');

    onAuthStateChanged(auth, (user) => {
        splashScreen.style.opacity = '0';
        setTimeout(() => {
            splashScreen.classList.add('hidden');
        }, 500);

        if (user) {
            // Usuário está logado
            authSection.classList.add('hidden');
            mainApp.classList.remove('hidden');
            if (onLoginSuccess) onLoginSuccess(user);
        } else {
            // Usuário não está logado
            mainApp.classList.add('hidden');
            authSection.classList.remove('hidden');
            if (onLogout) onLogout();
        }
    });

    setupAuthEventListeners();
}

function setupAuthEventListeners() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginFormContainer.classList.add('hidden');
            registerFormContainer.classList.remove('hidden');
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerFormContainer.classList.add('hidden');
            loginFormContainer.classList.remove('hidden');
        });
    }

    // --- LÓGICA DE VALIDAÇÃO ---

    // Verificar se o formulário está válido
    function checkFormValidity() {
        // Obter valores apenas se os elementos existirem
        const nameInput = document.getElementById('register-fullname');
        if (!nameInput) return false;

        const fullName = nameInput.value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;

        const isFullNameValid = validateFullName(fullName).valid;
        const isEmailValid = validateEmail(email).valid;
        const isPasswordValid = validatePassword(password).score >= 4;
        const isConfirmPasswordValid = password === confirmPassword && confirmPassword.length > 0;

        const isFormValid = isFullNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid;

        const submitBtn = document.getElementById('register-submit-btn');
        if (submitBtn) submitBtn.disabled = !isFormValid;

        return isFormValid;
    }

    // Event listeners para validação em tempo real
    const registerNameInput = document.getElementById('register-fullname');
    if (registerNameInput) {
        registerNameInput.addEventListener('input', (e) => {
            updateFullNameValidation(e.target.value);
            checkFormValidity();
        });
    }

    const registerEmailInput = document.getElementById('register-email');
    if (registerEmailInput) {
        registerEmailInput.addEventListener('input', (e) => {
            updateEmailValidation(e.target.value);
            checkFormValidity();
        });
    }

    const registerPassInput = document.getElementById('register-password');
    if (registerPassInput) {
        registerPassInput.addEventListener('input', (e) => {
            updatePasswordStrength(e.target.value);
            const confirmPassword = document.getElementById('register-confirm-password').value;
            if (confirmPassword) {
                updateConfirmPasswordValidation(e.target.value, confirmPassword);
            }
            checkFormValidity();
        });
    }

    const registerConfirmInput = document.getElementById('register-confirm-password');
    if (registerConfirmInput) {
        registerConfirmInput.addEventListener('input', (e) => {
            const password = document.getElementById('register-password').value;
            updateConfirmPasswordValidation(password, e.target.value);
            checkFormValidity();
        });
    }

    // Toggle de visualização de senha
    const togglePassBtn = document.getElementById('toggle-password');
    if (togglePassBtn) {
        togglePassBtn.addEventListener('click', () => {
            const passwordInput = document.getElementById('register-password');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
        });
    }

    // Verificação inicial do formulário
    setTimeout(checkFormValidity, 1000);

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Mostrar loading
            const submitBtn = document.getElementById('register-submit-btn');
            const btnText = document.getElementById('register-btn-text');
            const btnLoading = document.getElementById('register-btn-loading');
            const errorEl = document.getElementById('register-error');
            const successEl = document.getElementById('register-success');

            btnText.classList.add('hidden');
            btnLoading.classList.remove('hidden');
            submitBtn.disabled = true;
            errorEl.classList.add('hidden');
            successEl.classList.add('hidden');

            try {
                // Coletar dados do formulário
                const fullName = document.getElementById('register-fullname').value;
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;

                // Validação final
                if (!checkFormValidity()) {
                    throw new Error('Por favor, preencha todos os campos corretamente.');
                }

                // Criar conta no Firebase
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Salvar dados adicionais do usuário
                const userData = {
                    fullName: fullName,
                    email: email,
                    verificationMethod: 'email',
                    createdAt: new Date().toISOString(),
                    emailVerified: false
                };

                // Salvar no Firestore
                await setDoc(doc(db, `users/${user.uid}/profile`, 'info'), userData);

                // Enviar verificação por email via Firebase
                try {
                    await sendEmailVerification(user);
                    successEl.textContent = `Conta criada com sucesso! Verifique seu email (${email}) para ativar sua conta.`;
                    successEl.classList.remove('hidden');
                } catch (emailError) {
                    console.error('Erro ao enviar email de verificação:', emailError);
                    successEl.textContent = `Conta criada! Faça login para reenviar o email de verificação.`;
                    successEl.classList.remove('hidden');
                }

                // Resetar formulário após sucesso
                setTimeout(() => {
                    document.getElementById('register-form').reset();
                    document.getElementById('show-login-link').click();
                }, 3000);

            } catch (error) {
                console.error('Erro ao criar conta:', error);
                errorEl.textContent = "Erro ao criar conta: " + error.message;
                errorEl.classList.remove('hidden');
            } finally {
                // Restaurar botão
                btnText.classList.remove('hidden');
                btnLoading.classList.add('hidden');
                submitBtn.disabled = false;
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');

            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    // O onAuthStateChanged vai cuidar da UI
                })
                .catch((error) => {
                    if (errorEl) {
                        errorEl.textContent = "Email ou senha inválidos.";
                        errorEl.classList.remove('hidden');
                    }
                });
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth);
        });
    }
}
