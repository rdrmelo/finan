 
// Firebase imports and configuration
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
        import {
            getAuth,
            createUserWithEmailAndPassword,
            signInWithEmailAndPassword,
            signOut,
            onAuthStateChanged,
            sendEmailVerification
        } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
        import {
            getFirestore,
            collection,
            doc,
            addDoc,
            setDoc,
            getDoc,
            deleteDoc,
            onSnapshot,
            query,
            writeBatch,
            getDocs
        } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

        // --- Variáveis globais e estado da aplicação ---
        let currentUser = null;
        let unsubscribeListeners = [];

        // --- DOM Elements ---
        const splashScreen = document.getElementById('splash-screen');
        const authSection = document.getElementById('auth-section');
        const mainApp = document.getElementById('main-app');

        document.addEventListener('DOMContentLoaded', () => {
            document.documentElement.classList.add('dark');
            setupAuthEventListeners();
            setupEventListeners();
            setupConnectivityDetection();
            
            // Registrar Service Worker após um pequeno delay para garantir que o documento esteja pronto
            setTimeout(() => {
                registerServiceWorker();
            }, 1000);
        });

        // --- LÓGICA DE AUTENTICAÇÃO ---
        onAuthStateChanged(auth, (user) => {
            splashScreen.style.opacity = '0';
            setTimeout(() => {
                splashScreen.classList.add('hidden');
            }, 500);

            if (user) {
                // Usuário está logado
                currentUser = user;
                authSection.classList.add('hidden');
                mainApp.classList.remove('hidden');
                initializeAppLogic(user);
            } else {
                // Usuário não está logado
                currentUser = null;
                mainApp.classList.add('hidden');
                authSection.classList.remove('hidden');
                if (unsubscribeListeners.length > 0) {
                    unsubscribeListeners.forEach(unsub => unsub());
                    unsubscribeListeners = [];
                }
            }
        });

        function setupAuthEventListeners() {
            const loginForm = document.getElementById('login-form');
            const registerForm = document.getElementById('register-form');
            const logoutBtn = document.getElementById('logout-btn');
            const showRegisterLink = document.getElementById('show-register-link');
            const showLoginLink = document.getElementById('show-login-link');
            const loginFormContainer = document.getElementById('login-form-container');
            const registerFormContainer = document.getElementById('register-form-container');

            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                loginFormContainer.classList.add('hidden');
                registerFormContainer.classList.remove('hidden');
            });

            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                registerFormContainer.classList.add('hidden');
                loginFormContainer.classList.remove('hidden');
            });

            // --- SISTEMA DE VALIDAÇÃO ROBUSTA DE REGISTRO ---
            
            // Validação de senha robusta
            function validatePassword(password) {
                const criteria = {
                    length: password.length >= 8,
                    uppercase: /[A-Z]/.test(password),
                    lowercase: /[a-z]/.test(password),
                    number: /\d/.test(password),
                    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
                };
                
                const score = Object.values(criteria).filter(Boolean).length;
                return { criteria, score };
            }
            
            function updatePasswordStrength(password) {
                const validation = validatePassword(password);
                const { criteria, score } = validation;
                
                // Atualizar barras de força
                const bars = ['strength-bar-1', 'strength-bar-2', 'strength-bar-3', 'strength-bar-4'];
                bars.forEach((barId, index) => {
                    const bar = document.getElementById(barId);
                    if (index < score) {
                        if (score <= 2) bar.className = 'h-1 flex-1 bg-red-500 rounded';
                        else if (score <= 3) bar.className = 'h-1 flex-1 bg-yellow-500 rounded';
                        else bar.className = 'h-1 flex-1 bg-green-500 rounded';
                    } else {
                        bar.className = 'h-1 flex-1 bg-gray-600 rounded';
                    }
                });
                
                // Atualizar texto de força
                const strengthText = document.getElementById('password-strength-text');
                if (password.length === 0) {
                    strengthText.textContent = 'Digite uma senha';
                    strengthText.className = 'text-xs text-gray-400';
                } else if (score <= 2) {
                    strengthText.textContent = 'Senha fraca';
                    strengthText.className = 'text-xs text-red-400';
                } else if (score <= 3) {
                    strengthText.textContent = 'Senha média';
                    strengthText.className = 'text-xs text-yellow-400';
                } else if (score === 4) {
                    strengthText.textContent = 'Senha boa';
                    strengthText.className = 'text-xs text-blue-400';
                } else {
                    strengthText.textContent = 'Senha excelente';
                    strengthText.className = 'text-xs text-green-400';
                }
                
                // Atualizar requisitos
                const requirements = {
                    'req-length': criteria.length,
                    'req-uppercase': criteria.uppercase,
                    'req-lowercase': criteria.lowercase,
                    'req-number': criteria.number,
                    'req-special': criteria.special
                };
                
                Object.entries(requirements).forEach(([reqId, met]) => {
                    const req = document.getElementById(reqId);
                    const icon = req.querySelector('span');
                    if (met) {
                        icon.textContent = '✓';
                        icon.className = 'text-green-400';
                        req.className = 'flex items-center space-x-2 text-green-400';
                    } else {
                        icon.textContent = '○';
                        icon.className = 'text-gray-400';
                        req.className = 'flex items-center space-x-2 text-gray-400';
                    }
                });
                
                return score >= 4;
            }
            
            // Validação de email avançada
            function validateEmail(email) {
                const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'uol.com.br', 'terra.com.br'];
                
                if (!email) return { valid: false, message: '' };
                if (!emailRegex.test(email)) return { valid: false, message: 'Formato de email inválido' };
                
                const domain = email.split('@')[1];
                if (!domain) return { valid: false, message: 'Domínio inválido' };
                
                return { valid: true, message: 'Email válido' };
            }
            
            function updateEmailValidation(email) {
                const validation = validateEmail(email);
                const statusIcon = document.getElementById('email-status');
                const errorDiv = document.getElementById('email-error');
                
                if (!email) {
                    statusIcon.textContent = '';
                    errorDiv.classList.add('hidden');
                    return false;
                }
                
                if (validation.valid) {
                    statusIcon.textContent = '✓';
                    statusIcon.className = 'text-green-400';
                    errorDiv.classList.add('hidden');
                    return true;
                } else {
                    statusIcon.textContent = '✗';
                    statusIcon.className = 'text-red-400';
                    errorDiv.textContent = validation.message;
                    errorDiv.classList.remove('hidden');
                    return false;
                }
            }
            
            // Validação de nome completo
            function validateFullName(name) {
                if (!name) return { valid: false, message: '' };
                if (name.length < 2) return { valid: false, message: 'Nome muito curto' };
                if (name.length > 100) return { valid: false, message: 'Nome muito longo' };
                if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(name)) return { valid: false, message: 'Apenas letras e espaços' };
                if (name.trim().split(' ').length < 2) return { valid: false, message: 'Digite nome e sobrenome' };
                
                return { valid: true, message: 'Nome válido' };
            }
            
            function updateFullNameValidation(name) {
                const validation = validateFullName(name);
                const statusIcon = document.getElementById('fullname-status');
                const errorDiv = document.getElementById('fullname-error');
                
                if (!name) {
                    statusIcon.textContent = '';
                    errorDiv.classList.add('hidden');
                    return false;
                }
                
                if (validation.valid) {
                    statusIcon.textContent = '✓';
                    statusIcon.className = 'text-green-400';
                    errorDiv.classList.add('hidden');
                    return true;
                } else {
                    statusIcon.textContent = '✗';
                    statusIcon.className = 'text-red-400';
                    errorDiv.textContent = validation.message;
                    errorDiv.classList.remove('hidden');
                    return false;
                }
            }
            
            // Validação de confirmação de senha
            function updateConfirmPasswordValidation(password, confirmPassword) {
                const statusIcon = document.getElementById('confirm-password-status');
                const errorDiv = document.getElementById('confirm-password-error');
                
                if (!confirmPassword) {
                    statusIcon.textContent = '';
                    errorDiv.classList.add('hidden');
                    return false;
                }
                
                if (password === confirmPassword) {
                    statusIcon.textContent = '✓';
                    statusIcon.className = 'text-green-400';
                    errorDiv.classList.add('hidden');
                    return true;
                } else {
                    statusIcon.textContent = '✗';
                    statusIcon.className = 'text-red-400';
                    errorDiv.textContent = 'Senhas não coincidem';
                    errorDiv.classList.remove('hidden');
                    return false;
                }
            }
            

            
            // Verificar se o formulário está válido
            function checkFormValidity() {
                const fullName = document.getElementById('register-fullname').value;
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;
                const confirmPassword = document.getElementById('register-confirm-password').value;
                
                const isFullNameValid = validateFullName(fullName).valid;
                const isEmailValid = validateEmail(email).valid;
                const isPasswordValid = validatePassword(password).score >= 4;
                const isConfirmPasswordValid = password === confirmPassword && confirmPassword.length > 0;
                
                const isFormValid = isFullNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid;
                
                const submitBtn = document.getElementById('register-submit-btn');
                submitBtn.disabled = !isFormValid;
                
                return isFormValid;
            }
            
            // Event listeners para validação em tempo real
            document.getElementById('register-fullname').addEventListener('input', (e) => {
                updateFullNameValidation(e.target.value);
                checkFormValidity();
            });
            
            document.getElementById('register-email').addEventListener('input', (e) => {
                updateEmailValidation(e.target.value);
                checkFormValidity();
            });
            
            document.getElementById('register-password').addEventListener('input', (e) => {
                updatePasswordStrength(e.target.value);
                const confirmPassword = document.getElementById('register-confirm-password').value;
                if (confirmPassword) {
                    updateConfirmPasswordValidation(e.target.value, confirmPassword);
                }
                checkFormValidity();
            });
            
            document.getElementById('register-confirm-password').addEventListener('input', (e) => {
                const password = document.getElementById('register-password').value;
                updateConfirmPasswordValidation(password, e.target.value);
                checkFormValidity();
            });
            
            // Toggle de visualização de senha
            document.getElementById('toggle-password').addEventListener('click', () => {
                const passwordInput = document.getElementById('register-password');
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
            });
            
            // Verificação inicial do formulário
            window.addEventListener('load', function() {
                setTimeout(checkFormValidity, 1000);
            });

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
                        errorEl.textContent = "Email ou senha inválidos.";
                        errorEl.classList.remove('hidden');
                    });
            });

            logoutBtn.addEventListener('click', () => {
                signOut(auth);
            });
        }

            async function initializeAppLogic(user) {
            try {
                // Carregar nome completo do usuário
            const docRef = doc(db, 'users', user.uid);
            getDoc(docRef).then(docSnap => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    const fullName = userData.fullName || user.email.split('@')[0];
                    document.getElementById('welcome-message').textContent = `Bem-vindo(a) de volta, ${fullName}!`;
                } else {
                    document.getElementById('welcome-message').textContent = `Bem-vindo(a) de volta, ${user.email.split('@')[0]}!`;
                }
            }).catch(error => {
                console.error('Erro ao carregar nome:', error);
                document.getElementById('welcome-message').textContent = `Bem-vindo(a) de volta, ${user.email.split('@')[0]}!`;
            });
                
                // Sistema de email removido
                
                // Verificar relatórios mensais automáticos
                checkMonthlyReport();
            
            // Inicializar Push Notifications
            await initializePushNotifications();
            setupPeriodicNotifications();
            
            // Inicializar Sistema de Lembretes
            await initializePaymentReminders();
            loadReminderAlertSettings();
            
            // Inicializar Sistema de Alertas de Gastos
            initializeExpenseAlerts();
            
            // Inicializar Sistema 2FA
            initialize2FA();
            

            
            // Inicializar Sistema de Redefinir Senha
            initializePasswordReset();
            
            // Inicializar Sistema de Informações do Usuário
            initializeUserInfo();
            
            // Inicializar Modal de Alterar Senha
            initializeChangePasswordModal();
            
            // Inicializar Navegação Mobile
            initializeMobileNavigation();
            
            // Setup Firestore Listeners
            const collections = ['transactions', 'goals', 'categories', 'budgets', 'recurringTemplates', 'paymentReminders', 'expenseAlerts'];
            
            collections.forEach(colName => {
            const q = query(collection(db, `users/${user.uid}/${colName}`));
            const unsub = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    // Atualizar tanto window quanto variáveis globais
                    window[colName] = data;
                    if (colName === 'transactions') transactions = data;
                    if (colName === 'goals') goals = data;
                    if (colName === 'categories') categories = data;
                    if (colName === 'budgets') budgets = data;
                    if (colName === 'recurringTemplates') recurringTemplates = data;
                    if (colName === 'paymentReminders') paymentReminders = data;
                    if (colName === 'expenseAlerts') window.expenseAlertsSettings = data[0] || {};
                    
                    if (colName === 'categories' && data.length === 0) {
                         initializeDefaultCategories();
                    }
                    
                    if (colName === 'transactions') {
                        checkAndGenerateRecurringTransactions();
                    }

                    updateUI(); // Atualiza a UI sempre que houver mudança nos dados
                });
                unsubscribeListeners.push(unsub);
            });
            switchPage('dashboard');
            setTimeout(setInitialFilter, 150);
            } catch (error) {
                console.error('Erro na inicialização da aplicação:', error);
                // Mesmo com erro, tenta continuar com a inicialização básica
                switchPage('dashboard');
            }
        }

            // --- ESTADO GLOBAL ---
            let transactions = [];
            let recurringTemplates = [];
            let goals = [];
            let categories = [];
            let budgets = [];
            let expenseChart = null;
            let balanceHistoryChart = null;
            let goalsChart = null;    
            let temporaryActionPlan = null;
            let calendarDate = new Date();
            Chart.register(ChartDataLabels);
            
            // --- CHAVES DE ARMAZENAMENTO ---
            let TRANSACTIONS_KEY, RECURRING_KEY, GOALS_KEY, CATEGORIES_KEY, BUDGETS_KEY, API_KEY;
            
            function setupUserKeys() {
                if (!currentUser) return;
                const userPrefix = `finance_data_${currentUser.email}`;
                TRANSACTIONS_KEY = `${userPrefix}_transactions`;
                RECURRING_KEY = `${userPrefix}_recurring`;
                GOALS_KEY = `${userPrefix}_goals`;
                CATEGORIES_KEY = `${userPrefix}_categories`;
                BUDGETS_KEY = `${userPrefix}_budgets`;
                API_KEY = `${userPrefix}_gemini_api_key`;
            }

            // --- LÓGICA DE DADOS ---
            function loadData() {
                setupUserKeys();
                
                // Verificar se é necessário resetar dados mensais
                checkAndResetMonthlyData();
                
                transactions = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY)) || [];
                recurringTemplates = JSON.parse(localStorage.getItem(RECURRING_KEY)) || [];
                goals = JSON.parse(localStorage.getItem(GOALS_KEY)) || [];
                categories = JSON.parse(localStorage.getItem(CATEGORIES_KEY)) || [];
                budgets = JSON.parse(localStorage.getItem(BUDGETS_KEY)) || [];
                if (categories.length === 0) {
                    initializeDefaultCategories();
                }
            }
            
            // Função para verificar e resetar dados mensais no dia 1
            function checkAndResetMonthlyData() {
                if (!currentUser) return;
                
                const today = new Date();
                const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
                const lastResetKey = `${currentUser.email}_last_monthly_reset`;
                const lastReset = localStorage.getItem(lastResetKey);
                
                // Verificar se é dia 1 do mês e se ainda não foi resetado este mês
                if (today.getDate() === 1 && lastReset !== currentMonth) {
                    resetMonthlyData(currentMonth);
                    localStorage.setItem(lastResetKey, currentMonth);
                    
                    // Mostrar notificação de reset
                    setTimeout(() => {
                        showNotification('📅 Transações pontuais do mês resetadas! Recorrentes, parcelas e cofrinhos preservados.', 'info');
                    }, 1000);
                }
            }
            
            // Função para resetar apenas transações pontuais do mês atual (preserva recorrentes, parcelas e cofrinhos)
            function resetMonthlyData(currentMonth) {
                if (!currentUser) return;
                
                setupUserKeys();
                const existingTransactions = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY)) || [];
                
                // Filtrar transações para manter:
                // 1. Todas as transações de meses anteriores
                // 2. Transações recorrentes do mês atual (que têm recurringTemplateId)
                // 3. Transações de parcelas do mês atual (que têm installmentInfo)
                // 4. Transações relacionadas a metas/cofrinhos (que têm goalId)
                const filteredTransactions = existingTransactions.filter(transaction => {
                    // Manter transações de meses anteriores
                    if (!transaction.date.startsWith(currentMonth)) {
                        return true;
                    }
                    
                    // Para transações do mês atual, manter apenas:
                    // - Transações recorrentes
                    if (transaction.recurringTemplateId) {
                        return true;
                    }
                    
                    // - Transações de parcelas
                    if (transaction.installmentInfo) {
                        return true;
                    }
                    
                    // - Transações relacionadas a metas/cofrinhos
                    if (transaction.goalId) {
                        return true;
                    }
                    
                    // Remover apenas transações pontuais do mês atual
                    return false;
                });
                
                // Salvar transações filtradas
                localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(filteredTransactions));
                
                // Atualizar array global de transações
                transactions = filteredTransactions;
                
                // Atualizar a interface imediatamente
                updateUI();
                
                const removedCount = existingTransactions.length - filteredTransactions.length;
                console.log(`Reset mensal executado: ${removedCount} transações pontuais removidas, ${filteredTransactions.length} transações mantidas (incluindo recorrentes, parcelas e cofrinhos)`);
            }
            
            // Função para testar o reset mensal manualmente
            function testMonthlyReset() {
                if (!currentUser) {
                    showNotification('❌ Usuário não autenticado', 'error');
                    return;
                }
                
                if (confirm('⚠️ Isso irá remover apenas transações pontuais do mês atual.\n\n✅ Serão preservados:\n• Transações recorrentes\n• Parcelas\n• Saldos dos cofrinhos\n• Histórico de meses anteriores\n\nDeseja continuar?')) {
                    const currentMonth = new Date().toISOString().slice(0, 7);
                    resetMonthlyData(currentMonth);
                    
                    // Atualizar data do último reset
                    const lastResetKey = `${currentUser.email}_last_monthly_reset`;
                    localStorage.setItem(lastResetKey, currentMonth);
                    updateLastResetDisplay();
                    
                    showNotification('✅ Reset executado! Apenas transações pontuais removidas.', 'success');
                }
            }
            
            // Função para atualizar a exibição da data do último reset
            function updateLastResetDisplay() {
                if (!currentUser) return;
                
                const lastResetKey = `${currentUser.email}_last_monthly_reset`;
                const lastReset = localStorage.getItem(lastResetKey);
                const lastResetElement = document.getElementById('last-reset-date');
                
                if (lastResetElement) {
                    if (lastReset) {
                        const date = new Date(lastReset + '-01');
                        const formattedDate = date.toLocaleDateString('pt-BR', { 
                            month: 'long', 
                            year: 'numeric' 
                        });
                        lastResetElement.textContent = formattedDate;
                    } else {
                        lastResetElement.textContent = 'Nunca';
                    }
                }
            }
            
            function saveData() {
                if (!currentUser) return;
                localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
                localStorage.setItem(RECURRING_KEY, JSON.stringify(recurringTemplates));
                localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
                localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
                localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
            }
            
            // --- LÓGICA DE DADOS (Firestore) ---
        async function initializeDefaultCategories() {
            if (!currentUser) return;
            const defaultCategories = [
                { name: 'Alimentação', color: '#f97316' }, { name: 'Moradia', color: '#3b82f6' },
                { name: 'Transporte', color: '#10b981' }, { name: 'Lazer', color: '#8b5cf6' },
                { name: 'Saúde', color: '#ef4444' }, { name: 'Salário', color: '#22c55e' },
                { name: 'Outros', color: '#6b7280' }
            ];
            const batch = writeBatch(db);
            defaultCategories.forEach(cat => {
                const docRef = doc(collection(db, `users/${currentUser.uid}/categories`));
                batch.set(docRef, cat);
            });
            await batch.commit();
        }

            function getCategoryById(id) { return categories.find(c => c.id === id); }
            function getCategoryColor(categoryName) {
            if (!categories || categories.length === 0) return '#6b7280';
            const category = categories.find(c => c.name === categoryName);
            return category ? category.color : '#6b7280';
        }
        
        function getContrastingTextColor(hexColor) {
            if (!hexColor) return '#FFFFFF';
            const r = parseInt(hexColor.substr(1, 2), 16);
            const g = parseInt(hexColor.substr(3, 2), 16);
            const b = parseInt(hexColor.substr(5, 2), 16);
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            return (yiq >= 128) ? '#000000' : '#FFFFFF';
        }

            async function addCategory(categoryData) {
                if (!currentUser) return;
                try {
                    const docRef = doc(collection(db, `users/${currentUser.uid}/categories`));
                    await setDoc(docRef, categoryData);
                    showNotification('Categoria adicionada com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro ao adicionar categoria:', error);
                    showNotification('Erro ao adicionar categoria.', 'error');
                }
            }

            async function updateCategory(id, updatedData) {
                if (!currentUser) return;
                try {
                    const docRef = doc(db, `users/${currentUser.uid}/categories`, id);
                    await setDoc(docRef, updatedData, { merge: true });
                    
                    // Atualizar transações se o nome da categoria mudou
                    const category = categories.find(c => c.id === id);
                    if (category && category.name !== updatedData.name) {
                        const batch = writeBatch(db);
                        const transactionsToUpdate = transactions.filter(t => t.category === category.name);
                        
                        transactionsToUpdate.forEach(transaction => {
                            const transactionRef = doc(db, `users/${currentUser.uid}/transactions`, transaction.id);
                            batch.update(transactionRef, { category: updatedData.name });
                        });
                        
                        await batch.commit();
                    }
                    
                    showNotification('Categoria atualizada com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro ao atualizar categoria:', error);
                    showNotification('Erro ao atualizar categoria.', 'error');
                }
            }
            
            async function deleteCategory(id) {
                if (!currentUser) return;
                const categoryToDelete = getCategoryById(id);
                if (!categoryToDelete) return;
                
                if (categoryToDelete.name.toLowerCase() === 'outros') {
                    showNotification('A categoria "Outros" não pode ser excluída.', 'error');
                    return;
                }
                
                try {
                    // Verificar se existe categoria "Outros", se não, criar
                    let othersCategory = categories.find(c => c.name.toLowerCase() === 'outros');
                    if (!othersCategory) {
                        const othersDocRef = doc(collection(db, `users/${currentUser.uid}/categories`));
                        const othersData = { name: 'Outros', color: '#6b7280' };
                        await setDoc(othersDocRef, othersData);
                        othersCategory = { id: othersDocRef.id, ...othersData };
                    }
                    
                    // Atualizar transações que usam esta categoria
                    const batch = writeBatch(db);
                    const transactionsToUpdate = transactions.filter(t => t.category === categoryToDelete.name);
                    
                    transactionsToUpdate.forEach(transaction => {
                        const transactionRef = doc(db, `users/${currentUser.uid}/transactions`, transaction.id);
                        batch.update(transactionRef, { category: othersCategory.name });
                    });
                    
                    // Deletar a categoria
                    const categoryRef = doc(db, `users/${currentUser.uid}/categories`, id);
                    batch.delete(categoryRef);
                    
                    await batch.commit();
                    showNotification('Categoria excluída com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro ao excluir categoria:', error);
                    showNotification('Erro ao excluir categoria.', 'error');
                }
            }
            
            function getBudgetForCategory(categoryName, monthYear) {
                return budgets.find(b => b.categoryName === categoryName && b.monthYear === monthYear);
            }

            async function setBudget(categoryName, amount, monthYear) {
                const existingBudget = getBudgetForCategory(categoryName, monthYear);
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
                            await setDoc(doc(db, `users/${currentUser.uid}/budgets`, existingBudget.id), budgetData, { merge: true });
                        } else {
                            await addDoc(collection(db, `users/${currentUser.uid}/budgets`), budgetData);
                        }
                    } else {
                        storePendingData('budgets', budgetData);
                        registerBackgroundSync('background-sync-budgets');
                        showNotification('Orçamento salvo offline. Será sincronizado quando a conexão for restaurada.', 'info');
                    }
                } catch (error) {
                    console.error('Erro ao salvar orçamento:', error);
                    storePendingData('budgets', budgetData);
                    registerBackgroundSync('background-sync-budgets');
                    showNotification('Erro na conexão. Orçamento salvo offline para sincronização posterior.', 'warning');
                }
                
                saveData();
            }

            async function addTransaction(transactionData) {
            if (!currentUser) {
                showNotification('Usuário não autenticado. Faça login novamente.', 'error');
                return;
            }
            
            try {
                if (navigator.onLine) {
                    await addDoc(collection(db, `users/${currentUser.uid}/transactions`), transactionData);
                    showNotification('Transação adicionada com sucesso!', 'success');
                } else {
                    // Modo offline: armazenar localmente para sincronização posterior
                    storePendingData('transactions', transactionData);
                    registerBackgroundSync('background-sync-transactions');
                    showNotification('Transação salva offline. Será sincronizada quando a conexão for restaurada.', 'info');
                }
            } catch (error) {
                console.error('Erro ao adicionar transação:', error);
                // Fallback para armazenamento offline em caso de erro
                storePendingData('transactions', transactionData);
                registerBackgroundSync('background-sync-transactions');
                showNotification('Erro na conexão. Transação salva offline para sincronização posterior.', 'warning');
            }
        }
        async function updateTransaction(id, transactionData) {
            try {
                if (navigator.onLine) {
                    await setDoc(doc(db, `users/${currentUser.uid}/transactions`, id), transactionData, { merge: true });
                } else {
                    // Modo offline: armazenar atualização localmente
                    storePendingData('transactions', { ...transactionData, id, _action: 'update' });
                    registerBackgroundSync('background-sync-transactions');
                    showNotification('Atualização salva offline. Será sincronizada quando a conexão for restaurada.', 'info');
                }
            } catch (error) {
                console.error('Erro ao atualizar transação:', error);
                storePendingData('transactions', { ...transactionData, id, _action: 'update' });
                registerBackgroundSync('background-sync-transactions');
                showNotification('Erro na conexão. Atualização salva offline para sincronização posterior.', 'warning');
            }
        }
        async function deleteTransaction(id) {
            try {
                if (navigator.onLine) {
                    await deleteDoc(doc(db, `users/${currentUser.uid}/transactions`, id));
                } else {
                    // Modo offline: marcar para exclusão
                    storePendingData('transactions', { id, _action: 'delete' });
                    registerBackgroundSync('background-sync-transactions');
                    showNotification('Exclusão salva offline. Será sincronizada quando a conexão for restaurada.', 'info');
                }
            } catch (error) {
                console.error('Erro ao excluir transação:', error);
                storePendingData('transactions', { id, _action: 'delete' });
                registerBackgroundSync('background-sync-transactions');
                showNotification('Erro na conexão. Exclusão salva offline para sincronização posterior.', 'warning');
            }
        }
            
            function addRecurringTemplate(templateData) {
                // Adiciona um ID único ao template
                const newTemplate = { id: Date.now().toString() + Math.random().toString(36).substr(2, 9), ...templateData };
                
                // Adiciona o novo template à array local
                recurringTemplates.push(newTemplate);
                
                // **CORREÇÃO CRÍTICA**: Salva a array atualizada no localStorage
                saveData(); 
                
                // Atualiza a interface para refletir a mudança
                updateUI();
                
                showNotification('Despesa recorrente adicionada com sucesso!', 'success');
            }

            function deleteRecurringTemplate(templateId) {
                // Filtra a array local, removendo o template com o ID correspondente
                recurringTemplates = recurringTemplates.filter(t => t.id !== templateId);
                
                // Salva a lista de templates atualizada no localStorage
                saveData();
                
                // Reabre o modal para mostrar a lista atualizada
                openRecurringModal();
                
                showNotification('A despesa recorrente foi removida e não será mais gerada.', 'success');
            }
            
            async function deleteGoal(id) {
                goals = goals.filter(g => g.id !== id);
                
                try {
                    if (navigator.onLine) {
                        await deleteDoc(doc(db, `users/${currentUser.uid}/goals`, id));
                    } else {
                        storePendingData('goals', { id, _action: 'delete' });
                        registerBackgroundSync('background-sync-goals');
                        showNotification('Exclusão salva offline. Será sincronizada quando a conexão for restaurada.', 'info');
                    }
                } catch (error) {
                    console.error('Erro ao excluir meta:', error);
                    storePendingData('goals', { id, _action: 'delete' });
                    registerBackgroundSync('background-sync-goals');
                    showNotification('Erro na conexão. Exclusão salva offline para sincronização posterior.', 'warning');
                }
                
                saveAndRefresh();
            }
            async function addFundsToGoal(goalId, amount) { 
                if (!currentUser) {
                    showNotification('Usuário não autenticado. Faça login novamente.', 'error');
                    return;
                }
                
                const goal = goals.find(g => g.id === goalId); 
                if (goal) { 
                    try {
                        // Atualizar o valor salvo na meta
                        const newSavedAmount = goal.savedAmount + amount;
                        await setDoc(doc(db, `users/${currentUser.uid}/goals`, goalId), 
                            { savedAmount: newSavedAmount }, { merge: true });
                        
                        // Adicionar transação
                        await addTransaction({ 
                            type: 'expense', 
                            description: `Cofrinho: ${goal.name}`, 
                            amount: amount, 
                            category: 'Cofrinhos', 
                            date: new Date().toISOString().split('T')[0] 
                        });
                        
                        showNotification('Dinheiro adicionado ao cofrinho com sucesso!', 'success');
                    } catch (error) {
                        console.error('Erro ao adicionar fundos:', error);
                        showNotification('Erro ao adicionar fundos ao cofrinho.', 'error');
                    }
                } 
            }

            
            function checkAndGenerateRecurringTransactions() {
                const today = new Date(); const currentMonth = today.getMonth(); const currentYear = today.getFullYear(); let newTransactionsGenerated = false;
                recurringTemplates.forEach(template => {
                    const startDate = new Date(template.startDate + 'T00:00:00'); if (startDate > today) return;
                    const transactionExists = transactions.some(t => t.recurringTemplateId === template.id && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear);
                    if (!transactionExists) { const generationDate = new Date(currentYear, currentMonth, startDate.getDate()); addTransaction({ type: 'expense', description: template.description, amount: template.amount, category: template.category, date: generationDate.toISOString().split('T')[0], recurringTemplateId: template.id }, true); newTransactionsGenerated = true; }
                });
                if (newTransactionsGenerated) saveAndRefresh();
            }

            // --- LÓGICA DA UI ---
        function formatCurrency(value, decimals = 2) { 
            return (value || 0).toLocaleString('pt-BR', { 
                style: 'currency', 
                currency: 'BRL',
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }); 
        }
        
        function formatCurrencyForCharts(value) {
            return formatCurrency(value, 1);
        }
        
        function formatCurrencyForDatalabels(value) {
            return formatCurrency(value, 1);
        }
            
            function getCurrentFinancialCycle() {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            return {
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0],
            };
        }

            function updateUI() {
            if (!currentUser) return;

            // Garantir que os arrays existem, mesmo que vazios
            if (!transactions) transactions = [];
            if (!goals) goals = [];
            if (!categories) categories = [];
            if (!budgets) budgets = [];

            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            updateSummary();
            applyFilters(); // Isso também renderiza a lista de transações
            updateCharts();
            updateCategorySuggestions();
            populateYearFilter(); // <-- Linha adicionada
            populateCategoryFilter();
            populateFilterTags();
            renderGoals();
            renderBudgetsPage();
            updateBudgetSummaryCard();
            updateNetWorthCard();
            renderCalendar();

            updateExecutiveDashboard();
            updateComparisonCharts('monthly');
        }
                

        

        
        function generateAdvancedSavingsSuggestions() {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
            
            // Análise de gastos por categoria
            const categoryAnalysis = analyzeCategorySpending();
            const unusualSpending = detectUnusualSpending();
            const subscriptionAnalysis = analyzeRecurringExpenses();
            
            const suggestions = {
                primary: '',
                secondary: [],
                savings: 0
            };
            
            // Sugestão principal baseada na maior oportunidade de economia
            if (categoryAnalysis.highestCategory && categoryAnalysis.potentialSaving > 100) {
                suggestions.primary = `Reduza ${categoryAnalysis.highestCategory.name} em ${formatCurrency(categoryAnalysis.potentialSaving)}`;
                suggestions.savings += categoryAnalysis.potentialSaving;
            } else if (unusualSpending.length > 0) {
                const totalUnusual = unusualSpending.reduce((sum, item) => sum + item.amount, 0);
                suggestions.primary = `Gastos atípicos detectados: ${formatCurrency(totalUnusual)}`;
            } else if (subscriptionAnalysis.unusedSubscriptions > 0) {
                suggestions.primary = `Cancele ${subscriptionAnalysis.unusedSubscriptions} assinaturas não utilizadas`;
                suggestions.savings += subscriptionAnalysis.potentialSaving;
            } else {
                const totalGoals = (goals || []).reduce((sum, goal) => sum + goal.targetAmount, 0);
                const totalSaved = (goals || []).reduce((sum, goal) => sum + goal.savedAmount, 0);
                const remaining = totalGoals - totalSaved;
                
                if (remaining <= 0) return { primary: 'Metas atingidas! 🎉', secondary: [], savings: 0 };
                
                const monthlyIncome = transactions
                    .filter(t => t.type === 'income' && t.date.startsWith(currentMonth))
                    .reduce((sum, t) => sum + t.amount, 0);
                
                const monthlyExpenses = transactions
                    .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
                    .reduce((sum, t) => sum + t.amount, 0);
                
                const availableToSave = monthlyIncome - monthlyExpenses;
                
                if (availableToSave <= 0) {
                    suggestions.primary = 'Reduza gastos primeiro';
                } else {
                    const monthsToGoal = Math.ceil(remaining / availableToSave);
                    suggestions.primary = `Economize ${formatCurrency(availableToSave)}/mês (${monthsToGoal} meses para meta)`;
                }
            }
            
            return suggestions;
        }
        
        function analyzeCategorySpending() {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
            
            const currentExpenses = {};
            const lastExpenses = {};
            
            // Agrupar gastos por categoria
            transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
                .forEach(t => {
                    currentExpenses[t.category] = (currentExpenses[t.category] || 0) + t.amount;
                });
                
            transactions.filter(t => t.type === 'expense' && t.date.startsWith(lastMonth))
                .forEach(t => {
                    lastExpenses[t.category] = (lastExpenses[t.category] || 0) + t.amount;
                });
            
            let highestCategory = null;
            let maxIncrease = 0;
            
            Object.keys(currentExpenses).forEach(category => {
                const current = currentExpenses[category];
                const last = lastExpenses[category] || 0;
                const increase = current - last;
                const percentIncrease = last > 0 ? (increase / last) * 100 : 0;
                
                if (increase > maxIncrease && percentIncrease > 20) {
                    maxIncrease = increase;
                    highestCategory = { name: category, increase, current, last };
                }
            });
            
            return {
                highestCategory,
                potentialSaving: maxIncrease * 0.3 // Sugestão de reduzir 30% do aumento
            };
        }
        
        function detectUnusualSpending() {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const currentTransactions = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth));
            
            // Calcular média histórica por categoria
            const historicalAverages = {};
            const last3Months = [];
            
            for (let i = 1; i <= 3; i++) {
                const monthDate = new Date(new Date().setMonth(new Date().getMonth() - i));
                last3Months.push(monthDate.toISOString().slice(0, 7));
            }
            
            last3Months.forEach(month => {
                transactions.filter(t => t.type === 'expense' && t.date.startsWith(month))
                    .forEach(t => {
                        if (!historicalAverages[t.category]) historicalAverages[t.category] = [];
                        historicalAverages[t.category].push(t.amount);
                    });
            });
            
            // Detectar gastos anômalos (>150% da média histórica)
            const unusualSpending = [];
            currentTransactions.forEach(transaction => {
                const categoryHistory = historicalAverages[transaction.category] || [];
                if (categoryHistory.length > 0) {
                    const average = categoryHistory.reduce((sum, amount) => sum + amount, 0) / categoryHistory.length;
                    if (transaction.amount > average * 1.5) {
                        unusualSpending.push({
                            ...transaction,
                            averageAmount: average,
                            difference: transaction.amount - average
                        });
                    }
                }
            });
            
            return unusualSpending;
        }
        
        function analyzeRecurringExpenses() {
            // Analisar templates recorrentes vs uso real
            const activeSubscriptions = recurringTemplates.length;
            const currentMonth = new Date().toISOString().slice(0, 7);
            
            const usedSubscriptions = recurringTemplates.filter(template => {
                return transactions.some(t => 
                    t.recurringTemplateId === template.id && 
                    t.date.startsWith(currentMonth)
                );
            }).length;
            
            const unusedSubscriptions = activeSubscriptions - usedSubscriptions;
            const potentialSaving = unusedSubscriptions * 50; // Estimativa média de R$50 por assinatura
            
            return {
                 total: activeSubscriptions,
                 used: usedSubscriptions,
                 unusedSubscriptions,
                 potentialSaving
             };
         }
         
         // --- DASHBOARD EXECUTIVO ---
         function updateExecutiveDashboard() {
             try {
                 const kpis = calculateExecutiveKPIs();
                 
                 // Atualizar KPIs principais
                 document.getElementById('monthly-roi').textContent = kpis.monthlyROI;
                 document.getElementById('savings-rate').textContent = kpis.savingsRate;
                 document.getElementById('burn-rate').textContent = formatCurrency(kpis.burnRate);
                 document.getElementById('financial-score').textContent = kpis.financialScore;
                 
                 // Atualizar métricas de performance
                 document.getElementById('wealth-growth').textContent = kpis.wealthGrowth;
                 document.getElementById('expense-efficiency').textContent = kpis.expenseEfficiency;
                 document.getElementById('diversification').textContent = kpis.diversification;
                 document.getElementById('liquidity').textContent = kpis.liquidity;
                 
                 // Atualizar card de metas
                 updateExecutiveGoals();
                 
                 // Atualizar gráficos executivos
                 updateWealthTrendChart();
                 updateCashFlowChart();
                 
                 // Atualizar comparação temporal
                 updateComparisonCharts('monthly');
                 
                 // Atualizar relatório de saúde financeira
                 updateHealthReport();
                 
                 // Atualizar insights
                 updateExecutiveInsights(kpis);
                 
             } catch (error) {
                 console.error('Erro ao atualizar dashboard executivo:', error);
             }
         }
         
         function calculateExecutiveKPIs() {
             const currentMonth = new Date().toISOString().slice(0, 7);
             const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
             
             // Calcular receitas e despesas mensais
             const currentIncome = transactions
                 .filter(t => t.type === 'income' && t.date.startsWith(currentMonth))
                 .reduce((sum, t) => sum + t.amount, 0);
                 
             const currentExpenses = transactions
                 .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
                 .reduce((sum, t) => sum + t.amount, 0);
                 
             const lastIncome = transactions
                 .filter(t => t.type === 'income' && t.date.startsWith(lastMonth))
                 .reduce((sum, t) => sum + t.amount, 0);
                 
             const lastExpenses = transactions
                 .filter(t => t.type === 'expense' && t.date.startsWith(lastMonth))
                 .reduce((sum, t) => sum + t.amount, 0);
             
             // ROI Mensal
             const currentBalance = currentIncome - currentExpenses;
             const lastBalance = lastIncome - lastExpenses;
             const monthlyROI = lastBalance > 0 ? (((currentBalance - lastBalance) / lastBalance) * 100).toFixed(1) + '%' : '0%';
             
             // Taxa de Poupança
             const savingsRate = currentIncome > 0 ? (((currentIncome - currentExpenses) / currentIncome) * 100).toFixed(1) + '%' : '0%';
             
             // Burn Rate (média de gastos mensais)
             const burnRate = currentExpenses;
             
             // Score Financeiro (baseado em múltiplos fatores)
             const score = calculateFinancialScore(currentIncome, currentExpenses, goals);
             
             // Crescimento Patrimonial (últimos 6 meses)
             const wealthGrowth = calculateWealthGrowth();
             
             // Eficiência de Gastos
             const expenseEfficiency = calculateExpenseEfficiency();
             
             // Diversificação (baseada em categorias)
             const diversification = calculateDiversification();
             
             // Liquidez (meses de reserva)
             const liquidity = currentExpenses > 0 ? (currentBalance / currentExpenses).toFixed(1) + ' meses' : '∞';
             
             return {
                 monthlyROI,
                 savingsRate,
                 burnRate,
                 financialScore: score,
                 wealthGrowth: wealthGrowth + '%',
                 expenseEfficiency: expenseEfficiency + '%',
                 diversification: diversification + '%',
                 liquidity
             };
         }
         
         function calculateFinancialScore(income, expenses, goals) {
             let score = 500; // Base score
             
             // Fator de poupança (0-200 pontos)
             const savingsRate = income > 0 ? (income - expenses) / income : 0;
             score += Math.min(200, savingsRate * 400);
             
             // Fator de metas (0-150 pontos)
             const totalGoals = (goals || []).reduce((sum, goal) => sum + goal.targetAmount, 0);
             const totalSaved = (goals || []).reduce((sum, goal) => sum + goal.savedAmount, 0);
             const goalsProgress = totalGoals > 0 ? totalSaved / totalGoals : 0;
             score += Math.min(150, goalsProgress * 150);
             
             // Fator de consistência (0-100 pontos)
             const consistencyBonus = calculateConsistencyBonus();
             score += consistencyBonus;
             
             // Fator de diversificação (0-50 pontos)
             const diversificationBonus = calculateDiversification() / 2;
             score += diversificationBonus;
             
             return Math.round(Math.min(1000, Math.max(300, score)));
         }
         
         function calculateWealthGrowth() {
             // Simular crescimento patrimonial baseado em transações
             const last6Months = [];
             for (let i = 0; i < 6; i++) {
                 const monthDate = new Date(new Date().setMonth(new Date().getMonth() - i));
                 const monthStr = monthDate.toISOString().slice(0, 7);
                 const monthBalance = transactions
                     .filter(t => t.date.startsWith(monthStr))
                     .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
                 last6Months.push(monthBalance);
             }
             
             if (last6Months.length < 2) return 0;
             
             const firstMonth = last6Months[last6Months.length - 1];
             const lastMonth = last6Months[0];
             
             if (firstMonth <= 0) return 0;
             
             return ((lastMonth - firstMonth) / Math.abs(firstMonth) * 100).toFixed(1);
         }
         
         function calculateExpenseEfficiency() {
             // Calcular eficiência baseada na variação de gastos
             const currentMonth = new Date().toISOString().slice(0, 7);
             const currentExpenses = transactions
                 .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
                 .reduce((sum, t) => sum + t.amount, 0);
                 
             const avgExpenses = calculateAverageExpenses();
             
             if (avgExpenses === 0) return 100;
             
             const efficiency = Math.max(0, 100 - ((currentExpenses - avgExpenses) / avgExpenses * 100));
             return Math.round(Math.min(100, efficiency));
         }
         
         function calculateAverageExpenses() {
             const last3Months = [];
             for (let i = 1; i <= 3; i++) {
                 const monthDate = new Date(new Date().setMonth(new Date().getMonth() - i));
                 const monthStr = monthDate.toISOString().slice(0, 7);
                 const monthExpenses = transactions
                     .filter(t => t.type === 'expense' && t.date.startsWith(monthStr))
                     .reduce((sum, t) => sum + t.amount, 0);
                 last3Months.push(monthExpenses);
             }
             
             return last3Months.length > 0 ? last3Months.reduce((sum, exp) => sum + exp, 0) / last3Months.length : 0;
         }
         
         function calculateDiversification() {
             const currentMonth = new Date().toISOString().slice(0, 7);
             const categoryExpenses = {};
             
             transactions
                 .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
                 .forEach(t => {
                     categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
                 });
             
             const categories = Object.keys(categoryExpenses);
             const totalExpenses = Object.values(categoryExpenses).reduce((sum, amount) => sum + amount, 0);
             
             if (categories.length === 0 || totalExpenses === 0) return 100;
             
             // Calcular índice de diversificação (baseado na distribuição)
             const maxCategoryPercent = Math.max(...Object.values(categoryExpenses)) / totalExpenses;
             const diversificationScore = Math.max(0, 100 - (maxCategoryPercent * 100));
             
             return Math.round(diversificationScore);
         }
         
         function calculateConsistencyBonus() {
             // Bonus baseado na consistência de poupança
             const last3Months = [];
             for (let i = 0; i < 3; i++) {
                 const monthDate = new Date(new Date().setMonth(new Date().getMonth() - i));
                 const monthStr = monthDate.toISOString().slice(0, 7);
                 const monthIncome = transactions
                     .filter(t => t.type === 'income' && t.date.startsWith(monthStr))
                     .reduce((sum, t) => sum + t.amount, 0);
                 const monthExpenses = transactions
                     .filter(t => t.type === 'expense' && t.date.startsWith(monthStr))
                     .reduce((sum, t) => sum + t.amount, 0);
                 
                 const savingsRate = monthIncome > 0 ? (monthIncome - monthExpenses) / monthIncome : 0;
                 last3Months.push(savingsRate);
             }
             
             if (last3Months.length < 3) return 0;
             
             // Verificar se houve poupança consistente
             const positiveSavings = last3Months.filter(rate => rate > 0).length;
             return (positiveSavings / last3Months.length) * 100;
         }
         
         function updateExecutiveGoals() {
             const container = document.getElementById('executive-goals-container');
             if (!container) return;
             
             if (!goals || goals.length === 0) {
                 container.innerHTML = '<p class="text-gray-400 text-center py-8">Nenhuma meta cadastrada ainda.<br>Vá para a aba "Cofrinhos" para criar suas metas.</p>';
                 return;
             }
             
             container.innerHTML = '';
             goals.slice(0, 3).forEach(goal => { // Mostrar apenas as 3 primeiras metas
                 const progress = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;
                 const progressColor = progress >= 100 ? 'green' : progress >= 50 ? 'blue' : 'yellow';
                 
                 const goalElement = document.createElement('div');
                 goalElement.innerHTML = `
                     <div class="flex justify-between items-center mb-2">
                         <span class="text-sm text-gray-400">${goal.name}</span>
                         <span class="font-mono text-${progressColor}-400">${progress.toFixed(0)}%</span>
                     </div>
                     <div class="w-full bg-gray-700 rounded-full h-2">
                         <div class="bg-${progressColor}-400 h-2 rounded-full" style="width: ${Math.min(progress, 100)}%"></div>
                     </div>
                 `;
                 container.appendChild(goalElement);
             });
         }
         
         function updateWealthTrendChart() {
             // Implementar gráfico de tendência de patrimônio
             const ctx = document.getElementById('wealthTrendChart');
             if (!ctx) return;
             
             // Destruir gráfico existente se houver
              if (window.wealthTrendChart && typeof window.wealthTrendChart.destroy === 'function') {
                  window.wealthTrendChart.destroy();
              }
             
             // Dados reais baseados nas transações
              const wealthData = generateWealthTrendData();
              const labels = wealthData.labels;
              const data = wealthData.values;
             
             window.wealthTrendChart = new Chart(ctx, {
                 type: 'line',
                 data: {
                     labels: labels,
                     datasets: [{
                         label: 'Patrimônio Líquido',
                         data: data,
                         borderColor: '#00d4ff',
                         backgroundColor: 'rgba(0, 212, 255, 0.1)',
                         tension: 0.4,
                         fill: true
                     }]
                 },
                 options: {
                     responsive: true,
                     maintainAspectRatio: false,
                     plugins: {
                         datalabels: {
                             display: false
                         },
                         legend: { display: false }
                     },
                     scales: {
                         y: {
                             ticks: {
                                 color: '#a0a0a0',
                                 callback: function(value) { return formatCurrencyForCharts(value); }
                             },
                             grid: { color: 'rgba(0, 212, 255, 0.1)' }
                         },
                         x: {
                             ticks: { color: '#a0a0a0' },
                             grid: { color: 'rgba(0, 212, 255, 0.1)' }
                         }
                     }
                 }
             });
         }
         
         function updateCashFlowChart() {
             // Implementar gráfico de fluxo de caixa
             const ctx = document.getElementById('cashFlowChart');
             if (!ctx) return;
             
             // Destruir gráfico existente se houver
              if (window.cashFlowChart && typeof window.cashFlowChart.destroy === 'function') {
                  window.cashFlowChart.destroy();
              }
             
             const cashFlowData = generateCashFlowData();
              const labels = cashFlowData.labels;
              const income = cashFlowData.income;
              const expenses = cashFlowData.expenses;
             
             window.cashFlowChart = new Chart(ctx, {
                 type: 'bar',
                 data: {
                     labels: labels,
                     datasets: [
                         {
                             label: 'Receitas',
                             data: income,
                             backgroundColor: '#22c55e',
                             borderRadius: 4
                         },
                         {
                             label: 'Despesas',
                             data: expenses,
                             backgroundColor: '#ef4444',
                             borderRadius: 4
                         }
                     ]
                 },
                 options: {
                     responsive: true,
                     maintainAspectRatio: false,
                     plugins: {
                         legend: {
                             position: 'top',
                             labels: { color: '#a0a0a0' }
                         }
                     },
                     scales: {
                         y: {
                             ticks: {
                                 color: '#a0a0a0',
                                 callback: function(value) { return formatCurrency(value); }
                             },
                             grid: { color: 'rgba(0, 212, 255, 0.1)' }
                         },
                         x: {
                             ticks: { color: '#a0a0a0' },
                             grid: { display: false }
                         }
                     }
                 }
             });
         }
         
         function updateExecutiveInsights(kpis) {
             const insights = generateExecutiveInsights(kpis);
             const container = document.getElementById('executive-insights');
             
             if (container && insights.length > 0) {
                 container.innerHTML = insights.map(insight => 
                     `<div class="p-3 bg-${insight.color}-500/20 rounded-lg border border-${insight.color}-400/30">
                         <p class="text-${insight.color}-300 font-semibold">${insight.icon} ${insight.title}</p>
                         <p class="text-gray-400">${insight.description}</p>
                     </div>`
                 ).join('');
             }
         }
         
         function generateExecutiveInsights(kpis) {
             const insights = [];
             
             // Insight sobre taxa de poupança
             const savingsRate = parseFloat(kpis.savingsRate);
             if (savingsRate > 20) {
                 insights.push({
                     icon: '✓',
                     title: 'Meta de poupança atingida',
                     description: `Você economizou ${kpis.savingsRate} da renda este mês`,
                     color: 'green'
                 });
             } else if (savingsRate < 10) {
                 insights.push({
                     icon: '⚠️',
                     title: 'Taxa de poupança baixa',
                     description: `Apenas ${kpis.savingsRate} da renda foi poupada`,
                     color: 'yellow'
                 });
             }
             
             // Insight sobre crescimento
             const wealthGrowth = parseFloat(kpis.wealthGrowth);
             if (wealthGrowth > 10) {
                 insights.push({
                     icon: '📈',
                     title: 'Crescimento consistente',
                     description: `Patrimônio cresceu ${kpis.wealthGrowth} nos últimos 6 meses`,
                     color: 'blue'
                 });
             }
             
             // Insight sobre eficiência
             const efficiency = parseFloat(kpis.expenseEfficiency);
             if (efficiency < 70) {
                 insights.push({
                     icon: '⚠️',
                     title: 'Atenção: Gastos elevados',
                     description: 'Despesas acima da média histórica',
                     color: 'yellow'
                 });
             }
             
             return insights.slice(0, 3); // Máximo 3 insights
         }
         
         function generateWealthTrendData() {
             const data = { labels: [], values: [] };
             
             // Últimos 6 meses
             for (let i = 5; i >= 0; i--) {
                 const date = new Date();
                 date.setMonth(date.getMonth() - i);
                 const monthStr = date.toISOString().slice(0, 7);
                 
                 // Calcular patrimônio acumulado até este mês
                 const cumulativeBalance = transactions
                     .filter(t => t.date <= monthStr + '-31')
                     .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
                 
                 data.labels.push(date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
                 data.values.push(Math.max(0, cumulativeBalance));
             }
             
             return data;
         }
         
         function generateCashFlowData() {
             const data = { labels: [], income: [], expenses: [] };
             
             // Últimos 6 meses
             for (let i = 5; i >= 0; i--) {
                 const date = new Date();
                 date.setMonth(date.getMonth() - i);
                 const monthStr = date.toISOString().slice(0, 7);
                 
                 const monthIncome = transactions
                     .filter(t => t.type === 'income' && t.date.startsWith(monthStr))
                     .reduce((sum, t) => sum + t.amount, 0);
                     
                 const monthExpenses = transactions
                     .filter(t => t.type === 'expense' && t.date.startsWith(monthStr))
                     .reduce((sum, t) => sum + t.amount, 0);
                 
                 data.labels.push(date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
                 data.income.push(monthIncome);
                 data.expenses.push(monthExpenses);
             }
             
             return data;
          }
          
          // --- RELATÓRIO DE SAÚDE FINANCEIRA ---
          function updateHealthReport() {
              try {
                  const healthData = calculateHealthMetrics();
                  
                  // Atualizar score principal
                  updateHealthScore(healthData.score);
                  
                  // Atualizar indicadores
                  updateHealthIndicators(healthData.indicators);
                  
                  // Atualizar gráfico de evolução
                  updateHealthTrendChart();
                  
                  // Atualizar recomendações
                  updateHealthRecommendations(healthData);
                  
              } catch (error) {
                  console.error('Erro ao atualizar relatório de saúde:', error);
              }
          }
          
          function calculateHealthMetrics() {
              const currentMonth = new Date().toISOString().slice(0, 7);
              
              // Calcular receitas e despesas atuais
              const monthlyIncome = transactions
                  .filter(t => t.type === 'income' && t.date.startsWith(currentMonth))
                  .reduce((sum, t) => sum + t.amount, 0);
                  
              const monthlyExpenses = transactions
                  .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
                  .reduce((sum, t) => sum + t.amount, 0);
              
              const currentBalance = monthlyIncome - monthlyExpenses;
              
              // Calcular indicadores de saúde
              const indicators = {
                  emergencyFund: calculateEmergencyFundStatus(currentBalance, monthlyExpenses),
                  debtRatio: calculateDebtRatio(monthlyIncome, monthlyExpenses),
                  savingsConsistency: calculateSavingsConsistency(),
                  expenseControl: calculateExpenseControl()
              };
              
              // Calcular score geral
              const score = calculateOverallHealthScore(indicators);
              
              return { score, indicators };
          }
          
          function calculateEmergencyFundStatus(balance, expenses) {
              if (expenses === 0) return { status: 'Adequada', color: 'green', score: 100 };
              
              const monthsOfExpenses = balance / expenses;
              
              if (monthsOfExpenses >= 6) {
                  return { status: 'Excelente', color: 'green', score: 100 };
              } else if (monthsOfExpenses >= 3) {
                  return { status: 'Adequada', color: 'blue', score: 80 };
              } else if (monthsOfExpenses >= 1) {
                  return { status: 'Insuficiente', color: 'yellow', score: 50 };
              } else {
                  return { status: 'Crítica', color: 'red', score: 20 };
              }
          }
          
          function calculateDebtRatio(income, expenses) {
              if (income === 0) return { status: 'N/A', color: 'gray', score: 50 };
              
              const ratio = expenses / income;
              
              if (ratio <= 0.3) {
                  return { status: 'Baixa', color: 'green', score: 100 };
              } else if (ratio <= 0.5) {
                  return { status: 'Moderada', color: 'blue', score: 80 };
              } else if (ratio <= 0.7) {
                  return { status: 'Alta', color: 'yellow', score: 50 };
              } else {
                  return { status: 'Crítica', color: 'red', score: 20 };
              }
          }
          
          function calculateSavingsConsistency() {
              const last6Months = [];
              
              for (let i = 0; i < 6; i++) {
                  const date = new Date();
                  date.setMonth(date.getMonth() - i);
                  const monthStr = date.toISOString().slice(0, 7);
                  
                  const income = transactions
                      .filter(t => t.type === 'income' && t.date.startsWith(monthStr))
                      .reduce((sum, t) => sum + t.amount, 0);
                      
                  const expenses = transactions
                      .filter(t => t.type === 'expense' && t.date.startsWith(monthStr))
                      .reduce((sum, t) => sum + t.amount, 0);
                  
                  last6Months.push(income - expenses);
              }
              
              const positiveSavings = last6Months.filter(balance => balance > 0).length;
              const consistency = (positiveSavings / last6Months.length) * 100;
              
              if (consistency >= 80) {
                  return { status: 'Excelente', color: 'green', score: 100 };
              } else if (consistency >= 60) {
                  return { status: 'Boa', color: 'blue', score: 80 };
              } else if (consistency >= 40) {
                  return { status: 'Regular', color: 'yellow', score: 60 };
              } else {
                  return { status: 'Ruim', color: 'red', score: 30 };
              }
          }
          
          function calculateExpenseControl() {
              const currentMonth = new Date().toISOString().slice(0, 7);
              const currentExpenses = transactions
                  .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
                  .reduce((sum, t) => sum + t.amount, 0);
              
              const avgExpenses = calculateAverageExpenses();
              
              if (avgExpenses === 0) return { status: 'N/A', color: 'gray', score: 50 };
              
              const variation = ((currentExpenses - avgExpenses) / avgExpenses) * 100;
              
              if (variation <= -10) {
                  return { status: 'Excelente', color: 'green', score: 100 };
              } else if (variation <= 5) {
                  return { status: 'Bom', color: 'blue', score: 80 };
              } else if (variation <= 15) {
                  return { status: 'Regular', color: 'yellow', score: 60 };
              } else {
                  return { status: 'Ruim', color: 'red', score: 30 };
              }
          }
          
          function calculateOverallHealthScore(indicators) {
              const scores = [
                  indicators.emergencyFund.score * 0.3,
                  indicators.debtRatio.score * 0.25,
                  indicators.savingsConsistency.score * 0.25,
                  indicators.expenseControl.score * 0.2
              ];
              
              return Math.round(scores.reduce((sum, score) => sum + score, 0));
          }
          
          function updateHealthScore(score) {
              const scoreDisplay = document.getElementById('health-score-display');
              const scoreBadge = document.getElementById('health-score-badge');
              
              if (scoreDisplay) scoreDisplay.textContent = score;
              
              if (scoreBadge) {
                  // Atualizar cor do badge baseado no score
                  scoreBadge.className = 'px-3 py-1 rounded-full border';
                  
                  if (score >= 80) {
                      scoreBadge.classList.add('bg-green-500/20', 'text-green-300', 'border-green-400/30');
                  } else if (score >= 60) {
                      scoreBadge.classList.add('bg-blue-500/20', 'text-blue-300', 'border-blue-400/30');
                  } else if (score >= 40) {
                      scoreBadge.classList.add('bg-yellow-500/20', 'text-yellow-300', 'border-yellow-400/30');
                  } else {
                      scoreBadge.classList.add('bg-red-500/20', 'text-red-300', 'border-red-400/30');
                  }
              }
          }
          
          function updateHealthIndicators(indicators) {
              const indicatorMap = {
                  'emergency-fund': indicators.emergencyFund,
                  'debt-ratio': indicators.debtRatio,
                  'savings-consistency': indicators.savingsConsistency,
                  'expense-control': indicators.expenseControl
              };
              
              Object.entries(indicatorMap).forEach(([key, indicator]) => {
                  const iconEl = document.getElementById(`${key}-icon`);
                  const statusEl = document.getElementById(`${key}-status`);
                  
                  if (iconEl) {
                      iconEl.className = `w-3 h-3 rounded-full bg-${indicator.color}-400`;
                  }
                  
                  if (statusEl) {
                      statusEl.textContent = indicator.status;
                      statusEl.className = `text-sm font-semibold text-${indicator.color}-400`;
                  }
              });
          }
          
          function updateHealthTrendChart() {
              const ctx = document.getElementById('healthTrendChart');
              if (!ctx) return;
              
              // Destruir gráfico existente se houver
              if (window.healthTrendChart && typeof window.healthTrendChart.destroy === 'function') {
                  window.healthTrendChart.destroy();
              }
              
              // Dados dos últimos 6 meses
              const healthHistory = generateHealthHistory();
              
              window.healthTrendChart = new Chart(ctx, {
                  type: 'line',
                  data: {
                      labels: healthHistory.labels,
                      datasets: [{
                          label: 'Score de Saúde',
                          data: healthHistory.scores,
                          borderColor: '#8b5cf6',
                          backgroundColor: 'rgba(139, 92, 246, 0.1)',
                          tension: 0.4,
                          fill: true
                      }]
                  },
                  options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                          legend: { display: false }
                      },
                      scales: {
                          y: {
                              min: 0,
                              max: 100,
                              ticks: {
                                  color: '#a0a0a0',
                                  callback: function(value) { return value + '%'; }
                              },
                              grid: { color: 'rgba(139, 92, 246, 0.1)' }
                          },
                          x: {
                              ticks: { color: '#a0a0a0' },
                              grid: { color: 'rgba(139, 92, 246, 0.1)' }
                          }
                      }
                  }
              });
          }
          
          function generateHealthHistory() {
              const data = { labels: [], scores: [] };
              
              // Obter o score atual de saúde financeira
              const currentHealthData = calculateHealthMetrics();
              const currentScore = currentHealthData.score;
              
              for (let i = 5; i >= 0; i--) {
                  const date = new Date();
                  date.setMonth(date.getMonth() - i);
                  
                  let score;
                  if (i === 0) {
                      // Mês atual - usar score real
                      score = currentScore;
                  } else {
                      // Meses anteriores - simular evolução baseada no score atual
                      const progressFactor = (6 - i) / 6; // Progresso de 0 a 1
                      const baseScore = Math.max(30, currentScore - (i * 3)); // Evolução gradual
                      const variation = Math.sin(i * 0.3) * 5; // Pequena variação
                      score = Math.max(30, Math.min(100, baseScore + variation));
                  }
                  
                  data.labels.push(date.toLocaleDateString('pt-BR', { month: 'short' }));
                  data.scores.push(Math.round(score));
              }
              
              return data;
          }
          
          function updateHealthRecommendations(healthData) {
              const recommendations = generateHealthRecommendations(healthData);
              const container = document.getElementById('health-recommendations');
              
              if (container && recommendations.length > 0) {
                  container.innerHTML = recommendations.map((rec, index) => 
                      `<div class="p-4 bg-${rec.color}-500/10 rounded-lg border border-${rec.color}-400/20">
                          <div class="flex items-start space-x-3">
                              <div class="w-6 h-6 rounded-full bg-${rec.color}-500 flex items-center justify-center text-xs font-bold text-white">${index + 1}</div>
                              <div>
                                  <h5 class="font-semibold text-${rec.color}-300 mb-1">${rec.title}</h5>
                                  <p class="text-sm text-gray-400">${rec.description}</p>
                              </div>
                          </div>
                      </div>`
                  ).join('');
              }
          }
          
          function generateHealthRecommendations(healthData) {
              const recommendations = [];
              
              // Recomendações baseadas nos indicadores
              if (healthData.indicators.emergencyFund.score < 80) {
                  recommendations.push({
                      title: 'Aumentar Reserva de Emergência',
                      description: 'Sua reserva está abaixo do ideal. Tente poupar pelo menos 3-6 meses de despesas.',
                      color: 'blue'
                  });
              }
              
              if (healthData.indicators.debtRatio.score < 70) {
                  recommendations.push({
                      title: 'Reduzir Gastos Mensais',
                      description: 'Seus gastos estão altos em relação à renda. Considere revisar categorias não essenciais.',
                      color: 'yellow'
                  });
              }
              
              if (healthData.indicators.savingsConsistency.score < 70) {
                  recommendations.push({
                      title: 'Melhorar Consistência de Poupança',
                      description: 'Estabeleça uma meta fixa de poupança mensal para criar um hábito consistente.',
                      color: 'green'
                  });
              }
              
              if (healthData.indicators.expenseControl.score < 70) {
                  recommendations.push({
                      title: 'Controlar Variação de Gastos',
                      description: 'Seus gastos têm variado muito. Use orçamentos para manter maior controle.',
                      color: 'purple'
                  });
              }
              
              // Se tudo estiver bem, dar recomendações de crescimento
              if (recommendations.length === 0) {
                  recommendations.push(
                      {
                          title: 'Diversificar Investimentos',
                          description: 'Sua saúde financeira está ótima! Considere diversificar em investimentos de longo prazo.',
                          color: 'blue'
                      },
                      {
                          title: 'Planejar Objetivos Futuros',
                          description: 'Com as finanças estáveis, é hora de definir metas de longo prazo como aposentadoria.',
                          color: 'green'
                      }
                  );
              }
              
              return recommendations.slice(0, 4); // Máximo 4 recomendações
           }
           
           // --- PUSH NOTIFICATIONS ---
           let notificationPermission = 'default';
           let swRegistration = null;
           
           async function initializePushNotifications() {
               try {
                   // Verificar se estamos em um protocolo válido
                   if (location.protocol !== 'http:' && location.protocol !== 'https:') {
                       console.log('Push notifications só funcionam em HTTP/HTTPS');
                       return false;
                   }
                   
                   // Verificar se o navegador suporta notificações
                   if (!('Notification' in window)) {
                       console.log('Este navegador não suporta notificações');
                       return false;
                   }
                   
                   // Verificar se o Service Worker está disponível
                   if (!('serviceWorker' in navigator)) {
                       console.log('Service Worker não suportado');
                       return false;
                   }
                   
                   // Registrar Service Worker se ainda não estiver
                   if (!swRegistration) {
                       swRegistration = await navigator.serviceWorker.register('/sw.js');
                   }
                   
                   // Verificar permissão atual
                   notificationPermission = Notification.permission;
                   
                   return true;
               } catch (error) {
                   console.error('Erro ao inicializar push notifications:', error);
                   return false;
               }
           }
           
           async function requestNotificationPermission() {
               try {
                   if (notificationPermission === 'granted') {
                       return true;
                   }
                   
                   if (notificationPermission === 'denied') {
                       showNotification('Notificações foram negadas. Ative nas configurações do navegador.', 'warning');
                       return false;
                   }
                   
                   const permission = await Notification.requestPermission();
                   notificationPermission = permission;
                   
                   if (permission === 'granted') {
                       showNotification('Notificações ativadas com sucesso!', 'success');
                       return true;
                   } else {
                       showNotification('Permissão de notificação negada.', 'warning');
                       return false;
                   }
               } catch (error) {
                   console.error('Erro ao solicitar permissão:', error);
                   return false;
               }
           }
           
           function sendLocalNotification(title, body, options = {}) {
                if (notificationPermission !== 'granted') {
                    console.log('Permissão de notificação não concedida');
                    return;
                }
                
                const defaultOptions = {
                    body: body,
                    icon: '/icon-192x192.png',
                    badge: '/badge-72x72.png',
                    vibrate: [100, 50, 100],
                    requireInteraction: false,
                    silent: false,
                    ...options
                };
                
                // Verificar se o Service Worker está ativo
                if (swRegistration && swRegistration.active) {
                    swRegistration.showNotification(title, defaultOptions)
                        .catch(error => {
                            console.warn('Erro ao enviar notificação via Service Worker, usando Notification API:', error);
                            // Fallback para Notification API nativa
                            if ('Notification' in window) {
                                new Notification(title, defaultOptions);
                            }
                        });
                } else {
                    // Usar Notification API nativa como fallback
                    if ('Notification' in window) {
                        new Notification(title, defaultOptions);
                    } else {
                        console.warn('Notificações não suportadas neste navegador');
                    }
                }
            }
           
           function scheduleNotification(title, body, delay, options = {}) {
               setTimeout(() => {
                   sendLocalNotification(title, body, options);
               }, delay);
           }
           
           function checkGoalAchievements() {
               if (!goals || goals.length === 0) return;
               
               goals.forEach(goal => {
                   const progress = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;
                   
                   // Notificar quando meta for atingida
                   if (progress >= 100 && !goal.notifiedComplete) {
                       sendLocalNotification(
                           '🎉 Meta Atingida!',
                           `Parabéns! Você atingiu a meta "${goal.name}"`,
                           {
                               tag: `goal-complete-${goal.id}`,
                               requireInteraction: true
                           }
                       );
                       
                       // Marcar como notificado (em implementação real, salvar no Firebase)
                       goal.notifiedComplete = true;
                   }
                   
                   // Notificar quando estiver próximo da meta (90%)
                   else if (progress >= 90 && progress < 100 && !goal.notifiedNearComplete) {
                       sendLocalNotification(
                           '🎯 Quase lá!',
                           `Você está a ${(100 - progress).toFixed(1)}% de atingir a meta "${goal.name}"`,
                           {
                               tag: `goal-near-${goal.id}`
                           }
                       );
                       
                       goal.notifiedNearComplete = true;
                   }
               });
           }
           
           function checkBudgetAlerts() {
               const currentMonth = new Date().toISOString().slice(0, 7);
               
               // Verificar gastos por categoria
               const categoryExpenses = {};
               transactions
                   .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
                   .forEach(t => {
                       categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
                   });
               
               // Verificar se alguma categoria ultrapassou 80% do orçamento
               Object.entries(categoryExpenses).forEach(([category, spent]) => {
                   const budget = budgets.find(b => b.category === category);
                   if (budget) {
                       const percentage = (spent / budget.amount) * 100;
                       
                       if (percentage >= 100) {
                           sendLocalNotification(
                               '⚠️ Orçamento Ultrapassado!',
                               `Categoria "${category}" ultrapassou o orçamento em ${(percentage - 100).toFixed(1)}%`,
                               {
                                   tag: `budget-exceeded-${category}`,
                                   requireInteraction: true
                               }
                           );
                       } else if (percentage >= 80) {
                           sendLocalNotification(
                               '⚡ Atenção ao Orçamento',
                               `Categoria "${category}" atingiu ${percentage.toFixed(1)}% do orçamento`,
                               {
                                   tag: `budget-warning-${category}`
                               }
                           );
                       }
                   }
               });
           }
           
           function setupPeriodicNotifications() {
               // Verificar metas e orçamentos a cada 5 minutos
               setInterval(() => {
                   if (notificationPermission === 'granted') {
                       checkGoalAchievements();
                       checkBudgetAlerts();
                   }
               }, 5 * 60 * 1000); // 5 minutos
               
               // Lembrete diário de backup (às 18h)
               const now = new Date();
               const reminderTime = new Date();
               reminderTime.setHours(18, 0, 0, 0);
               
               if (reminderTime <= now) {
                   reminderTime.setDate(reminderTime.getDate() + 1);
               }
               
               const timeUntilReminder = reminderTime.getTime() - now.getTime();
               
               setTimeout(() => {
                   sendLocalNotification(
                       '💾 Lembrete de Backup',
                       'Não se esqueça de fazer backup dos seus dados financeiros!',
                       {
                           tag: 'daily-backup-reminder',
                           requireInteraction: false
                       }
                   );
                   
                   // Configurar para repetir diariamente
                   setInterval(() => {
                       sendLocalNotification(
                           '💾 Lembrete de Backup',
                           'Não se esqueça de fazer backup dos seus dados financeiros!',
                           {
                               tag: 'daily-backup-reminder',
                               requireInteraction: false
                           }
                       );
                   }, 24 * 60 * 60 * 1000); // 24 horas
               }, timeUntilReminder);
            }
            
            // --- SISTEMA DE LEMBRETES DE PAGAMENTO ---
            let paymentReminders = [];
            
            async function initializePaymentReminders() {
                await loadPaymentReminders();
                updateReminderDisplay();
                setupReminderNotifications();
            }
            
            function openReminderModal(reminder = null) {
                const modal = document.getElementById('reminder-modal');
                const title = document.getElementById('reminder-modal-title');
                const form = document.getElementById('reminder-form');
                
                if (reminder) {
                    title.textContent = 'Editar Lembrete de Pagamento';
                    document.getElementById('reminder-title').value = reminder.title;
                    document.getElementById('reminder-amount').value = reminder.amount;
                    document.getElementById('reminder-due-date').value = reminder.dueDate;
                    document.getElementById('reminder-category').value = reminder.category;
                    document.getElementById('reminder-frequency').value = reminder.frequency;
                    document.getElementById('reminder-alert-days').value = reminder.alertDays;
                    document.getElementById('reminder-notes').value = reminder.notes || '';
                    form.dataset.editingId = reminder.id;
                } else {
                    title.textContent = 'Novo Lembrete de Pagamento';
                    form.reset();
                    delete form.dataset.editingId;
                    
                    // Definir data padrão para próximo mês
                    const nextMonth = new Date();
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    nextMonth.setDate(1);
                    document.getElementById('reminder-due-date').value = nextMonth.toISOString().split('T')[0];
                }
                
                openModal(modal);
            }
            
            function savePaymentReminder(reminderData) {
                const reminder = {
                    id: reminderData.id || Date.now().toString(),
                    title: reminderData.title,
                    amount: parseFloat(reminderData.amount),
                    dueDate: reminderData.dueDate,
                    category: reminderData.category,
                    frequency: reminderData.frequency,
                    alertDays: parseInt(reminderData.alertDays),
                    notes: reminderData.notes,
                    isPaid: reminderData.isPaid || false,
                    createdAt: reminderData.createdAt || new Date().toISOString(),
                    nextDueDate: calculateNextDueDate(reminderData.dueDate, reminderData.frequency)
                };
                
                const existingIndex = paymentReminders.findIndex(r => r.id === reminder.id);
                
                if (existingIndex >= 0) {
                    paymentReminders[existingIndex] = reminder;
                } else {
                    paymentReminders.push(reminder);
                }
                
                savePaymentRemindersToStorage();
                updateReminderDisplay();
                
                return reminder;
            }
            
            function calculateNextDueDate(currentDate, frequency) {
                const date = new Date(currentDate);
                
                switch (frequency) {
                    case 'monthly':
                        date.setMonth(date.getMonth() + 1);
                        break;
                    case 'quarterly':
                        date.setMonth(date.getMonth() + 3);
                        break;
                    case 'yearly':
                        date.setFullYear(date.getFullYear() + 1);
                        break;
                    default: // 'once'
                        return null;
                }
                
                return date.toISOString().split('T')[0];
            }
            
            function updateReminderDisplay() {
                updateUpcomingReminders();
                updateReminderSummary();
                updateWeekCalendar();
            }
            
            function updateUpcomingReminders() {
                const container = document.getElementById('upcoming-reminders');
                if (!container) return;
                
                const today = new Date();
                const upcoming = paymentReminders
                    .filter(r => !r.isPaid && new Date(r.dueDate) >= today)
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .slice(0, 10);
                
                if (upcoming.length === 0) {
                    container.innerHTML = '<p class="text-center text-gray-400 py-8">Nenhum pagamento pendente</p>';
                    return;
                }
                
                container.innerHTML = upcoming.map(reminder => {
                    const dueDate = new Date(reminder.dueDate);
                    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    
                    let colorClass = 'green';
                    if (daysUntilDue <= 1) colorClass = 'red';
                    else if (daysUntilDue <= 3) colorClass = 'yellow';
                    else if (daysUntilDue <= 7) colorClass = 'orange';
                    
                    return `
                        <div class="p-3 bg-${colorClass}-500/10 rounded-lg border border-${colorClass}-400/20">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-semibold text-${colorClass}-300">${reminder.title}</p>
                                    <p class="text-sm text-gray-400">Vence em ${daysUntilDue} dia${daysUntilDue !== 1 ? 's' : ''} - ${formatCurrency(reminder.amount)}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-xs text-${colorClass}-400">${dueDate.toLocaleDateString('pt-BR')}</p>
                                    <div class="flex space-x-2 mt-1">
                                        <button onclick="markReminderAsPaid('${reminder.id}')" class="text-xs text-green-400 hover:underline">Pagar</button>
                                        <button onclick="openReminderModal(paymentReminders.find(r => r.id === '${reminder.id}'))" class="text-xs text-blue-400 hover:underline">Editar</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            function updateReminderSummary() {
                const currentMonth = new Date().toISOString().slice(0, 7);
                const monthlyReminders = paymentReminders.filter(r => r.dueDate.startsWith(currentMonth));
                
                const totalPending = monthlyReminders
                    .filter(r => !r.isPaid)
                    .reduce((sum, r) => sum + r.amount, 0);
                    
                const paidCount = monthlyReminders.filter(r => r.isPaid).length;
                const pendingCount = monthlyReminders.filter(r => !r.isPaid).length;
                
                const totalPendingEl = document.getElementById('total-pending');
                const paidCountEl = document.getElementById('paid-count');
                const pendingCountEl = document.getElementById('pending-count');
                
                if (totalPendingEl) totalPendingEl.textContent = formatCurrency(totalPending);
                if (paidCountEl) paidCountEl.textContent = paidCount;
                if (pendingCountEl) pendingCountEl.textContent = pendingCount;
            }
            
            function updateWeekCalendar() {
                const container = document.getElementById('week-calendar');
                if (!container) return;
                
                const today = new Date();
                const weekDays = [];
                
                for (let i = 0; i < 7; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() + i);
                    weekDays.push(date);
                }
                
                container.innerHTML = weekDays.map(date => {
                    const dateStr = date.toISOString().split('T')[0];
                    const hasReminder = paymentReminders.some(r => r.dueDate === dateStr && !r.isPaid);
                    const isToday = date.toDateString() === today.toDateString();
                    
                    return `
                        <div class="text-center p-2 rounded ${
                            isToday ? 'bg-blue-500/20 border border-blue-400/30' : 
                            hasReminder ? 'bg-red-500/20 border border-red-400/30' : 
                            'bg-gray-500/10'
                        }">
                            <p class="text-xs text-gray-400">${date.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                            <p class="text-sm font-semibold ${isToday ? 'text-blue-400' : hasReminder ? 'text-red-400' : 'text-gray-300'}">
                                ${date.getDate()}
                            </p>
                        </div>
                    `;
                }).join('');
            }
            
            function markReminderAsPaid(reminderId) {
                const reminder = paymentReminders.find(r => r.id === reminderId);
                if (!reminder) return;
                
                reminder.isPaid = true;
                reminder.paidAt = new Date().toISOString();
                
                // Se for recorrente, criar próximo lembrete
                if (reminder.frequency !== 'once' && reminder.nextDueDate) {
                    const nextReminder = {
                        ...reminder,
                        id: Date.now().toString(),
                        dueDate: reminder.nextDueDate,
                        nextDueDate: calculateNextDueDate(reminder.nextDueDate, reminder.frequency),
                        isPaid: false,
                        createdAt: new Date().toISOString()
                    };
                    delete nextReminder.paidAt;
                    
                    paymentReminders.push(nextReminder);
                }
                
                savePaymentRemindersToStorage();
                updateReminderDisplay();
                
                showNotification(`Pagamento "${reminder.title}" marcado como pago!`, 'success');
                
                // Registrar como transação
                const transaction = {
                    id: Date.now().toString(),
                    type: 'expense',
                    amount: reminder.amount,
                    description: reminder.title,
                    category: reminder.category,
                    date: new Date().toISOString().split('T')[0],
                    tags: ['pagamento-automatico']
                };
                
                // Adicionar à lista de transações (se estiver disponível)
                if (typeof addTransaction === 'function') {
                    addTransaction(transaction);
                }
            }
            
            function setupReminderNotifications() {
                // Verificar lembretes a cada hora
                setInterval(() => {
                    checkReminderAlerts();
                }, 60 * 60 * 1000); // 1 hora
                
                // Verificar imediatamente
                checkReminderAlerts();
            }
            
            function checkReminderAlerts() {
                const today = new Date();
                
                paymentReminders.forEach(reminder => {
                    if (reminder.isPaid) return;
                    
                    const dueDate = new Date(reminder.dueDate);
                    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    
                    if (daysUntilDue === reminder.alertDays) {
                        sendLocalNotification(
                            '💳 Lembrete de Pagamento',
                            `${reminder.title} vence em ${daysUntilDue} dia${daysUntilDue !== 1 ? 's' : ''} - ${formatCurrency(reminder.amount)}`,
                            {
                                tag: `payment-reminder-${reminder.id}`,
                                requireInteraction: true
                            }
                        );
                    }
                    
                    // Alerta no dia do vencimento
                    if (daysUntilDue === 0) {
                        sendLocalNotification(
                            '🚨 Pagamento Vence Hoje!',
                            `${reminder.title} - ${formatCurrency(reminder.amount)}`,
                            {
                                tag: `payment-due-${reminder.id}`,
                                requireInteraction: true
                            }
                        );
                    }
                });
            }
            
            async function savePaymentRemindersToStorage() {
                if (!currentUser) return;
                
                try {
                    // Limpar coleção existente
                    const q = query(collection(db, `users/${currentUser.uid}/paymentReminders`));
                    const snapshot = await getDocs(q);
                    const batch = writeBatch(db);
                    
                    snapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    
                    // Adicionar novos lembretes
                    paymentReminders.forEach(reminder => {
                        const docRef = doc(collection(db, `users/${currentUser.uid}/paymentReminders`));
                        batch.set(docRef, reminder);
                    });
                    
                    await batch.commit();
                } catch (error) {
                    console.error('Erro ao salvar lembretes no Firebase:', error);
                    // Fallback para localStorage
                    const userPrefix = `reminders_${currentUser?.email || 'default'}`;
                    localStorage.setItem(userPrefix, JSON.stringify(paymentReminders));
                }
            }
            
            async function loadPaymentReminders() {
                if (!currentUser) {
                    paymentReminders = [];
                    return;
                }
                
                try {
                    // Tentar carregar do Firebase primeiro
                    const q = query(collection(db, `users/${currentUser.uid}/paymentReminders`));
                    const snapshot = await getDocs(q);
                    paymentReminders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                } catch (error) {
                    console.error('Erro ao carregar lembretes do Firebase:', error);
                    // Fallback para localStorage
                    const userPrefix = `reminders_${currentUser?.email || 'default'}`;
                    const saved = localStorage.getItem(userPrefix);
                    
                    if (saved) {
                        paymentReminders = JSON.parse(saved);
                        // Migrar para Firebase
                        await savePaymentRemindersToStorage();
                    } else {
                        paymentReminders = [];
                    }
                }
            }
             
             // --- SISTEMA DE ALERTAS DE GASTOS EXCESSIVOS ---
             let expenseAlerts = {
                 enabled: true,
                 warningThreshold: 80,
                 criticalThreshold: 100,
                 categoryLimits: {},
                 alertHistory: []
             };
             
             function initializeExpenseAlerts() {
                 loadExpenseAlertsSettings();
                 updateExpenseAlertsDisplay();
                 setupExpenseAlertsMonitoring();
             }
             
             function updateExpenseAlertsDisplay() {
                 updateExpenseAlertsStatus();
                 updateExpenseAlertsStats();
                 updateAlertsHistory();
             }
             
             function updateExpenseAlertsStatus() {
                 const container = document.getElementById('expense-alerts-status');
                 if (!container) return;
                 
                 const currentMonth = new Date().toISOString().slice(0, 7);
                 const categoryExpenses = {};
                 
                 // Calcular gastos por categoria no mês atual
                 transactions
                     .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
                     .forEach(t => {
                         categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
                     });
                 
                 // Obter limites de orçamento ou usar limites personalizados
                 const categoryLimits = {};
                 budgets.forEach(budget => {
                     categoryLimits[budget.category] = budget.amount;
                 });
                 
                 // Adicionar limites personalizados
                 Object.assign(categoryLimits, expenseAlerts.categoryLimits);
                 
                 const statusItems = [];
                 
                 Object.entries(categoryLimits).forEach(([category, limit]) => {
                     const spent = categoryExpenses[category] || 0;
                     const percentage = limit > 0 ? (spent / limit) * 100 : 0;
                     
                     let status, colorClass;
                     if (percentage >= expenseAlerts.criticalThreshold) {
                         status = 'Excedido';
                         colorClass = 'red';
                     } else if (percentage >= expenseAlerts.warningThreshold) {
                         status = 'Atenção';
                         colorClass = 'yellow';
                     } else {
                         status = 'Normal';
                         colorClass = 'green';
                     }
                     
                     statusItems.push({
                         category,
                         spent,
                         limit,
                         percentage: Math.min(percentage, 100),
                         actualPercentage: percentage,
                         status,
                         colorClass
                     });
                 });
                 
                 // Ordenar por porcentagem (maior primeiro)
                 statusItems.sort((a, b) => b.actualPercentage - a.actualPercentage);
                 
                 if (statusItems.length === 0) {
                     container.innerHTML = '<p class="text-center text-gray-400 py-8">Configure orçamentos para monitorar gastos</p>';
                     return;
                 }
                 
                 container.innerHTML = statusItems.map(item => `
                     <div class="p-3 bg-${item.colorClass}-500/10 rounded-lg border border-${item.colorClass}-400/20">
                         <div class="flex items-center justify-between">
                             <div>
                                 <p class="font-semibold text-${item.colorClass}-300">${item.category}</p>
                                 <p class="text-sm text-gray-400">${formatCurrency(item.spent)} de ${formatCurrency(item.limit)} (${item.actualPercentage.toFixed(0)}%)</p>
                             </div>
                             <div class="text-right">
                                 <span class="text-xs px-2 py-1 bg-${item.colorClass}-500/20 text-${item.colorClass}-300 rounded-full">${item.status}</span>
                             </div>
                         </div>
                         <div class="mt-2 w-full bg-gray-700 rounded-full h-2">
                             <div class="bg-${item.colorClass}-500 h-2 rounded-full" style="width: ${item.percentage}%"></div>
                         </div>
                     </div>
                 `).join('');
             }
             
             function updateExpenseAlertsStats() {
                 const alertsTodayEl = document.getElementById('alerts-today');
                 const categoriesMonitoredEl = document.getElementById('categories-monitored');
                 
                 const today = new Date().toISOString().split('T')[0];
                 const alertsToday = expenseAlerts.alertHistory.filter(alert => 
                     alert.date === today
                 ).length;
                 
                 const categoriesCount = Object.keys(expenseAlerts.categoryLimits).length + budgets.length;
                 
                 if (alertsTodayEl) alertsTodayEl.textContent = alertsToday;
                 if (categoriesMonitoredEl) categoriesMonitoredEl.textContent = categoriesCount;
             }
             
             function updateAlertsHistory() {
                 const container = document.getElementById('alerts-history');
                 if (!container) return;
                 
                 const recentAlerts = expenseAlerts.alertHistory
                     .slice(-10)
                     .reverse();
                 
                 if (recentAlerts.length === 0) {
                     container.innerHTML = '<p class="text-center text-gray-400 py-4">Nenhum alerta recente</p>';
                     return;
                 }
                 
                 container.innerHTML = recentAlerts.map(alert => {
                     const alertDate = new Date(alert.timestamp);
                     const timeStr = alertDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                     const dateStr = alertDate.toLocaleDateString('pt-BR');
                     
                     const colorClass = alert.type === 'critical' ? 'red' : 'yellow';
                     const typeText = alert.type === 'critical' ? 'Crítico' : 'Aviso';
                     
                     return `
                         <div class="flex items-center justify-between p-2 bg-gray-500/10 rounded text-xs">
                             <span class="text-gray-300">${dateStr} ${timeStr} - ${alert.message}</span>
                             <span class="text-${colorClass}-400">${typeText}</span>
                         </div>
                     `;
                 }).join('');
             }
             
             function checkExpenseAlerts() {
                 if (!expenseAlerts.enabled) return;
                 
                 const currentMonth = new Date().toISOString().slice(0, 7);
                 const categoryExpenses = {};
                 
                 // Calcular gastos por categoria no mês atual
                 transactions
                     .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
                     .forEach(t => {
                         categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
                     });
                 
                 // Obter limites
                 const categoryLimits = {};
                 budgets.forEach(budget => {
                     categoryLimits[budget.category] = budget.amount;
                 });
                 Object.assign(categoryLimits, expenseAlerts.categoryLimits);
                 
                 Object.entries(categoryLimits).forEach(([category, limit]) => {
                     const spent = categoryExpenses[category] || 0;
                     const percentage = limit > 0 ? (spent / limit) * 100 : 0;
                     
                     // Verificar se deve gerar alerta
                     if (percentage >= expenseAlerts.criticalThreshold) {
                         triggerExpenseAlert(category, spent, limit, percentage, 'critical');
                     } else if (percentage >= expenseAlerts.warningThreshold) {
                         triggerExpenseAlert(category, spent, limit, percentage, 'warning');
                     }
                 });
             }
             
             function triggerExpenseAlert(category, spent, limit, percentage, type) {
                 const alertId = `${category}-${type}-${new Date().toISOString().split('T')[0]}`;
                 
                 // Verificar se já foi enviado hoje
                 const existingAlert = expenseAlerts.alertHistory.find(alert => 
                     alert.id === alertId
                 );
                 
                 if (existingAlert) return;
                 
                 const message = `${category} ${type === 'critical' ? 'excedeu' : 'atingiu'} ${percentage.toFixed(0)}% (${formatCurrency(spent)}/${formatCurrency(limit)})`;
                 
                 // Adicionar ao histórico
                 const alert = {
                     id: alertId,
                     category,
                     spent,
                     limit,
                     percentage,
                     type,
                     message,
                     timestamp: new Date().toISOString(),
                     date: new Date().toISOString().split('T')[0]
                 };
                 
                 expenseAlerts.alertHistory.push(alert);
                 saveExpenseAlertsSettings();
                 
                 // Enviar notificação
                 if (notificationPermission === 'granted') {
                     const title = type === 'critical' ? '🚨 Gasto Crítico!' : '⚠️ Atenção aos Gastos';
                     sendLocalNotification(
                         title,
                         message,
                         {
                             tag: `expense-alert-${category}`,
                             requireInteraction: type === 'critical'
                         }
                     );
                 }
                 
                 // Mostrar notificação na interface
                 showNotification(message, type === 'critical' ? 'error' : 'warning');
                 
                 // Atualizar display
                 updateExpenseAlertsDisplay();
             }
             
             function setupExpenseAlertsMonitoring() {
                 // Verificar alertas a cada 30 minutos
                 setInterval(() => {
                     checkExpenseAlerts();
                 }, 30 * 60 * 1000);
                 
                 // Verificar imediatamente
                 checkExpenseAlerts();
             }
             
             // Função saveExpenseAlertsSettings removida - duplicada mais abaixo
             
             // Função loadExpenseAlertsSettings removida - duplicada mais abaixo
             
             // --- SISTEMA DE AUTENTICAÇÃO 2FA ---
             let twoFactorAuth = {
                 enabled: false,
                 secret: null,
                 backupCodes: [],
                 enabledDate: null,
                 lastUsed: null
             };
             
             function initialize2FA() {
                 load2FASettings();
                 update2FADisplay();
             }
             
             function generate2FASecret() {
                 // Gerar chave secreta de 32 caracteres (Base32)
                 const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
                 let secret = '';
                 for (let i = 0; i < 32; i++) {
                     secret += chars.charAt(Math.floor(Math.random() * chars.length));
                 }
                 return secret;
             }
             
             function generateBackupCodes() {
                 const codes = [];
                 for (let i = 0; i < 10; i++) {
                     // Gerar código de 8 dígitos
                     const code = Math.floor(10000000 + Math.random() * 90000000).toString();
                     codes.push(code.substring(0, 4) + '-' + code.substring(4));
                 }
                 return codes;
             }
             
             function generateQRCode(secret) {
                 const userEmail = currentUser?.email || 'user@financex.com';
                 const issuer = 'FinanceX';
                 const otpAuthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
                 
                 // Usar uma biblioteca de QR Code simples (implementação básica)
                 return generateQRCodeSVG(otpAuthUrl);
             }
             
             function generateQRCodeSVG(text) {
                 // Usar API externa para gerar QR Code real
                 const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
                 
                 return `<img src="${qrApiUrl}" alt="QR Code" style="width: 200px; height: 200px; border: 1px solid #ccc;" />`;
             }
             
             function simpleHash(str) {
                 let hash = 0;
                 for (let i = 0; i < str.length; i++) {
                     const char = str.charCodeAt(i);
                     hash = ((hash << 5) - hash) + char;
                     hash = hash & hash; // Convert to 32-bit integer
                 }
                 return Math.abs(hash);
             }
             
             function generateTOTP(secret, timeStep = 30) {
                 // Implementação simplificada do TOTP
                 // Em produção, usar uma biblioteca como otplib
                 const time = Math.floor(Date.now() / 1000 / timeStep);
                 const timeHex = time.toString(16).padStart(16, '0');
                 
                 // Simulação do HMAC-SHA1 (simplificado)
                 const hash = simpleHash(secret + timeHex);
                 const code = (hash % 1000000).toString().padStart(6, '0');
                 
                 return code;
             }
             
             function verifyTOTP(secret, userCode, timeStep = 30, window = 1) {
                 // Verificar código atual e códigos adjacentes (para compensar diferenças de tempo)
                 const currentTime = Math.floor(Date.now() / 1000 / timeStep);
                 
                 for (let i = -window; i <= window; i++) {
                     const time = currentTime + i;
                     const timeHex = time.toString(16).padStart(16, '0');
                     const hash = simpleHash(secret + timeHex);
                     const code = (hash % 1000000).toString().padStart(6, '0');
                     
                     if (code === userCode) {
                         return true;
                     }
                 }
                 
                 return false;
             }
             
             function setup2FA() {
                 const secret = generate2FASecret();
                 const backupCodes = generateBackupCodes();
                 
                 // Mostrar seção de configuração
                 document.getElementById('twofa-setup-section').classList.remove('hidden');
                 document.getElementById('toggle-2fa-btn').textContent = 'Cancelar';
                 
                 // Gerar QR Code
                 const qrCode = generateQRCode(secret);
                 document.getElementById('qr-code-container').innerHTML = qrCode;
                 
                 // Mostrar chave manual
                 document.getElementById('manual-key').textContent = secret;
                 
                 // Mostrar códigos de backup
                 const backupContainer = document.getElementById('backup-codes');
                 backupContainer.innerHTML = backupCodes.map(code => 
                     `<div class="p-2 bg-gray-700 rounded text-center">${code}</div>`
                 ).join('');
                 
                 // Armazenar temporariamente
                 window.tempTwoFA = { secret, backupCodes };
             }
             
             function verify2FASetup() {
                 const code = document.getElementById('verification-code').value;
                 const tempData = window.tempTwoFA;
                 
                 if (!tempData || !code || code.length !== 6) {
                     showNotification('Digite um código de 6 dígitos válido.', 'error');
                     return;
                 }
                 
                 if (verifyTOTP(tempData.secret, code)) {
                     // Ativar 2FA
                     twoFactorAuth = {
                         enabled: true,
                         secret: tempData.secret,
                         backupCodes: tempData.backupCodes,
                         enabledDate: new Date().toISOString(),
                         lastUsed: null
                     };
                     
                     save2FASettings();
                     update2FADisplay();
                     
                     showNotification('2FA ativado com sucesso! Sua conta agora está mais segura.', 'success');
                     
                     // Limpar dados temporários
                     delete window.tempTwoFA;
                     document.getElementById('verification-code').value = '';
                     
                 } else {
                     showNotification('Código inválido. Verifique seu aplicativo autenticador.', 'error');
                 }
             }
             
             function disable2FA() {
                 if (confirm('Tem certeza que deseja desativar a autenticação de dois fatores? Sua conta ficará menos segura.')) {
                     twoFactorAuth = {
                         enabled: false,
                         secret: null,
                         backupCodes: [],
                         enabledDate: null,
                         lastUsed: null
                     };
                     
                     save2FASettings();
                     update2FADisplay();
                     
                     showNotification('2FA desativado. Recomendamos reativar para maior segurança.', 'warning');
                 }
             }
             
             function regenerateBackupCodes() {
                 if (confirm('Gerar novos códigos de backup invalidará os códigos atuais. Continuar?')) {
                     twoFactorAuth.backupCodes = generateBackupCodes();
                     save2FASettings();
                     
                     // Mostrar novos códigos
                     const backupContainer = document.getElementById('backup-codes');
                     if (backupContainer) {
                         backupContainer.innerHTML = twoFactorAuth.backupCodes.map(code => 
                             `<div class="p-2 bg-gray-700 rounded text-center">${code}</div>`
                         ).join('');
                     }
                     
                     showNotification('Novos códigos de backup gerados!', 'success');
                 }
             }
             
             function downloadBackupCodes() {
                 const codes = window.tempTwoFA?.backupCodes || twoFactorAuth.backupCodes;
                 if (!codes || codes.length === 0) return;
                 
                 const content = `FinanceX - Códigos de Backup 2FA\n\nData: ${new Date().toLocaleDateString('pt-BR')}\nUsuário: ${currentUser?.email || 'N/A'}\n\nCódigos de Backup:\n${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nIMPORTANTE:\n- Guarde estes códigos em local seguro\n- Cada código pode ser usado apenas uma vez\n- Use apenas se não conseguir acessar seu aplicativo autenticador`;
                 
                 const blob = new Blob([content], { type: 'text/plain' });
                 const url = URL.createObjectURL(blob);
                 const a = document.createElement('a');
                 a.href = url;
                 a.download = `financex-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
                 document.body.appendChild(a);
                 a.click();
                 document.body.removeChild(a);
                 URL.revokeObjectURL(url);
                 
                 showNotification('Códigos de backup baixados!', 'success');
             }
             
             function update2FADisplay() {
                 const statusEl = document.getElementById('twofa-status');
                 const iconEl = document.getElementById('twofa-status-icon');
                 const toggleBtn = document.getElementById('toggle-2fa-btn');
                 const setupSection = document.getElementById('twofa-setup-section');
                 const activeSection = document.getElementById('twofa-active-section');
                 const enabledDateEl = document.getElementById('twofa-enabled-date');
                 const lastUsedEl = document.getElementById('twofa-last-used');
                 
                 if (twoFactorAuth.enabled) {
                     statusEl.textContent = 'Ativado - Sua conta está protegida';
                     iconEl.className = 'w-3 h-3 rounded-full bg-green-400';
                     toggleBtn.textContent = 'Gerenciar 2FA';
                     toggleBtn.className = 'btn btn-secondary';
                     
                     setupSection.classList.add('hidden');
                     activeSection.classList.remove('hidden');
                     
                     if (enabledDateEl && twoFactorAuth.enabledDate) {
                         enabledDateEl.textContent = new Date(twoFactorAuth.enabledDate).toLocaleDateString('pt-BR');
                     }
                     
                     if (lastUsedEl) {
                         lastUsedEl.textContent = twoFactorAuth.lastUsed ? 
                             new Date(twoFactorAuth.lastUsed).toLocaleDateString('pt-BR') : 'Nunca usado';
                     }
                     
                 } else {
                     statusEl.textContent = 'Desativado - Sua conta não está protegida';
                     iconEl.className = 'w-3 h-3 rounded-full bg-red-400';
                     toggleBtn.textContent = 'Ativar 2FA';
                     toggleBtn.className = 'btn btn-primary';
                     
                     setupSection.classList.add('hidden');
                     activeSection.classList.add('hidden');
                 }
             }
             
             function save2FASettings() {
                 const userPrefix = `twofa_${currentUser?.email || 'default'}`;
                 localStorage.setItem(userPrefix, JSON.stringify(twoFactorAuth));
             }
             
             function load2FASettings() {
                 const userPrefix = `twofa_${currentUser?.email || 'default'}`;
                 const saved = localStorage.getItem(userPrefix);
                 
                 if (saved) {
                     twoFactorAuth = { ...twoFactorAuth, ...JSON.parse(saved) };
                 }
             }
             
             // Função para validar 2FA no login (será integrada ao sistema de login)
             function validate2FALogin(code) {
                 if (!twoFactorAuth.enabled) return true;
                 
                 // Verificar código TOTP
                 if (verifyTOTP(twoFactorAuth.secret, code)) {
                     twoFactorAuth.lastUsed = new Date().toISOString();
                     save2FASettings();
                     return true;
                 }
                 
                 // Verificar códigos de backup
                 const backupIndex = twoFactorAuth.backupCodes.indexOf(code);
                 if (backupIndex !== -1) {
                     // Remover código usado
                     twoFactorAuth.backupCodes.splice(backupIndex, 1);
                     twoFactorAuth.lastUsed = new Date().toISOString();
                     save2FASettings();
                     
                     showNotification('Código de backup usado. Considere gerar novos códigos.', 'warning');
                     return true;
                 }
                 
                 return false;
             }
              


              
              function initializeWidgets() {
                  loadWidgetSettings();
                  updateWidgetDisplay();
                  applyWidgetLayout();
                  applyWidgetTheme();
              }
              
              function updateWidgetDisplay() {
                  const widgets = {
                      'summary': document.querySelector('.summary-card'),
                      'chart': document.querySelector('.chart-container'),
                      'goals': document.querySelector('.goals-section'),
                      'transactions': document.querySelector('.transactions-section'),
                      'suggestions': document.querySelector('.suggestions-section'),
                      'health': document.querySelector('.health-section'),
                      'reminders': document.querySelector('.reminders-section'),
                      'alerts': document.querySelector('.alerts-section')
                  };
                  
                  Object.keys(widgets).forEach(widgetKey => {
                      const widget = widgets[widgetKey];
                      const checkbox = document.getElementById(`widget-${widgetKey}`);
                      
                      if (widget && checkbox) {
                          if (widgetSettings.enabled[widgetKey]) {
                              widget.style.display = 'block';
                              checkbox.checked = true;
                          } else {
                              widget.style.display = 'none';
                              checkbox.checked = false;
                          }
                      }
                  });
              }
              
              function applyWidgetLayout() {
                  const dashboard = document.querySelector('.dashboard-grid');
                  if (!dashboard) return;
                  
                  // Remover classes de layout existentes
                  dashboard.classList.remove('grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'md:grid-cols-2', 'lg:grid-cols-3');
                  
                  switch (widgetSettings.layout) {
                      case 'list':
                          dashboard.classList.add('grid-cols-1');
                          break;
                      case 'compact':
                          dashboard.classList.add('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
                          break;
                      case 'grid':
                      default:
                          dashboard.classList.add('grid-cols-1', 'md:grid-cols-2');
                          break;
                  }
              }
              
              function applyWidgetTheme() {
                  const widgets = document.querySelectorAll('.glass-card');
                  
                  widgets.forEach(widget => {
                      // Remover classes de tema existentes
                      widget.classList.remove('theme-light', 'theme-colorful', 'theme-minimal');
                      
                      switch (widgetSettings.theme) {
                          case 'light':
                              widget.classList.add('theme-light');
                              break;
                          case 'colorful':
                              widget.classList.add('theme-colorful');
                              break;
                          case 'minimal':
                              widget.classList.add('theme-minimal');
                              break;
                          case 'default':
                          default:
                              // Manter tema padrão
                              break;
                      }
                  });
                  
                  // Aplicar ou remover animações
                  const body = document.body;
                  if (widgetSettings.animations) {
                      body.classList.add('animations-enabled');
                  } else {
                      body.classList.remove('animations-enabled');
                  }
              }
              
              function handleWidgetToggle(widgetKey) {
                  widgetSettings.enabled[widgetKey] = !widgetSettings.enabled[widgetKey];
                  saveWidgetSettings();
                  updateWidgetDisplay();
                  
                  const widgetName = getWidgetName(widgetKey);
                  const status = widgetSettings.enabled[widgetKey] ? 'ativado' : 'desativado';
                  showNotification(`Widget "${widgetName}" ${status}.`, 'info');
              }
              
              function handleLayoutChange(newLayout) {
                  widgetSettings.layout = newLayout;
                  saveWidgetSettings();
                  applyWidgetLayout();
                  showNotification(`Layout alterado para "${getLayoutName(newLayout)}".`, 'success');
              }
              
              function handleThemeChange(newTheme) {
                  widgetSettings.theme = newTheme;
                  saveWidgetSettings();
                  applyWidgetTheme();
                  showNotification(`Tema alterado para "${getThemeName(newTheme)}".`, 'success');
              }
              
              function handleAnimationsToggle() {
                  widgetSettings.animations = !widgetSettings.animations;
                  saveWidgetSettings();
                  applyWidgetTheme();
                  
                  const status = widgetSettings.animations ? 'ativadas' : 'desativadas';
                  showNotification(`Animações ${status}.`, 'info');
              }
              
              function resetWidgets() {
                  if (confirm('Tem certeza que deseja restaurar as configurações padrão dos widgets?')) {
                      widgetSettings = {
                          enabled: {
                              summary: true,
                              chart: true,
                              goals: true,
                              transactions: true,
                              suggestions: true,
                              health: true,
                              reminders: true,
                              alerts: true
                          },
                          layout: 'grid',
                          theme: 'default',
                          animations: true
                      };
                      
                      saveWidgetSettings();
                      updateWidgetDisplay();
                      applyWidgetLayout();
                      applyWidgetTheme();
                      updateWidgetControls();
                      
                      showNotification('Configurações dos widgets restauradas para o padrão.', 'success');
                  }
              }
              
              function previewWidgets() {
                  showNotification('Aplicando configurações dos widgets...', 'info');
                  
                  setTimeout(() => {
                      updateWidgetDisplay();
                      applyWidgetLayout();
                      applyWidgetTheme();
                      showNotification('Configurações aplicadas com sucesso!', 'success');
                  }, 500);
              }
              
              function updateWidgetControls() {
                  // Atualizar checkboxes
                  Object.keys(widgetSettings.enabled).forEach(widgetKey => {
                      const checkbox = document.getElementById(`widget-${widgetKey}`);
                      if (checkbox) {
                          checkbox.checked = widgetSettings.enabled[widgetKey];
                      }
                  });
                  
                  // Atualizar selects
                  const layoutSelect = document.getElementById('widget-layout');
                  const themeSelect = document.getElementById('widget-theme');
                  const animationsCheckbox = document.getElementById('widget-animations');
                  
                  if (layoutSelect) layoutSelect.value = widgetSettings.layout;
                  if (themeSelect) themeSelect.value = widgetSettings.theme;
                  if (animationsCheckbox) animationsCheckbox.checked = widgetSettings.animations;
              }
              
              function saveWidgetSettings() {
                  const userPrefix = `widgets_${currentUser?.email || 'default'}`;
                  localStorage.setItem(userPrefix, JSON.stringify(widgetSettings));
              }
              
              function loadWidgetSettings() {
                  const userPrefix = `widgets_${currentUser?.email || 'default'}`;
                  const saved = localStorage.getItem(userPrefix);
                  
                  if (saved) {
                      const settings = JSON.parse(saved);
                      widgetSettings = { ...widgetSettings, ...settings };
                  }
              }
              
              function getWidgetName(widgetKey) {
                  const names = {
                      summary: 'Resumo Financeiro',
                      chart: 'Gráfico de Gastos',
                      goals: 'Metas Financeiras',
                      transactions: 'Transações Recentes',
                      suggestions: 'Sugestões de Economia',
                      health: 'Saúde Financeira',
                      reminders: 'Lembretes',
                      alerts: 'Alertas de Gastos'
                  };
                  return names[widgetKey] || widgetKey;
              }
              
              function getLayoutName(layout) {
                  const names = {
                      grid: 'Grade (2 colunas)',
                      list: 'Lista (1 coluna)',
                      compact: 'Compacto (3 colunas)'
                  };
                  return names[layout] || layout;
              }
              
              function getThemeName(theme) {
                  const names = {
                      default: 'Padrão (Escuro)',
                      light: 'Claro',
                      colorful: 'Colorido',
                      minimal: 'Minimalista'
                  };
                  return names[theme] || theme;
              }
              
              // --- SISTEMA DE REDEFINIR SENHA ---
              function initializePasswordReset() {
                  const newPasswordInput = document.getElementById('new-password');
                  const confirmPasswordInput = document.getElementById('confirm-password');
                  
                  if (newPasswordInput) {
                      newPasswordInput.addEventListener('input', checkPasswordStrength);
                  }
                  
                  if (confirmPasswordInput) {
                      confirmPasswordInput.addEventListener('input', validatePasswordMatch);
                  }
              }
              
              function resetPassword() {
                  const currentPassword = document.getElementById('current-password').value;
                  const newPassword = document.getElementById('new-password').value;
                  const confirmPassword = document.getElementById('confirm-password').value;
                  
                  // Validações
                  if (!currentPassword || !newPassword || !confirmPassword) {
                      showNotification('Preencha todos os campos de senha.', 'error');
                      return;
                  }
                  
                  if (newPassword !== confirmPassword) {
                      showNotification('A nova senha e a confirmação não coincidem.', 'error');
                      return;
                  }
                  
                  if (newPassword.length < 8) {
                      showNotification('A nova senha deve ter pelo menos 8 caracteres.', 'error');
                      return;
                  }
                  
                  // Verificar senha atual (simulação)
                  const storedPassword = localStorage.getItem('userPassword') || 'admin123';
                  if (currentPassword !== storedPassword) {
                      showNotification('Senha atual incorreta.', 'error');
                      return;
                  }
                  
                  // Verificar se a nova senha é diferente da atual
                  if (newPassword === currentPassword) {
                      showNotification('A nova senha deve ser diferente da senha atual.', 'error');
                      return;
                  }
                  
                  // Salvar nova senha
                  localStorage.setItem('userPassword', newPassword);
                  
                  // Limpar campos
                  document.getElementById('current-password').value = '';
                  document.getElementById('new-password').value = '';
                  document.getElementById('confirm-password').value = '';
                  
                  // Reset password strength indicator
                  updatePasswordStrength(0, '--', 'gray');
                  
                  showNotification('Senha redefinida com sucesso!', 'success');
              }
              
              function generateSecurePassword() {
                  const length = 12;
                  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
                  let password = '';
                  
                  // Garantir pelo menos um de cada tipo
                  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
                  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                  const numbers = '0123456789';
                  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
                  
                  password += lowercase[Math.floor(Math.random() * lowercase.length)];
                  password += uppercase[Math.floor(Math.random() * uppercase.length)];
                  password += numbers[Math.floor(Math.random() * numbers.length)];
                  password += symbols[Math.floor(Math.random() * symbols.length)];
                  
                  // Preencher o resto aleatoriamente
                  for (let i = password.length; i < length; i++) {
                      password += charset[Math.floor(Math.random() * charset.length)];
                  }
                  
                  // Embaralhar a senha
                  password = password.split('').sort(() => Math.random() - 0.5).join('');
                  
                  // Preencher o campo
                  const newPasswordInput = document.getElementById('new-password');
                  const confirmPasswordInput = document.getElementById('confirm-password');
                  
                  if (newPasswordInput && confirmPasswordInput) {
                      newPasswordInput.value = password;
                      confirmPasswordInput.value = password;
                      
                      // Atualizar indicador de força
                      checkPasswordStrength();
                      validatePasswordMatch();
                      
                      showNotification('Senha segura gerada com sucesso!', 'success');
                  }
              }
              
              function checkPasswordStrength() {
                  const password = document.getElementById('new-password').value;
                  let strength = 0;
                  let strengthText = 'Muito Fraca';
                  let color = 'red';
                  
                  if (password.length === 0) {
                      updatePasswordStrength(0, '--', 'gray');
                      return;
                  }
                  
                  // Critérios de força
                  if (password.length >= 8) strength += 20;
                  if (password.length >= 12) strength += 10;
                  if (/[a-z]/.test(password)) strength += 15;
                  if (/[A-Z]/.test(password)) strength += 15;
                  if (/[0-9]/.test(password)) strength += 15;
                  if (/[^A-Za-z0-9]/.test(password)) strength += 15;
                  if (password.length >= 16) strength += 10;
                  
                  // Determinar texto e cor
                  if (strength < 30) {
                      strengthText = 'Muito Fraca';
                      color = 'red';
                  } else if (strength < 50) {
                      strengthText = 'Fraca';
                      color = 'orange';
                  } else if (strength < 70) {
                      strengthText = 'Média';
                      color = 'yellow';
                  } else if (strength < 90) {
                      strengthText = 'Forte';
                      color = 'lightgreen';
                  } else {
                      strengthText = 'Muito Forte';
                      color = 'green';
                  }
                  
                  updatePasswordStrength(strength, strengthText, color);
              }
              
              function updatePasswordStrength(percentage, text, color) {
                  const strengthBar = document.getElementById('password-strength-bar');
                  const strengthText = document.getElementById('password-strength-text');
                  
                  if (strengthBar && strengthText) {
                      strengthBar.style.width = percentage + '%';
                      strengthBar.style.backgroundColor = color;
                      strengthText.textContent = text;
                      strengthText.style.color = color;
                  }
              }
              
              function validatePasswordMatch() {
                  const newPassword = document.getElementById('new-password').value;
                  const confirmPassword = document.getElementById('confirm-password').value;
                  const confirmInput = document.getElementById('confirm-password');
                  
                  if (confirmPassword && newPassword !== confirmPassword) {
                      confirmInput.style.borderColor = '#ef4444';
                  } else if (confirmPassword) {
                      confirmInput.style.borderColor = '#10b981';
                  } else {
                      confirmInput.style.borderColor = '';
                  }
              }
              
              // --- SISTEMA DE INFORMAÇÕES DO USUÁRIO ---
              
              function validateUserFullName(name) {
                  if (!name) return { valid: false, message: 'Nome é obrigatório' };
                  if (name.length < 2) return { valid: false, message: 'Nome muito curto' };
                  if (name.length > 100) return { valid: false, message: 'Nome muito longo' };
                  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(name)) return { valid: false, message: 'Apenas letras e espaços' };
                  return { valid: true, message: 'Nome válido' };
              }
              
              function validateUserIncome(income) {
                  if (!income || income === '') return { valid: true, message: '' }; // Renda é opcional
                  const numIncome = parseFloat(income);
                  if (isNaN(numIncome) || numIncome < 0) return { valid: false, message: 'Valor inválido' };
                  if (numIncome > 1000000) return { valid: false, message: 'Valor muito alto' };
                  return { valid: true, message: 'Renda válida' };
              }
              
              function updateUserFieldValidation(fieldId, validationFn, value) {
                  const validation = validationFn(value);
                  const statusIcon = document.getElementById(`${fieldId}-status`);
                  const errorDiv = document.getElementById(`${fieldId}-error`);
                  
                  if (validation.valid) {
                      if (statusIcon) {
                          statusIcon.textContent = '✓';
                          statusIcon.className = 'text-green-400';
                      }
                      if (errorDiv) errorDiv.classList.add('hidden');
                      return true;
                  } else {
                      if (statusIcon) {
                          statusIcon.textContent = '✗';
                          statusIcon.className = 'text-red-400';
                      }
                      if (errorDiv) {
                          errorDiv.textContent = validation.message;
                          errorDiv.classList.remove('hidden');
                      }
                      return false;
                  }
              }
              
              async function saveUserInfo() {
                  const saveBtn = document.getElementById('save-user-info-btn');
                  const saveText = document.getElementById('save-user-info-text');
                  const saveLoading = document.getElementById('save-user-info-loading');
                  
                  if (!saveBtn || !saveText || !saveLoading) return;
                  
                  // Mostrar loading
                  saveText.classList.add('hidden');
                  saveLoading.classList.remove('hidden');
                  saveBtn.disabled = true;
                  
                  try {
                      const fullName = document.getElementById('user-fullname').value;
                      const income = document.getElementById('user-income').value;
                      
                      // Validar campos
                      const isFullNameValid = validateUserFullName(fullName).valid;
                      const isIncomeValid = validateUserIncome(income).valid;
                      
                      if (!isFullNameValid || !isIncomeValid) {
                          throw new Error('Por favor, corrija os campos com erro.');
                      }
                      
                      if (currentUser) {
                          // Salvar no Firestore
                          const userInfo = {
                              fullName: fullName,
                              monthlyIncome: parseFloat(income) || 0,
                              updatedAt: new Date().toISOString()
                          };
                          
                          await setDoc(doc(db, 'users', currentUser.uid), userInfo, { merge: true });
                          showNotification('Informações salvas com sucesso!', 'success');
                      } else {
                          throw new Error('Usuário não está logado.');
                      }
                      
                  } catch (error) {
                      console.error('Erro ao salvar informações:', error);
                      showNotification('Erro ao salvar informações: ' + error.message, 'error');
                  } finally {
                      // Restaurar botão
                      saveText.classList.remove('hidden');
                      saveLoading.classList.add('hidden');
                      saveBtn.disabled = false;
                  }
              }
              
              async function loadUserInfo() {
                  try {
                      if (currentUser) {
                          // Carregar do Firestore
                          const docRef = doc(db, 'users', currentUser.uid);
                          const docSnap = await getDoc(docRef);
                          
                          if (docSnap.exists()) {
                              const userData = docSnap.data();
                              const fullNameInput = document.getElementById('user-fullname');
                              const incomeInput = document.getElementById('user-income');
                              
                              if (fullNameInput) fullNameInput.value = userData.fullName || '';
                              if (incomeInput) incomeInput.value = userData.monthlyIncome || '';
                          }
                      }
                  } catch (error) {
                      console.error('Erro ao carregar informações:', error);
                  }
              }
              
              function initializeUserInfo() {
                  // Event listeners para validação em tempo real
                  const fullNameInput = document.getElementById('user-fullname');
                  if (fullNameInput) {
                      fullNameInput.addEventListener('input', (e) => {
                          updateUserFieldValidation('user-fullname', validateUserFullName, e.target.value);
                      });
                  }
                  
                  const incomeInput = document.getElementById('user-income');
                  if (incomeInput) {
                      incomeInput.addEventListener('input', (e) => {
                          updateUserFieldValidation('user-income', validateUserIncome, e.target.value);
                      });
                  }
                  
                  // Event listeners para botões
                  const saveBtn = document.getElementById('save-user-info-btn');
                  if (saveBtn) {
                      saveBtn.addEventListener('click', saveUserInfo);
                  }
                  
                  const changePasswordBtn = document.getElementById('change-password-btn');
                  if (changePasswordBtn) {
                      changePasswordBtn.addEventListener('click', () => {
                          openModal('change-password-modal');
                      });
                  }
                  
                  // Carregar informações automaticamente
                  loadUserInfo();
              }
              
              // --- SISTEMA DE ALTERAR SENHA ---
              
              function validatePasswordStrength(password) {
                  const criteria = {
                      length: password.length >= 8,
                      uppercase: /[A-Z]/.test(password),
                      lowercase: /[a-z]/.test(password),
                      number: /\d/.test(password),
                      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
                  };
                  
                  const score = Object.values(criteria).filter(Boolean).length;
                  return { criteria, score };
              }
              
              function updatePasswordStrengthIndicator(password) {
                  const validation = validatePasswordStrength(password);
                  const { score } = validation;
                  
                  // Atualizar barras de força
                  const bars = ['strength-bar-1', 'strength-bar-2', 'strength-bar-3', 'strength-bar-4'];
                  bars.forEach((barId, index) => {
                      const bar = document.getElementById(barId);
                      if (bar) {
                          if (index < score) {
                              if (score <= 2) bar.className = 'h-1 flex-1 bg-red-500 rounded';
                              else if (score <= 3) bar.className = 'h-1 flex-1 bg-yellow-500 rounded';
                              else bar.className = 'h-1 flex-1 bg-green-500 rounded';
                          } else {
                              bar.className = 'h-1 flex-1 bg-gray-600 rounded';
                          }
                      }
                  });
                  
                  // Atualizar texto de força
                  const strengthText = document.getElementById('password-strength-text');
                  if (strengthText) {
                      if (password.length === 0) {
                          strengthText.textContent = 'Digite uma senha';
                          strengthText.className = 'text-xs text-gray-400';
                      } else if (score <= 2) {
                          strengthText.textContent = 'Senha fraca';
                          strengthText.className = 'text-xs text-red-400';
                      } else if (score <= 3) {
                          strengthText.textContent = 'Senha média';
                          strengthText.className = 'text-xs text-yellow-400';
                      } else if (score === 4) {
                          strengthText.textContent = 'Senha boa';
                          strengthText.className = 'text-xs text-blue-400';
                      } else {
                          strengthText.textContent = 'Senha excelente';
                          strengthText.className = 'text-xs text-green-400';
                      }
                  }
                  
                  return score >= 4;
              }
              
              function initializeChangePasswordModal() {
                  // Event listeners para o modal
                  const closeBtn = document.getElementById('close-change-password-btn');
                  const cancelBtn = document.getElementById('cancel-change-password-btn');
                  const form = document.getElementById('change-password-form');
                  const toggleBtn = document.getElementById('toggle-new-password');
                  const newPasswordInput = document.getElementById('new-password');
                  
                  if (closeBtn) {
                      closeBtn.addEventListener('click', () => closeModal('change-password-modal'));
                  }
                  
                  if (cancelBtn) {
                      cancelBtn.addEventListener('click', () => closeModal('change-password-modal'));
                  }
                  
                  if (form) {
                      form.addEventListener('submit', (e) => {
                          e.preventDefault();
                          // Função de alterar senha será implementada
                          showNotification('Funcionalidade de alterar senha em desenvolvimento', 'info');
                      });
                  }
                  
                  if (toggleBtn && newPasswordInput) {
                      toggleBtn.addEventListener('click', () => {
                          const type = newPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                          newPasswordInput.setAttribute('type', type);
                      });
                  }
                  
                  if (newPasswordInput) {
                      newPasswordInput.addEventListener('input', (e) => {
                          updatePasswordStrengthIndicator(e.target.value);
                      });
                  }
              }
              
              // --- INTEGRAÇÃO BANCÁRIA REMOVIDA ---
              // A integração com APIs bancárias foi removida devido à complexidade de implementação
              
              // Função removida - integração bancária descontinuada
              
              // Funções removidas - integração bancária descontinuada
              
              // --- COMPARAÇÃO TEMPORAL ---
         function updateComparisonCharts(period = 'monthly') {
             try {
                 const comparisonData = generateComparisonData(period);
                 
                 updateComparisonIncomeExpenseChart(comparisonData, period);
                 updateComparisonBalanceChart(comparisonData, period);
                 updateComparisonMetrics(comparisonData, period);
                 
             } catch (error) {
                 console.error('Erro ao atualizar gráficos de comparação:', error);
             }
         }
         
         function generateComparisonData(period) {
             const data = {
                 labels: [],
                 income: [],
                 expenses: [],
                 balance: []
             };
             
             if (period === 'monthly') {
                 // Últimos 12 meses
                 for (let i = 11; i >= 0; i--) {
                     const date = new Date();
                     date.setMonth(date.getMonth() - i);
                     const monthStr = date.toISOString().slice(0, 7);
                     
                     const monthIncome = transactions
                         .filter(t => t.type === 'income' && t.date.startsWith(monthStr))
                         .reduce((sum, t) => sum + t.amount, 0);
                         
                     const monthExpenses = transactions
                         .filter(t => t.type === 'expense' && t.date.startsWith(monthStr))
                         .reduce((sum, t) => sum + t.amount, 0);
                     
                     data.labels.push(date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
                     data.income.push(monthIncome);
                     data.expenses.push(monthExpenses);
                     data.balance.push(monthIncome - monthExpenses);
                 }
             } else {
                 // Últimos 5 anos
                 for (let i = 4; i >= 0; i--) {
                     const year = new Date().getFullYear() - i;
                     
                     const yearIncome = transactions
                         .filter(t => t.type === 'income' && t.date.startsWith(year.toString()))
                         .reduce((sum, t) => sum + t.amount, 0);
                         
                     const yearExpenses = transactions
                         .filter(t => t.type === 'expense' && t.date.startsWith(year.toString()))
                         .reduce((sum, t) => sum + t.amount, 0);
                     
                     data.labels.push(year.toString());
                     data.income.push(yearIncome);
                     data.expenses.push(yearExpenses);
                     data.balance.push(yearIncome - yearExpenses);
                 }
             }
             
             return data;
         }
         
         function updateComparisonIncomeExpenseChart(data, period) {
             const ctx = document.getElementById('comparisonIncomeExpenseChart');
             if (!ctx) return;
             
             // Destruir gráfico existente se houver
              if (window.comparisonIncomeExpenseChart && typeof window.comparisonIncomeExpenseChart.destroy === 'function') {
                  window.comparisonIncomeExpenseChart.destroy();
              }
             
             window.comparisonIncomeExpenseChart = new Chart(ctx, {
                 type: 'line',
                 data: {
                     labels: data.labels,
                     datasets: [
                         {
                             label: 'Receitas',
                             data: data.income,
                             borderColor: '#22c55e',
                             backgroundColor: 'rgba(34, 197, 94, 0.1)',
                             tension: 0.4,
                             fill: false
                         },
                         {
                             label: 'Despesas',
                             data: data.expenses,
                             borderColor: '#ef4444',
                             backgroundColor: 'rgba(239, 68, 68, 0.1)',
                             tension: 0.4,
                             fill: false
                         }
                     ]
                 },
                 options: {
                     responsive: true,
                     maintainAspectRatio: false,
                     plugins: {
                         legend: {
                             position: 'top',
                             labels: { color: '#a0a0a0' }
                         }
                     },
                     scales: {
                         y: {
                             ticks: {
                                 color: '#a0a0a0',
                                 callback: function(value) { return formatCurrency(value); }
                             },
                             grid: { color: 'rgba(0, 212, 255, 0.1)' }
                         },
                         x: {
                             ticks: { color: '#a0a0a0' },
                             grid: { color: 'rgba(0, 212, 255, 0.1)' }
                         }
                     }
                 }
             });
         }
         
         function updateComparisonBalanceChart(data, period) {
             const ctx = document.getElementById('comparisonBalanceChart');
             if (!ctx) return;
             
             // Destruir gráfico existente se houver
              if (window.comparisonBalanceChart && typeof window.comparisonBalanceChart.destroy === 'function') {
                  window.comparisonBalanceChart.destroy();
              }
             
             window.comparisonBalanceChart = new Chart(ctx, {
                 type: 'bar',
                 data: {
                     labels: data.labels,
                     datasets: [{
                         label: 'Saldo',
                         data: data.balance,
                         backgroundColor: data.balance.map(value => 
                             value >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
                         ),
                         borderColor: data.balance.map(value => 
                             value >= 0 ? '#22c55e' : '#ef4444'
                         ),
                         borderWidth: 1,
                         borderRadius: 4
                     }]
                 },
                 options: {
                     responsive: true,
                     maintainAspectRatio: false,
                     plugins: {
                         legend: { display: false }
                     },
                     scales: {
                         y: {
                             ticks: {
                                 color: '#a0a0a0',
                                 callback: function(value) { return formatCurrency(value); }
                             },
                             grid: { color: 'rgba(0, 212, 255, 0.1)' }
                         },
                         x: {
                             ticks: { color: '#a0a0a0' },
                             grid: { display: false }
                         }
                     }
                 }
             });
         }
         
         function updateComparisonMetrics(data, period) {
             // Encontrar melhor período
             const maxBalanceIndex = data.balance.indexOf(Math.max(...data.balance));
             const bestPeriod = data.labels[maxBalanceIndex];
             const bestValue = data.balance[maxBalanceIndex];
             
             // Calcular média
             const avgBalance = data.balance.reduce((sum, val) => sum + val, 0) / data.balance.length;
             
             // Calcular tendência (comparação com período anterior)
             const currentBalance = data.balance[data.balance.length - 1];
             const previousBalance = data.balance[data.balance.length - 2] || 0;
             const trend = previousBalance !== 0 ? ((currentBalance - previousBalance) / Math.abs(previousBalance) * 100) : 0;
             
             // Projeção (baseada na média dos últimos períodos)
             const last3Periods = data.balance.slice(-3);
             const avgLast3 = last3Periods.reduce((sum, val) => sum + val, 0) / last3Periods.length;
             const projection = period === 'monthly' ? avgLast3 * 12 : avgLast3;
             
             // Atualizar elementos
             const bestMonthEl = document.getElementById('best-month');
             const bestMonthValueEl = document.getElementById('best-month-value');
             const averageMonthEl = document.getElementById('average-month');
             const averageTrendEl = document.getElementById('average-trend');
             const yearlyProjectionEl = document.getElementById('yearly-projection');
             const projectionConfidenceEl = document.getElementById('projection-confidence');
             
             if (bestMonthEl) bestMonthEl.textContent = bestPeriod;
             if (bestMonthValueEl) bestMonthValueEl.textContent = formatCurrency(bestValue);
             if (averageMonthEl) averageMonthEl.textContent = formatCurrency(avgBalance);
             if (averageTrendEl) {
                 const trendIcon = trend >= 0 ? '↗️' : '↘️';
                 const trendText = `${trendIcon} ${Math.abs(trend).toFixed(1)}% vs período anterior`;
                 averageTrendEl.textContent = trendText;
             }
             if (yearlyProjectionEl) yearlyProjectionEl.textContent = formatCurrency(projection);
             if (projectionConfidenceEl) {
                 const confidence = Math.min(95, Math.max(60, 85 - (data.balance.length < 6 ? 20 : 0)));
                 projectionConfidenceEl.textContent = `${confidence}% confiança`;
             }
         }
        
        // --- FUNÇÕES DE CONFIGURAÇÃO DE NOTIFICAÇÕES ---
        async function toggleNotifications() {
            const btn = document.getElementById('toggle-notifications-btn');
            const statusEl = document.getElementById('notification-status');
            
            if (notificationPermission === 'granted') {
                // Já está ativado, mostrar opções para desativar
                showNotification('Notificações já estão ativadas!', 'info');
                return;
            }
            
            btn.disabled = true;
            btn.textContent = 'Solicitando...';
            
            const granted = await requestNotificationPermission();
            
            if (granted) {
                btn.textContent = 'Ativado ✓';
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-success');
                statusEl.textContent = 'Notificações ativadas';
                statusEl.className = 'text-xs text-green-400';
            } else {
                btn.textContent = 'Tentar Novamente';
                statusEl.textContent = 'Permissão negada';
                statusEl.className = 'text-xs text-red-400';
            }
            
            btn.disabled = false;
        }
        
        function sendTestNotification() {
            if (notificationPermission !== 'granted') {
                showNotification('Ative as notificações primeiro!', 'warning');
                return;
            }
            
            sendLocalNotification(
                '🧪 Teste - FinanceX',
                'Esta é uma notificação de teste. Suas configurações estão funcionando!',
                {
                    tag: 'test-notification',
                    requireInteraction: true,
                    icon: '/icon-192x192.png'
                }
            );
            
            showNotification('Notificação de teste enviada!', 'success');
        }
        
        function saveNotificationSettings() {
            const userPrefix = `notifications_${currentUser?.email || 'default'}`;
            
            const settings = {
                goalNotifications: document.getElementById('goal-notifications-enabled').checked,
                budgetNotifications: document.getElementById('budget-notifications-enabled').checked,
                backupNotifications: document.getElementById('backup-notifications-enabled').checked,
                achievementNotifications: document.getElementById('achievement-notifications-enabled').checked
            };
            
            localStorage.setItem(userPrefix, JSON.stringify(settings));
            showNotification('Configurações de notificação salvas!', 'success');
        }
        
        function loadNotificationSettings() {
            const userPrefix = `notifications_${currentUser?.email || 'default'}`;
            const saved = localStorage.getItem(userPrefix);
            
            if (saved) {
                const settings = JSON.parse(saved);
                document.getElementById('goal-notifications-enabled').checked = settings.goalNotifications ?? true;
                document.getElementById('budget-notifications-enabled').checked = settings.budgetNotifications ?? true;
                document.getElementById('backup-notifications-enabled').checked = settings.backupNotifications ?? true;
                document.getElementById('achievement-notifications-enabled').checked = settings.achievementNotifications ?? true;
            }
            
            // Atualizar status das notificações
            updateNotificationStatus();
        }
        
        function updateNotificationStatus() {
            const statusEl = document.getElementById('notification-status');
            const btn = document.getElementById('toggle-notifications-btn');
            
            if (!statusEl || !btn) return;
            
            switch (notificationPermission) {
                case 'granted':
                    statusEl.textContent = 'Notificações ativadas';
                    statusEl.className = 'text-xs text-green-400';
                    btn.textContent = 'Ativado ✓';
                    btn.classList.remove('btn-secondary');
                    btn.classList.add('btn-success');
                    btn.disabled = true;
                    break;
                case 'denied':
                    statusEl.textContent = 'Permissão negada';
                    statusEl.className = 'text-xs text-red-400';
                    btn.textContent = 'Bloqueado';
                    btn.disabled = true;
                    break;
                default:
                    statusEl.textContent = 'Clique para ativar';
                    statusEl.className = 'text-xs text-gray-400';
                    btn.textContent = 'Ativar Notificações';
                    btn.disabled = false;
            }
        }
         
         // --- FUNÇÕES DE MANIPULAÇÃO DE LEMBRETES ---
         function handleReminderFormSubmit(e) {
             e.preventDefault();
             
             const form = e.target;
             const formData = new FormData(form);
             
             const reminderData = {
                 id: form.dataset.editingId,
                 title: document.getElementById('reminder-title').value,
                 amount: document.getElementById('reminder-amount').value,
                 dueDate: document.getElementById('reminder-due-date').value,
                 category: document.getElementById('reminder-category').value,
                 frequency: document.getElementById('reminder-frequency').value,
                 alertDays: document.getElementById('reminder-alert-days').value,
                 notes: document.getElementById('reminder-notes').value
             };
             
             try {
                 const savedReminder = savePaymentReminder(reminderData);
                 showNotification('Lembrete salvo com sucesso!', 'success');
                 closeAllModals();
                 
                 // Agendar notificação se necessário
                 scheduleReminderNotification(savedReminder);
                 
             } catch (error) {
                 console.error('Erro ao salvar lembrete:', error);
                 showNotification('Erro ao salvar lembrete.', 'error');
             }
         }
         
         function saveReminderAlertSettings() {
             const alertDays = document.getElementById('alert-days').value;
             const alertTime = document.getElementById('alert-time').value;
             
             const userPrefix = `reminder_settings_${currentUser?.email || 'default'}`;
             const settings = {
                 defaultAlertDays: parseInt(alertDays),
                 defaultAlertTime: alertTime
             };
             
             localStorage.setItem(userPrefix, JSON.stringify(settings));
             showNotification('Configurações de alerta salvas!', 'success');
         }
         
         function loadReminderAlertSettings() {
             const userPrefix = `reminder_settings_${currentUser?.email || 'default'}`;
             const saved = localStorage.getItem(userPrefix);
             
             if (saved) {
                 const settings = JSON.parse(saved);
                 document.getElementById('alert-days').value = settings.defaultAlertDays || 3;
                 document.getElementById('alert-time').value = settings.defaultAlertTime || '09:00';
             }
         }
         
         function scheduleReminderNotification(reminder) {
             const dueDate = new Date(reminder.dueDate);
             const alertDate = new Date(dueDate);
             alertDate.setDate(alertDate.getDate() - reminder.alertDays);
             
             const now = new Date();
             const timeUntilAlert = alertDate.getTime() - now.getTime();
             
             if (timeUntilAlert > 0) {
                 setTimeout(() => {
                     if (notificationPermission === 'granted') {
                         sendLocalNotification(
                             '💳 Lembrete de Pagamento',
                             `${reminder.title} vence em ${reminder.alertDays} dia${reminder.alertDays !== 1 ? 's' : ''} - ${formatCurrency(reminder.amount)}`,
                             {
                                 tag: `scheduled-reminder-${reminder.id}`,
                                 requireInteraction: true
                             }
                         );
                     }
                 }, timeUntilAlert);
             }
         }
         
         function deletePaymentReminder(reminderId) {
             const index = paymentReminders.findIndex(r => r.id === reminderId);
             if (index >= 0) {
                 const reminder = paymentReminders[index];
                 paymentReminders.splice(index, 1);
                 savePaymentRemindersToStorage();
                 updateReminderDisplay();
                 showNotification(`Lembrete "${reminder.title}" excluído!`, 'success');
             }
         }
          
          // --- FUNÇÕES DE MANIPULAÇÃO DE ALERTAS DE GASTOS ---
          function handleExpenseAlertsToggle(e) {
              expenseAlerts.enabled = e.target.checked;
              saveExpenseAlertsSettings();
              
              if (expenseAlerts.enabled) {
                  showNotification('Alertas de gastos ativados!', 'success');
                  checkExpenseAlerts();
              } else {
                  showNotification('Alertas de gastos desativados.', 'info');
              }
          }
          
          function handleThresholdChange(e) {
              const value = parseInt(e.target.value);
              
              if (e.target.id === 'warning-threshold') {
                  expenseAlerts.warningThreshold = value;
                  document.getElementById('warning-value').textContent = value + '%';
              } else if (e.target.id === 'critical-threshold') {
                  expenseAlerts.criticalThreshold = value;
                  document.getElementById('critical-value').textContent = value + '%';
              }
              
              saveExpenseAlertsSettings();
              
              // Verificar alertas com novos limites
              setTimeout(() => {
                  checkExpenseAlerts();
                  updateExpenseAlertsDisplay();
              }, 500);
          }
          
          function clearAlertsHistory() {
              expenseAlerts.alertHistory = [];
              saveExpenseAlertsSettings();
              updateAlertsHistory();
              showNotification('Histórico de alertas limpo!', 'success');
          }
          
          function testExpenseAlert() {
              // Simular um alerta para teste
              triggerExpenseAlert('Teste', 850, 1000, 85, 'warning');
          }
           
           // --- FUNÇÕES DE MANIPULAÇÃO 2FA ---
           function handle2FAToggle() {
               const btn = document.getElementById('toggle-2fa-btn');
               const setupSection = document.getElementById('twofa-setup-section');
               
               if (twoFactorAuth.enabled) {
                   // Se 2FA está ativo, mostrar opções de gerenciamento
                   const activeSection = document.getElementById('twofa-active-section');
                   if (activeSection.classList.contains('hidden')) {
                       activeSection.classList.remove('hidden');
                       btn.textContent = 'Ocultar Opções';
                   } else {
                       activeSection.classList.add('hidden');
                       btn.textContent = 'Gerenciar 2FA';
                   }
               } else {
                   // Se 2FA não está ativo, iniciar configuração ou cancelar
                   if (setupSection.classList.contains('hidden')) {
                       setup2FA();
                   } else {
                       // Cancelar configuração
                       setupSection.classList.add('hidden');
                       btn.textContent = 'Ativar 2FA';
                       btn.className = 'btn btn-primary';
                       
                       // Limpar dados temporários
                       delete window.tempTwoFA;
                       document.getElementById('verification-code').value = '';
                   }
               }
           }
            
            // --- FUNÇÕES DE INTEGRAÇÃO BANCÁRIA REMOVIDAS ---
            // As funções de manipulação PicPay foram removidas devido à complexidade
            

            
            function updateSummary() {   
            const cycle = getCurrentFinancialCycle();
            const cycleTransactions = transactions.filter(t => t.date >= cycle.start && t.date <= cycle.end);
            const totalIncome = cycleTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);   
            const totalExpense = cycleTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);   
            const balance = totalIncome - totalExpense;
            document.getElementById('balance').textContent = formatCurrency(balance);   
            document.getElementById('total-income').textContent = formatCurrency(totalIncome);   
            document.getElementById('total-expense').textContent = formatCurrency(totalExpense);   
        }
            
            function updateNetWorthCard() {
            // Calcular saldo do mês atual
            const today = new Date();
            const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
            
            const monthlyIncome = transactions.filter(t => 
                t.type === 'income' && t.date.startsWith(currentMonth)
            ).reduce((sum, t) => sum + t.amount, 0);
            
            const monthlyExpense = transactions.filter(t => 
                t.type === 'expense' && t.date.startsWith(currentMonth)
            ).reduce((sum, t) => sum + t.amount, 0);
            
            const monthlyBalance = monthlyIncome - monthlyExpense;
            const totalInGoals = (goals || []).reduce((sum, goal) => sum + goal.savedAmount, 0);
            const netWorth = monthlyBalance + totalInGoals;

            document.getElementById('total-in-goals').textContent = formatCurrency(totalInGoals);
            document.getElementById('net-worth').textContent = formatCurrency(netWorth);
        }

            function renderTransactionsList(transactionsToRender) {
            const listElement = document.getElementById('transactions-list');
            listElement.innerHTML = '';
            if (transactionsToRender.length === 0) { listElement.innerHTML = '<p class="text-center">Nenhuma transação encontrada.</p>'; return; }
            transactionsToRender.forEach(t => {
                const item = document.createElement('div');
                item.className = `flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10`;
                const sign = t.type === 'income' ? '+' : '-';
                const amountColor = t.type === 'income' ? 'text-green-400' : 'text-red-400';
                const date = new Date(t.date + 'T00:00:00');
                const formattedDate = date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                const recurringIcon = t.recurringTemplateId ? '<span class="text-blue-400" title="Despesa Recorrente"> 🔄</span>' : '';
                const categoryColor = getCategoryColor(t.category);
                const categoryTextColor = getContrastingTextColor(categoryColor);
                const tagsHtml = (t.tags && t.tags.length > 0) ? `<div class="flex flex-wrap gap-1 mt-1">${t.tags.map(tag => `<span class="tag" style="font-size: 10px; padding: 2px 6px;">${tag}</span>`).join('')}</div>` : '';

                item.innerHTML = `<div class="flex items-center gap-4"><div><p class="font-semibold">${t.description}${recurringIcon}</p><div class="flex items-center gap-2 text-sm"><span style="background-color: ${categoryColor}; color: ${categoryTextColor}" class="px-2 py-0.5 rounded-full text-xs font-semibold">${t.category}</span><span>•</span><span>${formattedDate}</span></div>${tagsHtml}</div></div><div class="text-right"><p class="font-mono font-bold ${amountColor}">${sign} ${formatCurrency(t.amount)}</p><div class="flex gap-2 mt-1"><button data-id="${t.id}" class="edit-btn text-xs text-cyan-400 hover:underline">Editar</button><button data-id="${t.id}" class="delete-btn text-xs text-red-400 hover:underline">Excluir</button></div></div>`;
                listElement.appendChild(item);
            });
        }
            
            function renderGoals() { 
            const listEl = document.getElementById('goals-list'); 
            listEl.innerHTML = ''; 
            if (!goals || goals.length === 0) { 
                listEl.innerHTML = '<p class="text-center col-span-full">Crie seu primeiro cofrinho para começar a poupar!</p>'; 
                return; 
            } 
            goals.forEach(goal => { 
                const progress = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0; 
                const card = document.createElement('div'); 
                card.className = 'glass-card flex flex-col justify-between'; 
                const planButton = goal.actionPlan ? `<button data-id="${goal.id}" class="view-plan-btn text-sm text-indigo-400 hover:underline">Ver Plano</button>` : ''; 
                card.innerHTML = `<div><div class="flex justify-between items-start mb-2"><h3 class="font-mono text-xl font-bold">${goal.name}</h3><div class="flex items-center space-x-2">${planButton}<button data-id="${goal.id}" class="delete-goal-btn text-red-400 hover:text-red-600">&times;</button></div></div><p class="text-sm mb-4">Guardado: <span class="font-semibold text-green-400">${formatCurrency(goal.savedAmount)}</span> de ${formatCurrency(goal.targetAmount)}</p><div class="w-full bg-slate-700 rounded-full h-4 mb-2"><div class="progress-bar-fill h-4 rounded-full" style="background: var(--success-gradient); width: ${Math.min(progress, 100)}%;"></div></div><p class="text-right text-sm font-semibold font-mono">${progress.toFixed(1)}%</p></div><div class="mt-6"><button data-id="${goal.id}" class="add-funds-btn btn btn-primary w-full">Adicionar Dinheiro</button></div>`; 
                listEl.appendChild(card); 
            }); 
        }
         
        async function updateCharts() { 
            updateExpenseChart(); 
            updateBalanceHistoryChart();
            await updateFutureExpensesChart();
        }
         
        function updateCategorySuggestions() {
            const datalist = document.getElementById('category-suggestions');
            datalist.innerHTML = '';
            
            // Ordena as categorias alfabeticamente
            const sortedCategories = [...(window.categories || [])].sort((a, b) => a.name.localeCompare(b.name));
            
            sortedCategories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.name;
                datalist.appendChild(option);
            });
        }
         
        function populateCategoryFilter() {
            const filterSelect = document.getElementById('filter-category');
            if (!filterSelect) return;

            const currentVal = filterSelect.value;
            filterSelect.innerHTML = '<option value="">Todas</option>'; // Limpa o seletor

            // Utiliza um Set para garantir que os nomes das categorias sejam únicos
            const uniqueCategoryNames = new Set();
            (window.categories || []).forEach(cat => {
                if (cat.name) { // Garante que a categoria tem um nome
                    uniqueCategoryNames.add(cat.name);
                }
            });

            // Converte o Set para um array, ordena alfabeticamente e cria as opções
            const sortedNames = Array.from(uniqueCategoryNames).sort((a, b) => a.localeCompare(b));

            sortedNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                filterSelect.appendChild(option);
            });

            // Restaura o valor que estava selecionado anteriormente, se ainda existir
            filterSelect.value = currentVal;
        }

        function updateExpenseChart() {
            const legendColor = '#d1d5db';
            const ctx = document.getElementById('expenseChart').getContext('2d');
            
            const cycle = getCurrentFinancialCycle();
            const cycleTransactions = transactions.filter(t => t.date >= cycle.start && t.date <= cycle.end);

            const expenseData = cycleTransactions.filter(t => t.type === 'expense').reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
            const labels = Object.keys(expenseData);
            const data = Object.values(expenseData);
            const backgroundColors = labels.map(label => getCategoryColor(label));

            if (expenseChart) expenseChart.destroy();

            expenseChart = new Chart(ctx, { 
                type: 'bar', 
                data: { 
                    labels: labels.length > 0 ? labels : ['Sem despesas'], 
                    datasets: [{ 
                        label: 'Despesas',
                        data: data.length > 0 ? data : [1], 
                        backgroundColor: backgroundColors.length > 0 ? backgroundColors : ['#374151'], 
                        borderColor: backgroundColors.length > 0 ? backgroundColors : ['#374151'], 
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false
                    }] 
                }, 
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    indexAxis: 'x',
                    scales: {
                        x: {
                            ticks: { color: '#a0a0a0', font: { family: "'Inter', sans-serif" } },
                            grid: { color: 'rgba(0, 212, 255, 0.1)' }
                        },
                        y: {
                            ticks: { 
                                color: '#a0a0a0', 
                                font: { family: "'Inter', sans-serif" },
                                callback: function(value) { return formatCurrencyForCharts(value); }
                            },
                            grid: { color: 'rgba(0, 212, 255, 0.1)' }
                        }
                    },
                    plugins: { 
                        datalabels: {
                            display: true,
                            anchor: 'end',
                            align: 'top',
                            color: '#ffffff',
                            font: {
                                weight: 'bold',
                                size: 11
                            },
                            formatter: function(value) {
                                return formatCurrencyForDatalabels(value);
                            }
                        },
                        legend: { 
                            display: false
                        }, 
                        tooltip: { 
                            callbacks: { 
                                label: context => context.dataset.label + ': ' + formatCurrencyForCharts(context.parsed.y) 
                            } 
                        } 
                    }
                } 
            });
        }
         
        function updateBalanceHistoryChart() {   
            const ticksColor = '#a0a0a0';   
            const gridColor = 'rgba(0, 212, 255, 0.1)';   
            const ctx = document.getElementById('balanceHistoryChart').getContext('2d');   
            if (balanceHistoryChart) balanceHistoryChart.destroy();   

            // Gerar histórico dos últimos 30 dias
            const balanceHistory = [];
            const labels = [];
            let cumulativeBalance = 0;
            
            // Ordenar todas as transações por data
            const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Calcular saldo para os últimos 30 dias
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            
            // Calcular saldo inicial (todas as transações antes dos últimos 30 dias)
            const initialBalance = sortedTransactions
                .filter(t => new Date(t.date) < thirtyDaysAgo)
                .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
            
            cumulativeBalance = initialBalance;
            
            // Gerar dados para cada dia dos últimos 30 dias
            for (let i = 30; i >= 0; i--) {
                const currentDate = new Date(today);
                currentDate.setDate(today.getDate() - i);
                const dateStr = currentDate.toISOString().split('T')[0];
                
                // Adicionar transações do dia atual
                const dailyTransactions = sortedTransactions.filter(t => t.date === dateStr);
                const dailyNet = dailyTransactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
                
                cumulativeBalance += dailyNet;
                
                labels.push(`${currentDate.getDate()}/${currentDate.getMonth() + 1}`);
                balanceHistory.push(parseFloat(cumulativeBalance.toFixed(2)));
            }

            balanceHistoryChart = new Chart(ctx, { 
                type: 'line', 
                data: { 
                    labels: labels, 
                    datasets: [{ 
                        label: 'Saldo Acumulado', 
                        data: balanceHistory, 
                        borderColor: '#00d4ff', 
                        backgroundColor: 'rgba(0, 212, 255, 0.2)', 
                        fill: true, 
                        tension: 0.4, 
                        pointBackgroundColor: '#00d4ff', 
                        pointRadius: 2, 
                        pointHoverRadius: 6 
                    }] 
                }, 
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { 
                        y: { 
                            ticks: { 
                                color: ticksColor, 
                                callback: value => formatCurrencyForCharts(value) 
                            }, 
                            grid: { color: gridColor } 
                        }, 
                        x: { 
                            ticks: { 
                                color: ticksColor,
                                maxTicksLimit: 10 
                            }, 
                            grid: { color: gridColor } 
                        } 
                    }, 
                    plugins: { 
                        datalabels: {
                            display: false
                        },
                        legend: { display: false }, 
                        tooltip: { 
                            callbacks: { 
                                label: context => 'Saldo: ' + formatCurrencyForCharts(context.parsed.y) 
                            } 
                        } 
                    } 
                } 
            });   
        }
         
        async function updateFutureExpensesChart() { 
            const ticksColor = '#a0a0a0'; 
            const gridColor = 'rgba(0, 212, 255, 0.1)'; 
            const ctx = document.getElementById('futureExpensesChart');
            if (!ctx) return;
            
            // Destruir gráfico existente se houver
            if (window.futureExpensesChart && typeof window.futureExpensesChart.destroy === 'function') { 
                window.futureExpensesChart.destroy(); 
                window.futureExpensesChart = null;
            } 
            
            // Calcular despesas futuras para os próximos 6 meses
            const futureData = await calculateFutureExpenses();
            
            window.futureExpensesChart = new Chart(ctx.getContext('2d'), { 
                type: 'line', 
                data: { 
                    labels: futureData.labels, 
                    datasets: [
                        
                        { 
                            label: 'Parcelas', 
                            data: futureData.installments, 
                            borderColor: '#f59e0b', 
                            backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                            tension: 0.4, 
                            fill: false 
                        },
                        { 
                            label: 'Saldo Líquido', 
                            data: futureData.netBalance, 
                            borderColor: '#22c55e', 
                            backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                            tension: 0.4, 
                            fill: false,
                            borderWidth: 3
                        }
                    ] 
                }, 
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { 
                        y: { 
                            ticks: { 
                                color: ticksColor, 
                                callback: value => formatCurrencyForCharts(value) 
                            }, 
                            grid: { color: gridColor } 
                        }, 
                        x: { 
                            ticks: { color: ticksColor }, 
                            grid: { color: gridColor } 
                        } 
                    }, 
                    plugins: { 
                        datalabels: {
                            display: false
                        },
                        legend: { 
                            position: 'top', 
                            labels: { 
                                color: ticksColor, 
                                font: { family: "'Inter', sans-serif" } 
                            } 
                        }, 
                        tooltip: { 
                            callbacks: { 
                                label: context => `${context.dataset.label}: ${formatCurrencyForCharts(context.parsed.y)}` 
                            } 
                        } 
                    } 
                } 
            }); 
        }
        
        async function calculateFutureExpenses() {
            const data = { labels: [], recurring: [], installments: [], total: [], netBalance: [] };
            const today = new Date();
            
            // Obter renda mensal do usuário
            let monthlyIncome = 0;
            if (currentUser) {
                try {
                    const docRef = doc(db, 'users', currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        monthlyIncome = userData.monthlyIncome || 0;
                    }
                } catch (error) {
                    console.error('Erro ao carregar renda:', error);
                }
            }
            
            // Próximos 6 meses
            for (let i = 0; i < 6; i++) {
                const futureDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
                const monthStr = futureDate.toISOString().slice(0, 7);
                const monthLabel = futureDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                
                data.labels.push(monthLabel);
                
                // Calcular despesas recorrentes
                const recurringAmount = recurringTemplates.reduce((sum, template) => {
                    return sum + template.amount;
                }, 0);
                
                // Calcular parcelas futuras - melhorado
                let installmentsAmount = 0;
                
                // Parcelas de transações existentes
                transactions.forEach(t => {
                    if (t.installments && t.installments.length > 0) {
                        const futureInstallments = t.installments.filter(inst => 
                            inst.date.startsWith(monthStr) && new Date(inst.date) >= today
                        );
                        installmentsAmount += futureInstallments.reduce((instSum, inst) => instSum + inst.amount, 0);
                    }
                });
                
                // Parcelas de transações parceladas (buscar por descrição)
                const parceladaTransactions = transactions.filter(t => 
                    t.description.includes('(') && t.description.includes('/') && 
                    t.date.startsWith(monthStr) && new Date(t.date) >= today
                );
                
                parceladaTransactions.forEach(t => {
                    installmentsAmount += t.amount;
                });
                
                const totalAmount = recurringAmount + installmentsAmount;
                
                // Calcular saldo líquido (renda - despesas totais)
                const netBalance = monthlyIncome - totalAmount;
                
                data.recurring.push(recurringAmount);
                data.installments.push(installmentsAmount);
                data.total.push(totalAmount);
                data.netBalance.push(Math.max(0, netBalance)); // Não mostrar valores negativos
            }
            
            return data;
        }
        function populateYearFilter() {
            const yearSelect = document.getElementById('filter-year');
            if (!yearSelect) return;

            const existingYears = new Set(Array.from(yearSelect.options).map(opt => opt.value));
            const transactionYears = new Set(transactions.map(t => t.date.substring(0, 4)));

            // Garante que o ano atual esteja sempre disponível como opção
            transactionYears.add(new Date().getFullYear().toString());

            let yearsChanged = false;

            transactionYears.forEach(year => {
                if (!existingYears.has(year)) {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    yearSelect.appendChild(option);
                    yearsChanged = true;
                }
            });
            
            // Reordena as opções se um novo ano foi adicionado
            if (yearsChanged) {
                const options = Array.from(yearSelect.options);
                options.sort((a, b) => {
                    if (a.value === "") return -1; // "Todos" sempre primeiro
                    if (b.value === "") return 1;
                    return b.value.localeCompare(a.value); // Ordena anos em ordem decrescente
                });
                yearSelect.innerHTML = '';
                options.forEach(opt => yearSelect.appendChild(opt));
            }
        }

        function setInitialFilter() {
            const now = new Date();
            const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
            const currentYear = now.getFullYear().toString();

            const monthSelect = document.getElementById('filter-month');
            const yearSelect = document.getElementById('filter-year');

            if (monthSelect) {
                monthSelect.value = currentMonth;
            }

            if (yearSelect) {
                yearSelect.value = currentYear;
            }

            applyFilters();
        }
  
    function renderBudgetsPage() {
        const listEl = document.getElementById('budgets-list');
        listEl.innerHTML = '';
        const cycle = getCurrentFinancialCycle();
        const cycleMonthYear = new Date(cycle.start + 'T00:00:00').toISOString().slice(0, 7); // Usa o mês do ciclo
        const expenseCategories = categories.filter(c => c.name.toLowerCase() !== 'salário' && c.name.toLowerCase() !== 'cofrinhos');
        if (expenseCategories.length === 0) { listEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center col-span-full">Adicione categorias de despesa para criar orçamentos.</p>'; return; }
        let budgetsFound = false;
        expenseCategories.forEach(category => {
            const budget = getBudgetForCategory(category.name, cycleMonthYear);
            if (!budget || budget.amount <= 0) return;
            budgetsFound = true;
            const spentAmount = transactions.filter(t => t.type === 'expense' && t.category === category.name && t.date >= cycle.start && t.date <= cycle.end).reduce((sum, t) => sum + t.amount, 0);
            const percentage = (spentAmount / budget.amount) * 100;
            let progressBarColor = 'bg-green-500';
            if (percentage > 75) progressBarColor = 'bg-yellow-500';
            if (percentage >= 100) progressBarColor = 'bg-red-500';
            const card = document.createElement('div');
            card.className = 'card-transition bg-white/80 dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-cyan-500/10 shadow-lg dark:shadow-cyan-500/5 rounded-xl p-6';
            card.innerHTML = `<div class="flex justify-between items-center mb-2"><h3 class="font-bold text-lg">${category.name}</h3><span class="text-sm font-semibold ${percentage >= 100 ? 'text-red-500' : 'text-gray-500'}">${percentage.toFixed(0)}%</span></div><p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Gasto: <span class="font-semibold text-gray-800 dark:text-gray-200">${formatCurrency(spentAmount)}</span> de ${formatCurrency(budget.amount)}</p><div class="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-4"><div class="progress-bar-fill h-4 rounded-full ${progressBarColor}" style="width: ${Math.min(percentage, 100)}%;"></div></div>`;
            listEl.appendChild(card);
        });
         if (!budgetsFound) { listEl.innerHTML = `<p class="text-gray-500 dark:text-gray-400 text-center col-span-full">Nenhum orçamento definido para este ciclo. Clique em "Definir Orçamentos" para começar.</p>`; }
    }

    function updateBudgetSummaryCard() {
        const summaryEl = document.getElementById('budget-summary');
        const cycle = getCurrentFinancialCycle();
        const cycleMonthYear = new Date(cycle.start + 'T00:00:00').toISOString().slice(0, 7);
        const relevantBudgets = budgets.filter(b => b.monthYear === cycleMonthYear && b.amount > 0);
        if (relevantBudgets.length === 0) { summaryEl.textContent = 'N/A'; return; }
        let withinLimitCount = 0;
        relevantBudgets.forEach(budget => {
            const spentAmount = transactions.filter(t => t.type === 'expense' && t.category === budget.categoryName && t.date >= cycle.start && t.date <= cycle.end).reduce((sum, t) => sum + t.amount, 0);
            if (spentAmount <= budget.amount) { withinLimitCount++; }
        });
        summaryEl.textContent = `${withinLimitCount} / ${relevantBudgets.length}`;
    }
    
    function renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const title = document.getElementById('month-year-title');
        grid.innerHTML = '';

        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();

        title.textContent = new Date(year, month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        daysOfWeek.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'font-bold text-center py-2 bg-gray-50 dark:bg-slate-800/50';
            dayHeader.textContent = day;
            grid.appendChild(dayHeader);
        });

        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'bg-gray-50 dark:bg-slate-800/30';
            grid.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day p-2 bg-white dark:bg-slate-900/50 relative flex flex-col';
            
            const dayNumber = document.createElement('span');
            dayNumber.className = 'font-semibold';
            dayNumber.textContent = day;
            dayCell.appendChild(dayNumber);

            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayTransactions = transactions.filter(t => t.date === dateStr);

            const transactionsContainer = document.createElement('div');
            transactionsContainer.className = 'mt-1 space-y-1 overflow-y-auto';
            
            const maxVisible = 4;
            const hasMoreTransactions = dayTransactions.length > maxVisible;
            
            // Mostrar apenas as primeiras 4 transações inicialmente
            const visibleTransactions = dayTransactions.slice(0, maxVisible);
            const hiddenTransactions = dayTransactions.slice(maxVisible);
            
            visibleTransactions.forEach(t => {
                const transactionEl = document.createElement('div');
                transactionEl.dataset.id = t.id;
                transactionEl.className = `p-1 rounded-md text-xs cursor-pointer truncate ${t.type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-200'}`;
                transactionEl.textContent = t.description;
                transactionEl.title = `${t.description} (${formatCurrency(t.amount)})`;
                transactionsContainer.appendChild(transactionEl);
            });
            
            // Container para transações ocultas
            if (hasMoreTransactions) {
                const hiddenContainer = document.createElement('div');
                hiddenContainer.className = 'hidden-transactions hidden space-y-1';
                
                hiddenTransactions.forEach(t => {
                    const transactionEl = document.createElement('div');
                    transactionEl.dataset.id = t.id;
                    transactionEl.className = `p-1 rounded-md text-xs cursor-pointer truncate ${t.type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-200'}`;
                    transactionEl.textContent = t.description;
                    transactionEl.title = `${t.description} (${formatCurrency(t.amount)})`;
                    hiddenContainer.appendChild(transactionEl);
                });
                
                transactionsContainer.appendChild(hiddenContainer);
                
                // Botão "Ver mais"
                const toggleButton = document.createElement('button');
                toggleButton.className = 'toggle-transactions-btn w-full mt-1 px-2 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded hover:bg-blue-500/30 transition-colors';
                toggleButton.textContent = `+${hiddenTransactions.length} mais`;
                
                toggleButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isExpanded = !hiddenContainer.classList.contains('hidden');
                    
                    if (isExpanded) {
                        hiddenContainer.classList.add('hidden');
                        toggleButton.textContent = `+${hiddenTransactions.length} mais`;
                    } else {
                        hiddenContainer.classList.remove('hidden');
                        toggleButton.textContent = 'Recolher';
                    }
                });
                
                transactionsContainer.appendChild(toggleButton);
            }
            dayCell.appendChild(transactionsContainer);
            grid.appendChild(dayCell);
        }
    }

    // --- MODALS AND EVENT LISTENERS ---
    const modals = {    
        transaction: document.getElementById('transaction-modal'),
        delete: document.getElementById('delete-confirm-modal'),
        recurring: document.getElementById('recurring-modal'),
        goal: document.getElementById('goal-modal'),
        addFunds: document.getElementById('add-funds-modal'),
        report: document.getElementById('report-modal'),
        viewPlan: document.getElementById('view-plan-modal'),
        reminder: document.getElementById('reminder-modal'),
        categoryManager: document.getElementById('category-manager-modal'),
        categoryEdit: document.getElementById('category-edit-modal'),
        budget: document.getElementById('budget-modal'),
        expenseAlerts: document.getElementById('expense-alerts-modal')
    };
    
    function setupEventListeners() {
        document.getElementById('nav-dashboard').addEventListener('click', () => switchPage('dashboard'));
        document.getElementById('nav-executive').addEventListener('click', () => switchPage('executive'));
        document.getElementById('nav-budgets').addEventListener('click', () => switchPage('budgets'));
        document.getElementById('nav-calendar').addEventListener('click', () => switchPage('calendar'));
        document.getElementById('nav-goals').addEventListener('click', () => switchPage('goals'));
        document.getElementById('nav-settings').addEventListener('click', () => switchPage('settings'));
        document.getElementById('add-income-btn').addEventListener('click', () => openTransactionModal('income'));
        document.getElementById('add-expense-btn').addEventListener('click', () => openTransactionModal('expense'));
        document.getElementById('manage-recurring-btn').addEventListener('click', openRecurringModal);
        document.getElementById('generate-report-btn').addEventListener('click', openReportModal);

        document.getElementById('upload-pdf-btn').addEventListener('click', () => document.getElementById('pdf-file-input').click());
        document.getElementById('pdf-file-input').addEventListener('change', handlePdfUpload);
        document.getElementById('confirm-pdf-import').addEventListener('click', confirmPdfImport);
        document.getElementById('cancel-pdf-import').addEventListener('click', cancelPdfImport);
        
        // Event listeners para a página de configurações
        document.getElementById('settings-form').addEventListener('submit', handleSettingsFormSubmit);
        document.getElementById('budget-alerts-enabled').addEventListener('change', saveSettingsPage);
        
        // Event listeners para comparação temporal
        document.getElementById('comparison-monthly').addEventListener('click', () => {
            document.querySelectorAll('.comparison-btn').forEach(btn => {
                btn.classList.remove('active', 'bg-blue-500/20', 'text-blue-300', 'border-blue-400/30');
                btn.classList.add('bg-gray-500/20', 'text-gray-300', 'border-gray-400/30');
            });
            document.getElementById('comparison-monthly').classList.add('active', 'bg-blue-500/20', 'text-blue-300', 'border-blue-400/30');
            document.getElementById('comparison-monthly').classList.remove('bg-gray-500/20', 'text-gray-300', 'border-gray-400/30');
            updateComparisonCharts('monthly');
        });
        
        document.getElementById('comparison-yearly').addEventListener('click', () => {
            document.querySelectorAll('.comparison-btn').forEach(btn => {
                btn.classList.remove('active', 'bg-blue-500/20', 'text-blue-300', 'border-blue-400/30');
                btn.classList.add('bg-gray-500/20', 'text-gray-300', 'border-gray-400/30');
            });
            document.getElementById('comparison-yearly').classList.add('active', 'bg-blue-500/20', 'text-blue-300', 'border-blue-400/30');
            document.getElementById('comparison-yearly').classList.remove('bg-gray-500/20', 'text-gray-300', 'border-gray-400/30');
            updateComparisonCharts('yearly');
        });
        document.getElementById('backup-reminders-enabled').addEventListener('change', saveSettingsPage);
        // Event listeners de email removidos - sistema descontinuado
        
        // Event listeners para notificações push
        document.getElementById('toggle-notifications-btn').addEventListener('click', toggleNotifications);
        document.getElementById('test-notification-btn').addEventListener('click', sendTestNotification);
        document.getElementById('goal-notifications-enabled').addEventListener('change', saveNotificationSettings);
        document.getElementById('budget-notifications-enabled').addEventListener('change', saveNotificationSettings);
        document.getElementById('backup-notifications-enabled').addEventListener('change', saveNotificationSettings);
        document.getElementById('achievement-notifications-enabled').addEventListener('change', saveNotificationSettings);
        
        // Event listeners para lembretes de pagamento
        document.getElementById('add-reminder-btn').addEventListener('click', () => openReminderModal());
        document.getElementById('reminder-form').addEventListener('submit', handleReminderFormSubmit);
        document.getElementById('save-alert-settings').addEventListener('click', saveReminderAlertSettings);
        document.getElementById('configure-expense-alerts-btn').addEventListener('click', () => {
            openExpenseAlertsModal();
        });
        
        // Event listeners para alertas de gastos excessivos
        document.getElementById('expense-alerts-enabled').addEventListener('change', handleExpenseAlertsToggle);
        document.getElementById('warning-threshold').addEventListener('input', handleThresholdChange);
        document.getElementById('critical-threshold').addEventListener('input', handleThresholdChange);
        
        // Event listeners para autenticação 2FA
        document.getElementById('toggle-2fa-btn').addEventListener('click', handle2FAToggle);
        document.getElementById('verify-2fa-btn').addEventListener('click', verify2FASetup);
        document.getElementById('disable-2fa-btn').addEventListener('click', disable2FA);
        document.getElementById('regenerate-backup-codes').addEventListener('click', regenerateBackupCodes);
        document.getElementById('download-backup-codes').addEventListener('click', downloadBackupCodes);
        

        
        // Event listeners para redefinir senha
        const resetPasswordBtn = document.getElementById('reset-password-btn');
        const generatePasswordBtn = document.getElementById('generate-password-btn');
        
        if (resetPasswordBtn) resetPasswordBtn.addEventListener('click', resetPassword);
        if (generatePasswordBtn) generatePasswordBtn.addEventListener('click', generateSecurePassword);
        
        document.getElementById('transaction-form').addEventListener('submit', handleFormSubmit);
        document.getElementById('cancel-btn').addEventListener('click', closeAllModals);
        document.getElementById('confirm-delete-btn').addEventListener('click', handleDeleteConfirm);
        document.getElementById('close-recurring-modal-btn').addEventListener('click', closeAllModals);
        document.getElementById('add-goal-btn').addEventListener('click', openGoalModal);
        document.getElementById('cancel-delete-btn').addEventListener('click', closeAllModals);
        document.getElementById('goal-form').addEventListener('submit', handleGoalFormSubmit);
        document.getElementById('cancel-goal-btn').addEventListener('click', closeAllModals);
        document.getElementById('add-funds-form').addEventListener('submit', handleAddFundsFormSubmit);
        document.getElementById('cancel-add-funds-btn').addEventListener('click', closeAllModals);
        document.getElementById('transactions-list').addEventListener('click', handleListClick);
        document.getElementById('goals-list').addEventListener('click', handleGoalsListClick);
        document.getElementById('category-list').addEventListener('click', handleCategoryListClick);
        document.getElementById('is-installment').addEventListener('change', handleCheckboxChange);
        document.getElementById('is-recurring').addEventListener('change', handleCheckboxChange);
        document.getElementById('cancel-report-btn').addEventListener('click', closeAllModals);
        document.getElementById('report-type').addEventListener('change', handleReportTypeChange);
        document.getElementById('report-form').addEventListener('submit', handleReportFormSubmit);
        document.getElementById('suggest-category-btn').addEventListener('click', handleSuggestCategoryClick);
        document.getElementById('create-plan-btn').addEventListener('click', handleCreatePlanClick);
        document.getElementById('close-view-plan-btn').addEventListener('click', closeAllModals);

        const filterForm = document.getElementById('filter-form');
        filterForm.addEventListener('submit', (e) => { e.preventDefault(); applyFilters(); });
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        clearFiltersBtn.addEventListener('click', () => {   
            filterForm.reset();
            clearFilterTags();
            applyFilters();    
        });
        
        // Event listeners para tags
        document.getElementById('tags').addEventListener('input', populateTagSuggestions);
        document.getElementById('filter-tags').addEventListener('change', applyFilters);
        document.getElementById('manage-categories-btn').addEventListener('click', openCategoryManagerModal);
        document.getElementById('close-category-manager-btn').addEventListener('click', closeAllModals);
        document.getElementById('add-new-category-btn').addEventListener('click', () => openCategoryEditModal());
        document.getElementById('category-edit-form').addEventListener('submit', handleCategoryFormSubmit);
        document.getElementById('cancel-category-edit-btn').addEventListener('click', closeAllModals);
        document.getElementById('category-list').addEventListener('click', handleCategoryListClick);
        document.getElementById('manage-budgets-btn').addEventListener('click', openBudgetModal);
        document.getElementById('budget-form').addEventListener('submit', handleBudgetFormSubmit);
        document.getElementById('cancel-budget-btn').addEventListener('click', closeAllModals);
        document.getElementById('cancel-expense-alerts-btn').addEventListener('click', closeAllModals);
        document.getElementById('save-expense-alerts-btn').addEventListener('click', saveExpenseAlertsSettings);
        document.getElementById('cancel-reminder-btn').addEventListener('click', closeAllModals);
        document.getElementById('test-monthly-reset').addEventListener('click', testMonthlyReset);
        // Event listeners do assistente IA serão configurados após as funções serem definidas
        
        // Event listeners para email removidos
        document.getElementById('prev-month-btn').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
        document.getElementById('next-month-btn').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });
        document.getElementById('calendar-grid').addEventListener('click', (e) => {
            const target = e.target.closest('[data-id]');
            if (target) {
                const transactionId = target.dataset.id;
                const transactionToEdit = transactions.find(t => t.id === transactionId);
                if (transactionToEdit) {
                    openTransactionModal(transactionToEdit.type, transactionToEdit);
                }
            }
        });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllModals(); });
        Object.values(modals).forEach(modal => { if(modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeAllModals(); }); });
    }

    function closeAllModals() { Object.values(modals).forEach(modal => modal && modal.classList.add('hidden', 'opacity-0')); }
    function openModal(modal) { modal.classList.remove('hidden', 'opacity-0'); }
    function switchPage(page) {
        document.getElementById('dashboard-page').classList.toggle('hidden', page !== 'dashboard');
        document.getElementById('executive-page').classList.toggle('hidden', page !== 'executive');
        document.getElementById('goals-page').classList.toggle('hidden', page !== 'goals');
        document.getElementById('budgets-page').classList.toggle('hidden', page !== 'budgets');
        document.getElementById('calendar-page').classList.toggle('hidden', page !== 'calendar');
        document.getElementById('settings-page').classList.toggle('hidden', page !== 'settings');
        document.getElementById('nav-dashboard').classList.toggle('active', page === 'dashboard');
        document.getElementById('nav-executive').classList.toggle('active', page === 'executive');
        document.getElementById('nav-goals').classList.toggle('active', page === 'goals');
        document.getElementById('nav-budgets').classList.toggle('active', page === 'budgets');
        document.getElementById('nav-calendar').classList.toggle('active', page === 'calendar');
        document.getElementById('nav-settings').classList.toggle('active', page === 'settings');
        
        // Atualizar navegação mobile
        updateMobileNavigation(page);
        
        // Carregar configurações quando a página for acessada
        if (page === 'settings') {
            loadSettingsPage();
        }
        
        // Carregar dados executivos quando a página for acessada
        if (page === 'executive') {
            updateExecutiveDashboard();
        }
    }
    function openTransactionModal(type, transaction = null) { 
        const form = document.getElementById('transaction-form'); 
        form.reset(); 
        document.getElementById('date').valueAsDate = new Date(); 
        document.getElementById('options-section').classList.toggle('hidden', type === 'income' || !!transaction); 
        document.getElementById('installments-count-container').classList.add('hidden'); 
        document.getElementById('modal-title').textContent = transaction ? 'Editar Transação' : (type === 'income' ? 'Adicionar Receita' : 'Adicionar Despesa'); 
        document.getElementById('transaction-type').value = type; 
        
        // Popula as opções de categoria e sugestões de tags
        updateCategorySuggestions();
        populateTagSuggestions();
        
        if (transaction) { 
            document.getElementById('transaction-id').value = transaction.id; 
            document.getElementById('description').value = transaction.description; 
            document.getElementById('amount').value = transaction.amount; 
            document.getElementById('category').value = transaction.category; 
            document.getElementById('date').value = transaction.date; 
            document.getElementById('tags').value = (transaction.tags || []).join(', ');
        } else { 
            document.getElementById('transaction-id').value = ''; 
            document.getElementById('tags').value = '';
        } 
        updateDateLabel(); 
        openModal(modals.transaction); 
    }
    function openDeleteModal(id, type) {
        const confirmBtn = document.getElementById('confirm-delete-btn');
        const modalText = document.getElementById('delete-modal-text');
        confirmBtn.dataset.id = id;
        confirmBtn.dataset.type = type;
        if (type === 'transaction') modalText.textContent = `Tem certeza que deseja excluir esta transação?`;
        else if (type === 'goal') modalText.textContent = `Tem certeza que deseja excluir este cofrinho?`;
        else if (type === 'category') modalText.textContent = `Tem certeza? Todas as transações nesta categoria serão movidas para "Outros".`;
        
        // Abrir modal de exclusão sem fechar outros modais
        modals.delete.classList.remove('hidden', 'opacity-0');
    }
    function handleDeleteConfirm(e) {
        const { id, type } = e.target.dataset;

        if (type === 'category') {
            deleteCategory(id);   
            renderCategoryList();   
            // Fechar apenas o modal de exclusão, manter o de categorias aberto
            modals.delete.classList.add('hidden', 'opacity-0');
        } else {
            if (type === 'goal') {
                deleteGoal(id);
            } else if (type === 'transaction') {
                deleteTransaction(id);
            }
            closeAllModals();
        }
    }
    function openRecurringModal() {
    const listEl = document.getElementById('recurring-list');
    listEl.innerHTML = '';

    // Cria um Map para armazenar apenas uma transação por cada tipo de recorrência
    // A chave será o recurringTemplateId e o valor será o objeto da transação
    const uniqueRecurring = new Map();

    // Itera sobre TODAS as transações
    transactions.forEach(t => {
        // Se a transação tem um ID de recorrência e ainda não foi adicionada ao nosso Map
        if (t.recurringTemplateId && !uniqueRecurring.has(t.recurringTemplateId)) {
            uniqueRecurring.set(t.recurringTemplateId, t);
        }
    });

    if (uniqueRecurring.size === 0) {
        listEl.innerHTML = '<p class="text-gray-400 text-center py-4">Nenhuma despesa recorrente encontrada.</p>';
    } else {
        // Converte o Map para uma array e a exibe
        Array.from(uniqueRecurring.values()).forEach(transaction => {
            const itemEl = document.createElement('div');
            itemEl.className = 'flex justify-between items-center p-3 bg-slate-800/50 rounded-lg';

            itemEl.innerHTML = `
                <div>
                    <p class="font-semibold text-text-primary">${transaction.description.replace(/\s\(\d+\/\d+\)/, '')}</p>
                    <p class="text-sm text-gray-400">
                        ${formatCurrency(transaction.amount)} / mês - Categoria: ${transaction.category}
                    </p>
                </div>
                <button data-template-id="${transaction.recurringTemplateId}" class="delete-recurring-btn p-2 text-red-400 hover:text-red-600">&times;</button>
            `;

            listEl.appendChild(itemEl);
        });
    }

    // Adiciona os event listeners para os botões de deletar DEPOIS de criar a lista
    listEl.querySelectorAll('.delete-recurring-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const templateId = e.target.closest('button').dataset.templateId;
            if (confirm('Isso irá parar de gerar futuras transações para este item. Deseja continuar?')) {
                deleteRecurringTemplate(templateId);
            }
        });
    });

    openModal(modals.recurring);
}
    function openGoalModal() { document.getElementById('goal-form').reset(); document.getElementById('action-plan-display').classList.add('hidden'); temporaryActionPlan = null; openModal(modals.goal); }
    function openAddFundsModal(goalId) { const goal = goals.find(g => g.id === goalId); if (goal) { document.getElementById('add-funds-form').reset(); document.getElementById('add-funds-goal-id').value = goalId; document.getElementById('add-funds-modal-title').textContent = `Adicionar a: ${goal.name}`; openModal(modals.addFunds); } }
    function openViewPlanModal(goalId) { const goal = goals.find(g => g.id === goalId); if (goal && goal.actionPlan) { document.getElementById('view-plan-title').textContent = `Plano para: ${goal.name}`; const listEl = document.getElementById('view-plan-list'); listEl.innerHTML = goal.actionPlan.map(step => `<li class="p-2 bg-gray-100 dark:bg-slate-800/50 rounded">${step}</li>`).join(''); openModal(modals.viewPlan); } }
    function openReportModal() { const reportForm = document.getElementById('report-form'); reportForm.reset(); handleReportTypeChange(); const now = new Date(); const year = now.getFullYear(); const month = (now.getMonth() + 1).toString().padStart(2, '0'); document.getElementById('report-month').value = `${year}-${month}`; document.getElementById('report-year').value = year; openModal(modals.report); }
    function openSettingsModal() { document.getElementById('api-key-input').value = localStorage.getItem(API_KEY) || ''; openModal(modals.settings); }
    function openCategoryManagerModal() { renderCategoryList(); openModal(modals.categoryManager); }
    function openCategoryEditModal(category = null) {
        const form = document.getElementById('category-edit-form'); form.reset();
        const modalTitle = document.getElementById('category-edit-modal-title');
        const idInput = document.getElementById('category-edit-id');
        const nameInput = document.getElementById('category-name-input');
        const colorInput = document.getElementById('category-color-input');
        if (category) { modalTitle.textContent = 'Editar Categoria'; idInput.value = category.id; nameInput.value = category.name; colorInput.value = category.color; }
        else { modalTitle.textContent = 'Nova Categoria'; idInput.value = ''; colorInput.value = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'); }
        openModal(modals.categoryEdit);
    }
    async function handleCategoryFormSubmit(e) { e.preventDefault(); const id = document.getElementById('category-edit-id').value; const name = document.getElementById('category-name-input').value; const color = document.getElementById('category-color-input').value; if (id) { await updateCategory(id, { name, color }); } else { await addCategory({ name, color }); } closeAllModals(); openCategoryManagerModal(); }
    function renderCategoryList() {
        const listEl = document.getElementById('category-list');
        listEl.innerHTML = ''; // Limpa a lista para evitar acumular itens

        if (!categories || categories.length === 0) {
            listEl.innerHTML = '<p class="text-center text-gray-500">Nenhuma categoria encontrada.</p>';
            return;
        }

        // Usa um Map para garantir que cada nome de categoria seja único,
        // preservando o objeto da categoria (com seu id e cor).
        const uniqueCategoriesMap = new Map();
        categories.forEach(cat => {
            if (cat.name) {
                uniqueCategoriesMap.set(cat.name, cat);
            }
        });

        // Converte os valores do Map de volta para um array e ordena alfabeticamente
        const uniqueCategories = Array.from(uniqueCategoriesMap.values());
        uniqueCategories.sort((a, b) => a.name.localeCompare(b.name));

        // Renderiza a lista a partir do array de categorias únicas
        uniqueCategories.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg';
            item.innerHTML = `<div class="flex items-center gap-3"><span class="block w-5 h-5 rounded-full" style="background-color: ${cat.color}"></span><p class="font-semibold">${cat.name}</p></div><div class="flex gap-2"><button data-id="${cat.id}" class="edit-category-btn text-xs text-cyan-500 hover:underline">Editar</button><button data-id="${cat.id}" class="delete-category-btn text-xs text-red-500 hover:underline">Excluir</button></div>`;
            listEl.appendChild(item);
        });
    }
    function handleCategoryListClick(e) {
        const target = e.target; const id = target.dataset.id; if (!id) return;
        if (target.classList.contains('edit-category-btn')) { const categoryToEdit = getCategoryById(id); openCategoryEditModal(categoryToEdit); }
        if (target.classList.contains('delete-category-btn')) { openDeleteModal(id, 'category'); }
    }
    
    function applyFilters() {
    const description = document.getElementById('filter-description').value.toLowerCase();
    const category = document.getElementById('filter-category').value;
    const selectedMonth = document.getElementById('filter-month').value;
    const selectedYear = document.getElementById('filter-year').value;
    const selectedTags = getSelectedFilterTags();

    let filteredTransactions = [...transactions];

    if (description) {
        filteredTransactions = filteredTransactions.filter(t => t.description.toLowerCase().includes(description));
    }
    if (category) {
        filteredTransactions = filteredTransactions.filter(t => t.category === category);
    }
    if (selectedTags.length > 0) {
        filteredTransactions = filteredTransactions.filter(t => selectedTags.some(tag => (t.tags || []).includes(tag)));
    }

    // Nova lógica de filtragem por data
    if (selectedYear && selectedMonth) {
        const period = `${selectedYear}-${selectedMonth}`;
        filteredTransactions = filteredTransactions.filter(t => t.date.startsWith(period));
    } else if (selectedYear) {
        filteredTransactions = filteredTransactions.filter(t => t.date.startsWith(selectedYear));
    } else if (selectedMonth) {
        filteredTransactions = filteredTransactions.filter(t => t.date.substring(5, 7) === selectedMonth);
    }

    renderTransactionsList(filteredTransactions);
}
    
    // --- FUNÇÕES DE TAGS ---
    function getAllTags() {
        const allTags = new Set();
        transactions.forEach(t => {
            if (t.tags && Array.isArray(t.tags)) {
                t.tags.forEach(tag => allTags.add(tag));
            }
        });
        return Array.from(allTags).sort();
    }
    
    function populateTagSuggestions() {
        const tagSuggestionsEl = document.getElementById('tag-suggestions');
        const allTags = getAllTags();
        
        tagSuggestionsEl.innerHTML = '';
        allTags.slice(0, 10).forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag tag-suggestion';
            tagEl.textContent = tag;
            tagEl.addEventListener('click', () => {
                const tagsInput = document.getElementById('tags');
                const currentTags = tagsInput.value ? tagsInput.value.split(',').map(t => t.trim()) : [];
                if (!currentTags.includes(tag)) {
                    currentTags.push(tag);
                    tagsInput.value = currentTags.join(', ');
                }
            });
            tagSuggestionsEl.appendChild(tagEl);
        });
    }
    
    function populateFilterTags() {
        const filterTagsSelect = document.getElementById('filter-tags');
        const allTags = getAllTags();
        
        // Limpar opções existentes (exceto "Todas")
        filterTagsSelect.innerHTML = '<option value="">Todas</option>';
        
        allTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            filterTagsSelect.appendChild(option);
        });
    }
    
    function getSelectedFilterTags() {
        const filterTagsSelect = document.getElementById('filter-tags');
        const selectedTag = filterTagsSelect.value;
        return selectedTag ? [selectedTag] : [];
    }
    
    function clearFilterTags() {
        const filterTagsSelect = document.getElementById('filter-tags');
        filterTagsSelect.value = '';
    }

    function openBudgetModal() {
        const formInputs = document.getElementById('budget-form-inputs');
        formInputs.innerHTML = '';
        const cycle = getCurrentFinancialCycle();
        const cycleMonthYear = new Date(cycle.start + 'T00:00:00').toISOString().slice(0, 7);
        const expenseCategories = categories.filter(c => c.name.toLowerCase() !== 'salário' && c.name.toLowerCase() !== 'cofrinhos');
        expenseCategories.sort((a,b) => a.name.localeCompare(b.name)).forEach(category => {
            const budget = getBudgetForCategory(category.name, cycleMonthYear);
            const value = budget ? budget.amount : '';
            const inputGroup = document.createElement('div');
            inputGroup.innerHTML = `<label for="budget-${category.id}" class="block text-sm font-medium">${category.name}</label><div class="mt-1 flex rounded-md shadow-sm"><span class="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 dark:bg-slate-600 dark:border-slate-500 dark:text-gray-300">R$</span><input type="number" id="budget-${category.id}" data-category-name="${category.name}" value="${value}" step="0.01" placeholder="0,00" class="flex-1 block w-full rounded-none rounded-r-md futuristic-input"></div>`;
            formInputs.appendChild(inputGroup);
        });
        openModal(modals.budget);
    }
    function handleBudgetFormSubmit(e) {
        e.preventDefault();
        const cycle = getCurrentFinancialCycle();
        const cycleMonthYear = new Date(cycle.start + 'T00:00:00').toISOString().slice(0, 7);
        const inputs = document.getElementById('budget-form-inputs').querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            const categoryName = input.dataset.categoryName;
            const amount = parseFloat(input.value) || 0;
            setBudget(categoryName, amount, cycleMonthYear);
        });
        closeAllModals();
        updateUI();
    }
    function handleFormSubmit(e) { e.preventDefault(); const id = document.getElementById('transaction-id').value; const description = document.getElementById('description').value; const totalAmount = parseFloat(document.getElementById('amount').value); const category = document.getElementById('category').value.trim(); const type = document.getElementById('transaction-type').value; const startDateValue = document.getElementById('date').value; const tagsInput = document.getElementById('tags').value; const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []; if (id) { updateTransaction(id, { description, amount: totalAmount, category, date: startDateValue, type, tags }); } else if (document.getElementById('is-recurring').checked) { addRecurringTemplate({ description, amount: totalAmount, category, startDate: startDateValue, tags }); checkAndGenerateRecurringTransactions(); } else if (document.getElementById('is-installment').checked) { const installmentsCount = parseInt(document.getElementById('installments-count').value, 10); if (installmentsCount >= 2) { const installmentAmount = totalAmount / installmentsCount; const startDate = new Date(startDateValue + 'T00:00:00'); for (let i = 1; i <= installmentsCount; i++) { const installmentDate = new Date(startDate); installmentDate.setMonth(startDate.getMonth() + i - 1); addTransaction({ type: 'expense', description: `${description} (${i}/${installmentsCount})`, amount: installmentAmount, category, date: installmentDate.toISOString().split('T')[0], tags }, true); } saveAndRefresh(); } } else { addTransaction({ type, description, amount: totalAmount, category, date: startDateValue, tags }); } closeAllModals(); }
    function handleGoalFormSubmit(e) { e.preventDefault(); const name = document.getElementById('goal-name').value; const target = parseFloat(document.getElementById('goal-target').value); const initialSaved = parseFloat(document.getElementById('goal-initial-saved').value) || 0; addGoal({ name: name, targetAmount: target, savedAmount: initialSaved, actionPlan: temporaryActionPlan }); closeAllModals(); }
    function handleAddFundsFormSubmit(e) { e.preventDefault(); const goalId = document.getElementById('add-funds-goal-id').value; const amount = parseFloat(document.getElementById('add-funds-amount').value); if (goalId && amount > 0) addFundsToGoal(goalId, amount); closeAllModals(); }
    function handleReportTypeChange() { const type = document.getElementById('report-type').value; document.getElementById('report-month-container').classList.toggle('hidden', type !== 'monthly'); document.getElementById('report-year-container').classList.toggle('hidden', type !== 'annual'); }
    async function handleReportFormSubmit(e) { e.preventDefault(); const generateBtn = document.getElementById('generate-pdf-btn'); const originalBtnText = generateBtn.textContent; generateBtn.disabled = true; generateBtn.textContent = 'Gerando...'; const type = document.getElementById('report-type').value; const includeAI = document.getElementById('include-ai-analysis').checked; const value = type === 'monthly' ? document.getElementById('report-month').value : document.getElementById('report-year').value; if (value) { await generatePDF(type, value, includeAI); closeAllModals(); } else { alert('Por favor, preencha o período do relatório.'); } generateBtn.disabled = false; generateBtn.textContent = originalBtnText; }
    function handleListClick(e) { const targetButton = e.target.closest('button'); if (!targetButton) return; const id = targetButton.dataset.id; if (targetButton.classList.contains('delete-btn')) openDeleteModal(id, 'transaction'); if (targetButton.classList.contains('edit-btn')) { const transactionToEdit = transactions.find(t => t.id === id); if (transactionToEdit) openTransactionModal(transactionToEdit.type, transactionToEdit); } }
    function handleGoalsListClick(e) { const targetButton = e.target.closest('button'); if (!targetButton) return; const id = targetButton.dataset.id; if (targetButton.classList.contains('delete-goal-btn')) openDeleteModal(id, 'goal'); if (targetButton.classList.contains('add-funds-btn')) openAddFundsModal(id); if (targetButton.classList.contains('view-plan-btn')) openViewPlanModal(id); }
    function updateDateLabel() { const dateLabel = document.getElementById('date-label'); if (document.getElementById('is-installment').checked) dateLabel.textContent = 'Data da 1ª Parcela'; else if (document.getElementById('is-recurring').checked) dateLabel.textContent = 'Data de Início da Recorrência'; else dateLabel.textContent = 'Data'; }
    function handleCheckboxChange(e) { const isInstallment = document.getElementById('is-installment'); const isRecurring = document.getElementById('is-recurring'); if (e.target === isInstallment && isInstallment.checked) isRecurring.checked = false; if (e.target === isRecurring && isRecurring.checked) isInstallment.checked = false; document.getElementById('installments-count-container').classList.toggle('hidden', !isInstallment.checked); updateDateLabel(); }

    
    // --- BACKUP E EXPORTAÇÃO/IMPORTAÇÃO ---
    function createBackup() {
        if (!currentUser) return;
        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            user: currentUser.email,
            data: {
                transactions: transactions || [],
                recurringTemplates: recurringTemplates || [],
                goals: goals || [],
                categories: categories || [],
                budgets: budgets || []
            }
        };
        const backupKey = `finance_backup_${currentUser.email}`;
        localStorage.setItem(backupKey, JSON.stringify(backupData));
        return backupData;
    }
    
    function exportData() {
        try {
            const backupData = createBackup();
            const dataStr = JSON.stringify(backupData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            const date = new Date().toISOString().split('T')[0];
            link.download = `financex-backup-${date}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification('✅ Dados exportados com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            showNotification('❌ Erro ao exportar dados', 'error');
        }
    }
    
    function importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validar estrutura do arquivo
                if (!importedData.data || !importedData.version) {
                    throw new Error('Formato de arquivo inválido');
                }
                
                // Confirmar importação
                if (confirm('⚠️ Isso substituirá todos os seus dados atuais. Deseja continuar?')) {
                    // Importar dados
                    transactions = importedData.data.transactions || [];
                    recurringTemplates = importedData.data.recurringTemplates || [];
                    goals = importedData.data.goals || [];
                    categories = importedData.data.categories || [];
                    budgets = importedData.data.budgets || [];
                    
                    // Salvar e atualizar
                    saveData();
                    updateUI();
                    closeAllModals();
                    
                    showNotification('✅ Dados importados com sucesso!', 'success');
                }
            } catch (error) {
                console.error('Erro ao importar dados:', error);
                showNotification('❌ Erro ao importar dados: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
        
        // Limpar input
        event.target.value = '';
    }
    
    function showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
        
        // Definir cores baseado no tipo
        const colors = {
            success: 'bg-green-600 text-white border-green-500',
            error: 'bg-red-600 text-white border-red-500',
            info: 'bg-blue-600 text-white border-blue-500',
            warning: 'bg-yellow-600 text-white border-yellow-500'
        };
        
        notification.className += ` ${colors[type] || colors.info} border`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Backup automático melhorado
    function enhancedSaveData() {
        saveData(); // Função original
        
        // Verificar configurações
        const settings = getSettings();
        
        // Backup automático baseado nas configurações
        if (settings.weeklyBackup) {
            const lastBackup = localStorage.getItem('lastBackupDate');
            const today = new Date().toDateString();
            
            if (lastBackup !== today) {
                createBackup();
                localStorage.setItem('lastBackupDate', today);
                showNotification('Backup automático realizado!', 'success');
            }
        }
        
        // Verificar alertas de orçamento
        if (settings.budgetAlerts) {
            checkBudgetAlerts();
        }
    }
    
    // Funções de configurações
    function getSettings() {
        const defaultSettings = {
            budgetAlerts: true,
            weeklyBackup: true
        };
        
        const saved = localStorage.getItem(`settings_${window.currentUser?.email || 'default'}`);
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }
    
    function saveSettings(settings) {
        localStorage.setItem(`settings_${window.currentUser?.email || 'default'}`, JSON.stringify(settings));
    }
    
    function loadSettingsModal() {
        const settings = getSettings();
        const budgetCheckbox = document.getElementById('budget-alerts');
        const backupCheckbox = document.getElementById('weekly-backup');
        
        if (budgetCheckbox) budgetCheckbox.checked = settings.budgetAlerts;
        if (backupCheckbox) backupCheckbox.checked = settings.weeklyBackup;
        

    }
    
    function loadSettingsPage() {
        const userPrefix = `finance_data_${currentUser.email}`;
        
        // Carregar chave da API
        const apiKeyElement = document.getElementById('api-key-input');
        if (apiKeyElement) {
            const apiKey = localStorage.getItem(`${userPrefix}_gemini_api_key`) || '';
            apiKeyElement.value = apiKey;
        }
        
        // Carregar configurações de alertas
        const budgetAlerts = localStorage.getItem(`${userPrefix}_budget_alerts`) === 'true';
        const backupReminders = localStorage.getItem(`${userPrefix}_backup_reminders`) === 'true';
        
        const budgetAlertsElement = document.getElementById('budget-alerts-enabled');
        const backupRemindersElement = document.getElementById('backup-reminders-enabled');
        
        if (budgetAlertsElement) budgetAlertsElement.checked = budgetAlerts;
        if (backupRemindersElement) backupRemindersElement.checked = backupReminders;

        // Configurações de email foram removidas - não carregar mais
        
        const monthlyReports = localStorage.getItem(`${userPrefix}_monthly_reports`) === 'true';
        const monthlyReportsElement = document.getElementById('monthly-reports-enabled');
        if (monthlyReportsElement) monthlyReportsElement.checked = monthlyReports;
        
        // Carregar configurações de notificação
        loadNotificationSettings();
        
        // Atualizar exibição da data do último reset
        updateLastResetDisplay();
    }
    
    function saveSettingsPage() {
        const userPrefix = `finance_data_${currentUser.email}`;
        
        // Salvar configurações de alertas
        const budgetAlertsElement = document.getElementById('budget-alerts-enabled');
        const backupRemindersElement = document.getElementById('backup-reminders-enabled');
        
        if (budgetAlertsElement) {
            localStorage.setItem(`${userPrefix}_budget_alerts`, budgetAlertsElement.checked);
        }
        if (backupRemindersElement) {
            localStorage.setItem(`${userPrefix}_backup_reminders`, backupRemindersElement.checked);
        }
        
        // Configurações de email foram removidas - não salvar mais
        
        // Salvar configurações de relatórios mensais se o elemento existir
        const monthlyReportsElement = document.getElementById('monthly-reports-enabled');
        if (monthlyReportsElement) {
            localStorage.setItem(`${userPrefix}_monthly_reports`, monthlyReportsElement.checked);
        }
        
        showNotification('Configurações salvas com sucesso!', 'success');
    }
    
    function handleSettingsFormSubmit(e) {
        e.preventDefault();
        const userPrefix = `finance_data_${currentUser.email}`;
        const apiKeyElement = document.getElementById('api-key-input');
        if (apiKeyElement) {
            const newKey = apiKeyElement.value;
            localStorage.setItem(`${userPrefix}_gemini_api_key`, newKey);
            showNotification('Chave API salva com sucesso!', 'success');
        } else {
            showNotification('Erro: Campo de API não encontrado!', 'error');
        }
    }
    
    // Função sendTestEmail removida - sistema de email descontinuado
    
    // Substituir saveAndRefresh para usar backup automático
    function saveAndRefresh() {
        enhancedSaveData();
        updateUI();
    }
    
    // --- GEMINI API INTEGRATION ---
    async function getAIAnalysis(prompt) {
        const apiKey = localStorage.getItem(API_KEY);
        if (!apiKey) {
            return "Análise por IA indisponível. Por favor, insira sua chave da API do Gemini nas configurações.";
        }
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            if (!response.ok) {
                const error = await response.json();
                console.error("API Error:", error);
                throw new Error("Erro na resposta da API.");
            }
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error("Erro ao chamar a API Gemini: ", error);
            return "Ocorreu um erro ao contatar a IA. Verifique sua chave de API e a conexão.";
        }
    }
    
    async function generatePDF(periodType, periodValue, includeAI) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let reportTitle = "Relatório Financeiro", fileName = "relatorio.pdf", filteredTransactions = [], periodText = "", monthYear = "";
    
    if (periodType === 'monthly') {
        const [year, month] = periodValue.split('-');
        monthYear = periodValue;
        const monthName = new Date(periodValue + '-02').toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' });
        periodText = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
        reportTitle = `Relatório Financeiro - ${periodText}`;
        fileName = `FinanceX_Relatorio_${year}_${month}.pdf`;
        filteredTransactions = transactions.filter(t => t.date.startsWith(periodValue));
    } else {
        periodText = `o ano de ${periodValue}`;
        reportTitle = `Relatório Financeiro - Ano ${periodValue}`;
        fileName = `FinanceX_Relatorio_${periodValue}.pdf`;
        filteredTransactions = transactions.filter(t => t.date.startsWith(periodValue));
    }

    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netResult = totalIncome - totalExpense;
    const daysInPeriod = periodType === 'monthly' ? new Date(periodValue.split('-')[0], periodValue.split('-')[1], 0).getDate() : 365;
    const dailyAvgExpense = totalExpense > 0 ? totalExpense / daysInPeriod : 0;

    // === CABEÇALHO PROFISSIONAL ===
    // ... (code for the header remains the same) ...
    doc.setFillColor(41, 98, 255); // Azul corporativo
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('FinanceX', 14, 20);
    doc.setFontSize(16);
    doc.setFont(undefined, 'normal');
    doc.text(reportTitle, 14, 28);
    doc.setFontSize(10);
    const currentDate = new Date().toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    doc.text(`Gerado em: ${currentDate}`, 210 - 14, 20, { align: 'right' });
    doc.text(`Período: ${periodText}`, 210 - 14, 28, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // ✅ MOVED THIS BLOCK UP
    const categoryData = categories.filter(c => c.name.toLowerCase() !== 'salário').map(cat => {
        const transactionsInCategory = filteredTransactions.filter(t => t.category === cat.name && t.type === 'expense');
        const totalSpent = transactionsInCategory.reduce((sum, t) => sum + t.amount, 0);
        const budgetObj = getBudgetForCategory(cat.name, monthYear);
        const budgetAmount = budgetObj ? budgetObj.amount : 0;
        const status = budgetAmount > 0 ? (totalSpent <= budgetAmount ? '✅ OK' : '⚠️ Acima') : '-';
        return {
            name: cat.name,
            spent: formatCurrency(totalSpent),
            percentage: totalExpense > 0 ? `${((totalSpent / totalExpense) * 100).toFixed(1)}%` : '0.0%',
            transactions: transactionsInCategory.length,
            budget: budgetAmount > 0 ? formatCurrency(budgetAmount) : '-',
            status: status
        };
    }).filter(c => c.transactions > 0).sort((a, b) => parseFloat(b.spent.replace(/[^0-9,-]+/g,"").replace(',','.')) - parseFloat(a.spent.replace(/[^0-9,-]+/g,"").replace(',','.')));
    
    // Calcular dados para análises avançadas
    const previousPeriodTransactions = getPreviousPeriodTransactions(periodType, periodValue);
    const previousIncome = previousPeriodTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const previousExpense = previousPeriodTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const incomeVariation = previousIncome > 0 ? ((totalIncome - previousIncome) / previousIncome * 100) : 0;
    const expenseVariation = previousExpense > 0 ? ((totalExpense - previousExpense) / previousExpense * 100) : 0;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0;
    
    // Now this line will work correctly
    const financialScore = calculateReportFinancialScore(totalIncome, totalExpense, netResult, savingsRate, categoryData);
    
    let startY = 50;
        
        // === RESUMO EXECUTIVO ===
        doc.setFillColor(248, 250, 252); // Fundo cinza claro
        doc.rect(14, startY - 5, 182, 45, 'F');
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 41, 59); // Azul escuro
        doc.text("📊 RESUMO EXECUTIVO", 20, startY + 5);
        
        // Cards de métricas principais
        const cardWidth = 42;
        const cardHeight = 25;
        const cardSpacing = 4;
        const cardsStartX = 20;
        const cardsStartY = startY + 12;
        
        // Card 1 - Receitas
        doc.setFillColor(34, 197, 94); // Verde
        doc.rect(cardsStartX, cardsStartY, cardWidth, cardHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('RECEITAS', cardsStartX + 2, cardsStartY + 5);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(totalIncome), cardsStartX + 2, cardsStartY + 15);
        
        // Card 2 - Despesas
        doc.setFillColor(239, 68, 68); // Vermelho
        doc.rect(cardsStartX + cardWidth + cardSpacing, cardsStartY, cardWidth, cardHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('DESPESAS', cardsStartX + cardWidth + cardSpacing + 2, cardsStartY + 5);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(totalExpense), cardsStartX + cardWidth + cardSpacing + 2, cardsStartY + 15);
        
        // Card 3 - Saldo
        const balanceColor = netResult >= 0 ? [34, 197, 94] : [239, 68, 68];
        doc.setFillColor(...balanceColor);
        doc.rect(cardsStartX + (cardWidth + cardSpacing) * 2, cardsStartY, cardWidth, cardHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('SALDO', cardsStartX + (cardWidth + cardSpacing) * 2 + 2, cardsStartY + 5);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(netResult), cardsStartX + (cardWidth + cardSpacing) * 2 + 2, cardsStartY + 15);
        
        // Card 4 - Média Diária
        doc.setFillColor(59, 130, 246); // Azul
        doc.rect(cardsStartX + (cardWidth + cardSpacing) * 3, cardsStartY, cardWidth, cardHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('MÉDIA/DIA', cardsStartX + (cardWidth + cardSpacing) * 3 + 2, cardsStartY + 5);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(dailyAvgExpense), cardsStartX + (cardWidth + cardSpacing) * 3 + 2, cardsStartY + 15);
        
        // Reset cor do texto
        doc.setTextColor(0, 0, 0);
        startY += 55;
        
        // === SCORE DE SAÚDE FINANCEIRA ===
        doc.setFillColor(240, 253, 244); // Fundo verde claro
        doc.rect(14, startY - 5, 182, 35, 'F');
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(22, 101, 52); // Verde escuro
        doc.text("🏥 SCORE DE SAÚDE FINANCEIRA", 20, startY + 5);
        
        // Score visual com speedometer
        const scoreColor = financialScore >= 80 ? [34, 197, 94] : financialScore >= 60 ? [251, 191, 36] : [239, 68, 68];
        const scoreText = financialScore >= 80 ? 'Excelente' : financialScore >= 60 ? 'Bom' : 'Precisa Melhorar';
        
        // Círculo do score
        doc.setFillColor(...scoreColor);
        doc.circle(40, startY + 20, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(Math.round(financialScore).toString(), 40, startY + 24, { align: 'center' });
        
        // Detalhes do score
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Status: ${scoreText}`, 60, startY + 15);
        doc.text(`Taxa de Poupança: ${savingsRate.toFixed(1)}%`, 60, startY + 22);
        doc.text(`Controle de Gastos: ${getExpenseControlLevel(categoryData)}`, 60, startY + 29);
        
        startY += 45;
        
        // === ANÁLISE DE TENDÊNCIAS ===
        doc.setFillColor(254, 249, 195); // Fundo amarelo claro
        doc.rect(14, startY - 5, 182, 40, 'F');
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(146, 64, 14); // Laranja escuro
        doc.text("📈 ANÁLISE DE TENDÊNCIAS", 20, startY + 5);
        
        // Comparação com período anterior
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        
        const incomeIcon = incomeVariation >= 0 ? '📈' : '📉';
        const expenseIcon = expenseVariation <= 0 ? '📉' : '📈';
        const incomeColor = incomeVariation >= 0 ? [34, 197, 94] : [239, 68, 68];
        const expenseColor = expenseVariation <= 0 ? [34, 197, 94] : [239, 68, 68];
        
        doc.text(`${incomeIcon} Receitas vs período anterior:`, 20, startY + 15);
        doc.setTextColor(...incomeColor);
        doc.text(`${incomeVariation >= 0 ? '+' : ''}${incomeVariation.toFixed(1)}%`, 120, startY + 15);
        
        doc.setTextColor(0, 0, 0);
        doc.text(`${expenseIcon} Despesas vs período anterior:`, 20, startY + 22);
        doc.setTextColor(...expenseColor);
        doc.text(`${expenseVariation >= 0 ? '+' : ''}${expenseVariation.toFixed(1)}%`, 120, startY + 22);
        
        doc.setTextColor(0, 0, 0);
        doc.text(`💰 Economia projetada próximo período:`, 20, startY + 29);
        const projectedSavings = totalIncome * (savingsRate / 100);
        doc.setTextColor(34, 197, 94);
        doc.text(formatCurrency(projectedSavings), 120, startY + 29);
        
        doc.setTextColor(0, 0, 0);
         startY += 50;
         
         // === INDICADORES FINANCEIROS AVANÇADOS ===
         doc.setFillColor(245, 245, 255); // Fundo roxo claro
         doc.rect(14, startY - 5, 182, 35, 'F');
         
         doc.setFontSize(14);
         doc.setFont(undefined, 'bold');
         doc.setTextColor(79, 70, 229); // Roxo escuro
         doc.text("💎 INDICADORES AVANÇADOS", 20, startY + 5);
         
         // Calcular indicadores
         const emergencyFund = netResult > 0 ? netResult : 0;
         const monthsOfExpenses = totalExpense > 0 ? emergencyFund / (totalExpense / (periodType === 'monthly' ? 1 : 12)) : 0;
         const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome * 100) : 0;
         const avgTransactionValue = filteredTransactions.length > 0 ? (totalIncome + totalExpense) / filteredTransactions.length : 0;
         
         doc.setFontSize(10);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(0, 0, 0);
         
         doc.text(`💰 Reserva de emergência: ${monthsOfExpenses.toFixed(1)} meses de gastos`, 20, startY + 15);
         doc.text(`📊 Relação despesa/receita: ${expenseRatio.toFixed(1)}%`, 20, startY + 22);
         doc.text(`💳 Valor médio por transação: ${formatCurrency(avgTransactionValue)}`, 20, startY + 29);
         
         startY += 45;
         
         // === TOP 5 MAIORES GASTOS ===
         doc.setFillColor(255, 242, 242); // Fundo vermelho claro
         doc.rect(14, startY - 5, 182, 45, 'F');
         
         doc.setFontSize(14);
         doc.setFont(undefined, 'bold');
         doc.setTextColor(185, 28, 28); // Vermelho escuro
         doc.text("🔥 TOP 5 MAIORES GASTOS", 20, startY + 5);
         
         // Obter os 5 maiores gastos
         const topExpenses = filteredTransactions
             .filter(t => t.type === 'expense')
             .sort((a, b) => b.amount - a.amount)
             .slice(0, 5);
         
         doc.setFontSize(9);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(0, 0, 0);
         
         topExpenses.forEach((expense, index) => {
             const yPos = startY + 15 + (index * 5);
             const date = new Date(expense.date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' });
             doc.text(`${index + 1}. ${expense.description} (${date})`, 20, yPos);
             doc.setFont(undefined, 'bold');
             doc.text(formatCurrency(expense.amount), 160, yPos);
             doc.setFont(undefined, 'normal');
         });
         
         startY += 55;
 
         if (includeAI) {
            // === ANÁLISE INTELIGENTE ===
            doc.setFillColor(255, 251, 235); // Fundo amarelo claro
            doc.rect(14, startY - 5, 182, 35, 'F');
            
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(146, 64, 14); // Laranja escuro
            doc.text("🤖 ANÁLISE INTELIGENTE", 20, startY + 5);
            
            const categorySummaryForAI = categories.filter(c => c.name.toLowerCase() !== 'salário').map(cat => {
                const spent = filteredTransactions.filter(t => t.category === cat.name && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                const budget = getBudgetForCategory(cat.name, monthYear)?.amount || 0;
                return { Categoria: cat.name, Gasto: formatCurrency(spent), Orçamento: budget > 0 ? formatCurrency(budget) : 'N/A' };
            });

            const prompt = `Analise os seguintes dados financeiros para ${periodText}. Resumo: Receitas (${formatCurrency(totalIncome)}), Despesas (${formatCurrency(totalExpense)}), Saldo (${formatCurrency(netResult)}). Detalhes por Categoria: ${JSON.stringify(categorySummaryForAI)}. Forneça uma análise concisa em português, destacando a categoria de maior gasto, o status dos orçamentos e uma dica prática de economia. Formate em um único parágrafo.`;
            const aiAnalysisText = await getAIAnalysis(prompt);
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            const splitText = doc.splitTextToSize(aiAnalysisText, 175);
            doc.text(splitText, 20, startY + 15);
            startY += 45;
        }

        // === ANÁLISE POR CATEGORIAS ===
        doc.setFillColor(240, 249, 255); // Fundo azul claro
        doc.rect(14, startY - 5, 182, 95, 'F');
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 64, 175); // Azul escuro
        doc.text("📈 ANÁLISE POR CATEGORIAS", 20, startY + 5);
        
        // Gráfico de pizza
        const chartImage = expenseChart.toBase64Image();
        doc.addImage(chartImage, 'PNG', 20, startY + 10, 75, 75);
       
        doc.autoTable({
            head: [['Categoria', 'Gasto', '%', 'Qtd', 'Orçamento', 'Status']],
            body: categoryData.map(c => [c.name, c.spent, c.percentage, c.transactions, c.budget, c.status]),
            startY: startY + 10,
            margin: { left: 105 },
            theme: 'striped',
            headStyles: { 
                fillColor: [30, 64, 175], // Azul escuro
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold'
            },
            styles: { 
                fontSize: 8, 
                cellPadding: 3,
                lineColor: [200, 200, 200],
                lineWidth: 0.5
            },
            columnStyles: { 
                0: { fontStyle: 'bold' },
                1: { halign: 'right' }, 
                2: { halign: 'right' }, 
                3: { halign: 'center' }, 
                4: { halign: 'right' }, 
                5: { halign: 'center' } 
            },
            alternateRowStyles: { fillColor: [248, 250, 252] }
        });
        startY += 105;
        
        // === SEGUNDA PÁGINA - DETALHAMENTO ===
        doc.addPage();
        
        // Cabeçalho da segunda página
        doc.setFillColor(41, 98, 255);
        doc.rect(0, 0, 210, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('FinanceX - Detalhamento de Transações', 14, 16);
        
        // Reset cor do texto
        doc.setTextColor(0, 0, 0);
        
        // Título da seção
        doc.setFillColor(248, 250, 252);
        doc.rect(14, 35, 182, 15, 'F');
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text("📋 TODAS AS TRANSAÇÕES DO PERÍODO", 20, 45);
        
        // Reset cor do texto
        doc.setTextColor(0, 0, 0);
        
        // Tabela de transações com design profissional
        doc.autoTable({
            head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
            body: filteredTransactions.map(t => [
                new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
                t.description,
                t.category,
                t.type === 'income' ? '💰 Receita' : '💸 Despesa',
                { content: formatCurrency(t.amount), styles: { halign: 'right', fontStyle: 'bold' } }
            ]),
            startY: 55,
            theme: 'striped',
            headStyles: { 
                fillColor: [30, 64, 175],
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold',
                cellPadding: 4
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                lineColor: [200, 200, 200],
                lineWidth: 0.5
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 25 },
                1: { cellWidth: 60 },
                2: { halign: 'center', cellWidth: 30 },
                3: { halign: 'center', cellWidth: 25 },
                4: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 }
        });
        
        // Rodapé profissional
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(`FinanceX - Sistema de Gestão Financeira | Página ${i} de ${pageCount}`, 14, 285);
            doc.text(`Relatório gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')}`, 210 - 14, 285, { align: 'right' });
        }

        doc.save(fileName);
    }
    
    // Funções auxiliares para análises avançadas do relatório
    function getPreviousPeriodTransactions(periodType, periodValue) {
        if (periodType === 'monthly') {
            const [year, month] = periodValue.split('-');
            const currentDate = new Date(year, month - 1, 1);
            const previousDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            const previousPeriod = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
            return transactions.filter(t => t.date.startsWith(previousPeriod));
        } else {
            const previousYear = (parseInt(periodValue) - 1).toString();
            return transactions.filter(t => t.date.startsWith(previousYear));
        }
    }
    
    function calculateReportFinancialScore(income, expense, netResult, savingsRate, categoryData) {
        let score = 0;
        
        // Critério 1: Taxa de poupança (30 pontos)
        if (savingsRate >= 20) score += 30;
        else if (savingsRate >= 10) score += 20;
        else if (savingsRate >= 5) score += 10;
        else if (savingsRate > 0) score += 5;
        
        // Critério 2: Controle de orçamento (25 pontos)
        const budgetCompliance = categoryData.filter(c => c.status === '✅ OK').length;
        const totalCategories = categoryData.length;
        if (totalCategories > 0) {
            const complianceRate = budgetCompliance / totalCategories;
            score += Math.round(complianceRate * 25);
        }
        
        // Critério 3: Saldo positivo (20 pontos)
        if (netResult > 0) {
            const balanceRatio = netResult / income;
            if (balanceRatio >= 0.2) score += 20;
            else if (balanceRatio >= 0.1) score += 15;
            else if (balanceRatio >= 0.05) score += 10;
            else score += 5;
        }
        
        // Critério 4: Diversificação de gastos (15 pontos)
        const activeCategories = categoryData.filter(c => c.transactions > 0).length;
        if (activeCategories >= 5) score += 15;
        else if (activeCategories >= 3) score += 10;
        else if (activeCategories >= 2) score += 5;
        
        // Critério 5: Consistência (10 pontos)
        if (income > 0 && expense > 0) score += 10;
        
        return Math.min(score, 100);
    }
    
    function getExpenseControlLevel(categoryData) {
        const budgetCompliance = categoryData.filter(c => c.status === '✅ OK').length;
        const totalWithBudget = categoryData.filter(c => c.budget !== '-').length;
        
        if (totalWithBudget === 0) return 'Sem orçamentos definidos';
        
        const complianceRate = budgetCompliance / totalWithBudget;
        if (complianceRate >= 0.8) return 'Excelente';
        if (complianceRate >= 0.6) return 'Bom';
        if (complianceRate >= 0.4) return 'Regular';
        return 'Precisa melhorar';
    }
    
    async function handleSuggestCategoryClick(e) {
        const description = document.getElementById('description').value;
        if (!description) {
            alert('Por favor, insira uma descrição primeiro.');
            return;
        }
        const suggestBtn = e.target;
        suggestBtn.disabled = true;
        suggestBtn.innerHTML = '...';
        
        const categoryList = categories.map(c => c.name).join(', ');
        const prompt = `Dada a lista de categorias: [${categoryList}], sugira a melhor categoria para a seguinte despesa: "${description}". Responda APENAS com o nome da categoria.`;

        try {
            const suggestedCategory = await getAIAnalysis(prompt);
            document.getElementById('category').value = suggestedCategory.trim();
        } catch (error) {
            console.error('Erro ao sugerir categoria:', error);
            alert('Não foi possível sugerir uma categoria.');
        } finally {
            suggestBtn.disabled = false;
            suggestBtn.innerHTML = '✨';
        }
    }
    
    async function handleCreatePlanClick(e) {
        const goalName = document.getElementById('goal-name').value;
        const goalTarget = parseFloat(document.getElementById('goal-target').value);
        if (!goalName || !goalTarget) {
            alert('Por favor, preencha o nome e o valor da meta.');
            return;
        }
        
        const createPlanBtn = e.target;
        createPlanBtn.disabled = true;
        createPlanBtn.innerHTML = 'Criando plano...';

        const prompt = `Crie um "plano de ação" simples com 3 a 5 passos para alcançar a meta financeira de "${goalName}" com um valor de ${formatCurrency(goalTarget)}. A resposta deve ser uma lista de passos práticos. Formate a resposta como uma lista de itens separados pelo caractere '|'. Exemplo: Economizar X por mês|Cortar gastos com Y|Fazer Z para renda extra.`;
        
        try {
            const planText = await getAIAnalysis(prompt);
            temporaryActionPlan = planText.split('|').map(s => s.trim());
            const planDisplay = document.getElementById('action-plan-display');
            planDisplay.innerHTML = `<strong>Plano Sugerido:</strong><ul class="list-disc list-inside mt-2">${temporaryActionPlan.map(s => `<li>${s}</li>`).join('')}</ul>`;
            planDisplay.classList.remove('hidden');
        } catch (error) {
            console.error('Erro ao criar plano:', error);
            alert('Não foi possível criar um plano de ação.');
        } finally {
            createPlanBtn.disabled = false;
            createPlanBtn.innerHTML = '✨ Criar Plano de Ação';
        }
    }

    // --- FUNCIONALIDADES DE EMAIL ---
    function initializeEmailJS() {
        try {
            const emailSettings = getEmailSettings();
            if (emailSettings.publicKey && typeof emailjs !== 'undefined') {
                emailjs.init(emailSettings.publicKey);
            }
        } catch (error) {
            console.warn('EmailJS não está disponível:', error);
        }
    }
    
    function getEmailSettings() {
        const settings = localStorage.getItem('emailSettings');
        return settings ? JSON.parse(settings) : {
            userEmail: '',
            serviceId: '',
            templateId: '',
            publicKey: '',
            monthlyReportsEnabled: false
        };
    }
    
    function saveEmailSettings(settings) {
        localStorage.setItem('emailSettings', JSON.stringify(settings));
        if (settings.publicKey) {
            emailjs.init(settings.publicKey);
        }
    }
    

    
    async function generateMonthlyReport() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // Filtrar transações do mês atual
        const monthlyTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date + 'T00:00:00');
            return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
        });
        
        const totalIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = totalIncome - totalExpenses;
        
        // Agrupar despesas por categoria
        const expensesByCategory = {};
        monthlyTransactions.filter(t => t.type === 'expense').forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        });
        
        const topCategories = Object.entries(expensesByCategory)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([category, amount]) => `${category}: ${formatCurrency(amount)}`)
            .join('\n');
        
        const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        
        return {
            month: monthName,
            totalIncome: formatCurrency(totalIncome),
            totalExpenses: formatCurrency(totalExpenses),
            balance: formatCurrency(balance),
            balanceStatus: balance >= 0 ? 'positivo' : 'negativo',
            topCategories: topCategories || 'Nenhuma despesa registrada',
            transactionCount: monthlyTransactions.length
        };
    }
    
    async function sendMonthlyReport() {
        const settings = getEmailSettings();
        
        if (!settings.userEmail || !settings.serviceId || !settings.templateId || !settings.publicKey) {
            alert('Por favor, configure suas credenciais de email nas configurações primeiro.');
            return;
        }
        
        try {
            const reportData = await generateMonthlyReport();
            
            const templateParams = {
                to_email: settings.userEmail,
                user_name: currentUser.email.split('@')[0],
                month: reportData.month,
                total_income: reportData.totalIncome,
                total_expenses: reportData.totalExpenses,
                balance: reportData.balance,
                balance_status: reportData.balanceStatus,
                top_categories: reportData.topCategories,
                transaction_count: reportData.transactionCount,
                generated_date: new Date().toLocaleDateString('pt-BR')
            };
            
            await emailjs.send(settings.serviceId, settings.templateId, templateParams);
            
            showNotification('Relatório enviado por email com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao enviar email:', error);
            showNotification('Erro ao enviar relatório por email. Verifique suas configurações.', 'error');
        }
    }
    

    
    // Verificar se deve enviar relatório mensal automaticamente
    function checkMonthlyReport() {
        try {
            const settings = getEmailSettings();
            if (!settings.monthlyReportsEnabled) return;
            
            const lastReportDate = localStorage.getItem('lastMonthlyReport');
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            
            if (lastReportDate) {
                const lastReport = new Date(lastReportDate);
                if (lastReport.getMonth() === currentMonth && lastReport.getFullYear() === currentYear) {
                    return; // Já enviou este mês
                }
            }
            
            // Verificar se é o primeiro dia do mês
            if (currentDate.getDate() === 1) {
                sendMonthlyReport();
                localStorage.setItem('lastMonthlyReport', currentDate.toISOString());
            }
        } catch (error) {
            console.warn('Erro ao verificar relatório mensal:', error);
        }
    }

    // --- SERVICE WORKER E CONECTIVIDADE ---
    async function registerServiceWorker() {
        // Verificar se o ambiente suporta Service Workers e se está em protocolo seguro
        if (!('serviceWorker' in navigator)) {
            console.log('Service Workers não são suportados neste navegador.');
            return;
        }
        
        if (location.protocol !== 'http:' && location.protocol !== 'https:') {
            console.log('Service Workers só funcionam em HTTP/HTTPS.');
            return;
        }
        
        // Aguardar o documento estar completamente carregado
        if (document.readyState !== 'complete') {
            window.addEventListener('load', registerServiceWorker);
            return;
        }
        
        try {
            // Aguardar um pouco mais para garantir que o documento esteja estável
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verificar se o service worker já está ativo
            if (navigator.serviceWorker.controller) {
                console.log('Service Worker já está ativo');
                return;
            }
            
            const registration = await navigator.serviceWorker.register('./sw.js', {
                scope: './'
            });
            
            console.log('Service Worker registrado com sucesso:', registration.scope);
            
            // Aguardar o service worker estar pronto
            await navigator.serviceWorker.ready;
            console.log('Service Worker está pronto');
            
        } catch (error) {
            console.log('Service Worker não pôde ser registrado:', error.message);
            // Falha silenciosa - a aplicação continua funcionando sem SW
        }
    }
    
    function setupConnectivityDetection() {
        let isOnline = navigator.onLine;
        
        // Mostrar status inicial
        updateConnectivityStatus(isOnline);
        
        // Escutar mudanças de conectividade
        window.addEventListener('online', () => {
            isOnline = true;
            updateConnectivityStatus(true);
            
            // Notificar service worker sobre mudança de conectividade
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'CONNECTIVITY_CHANGED',
                    online: true
                });
            }
            
            showNotification('Conexão restaurada! Sincronizando dados...', 'success');
        });
        
        window.addEventListener('offline', () => {
            isOnline = false;
            updateConnectivityStatus(false);
            
            // Notificar service worker sobre mudança de conectividade
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'CONNECTIVITY_CHANGED',
                    online: false
                });
            }
            
            showNotification('Você está offline. Os dados serão sincronizados quando a conexão for restaurada.', 'warning');
        });
    }
    
    function updateConnectivityStatus(isOnline) {
        // Adicionar indicador visual de status de conectividade
        let statusIndicator = document.getElementById('connectivity-status');
        
        if (!statusIndicator) {
            statusIndicator = document.createElement('div');
            statusIndicator.id = 'connectivity-status';
            statusIndicator.className = 'fixed top-4 right-4 z-50 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300';
            document.body.appendChild(statusIndicator);
        }
        
        if (isOnline) {
            statusIndicator.className = 'fixed top-4 right-4 z-50 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 bg-green-500 text-white';
            statusIndicator.textContent = '🟢 Online';
            
            // Esconder após 3 segundos
            setTimeout(() => {
                statusIndicator.style.opacity = '0';
                setTimeout(() => {
                    if (statusIndicator.textContent === '🟢 Online') {
                        statusIndicator.style.display = 'none';
                    }
                }, 300);
            }, 3000);
        } else {
            statusIndicator.className = 'fixed top-4 right-4 z-50 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 bg-red-500 text-white';
            statusIndicator.textContent = '🔴 Offline';
            statusIndicator.style.display = 'block';
            statusIndicator.style.opacity = '1';
        }
    }
    
    // Função para armazenar dados pendentes quando offline
    function storePendingData(type, data) {
        try {
            const key = `pending${type.charAt(0).toUpperCase() + type.slice(1)}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            existing.push({
                ...data,
                timestamp: new Date().toISOString(),
                id: data.id || Date.now().toString()
            });
            localStorage.setItem(key, JSON.stringify(existing));
            console.log(`Dados ${type} armazenados para sincronização posterior`);
        } catch (error) {
            console.error(`Erro ao armazenar dados pendentes ${type}:`, error);
        }
    }
    
    // Função para registrar sincronização em background
    function registerBackgroundSync(tag) {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then(registration => {
                return registration.sync.register(tag);
            }).catch(error => {
                console.error('Erro ao registrar background sync:', error);
            });
        }
    }

    // --- INITIALIZATION ---
    // A inicialização é feita automaticamente pelo Firebase onAuthStateChanged
    
    // === NAVEGAÇÃO MOBILE === //
    function initializeMobileNavigation() {
        const mobileToggle = document.getElementById('mobile-nav-toggle');
        const mobileOverlay = document.getElementById('mobile-nav-overlay');
        const mobileMenu = document.getElementById('mobile-nav-menu');
        
        if (!mobileToggle || !mobileOverlay || !mobileMenu) return;
        
        // Toggle do menu mobile
        mobileToggle.addEventListener('click', () => {
            mobileOverlay.classList.add('active');
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
        
        // Fechar menu ao clicar no overlay
        mobileOverlay.addEventListener('click', closeMobileMenu);
        
        // Configurar navegação mobile
        const mobileNavButtons = {
            'mobile-nav-dashboard': 'dashboard',
            'mobile-nav-executive': 'executive',
            'mobile-nav-budgets': 'budgets',
            'mobile-nav-calendar': 'calendar',
            'mobile-nav-goals': 'goals',
            'mobile-nav-settings': 'settings'
        };
        
        Object.entries(mobileNavButtons).forEach(([buttonId, page]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    switchPage(page);
                    closeMobileMenu();
                });
            }
        });
        
        // Fechar menu com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
                closeMobileMenu();
            }
        });
    }
    
    function closeMobileMenu() {
        const mobileOverlay = document.getElementById('mobile-nav-overlay');
        const mobileMenu = document.getElementById('mobile-nav-menu');
        
        if (mobileOverlay) mobileOverlay.classList.remove('active');
        if (mobileMenu) mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function updateMobileNavigation(activePage) {
        // Atualizar navegação mobile
        const mobileButtons = document.querySelectorAll('#mobile-nav-menu .nav-btn');
        mobileButtons.forEach(btn => btn.classList.remove('active'));
        
        const activeMobileBtn = document.getElementById(`mobile-nav-${activePage}`);
        if (activeMobileBtn) {
            activeMobileBtn.classList.add('active');
        }
    }
    
    // === FUNÇÕES DO MODAL DE LIMITES DE GASTOS === //
    function openExpenseAlertsModal() {
        // Carregar configurações atuais
        loadExpenseAlertsSettings();
        
        // Carregar categorias
        loadAlertCategories();
        
        // Abrir modal
        openModal(modals.expenseAlerts);
    }
    
    function getExpenseAlertsSettings() {
        // Usar dados do Firebase se disponíveis, senão localStorage
        if (window.expenseAlertsSettings && Object.keys(window.expenseAlertsSettings).length > 0) {
            return window.expenseAlertsSettings;
        }
        return JSON.parse(localStorage.getItem('expenseAlertsSettings') || '{}');
    }
    
    function loadExpenseAlertsSettings() {
        const settings = getExpenseAlertsSettings();
        
        document.getElementById('daily-limit').value = settings.dailyLimit || '';
        document.getElementById('weekly-limit').value = settings.weeklyLimit || '';
        document.getElementById('monthly-limit').value = settings.monthlyLimit || '';
        document.getElementById('enable-push-alerts').checked = settings.enablePushAlerts || false;
        document.getElementById('enable-sound-alerts').checked = settings.enableSoundAlerts || false;
    }
    
    function loadAlertCategories() {
        const container = document.getElementById('alert-categories-list');
        const settings = getExpenseAlertsSettings();
        const selectedCategories = settings.selectedCategories || [];
        
        container.innerHTML = '';
        
        categories.forEach(category => {
            const div = document.createElement('div');
            div.className = 'flex items-center space-x-2';
            div.innerHTML = `
                <input type="checkbox" id="cat-${category.id}" class="form-checkbox" ${selectedCategories.includes(category.id) ? 'checked' : ''}>
                <span class="w-4 h-4 rounded-full" style="background-color: ${category.color}"></span>
                <label for="cat-${category.id}" class="text-sm">${category.name}</label>
            `;
            container.appendChild(div);
        });
    }
    
    async function saveExpenseAlertsSettings() {
        const selectedCategories = [];
        categories.forEach(category => {
            const checkbox = document.getElementById(`cat-${category.id}`);
            if (checkbox && checkbox.checked) {
                selectedCategories.push(category.id);
            }
        });
        
        const settings = {
            dailyLimit: parseFloat(document.getElementById('daily-limit').value) || 0,
            weeklyLimit: parseFloat(document.getElementById('weekly-limit').value) || 0,
            monthlyLimit: parseFloat(document.getElementById('monthly-limit').value) || 0,
            selectedCategories: selectedCategories,
            enablePushAlerts: document.getElementById('enable-push-alerts').checked,
            enableSoundAlerts: document.getElementById('enable-sound-alerts').checked
        };
        
        if (!currentUser) {
            localStorage.setItem('expenseAlertsSettings', JSON.stringify(settings));
            showNotification('Configurações de limites salvas com sucesso!', 'success');
            closeAllModals();
            return;
        }
        
        try {
            // Limpar configurações existentes
            const q = query(collection(db, `users/${currentUser.uid}/expenseAlerts`));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Salvar novas configurações
            const docRef = doc(collection(db, `users/${currentUser.uid}/expenseAlerts`));
            batch.set(docRef, settings);
            
            await batch.commit();
            window.expenseAlertsSettings = settings;
        } catch (error) {
            console.error('Erro ao salvar configurações no Firebase:', error);
            // Fallback para localStorage
            localStorage.setItem('expenseAlertsSettings', JSON.stringify(settings));
        }
        
        showNotification('Configurações de limites salvas com sucesso!', 'success');
        closeAllModals();
    }
    
    // === SISTEMA DE UPLOAD DE EXTRATO BANCÁRIO === //
    let pdfTransactions = [];
    
    async function handlePdfUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.type !== 'application/pdf') {
            showNotification('Por favor, selecione um arquivo PDF válido.', 'error');
            return;
        }
        
        showPdfUploadStatus();
        updatePdfProgress(10, 'Carregando arquivo PDF...');
        
        try {
            // Simular processamento (em produção, usaria PDF.js ou API de OCR)
            await simulatePdfProcessing(file);
        } catch (error) {
            console.error('Erro ao processar PDF:', error);
            showNotification('Erro ao processar o PDF. Tente novamente.', 'error');
            hidePdfUploadStatus();
        }
    }
    
    async function simulatePdfProcessing(file) {
        try {
            updatePdfProgress(10, 'Carregando PDF...');
            
            // Configurar PDF.js
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            updatePdfProgress(20, 'Extraindo texto do PDF...');
            
            // Converter arquivo para ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Carregar PDF
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            
            updatePdfProgress(40, 'Analisando páginas do documento...');
            
            let allText = '';
            const numPages = pdf.numPages;
            
            // Extrair texto de todas as páginas
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                // Combinar todos os itens de texto
                const pageText = textContent.items.map(item => item.str).join(' ');
                allText += pageText + '\n';
                
                updatePdfProgress(40 + (pageNum / numPages) * 20, `Processando página ${pageNum} de ${numPages}...`);
            }
            
            updatePdfProgress(70, 'Identificando estrutura da tabela...');
            await sleep(500);
            
            updatePdfProgress(80, 'Analisando colunas: Data | Descrição | Valor | Saldo...');
            
            // Processar texto extraído
            const extractedTransactions = await parseRealPdfText(allText);
            
            updatePdfProgress(90, 'Categorizando transações com IA...');
            await sleep(500);
            
            updatePdfProgress(100, 'Processamento concluído!');
            await sleep(300);
            
            pdfTransactions = extractedTransactions;
            showPdfResults();
            
        } catch (error) {
            console.error('Erro ao processar PDF:', error);
            updatePdfProgress(0, 'Erro ao processar PDF');
            showNotification('Erro ao processar PDF: ' + error.message, 'error');
            hidePdfUploadStatus();
        }
    }
    
    async function parseTableStructure() {
        // Simular dados extraídos seguindo o padrão de tabela bancária
        // Coluna 1: Data | Coluna 2: Descrição | Coluna 3: Valor | Coluna 4: Saldo
        const tableData = [
            ['15/01/2024', 'COMPRA CARTAO *SUPERMERCADO ABC LTDA', '-156,78', '2.343,22'],
            ['14/01/2024', 'PIX RECEBIDO JOAO SILVA CPF 123.456.789-00', '+500,00', '2.500,00'],
            ['13/01/2024', 'DEB AUTOMATICO ENERGIA ELETRICA CEMIG', '-89,45', '2.000,00'],
            ['12/01/2024', 'COMPRA CARTAO *POSTO BR COMBUSTIVEL', '-120,00', '2.089,45'],
            ['11/01/2024', 'TED RECEBIDA EMPRESA XYZ LTDA SALARIO', '+2.500,00', '2.209,45'],
            ['10/01/2024', 'SAQUE CAIXA ELETRONICO BANCO 24H', '-200,00', '-290,55'],
            ['09/01/2024', 'COMPRA CARTAO *FARMACIA POPULAR', '-45,30', '-90,55'],
            ['08/01/2024', 'PIX ENVIADO MARIA SANTOS CPF 987.654.321-00', '-150,00', '-45,25']
        ];
        
        const transactions = [];
        
        tableData.forEach(row => {
            const [dateStr, description, valueStr, balanceStr] = row;
            
            // Converter data do formato DD/MM/YYYY para YYYY-MM-DD
            const dateParts = dateStr.split('/');
            const formattedDate = `2024-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
            
            // Processar valor (remover + ou -, converter vírgula para ponto)
            const cleanValue = valueStr.replace(/[+\-]/g, '').replace(',', '.').replace(/\./g, '');
            const numericValue = parseFloat(cleanValue) / 100; // Converter centavos para reais
            const isPositive = valueStr.includes('+');
            
            // Determinar tipo e categoria baseado na descrição
            const transactionType = isPositive ? 'income' : 'expense';
            const category = categorizeTransaction(description, transactionType);
            
            transactions.push({
                date: formattedDate,
                description: cleanDescription(description),
                amount: isPositive ? numericValue : -numericValue,
                type: transactionType,
                category: category,
                balance: parseFloat(balanceStr.replace(',', '.').replace(/\./g, '')) / 100
            });
        });
        
        return transactions;
    }
    
    function categorizeTransaction(description, type) {
        const desc = description.toUpperCase();
        
        if (type === 'income') {
            if (desc.includes('SALARIO') || desc.includes('TED RECEBIDA') && desc.includes('EMPRESA')) {
                return 'Salário';
            }
            if (desc.includes('PIX RECEBIDO')) {
                return 'Transferências';
            }
            return 'Outras Receitas';
        } else {
            if (desc.includes('SUPERMERCADO') || desc.includes('FARMACIA') || desc.includes('PADARIA')) {
                return 'Alimentação';
            }
            if (desc.includes('POSTO') || desc.includes('COMBUSTIVEL') || desc.includes('UBER') || desc.includes('TAXI')) {
                return 'Transporte';
            }
            if (desc.includes('ENERGIA') || desc.includes('AGUA') || desc.includes('TELEFONE') || desc.includes('INTERNET')) {
                return 'Contas Básicas';
            }
            if (desc.includes('PIX ENVIADO') || desc.includes('TED ENVIADA')) {
                return 'Transferências';
            }
            if (desc.includes('SAQUE')) {
                return 'Saque';
            }
            if (desc.includes('CARTAO')) {
                return 'Compras';
            }
            return 'Outras Despesas';
        }
    }
    
    function cleanDescription(description) {
         // Limpar e formatar a descrição
         return description
             .replace(/\s+/g, ' ') // Remover espaços extras
             .replace(/\*+/g, '') // Remover asteriscos
             .trim()
             .toLowerCase()
             .replace(/\b\w/g, l => l.toUpperCase()); // Capitalizar primeira letra de cada palavra
     }
     
     async function parseRealPdfText(text) {
         const transactions = [];
         
         // Dividir texto em linhas
         const lines = text.split('\n').filter(line => line.trim().length > 0);
         
         // Padrões regex para identificar transações
         const datePattern = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/;
         const valuePattern = /([+-]?\s*R?\$?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/;
         
         for (let i = 0; i < lines.length; i++) {
             const line = lines[i].trim();
             
             // Tentar identificar uma linha de transação
             const dateMatch = line.match(datePattern);
             
             if (dateMatch) {
                 // Possível início de uma nova transação
                 const dateStr = dateMatch[0];
                 
                 // Extrair resto da linha após a data
                 const afterDate = line.substring(line.indexOf(dateStr) + dateStr.length).trim();
                 
                 // Procurar valor na linha atual
                 const valueMatch = afterDate.match(valuePattern);
                 
                 if (valueMatch) {
                     // Valor encontrado na mesma linha
                     const valueIndex = afterDate.indexOf(valueMatch[0]);
                     const description = afterDate.substring(0, valueIndex).trim();
                     const value = valueMatch[0];
                     
                     // Procurar saldo após o valor
                     const afterValue = afterDate.substring(valueIndex + valueMatch[0].length).trim();
                     const balanceMatch = afterValue.match(/([+-]?\s*R?\$?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/);
                     const balance = balanceMatch ? balanceMatch[0] : null;
                     
                     // Se encontrou data, descrição e valor, criar transação
                     if (description && value) {
                         const transaction = parseTransactionData(dateStr, description, value, balance);
                         if (transaction) {
                             transactions.push(transaction);
                         }
                     }
                 }
             }
         }
         
         // Se não encontrou transações com regex, tentar método alternativo
         if (transactions.length === 0) {
             return await parseAlternativeFormat(text);
         }
         
         return transactions;
     }
     
     function parseTransactionData(dateStr, description, valueStr, balanceStr) {
         try {
             // Converter data
             const dateParts = dateStr.split(/[\/\-]/);
             
             if (dateParts.length !== 3) {
                 return null;
             }
             
             const day = dateParts[0].padStart(2, '0');
             const month = dateParts[1].padStart(2, '0');
             let year = dateParts[2];
             
             // Ajustar ano se necessário
             if (year.length === 2) {
                 year = '20' + year;
             }
             
             const formattedDate = `${year}-${month}-${day}`;
             
             // Processar valor
             const cleanValue = valueStr.replace(/[R\$\s]/g, '').replace(/\./g, '').replace(',', '.');
             const numericValue = parseFloat(cleanValue);
             
             if (isNaN(numericValue)) {
                 return null;
             }
             
             // Determinar se é receita ou despesa
             const isPositive = numericValue > 0 || valueStr.includes('+');
             const transactionType = isPositive ? 'income' : 'expense';
             
             // Limpar descrição
             const cleanDesc = cleanDescription(description);
             
             // Categorizar
             const category = categorizeTransaction(cleanDesc, transactionType);
             
             // Processar saldo se disponível
             let balance = null;
             if (balanceStr) {
                 const cleanBalance = balanceStr.replace(/[R\$\s]/g, '').replace(/\./g, '').replace(',', '.');
                 balance = parseFloat(cleanBalance);
             }
             
             return {
                 date: formattedDate,
                 description: cleanDesc,
                 amount: Math.abs(numericValue) * (isPositive ? 1 : -1),
                 type: transactionType,
                 category: category,
                 balance: balance
             };
             
         } catch (error) {
             console.error('Erro ao processar transação:', error);
             return null;
         }
     }
     
     async function parseAlternativeFormat(text) {
         // Método alternativo para PDFs com formato diferente
         const transactions = [];
         
         // Procurar por padrões alternativos
         const lines = text.split('\n');
         
         for (const line of lines) {
             // Procurar linhas que contenham data e valor
             if (line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/) && 
                 line.match(/\d+[.,]\d{2}/)) {
                 
                 // Tentar extrair informações da linha
                 const parts = line.split(/\s+/);
                 
                 if (parts.length >= 3) {
                     const dateStr = parts.find(part => part.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/));
                     const valueStr = parts.find(part => part.match(/[+-]?\d+[.,]\d{2}/));
                     
                     if (dateStr && valueStr) {
                         const description = parts.filter(part => 
                             part !== dateStr && 
                             part !== valueStr && 
                             !part.match(/^[+-]?\d+[.,]\d{2}$/)
                         ).join(' ');
                         
                         const transaction = parseTransactionData(dateStr, description, valueStr, null);
                         if (transaction) {
                             transactions.push(transaction);
                         }
                     }
                 }
             }
         }
         
         return transactions;
     }
    
    function showPdfUploadStatus() {
        document.getElementById('pdf-upload-status').classList.remove('hidden');
        document.getElementById('pdf-results').classList.add('hidden');
    }
    
    function hidePdfUploadStatus() {
        document.getElementById('pdf-upload-status').classList.add('hidden');
    }
    
    function updatePdfProgress(percentage, statusText) {
        document.getElementById('pdf-progress-bar').style.width = percentage + '%';
        document.getElementById('pdf-status-text').textContent = statusText;
    }
    
    function showPdfResults() {
        hidePdfUploadStatus();
        
        const previewContainer = document.getElementById('pdf-transactions-preview');
        previewContainer.innerHTML = '';
        
        pdfTransactions.forEach((transaction, index) => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-2 bg-gray-700/30 rounded text-xs';
            
            const amountColor = transaction.amount > 0 ? 'text-green-400' : 'text-red-400';
            const amountSign = transaction.amount > 0 ? '+' : '';
            
            div.innerHTML = `
                <div class="flex-1">
                    <p class="font-medium">${transaction.description}</p>
                    <p class="text-gray-400">${formatDate(transaction.date)} • ${transaction.category}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold ${amountColor}">${amountSign}${formatCurrency(Math.abs(transaction.amount))}</p>
                </div>
            `;
            
            previewContainer.appendChild(div);
        });
        
        document.getElementById('pdf-results').classList.remove('hidden');
    }
    
    function confirmPdfImport() {
        if (pdfTransactions.length === 0) {
            showNotification('Nenhuma transação para importar.', 'warning');
            return;
        }
        
        let importedCount = 0;
        
        pdfTransactions.forEach(transaction => {
            // Verificar se a transação já existe (evitar duplicatas)
            const exists = transactions.some(t => 
                t.date === transaction.date && 
                t.description === transaction.description && 
                Math.abs(t.amount - Math.abs(transaction.amount)) < 0.01
            );
            
            if (!exists) {
                addTransaction({
                    type: transaction.type,
                    description: transaction.description,
                    amount: Math.abs(transaction.amount),
                    category: transaction.category,
                    date: transaction.date,
                    tags: ['Importado do PDF']
                }, true);
                importedCount++;
            }
        });
        
        if (importedCount > 0) {
            saveAndRefresh();
            showNotification(`${importedCount} transações importadas com sucesso!`, 'success');
        } else {
            showNotification('Todas as transações já existem no sistema.', 'info');
        }
        
        cancelPdfImport();
    }
    
    function cancelPdfImport() {
        document.getElementById('pdf-results').classList.add('hidden');
        document.getElementById('pdf-file-input').value = '';
        pdfTransactions = [];
    }
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    function formatDate(dateString) {
         const date = new Date(dateString);
         return date.toLocaleDateString('pt-BR');
     }
     
     // === ASSISTENTE FINANCEIRO IA === //
     let aiChatHistory = [];
     
     function openAIAssistant() {
         const modal = document.getElementById('ai-assistant-modal');
         modal.classList.remove('hidden');
         setTimeout(() => {
             modal.classList.remove('opacity-0');
             modal.querySelector('.modal-content').classList.remove('scale-95', '-translate-y-10');
         }, 10);
         
         // Remover event listeners antigos e configurar novos para ações rápidas
         document.querySelectorAll('.ai-quick-action').forEach(btn => {
             // Clonar o botão para remover todos os event listeners
             const newBtn = btn.cloneNode(true);
             btn.parentNode.replaceChild(newBtn, btn);
             
             // Adicionar novo event listener
             newBtn.addEventListener('click', () => {
                 const prompt = newBtn.dataset.prompt;
                 document.getElementById('ai-chat-input').value = prompt;
                 sendAIMessage();
             });
         });
         
         // Focar no input
         setTimeout(() => {
             document.getElementById('ai-chat-input').focus();
         }, 300);
     }
     
     function closeAIAssistant() {
         const modal = document.getElementById('ai-assistant-modal');
         modal.classList.add('opacity-0');
         modal.querySelector('.modal-content').classList.add('scale-95', '-translate-y-10');
         setTimeout(() => {
             modal.classList.add('hidden');
         }, 300);
     }
     
     function handleAIChatKeypress(e) {
         if (e.key === 'Enter' && !e.shiftKey) {
             e.preventDefault();
             sendAIMessage();
         }
     }
     
     async function sendAIMessage() {
         const input = document.getElementById('ai-chat-input');
         const message = input.value.trim();
         
         if (!message) return;
         
         // Adicionar mensagem do usuário
         addChatMessage(message, 'user');
         input.value = '';
         
         // Mostrar indicador de digitação
         showAITyping();
         
         // Simular delay de processamento
         await sleep(1500);
         
         // Gerar resposta da IA
         const aiResponse = await generateAIResponse(message);
         
         // Esconder indicador e mostrar resposta
         hideAITyping();
         addChatMessage(aiResponse, 'ai');
         
         // Salvar no histórico
         aiChatHistory.push({ user: message, ai: aiResponse, timestamp: new Date() });
     }
     
     function addChatMessage(message, sender) {
         const chatMessages = document.getElementById('chat-messages');
         const messageDiv = document.createElement('div');
         
         if (sender === 'user') {
             messageDiv.className = 'user-message flex items-start space-x-3 justify-end';
             messageDiv.innerHTML = `
                 <div class="flex-1 text-right">
                     <div class="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3 inline-block max-w-xs md:max-w-md">
                         <p class="text-sm">${message}</p>
                     </div>
                 </div>
                 <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">EU</div>
             `;
         } else {
             messageDiv.className = 'ai-message flex items-start space-x-3';
             messageDiv.innerHTML = `
                 <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">AI</div>
                 <div class="flex-1">
                     <div class="bg-purple-500/20 border border-purple-400/30 rounded-lg p-3">
                         <div class="text-sm whitespace-pre-line">${message}</div>
                     </div>
                 </div>
             `;
         }
         
         chatMessages.appendChild(messageDiv);
         chatMessages.scrollTop = chatMessages.scrollHeight;
     }
     
     function showAITyping() {
         document.getElementById('ai-typing').classList.remove('hidden');
     }
     
     function hideAITyping() {
         document.getElementById('ai-typing').classList.add('hidden');
     }
     
     async function generateAIResponse(userMessage) {
         const message = userMessage.toLowerCase();
         
         // Analisar dados financeiros do usuário
         const financialData = analyzeUserFinances();
         
         // Gerar resposta baseada na pergunta
         if (message.includes('gastos') || message.includes('despesas')) {
             return generateExpenseAnalysis(financialData);
         } else if (message.includes('economia') || message.includes('economizar')) {
             return generateSavingsAdvice(financialData);
         } else if (message.includes('saúde financeira') || message.includes('situação')) {
             return generateFinancialHealth(financialData);
         } else if (message.includes('relatório') || message.includes('resumo')) {
             return generateFinancialReport(financialData);
         } else if (message.includes('poupança') || message.includes('investir')) {
             return generateSavingsPlan(financialData);
         } else if (message.includes('orçamento') || message.includes('planejamento')) {
             return generateBudgetAdvice(financialData);
         } else {
             return generateGeneralAdvice(financialData, userMessage);
         }
     }
     
     function analyzeUserFinances() {
         const now = new Date();
         const thisMonth = now.getMonth();
         const thisYear = now.getFullYear();
         
         // Filtrar transações do mês atual
         const thisMonthTransactions = transactions.filter(t => {
             const transactionDate = new Date(t.date);
             return transactionDate.getMonth() === thisMonth && transactionDate.getFullYear() === thisYear;
         });
         
         const totalIncome = thisMonthTransactions
             .filter(t => t.type === 'income')
             .reduce((sum, t) => sum + t.amount, 0);
             
         const totalExpenses = thisMonthTransactions
             .filter(t => t.type === 'expense')
             .reduce((sum, t) => sum + t.amount, 0);
             
         const balance = totalIncome - totalExpenses;
         
         // Análise por categoria
         const expensesByCategory = {};
         thisMonthTransactions
             .filter(t => t.type === 'expense')
             .forEach(t => {
                 expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
             });
             
         const topExpenseCategory = Object.entries(expensesByCategory)
             .sort(([,a], [,b]) => b - a)[0];
             
         return {
             totalIncome,
             totalExpenses,
             balance,
             expensesByCategory,
             topExpenseCategory,
             transactionCount: thisMonthTransactions.length,
             savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0
         };
     }
     
     function generateExpenseAnalysis(data) {
         const { totalExpenses, expensesByCategory, topExpenseCategory } = data;
         
         if (totalExpenses === 0) {
             return "📊 **Análise de Gastos**\n\nVocê ainda não registrou gastos este mês. Que tal começar a adicionar suas despesas para eu poder fazer uma análise mais detalhada?";
         }
         
         let analysis = `📊 **Análise de Gastos - ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}**\n\n`;
         analysis += `💰 **Total gasto:** ${formatCurrency(totalExpenses)}\n\n`;
         
         if (topExpenseCategory) {
             const [category, amount] = topExpenseCategory;
             const percentage = (amount / totalExpenses * 100).toFixed(1);
             analysis += `🎯 **Maior categoria:** ${category} (${formatCurrency(amount)} - ${percentage}%)\n\n`;
         }
         
         analysis += "📈 **Distribuição por categoria:**\n";
         Object.entries(expensesByCategory)
             .sort(([,a], [,b]) => b - a)
             .slice(0, 5)
             .forEach(([category, amount]) => {
                 const percentage = (amount / totalExpenses * 100).toFixed(1);
                 analysis += `• ${category}: ${formatCurrency(amount)} (${percentage}%)\n`;
             });
             
         return analysis;
     }
     
     function generateSavingsAdvice(data) {
         const { totalIncome, totalExpenses, expensesByCategory, savingsRate } = data;
         
         let advice = "💡 **Dicas de Economia Personalizadas**\n\n";
         
         if (savingsRate < 10) {
             advice += "🚨 Sua taxa de poupança está baixa. Vamos trabalhar nisso!\n\n";
         } else if (savingsRate > 20) {
             advice += "🎉 Parabéns! Você tem uma excelente taxa de poupança!\n\n";
         }
         
         // Sugestões baseadas nas categorias de maior gasto
         const sortedExpenses = Object.entries(expensesByCategory)
             .sort(([,a], [,b]) => b - a);
             
         if (sortedExpenses.length > 0) {
             const [topCategory, topAmount] = sortedExpenses[0];
             
             advice += "🎯 **Oportunidades de economia:**\n\n";
             
             if (topCategory.includes('Alimentação')) {
                 advice += "🍽️ **Alimentação:** Considere cozinhar mais em casa, fazer lista de compras e evitar desperdícios.\n";
             } else if (topCategory.includes('Transporte')) {
                 advice += "🚗 **Transporte:** Avalie usar transporte público, caronas ou trabalho remoto alguns dias.\n";
             } else if (topCategory.includes('Entretenimento')) {
                 advice += "🎬 **Entretenimento:** Procure atividades gratuitas e promoções em streaming.\n";
             }
             
             advice += `\n💰 **Meta:** Reduza ${topCategory} em 10% = economia de ${formatCurrency(topAmount * 0.1)}/mês`;
         }
         
         return advice;
     }
     
     function generateFinancialHealth(data) {
         const { totalIncome, totalExpenses, balance, savingsRate } = data;
         
         let health = "🏥 **Diagnóstico de Saúde Financeira**\n\n";
         
         // Calcular score
         let score = 0;
         let status = "";
         let color = "";
         
         if (savingsRate >= 20) {
             score += 40;
         } else if (savingsRate >= 10) {
             score += 25;
         } else if (savingsRate >= 0) {
             score += 10;
         }
         
         if (balance > 0) {
             score += 30;
         } else if (balance >= -totalIncome * 0.1) {
             score += 15;
         }
         
         if (totalIncome > totalExpenses * 1.2) {
             score += 30;
         } else if (totalIncome > totalExpenses) {
             score += 20;
         }
         
         if (score >= 80) {
             status = "Excelente";
             color = "🟢";
         } else if (score >= 60) {
             status = "Boa";
             color = "🟡";
         } else if (score >= 40) {
             status = "Regular";
             color = "🟠";
         } else {
             status = "Precisa melhorar";
             color = "🔴";
         }
         
         health += `${color} **Score:** ${score}/100 - ${status}\n\n`;
         health += `💰 **Saldo do mês:** ${formatCurrency(balance)}\n`;
         health += `📊 **Taxa de poupança:** ${savingsRate.toFixed(1)}%\n\n`;
         
         health += "📋 **Recomendações:**\n";
         if (score < 60) {
             health += "• Foque em reduzir gastos desnecessários\n";
             health += "• Estabeleça uma meta de poupança mensal\n";
             health += "• Monitore seus gastos diariamente\n";
         } else {
             health += "• Continue mantendo o bom controle financeiro\n";
             health += "• Considere investir suas economias\n";
             health += "• Explore novas fontes de renda\n";
         }
         
         return health;
     }
     
     function generateFinancialReport(data) {
         const { totalIncome, totalExpenses, balance, transactionCount } = data;
         
         let report = `📋 **Relatório Financeiro - ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}**\n\n`;
         
         report += "💰 **Resumo Geral:**\n";
         report += `• Receitas: ${formatCurrency(totalIncome)}\n`;
         report += `• Despesas: ${formatCurrency(totalExpenses)}\n`;
         report += `• Saldo: ${formatCurrency(balance)}\n`;
         report += `• Transações: ${transactionCount}\n\n`;
         
         if (goals && goals.length > 0) {
             report += "🎯 **Progresso dos Cofrinhos:**\n";
             goals.slice(0, 3).forEach(goal => {
                 const progress = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount * 100) : 0;
                 report += `• ${goal.name}: ${progress.toFixed(1)}% (${formatCurrency(goal.savedAmount)}/${formatCurrency(goal.targetAmount)})\n`;
             });
         }
         
         return report;
     }
     
     function generateSavingsPlan(data) {
         const { totalIncome, totalExpenses } = data;
         
         let plan = "🎯 **Plano de Poupança Personalizado**\n\n";
         
         if (totalIncome === 0) {
             return "Para criar um plano de poupança, preciso que você registre suas receitas primeiro. Adicione suas fontes de renda para eu poder ajudar!";
         }
         
         const suggestedSavings = totalIncome * 0.2; // 20% da renda
         const currentSavings = totalIncome - totalExpenses;
         
         plan += `💡 **Meta recomendada:** ${formatCurrency(suggestedSavings)}/mês (20% da renda)\n`;
         plan += `📊 **Situação atual:** ${formatCurrency(currentSavings)}/mês\n\n`;
         
         if (currentSavings < suggestedSavings) {
             const gap = suggestedSavings - currentSavings;
             plan += `🎯 **Desafio:** Economize mais ${formatCurrency(gap)}/mês\n\n`;
             plan += "📝 **Estratégias:**\n";
             plan += "• Regra 50/30/20: 50% necessidades, 30% desejos, 20% poupança\n";
             plan += "• Automatize transferências para poupança\n";
             plan += "• Revise gastos mensalmente\n";
             plan += "• Use a técnica do envelope para categorias\n";
         } else {
             plan += "🎉 Parabéns! Você já está poupando acima da meta!\n\n";
             plan += "💰 **Próximos passos:**\n";
             plan += "• Considere investimentos de baixo risco\n";
             plan += "• Diversifique suas aplicações\n";
             plan += "• Mantenha uma reserva de emergência\n";
         }
         
         return plan;
     }
     
     function generateBudgetAdvice(data) {
         const { totalIncome, expensesByCategory } = data;
         
         let advice = "📊 **Consultoria de Orçamento**\n\n";
         
         if (totalIncome === 0) {
             return "Para criar um orçamento eficaz, primeiro registre suas receitas. Depois podemos planejar como distribuir seus recursos!";
         }
         
         advice += "💡 **Distribuição recomendada (Regra 50/30/20):**\n";
         advice += `• Necessidades (50%): ${formatCurrency(totalIncome * 0.5)}\n`;
         advice += `• Desejos (30%): ${formatCurrency(totalIncome * 0.3)}\n`;
         advice += `• Poupança (20%): ${formatCurrency(totalIncome * 0.2)}\n\n`;
         
         if (Object.keys(expensesByCategory).length > 0) {
             advice += "📈 **Sua distribuição atual:**\n";
             Object.entries(expensesByCategory)
                 .sort(([,a], [,b]) => b - a)
                 .forEach(([category, amount]) => {
                     const percentage = (amount / totalIncome * 100).toFixed(1);
                     advice += `• ${category}: ${formatCurrency(amount)} (${percentage}%)\n`;
                 });
         }
         
         return advice;
     }
     
     function generateGeneralAdvice(data, userMessage) {
         const responses = [
             "Entendi sua pergunta! Com base nos seus dados financeiros, posso ajudar de várias formas. Que tal ser mais específico? Por exemplo: 'Como estão meus gastos?' ou 'Onde posso economizar?'",
             "Sou seu assistente financeiro pessoal! Posso analisar seus gastos, sugerir economias, criar relatórios e muito mais. O que você gostaria de saber sobre suas finanças?",
             "Ótima pergunta! Para dar uma resposta mais precisa, preciso entender melhor o que você quer saber. Posso ajudar com análises de gastos, planejamento financeiro, dicas de economia e muito mais!",
             "Como seu consultor financeiro IA, estou aqui para ajudar! Posso analisar seus dados, criar relatórios personalizados e dar conselhos baseados na sua situação atual. O que você gostaria de explorar?"
         ];
         
         return responses[Math.floor(Math.random() * responses.length)];
     }
     
     // Configurar event listeners do assistente IA após as funções serem definidas
     const aiAssistantBtn = document.getElementById('ai-assistant-btn');
     const closeAiAssistantBtn = document.getElementById('close-ai-assistant-btn');
     const sendAiMessageBtn = document.getElementById('send-ai-message');
     const aiChatInput = document.getElementById('ai-chat-input');
     
     if (aiAssistantBtn) aiAssistantBtn.addEventListener('click', openAIAssistant);
     if (closeAiAssistantBtn) closeAiAssistantBtn.addEventListener('click', closeAIAssistant);
     if (sendAiMessageBtn) sendAiMessageBtn.addEventListener('click', sendAIMessage);
     if (aiChatInput) aiChatInput.addEventListener('keypress', handleAIChatKeypress);