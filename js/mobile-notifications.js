// Service Worker para notificações
class MobileNotifications {
    constructor() {
        this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
        this.permission = null;
        this.init();
    }
    
    async init() {
        if (!this.isSupported) {
            console.warn('Notificações não são suportadas neste dispositivo');
            return;
        }
        
        this.permission = Notification.permission;
        
        // Registrar service worker se não estiver registrado
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registrado:', registration);
            } catch (error) {
                console.error('Erro ao registrar Service Worker:', error);
            }
        }
    }
    
    async requestPermission() {
        if (!this.isSupported) {
            return false;
        }
        
        if (this.permission === 'granted') {
            return true;
        }
        
        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            return permission === 'granted';
        } catch (error) {
            console.error('Erro ao solicitar permissão:', error);
            return false;
        }
    }
    
    async showNotification(title, options = {}) {
        if (!await this.requestPermission()) {
            console.warn('Permissão de notificação negada');
            return;
        }
        
        const defaultOptions = {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            vibrate: [200, 100, 200],
            requireInteraction: false,
            silent: false,
            ...options
        };
        
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, defaultOptions);
            } else {
                new Notification(title, defaultOptions);
            }
        } catch (error) {
            console.error('Erro ao mostrar notificação:', error);
        }
    }
    
    async scheduleReminder(title, body, date, data = {}) {
        if (!await this.requestPermission()) {
            return;
        }
        
        const now = new Date();
        const targetDate = new Date(date);
        const delay = targetDate.getTime() - now.getTime();
        
        if (delay <= 0) {
            console.warn('Data do lembrete deve ser no futuro');
            return;
        }
        
        // Usar setTimeout para lembretes de curto prazo (até 24h)
        if (delay <= 24 * 60 * 60 * 1000) {
            setTimeout(() => {
                this.showNotification(title, {
                    body,
                    tag: 'financial-reminder',
                    requireInteraction: true,
                    actions: [
                        {
                            action: 'view',
                            title: 'Ver Detalhes',
                            icon: '/icon-view.png'
                        },
                        {
                            action: 'dismiss',
                            title: 'Dispensar',
                            icon: '/icon-dismiss.png'
                        }
                    ],
                    data: {
                        type: 'reminder',
                        ...data
                    }
                });
            }, delay);
        } else {
            // Para lembretes de longo prazo, salvar no localStorage
            this.saveScheduledNotification({
                title,
                body,
                date: targetDate.toISOString(),
                data
            });
        }
    }
    
    saveScheduledNotification(notification) {
        const scheduled = JSON.parse(localStorage.getItem('scheduledNotifications') || '[]');
        scheduled.push({
            id: Date.now().toString(),
            ...notification
        });
        localStorage.setItem('scheduledNotifications', JSON.stringify(scheduled));
    }
    
    checkScheduledNotifications() {
        const scheduled = JSON.parse(localStorage.getItem('scheduledNotifications') || '[]');
        const now = new Date();
        const toRemove = [];
        
        scheduled.forEach((notification, index) => {
            const notificationDate = new Date(notification.date);
            if (notificationDate <= now) {
                this.showNotification(notification.title, {
                    body: notification.body,
                    data: notification.data
                });
                toRemove.push(index);
            }
        });
        
        // Remover notificações processadas
        if (toRemove.length > 0) {
            const updated = scheduled.filter((_, index) => !toRemove.includes(index));
            localStorage.setItem('scheduledNotifications', JSON.stringify(updated));
        }
    }
    
    // Notificações específicas para finanças
    async notifyLowBalance(accountName, balance) {
        await this.showNotification('⚠️ Saldo Baixo', {
            body: `Sua conta ${accountName} está com saldo baixo: R$ ${balance.toFixed(2)}`,
            tag: 'low-balance',
            requireInteraction: true,
            actions: [
                {
                    action: 'view-account',
                    title: 'Ver Conta'
                },
                {
                    action: 'add-funds',
                    title: 'Adicionar Fundos'
                }
            ],
            data: {
                type: 'low-balance',
                accountName,
                balance
            }
        });
    }
    
    async notifyHighExpenses(amount, period) {
        await this.showNotification('📊 Gastos Elevados', {
            body: `Você gastou R$ ${amount.toFixed(2)} ${period}. Isso está acima da sua média.`,
            tag: 'high-expenses',
            requireInteraction: true,
            actions: [
                {
                    action: 'view-expenses',
                    title: 'Ver Gastos'
                },
                {
                    action: 'set-budget',
                    title: 'Definir Orçamento'
                }
            ],
            data: {
                type: 'high-expenses',
                amount,
                period
            }
        });
    }
    
    async notifyBillReminder(billName, amount, dueDate) {
        await this.showNotification('💳 Lembrete de Conta', {
            body: `${billName} vence em breve: R$ ${amount.toFixed(2)} - ${dueDate}`,
            tag: 'bill-reminder',
            requireInteraction: true,
            actions: [
                {
                    action: 'pay-bill',
                    title: 'Pagar Agora'
                },
                {
                    action: 'snooze',
                    title: 'Lembrar Depois'
                }
            ],
            data: {
                type: 'bill-reminder',
                billName,
                amount,
                dueDate
            }
        });
    }
    
    async notifyGoalAchieved(goalName, amount) {
        await this.showNotification('🎉 Meta Alcançada!', {
            body: `Parabéns! Você alcançou sua meta "${goalName}" de R$ ${amount.toFixed(2)}`,
            tag: 'goal-achieved',
            requireInteraction: true,
            actions: [
                {
                    action: 'view-goal',
                    title: 'Ver Meta'
                },
                {
                    action: 'set-new-goal',
                    title: 'Nova Meta'
                }
            ],
            data: {
                type: 'goal-achieved',
                goalName,
                amount
            }
        });
    }
    
    // Configurar verificações automáticas
    startPeriodicChecks() {
        // Verificar notificações agendadas a cada minuto
        setInterval(() => {
            this.checkScheduledNotifications();
        }, 60000);
        
        // Verificar saldos baixos a cada 5 minutos
        setInterval(() => {
            this.checkLowBalances();
        }, 5 * 60000);
        
        // Verificar gastos elevados diariamente
        setInterval(() => {
            this.checkHighExpenses();
        }, 24 * 60 * 60000);
    }
    
    async checkLowBalances() {
        if (typeof accounts === 'undefined' || typeof transactions === 'undefined') {
            return;
        }
        
        const lowBalanceThreshold = 100; // R$ 100
        
        accounts.forEach(account => {
            const accountTransactions = transactions.filter(t => t.accountId === account.id);
            const balance = account.initialBalance + accountTransactions.reduce((sum, t) => {
                if (t.type === 'income' || t.type === 'transfer_in') return sum + t.amount;
                if (t.type === 'expense' || t.type === 'transfer_out') return sum - t.amount;
                return sum;
            }, 0);
            
            if (balance < lowBalanceThreshold) {
                this.notifyLowBalance(account.name, balance);
            }
        });
    }
    
    async checkHighExpenses() {
        if (typeof transactions === 'undefined') {
            return;
        }
        
        const today = new Date();
        const thisMonth = today.getMonth();
        const thisYear = today.getFullYear();
        
        const thisMonthExpenses = transactions
            .filter(t => {
                const tDate = new Date(t.date);
                return t.type === 'expense' && 
                       tDate.getMonth() === thisMonth && 
                       tDate.getFullYear() === thisYear;
            })
            .reduce((sum, t) => sum + t.amount, 0);
        
        // Calcular média dos últimos 3 meses
        const lastThreeMonthsExpenses = [];
        for (let i = 1; i <= 3; i++) {
            const monthDate = new Date(thisYear, thisMonth - i, 1);
            const monthExpenses = transactions
                .filter(t => {
                    const tDate = new Date(t.date);
                    return t.type === 'expense' && 
                           tDate.getMonth() === monthDate.getMonth() && 
                           tDate.getFullYear() === monthDate.getFullYear();
                })
                .reduce((sum, t) => sum + t.amount, 0);
            lastThreeMonthsExpenses.push(monthExpenses);
        }
        
        const averageExpenses = lastThreeMonthsExpenses.reduce((sum, exp) => sum + exp, 0) / 3;
        
        if (thisMonthExpenses > averageExpenses * 1.2) {
            this.notifyHighExpenses(thisMonthExpenses, 'este mês');
        }
    }
    
    // Gerenciar permissões
    getPermissionStatus() {
        return this.permission;
    }
    
    isNotificationSupported() {
        return this.isSupported;
    }
    
    // Limpar notificações
    async clearAllNotifications() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            const notifications = await registration.getNotifications();
            notifications.forEach(notification => notification.close());
        }
    }
    
    async clearNotificationsByTag(tag) {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            const notifications = await registration.getNotifications({ tag });
            notifications.forEach(notification => notification.close());
        }
    }
}

// Event listeners para ações de notificação
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'notification-action') {
            handleNotificationAction(event.data.action, event.data.data);
        }
    });
}

function handleNotificationAction(action, data) {
    switch (action) {
        case 'view':
        case 'view-account':
        case 'view-expenses':
        case 'view-goal':
            // Abrir aplicação na página relevante
            if (window.mobileNav) {
                window.mobileNav.navigateToPage('dashboard');
            }
            break;
        case 'add-funds':
            // Abrir modal de nova receita
            if (document.getElementById('add-income-btn')) {
                document.getElementById('add-income-btn').click();
            }
            break;
        case 'pay-bill':
            // Abrir modal de nova despesa
            if (document.getElementById('add-expense-btn')) {
                document.getElementById('add-expense-btn').click();
            }
            break;
        case 'set-budget':
        case 'set-new-goal':
            // Navegar para configurações
            if (window.mobileNav) {
                window.mobileNav.navigateToPage('settings');
            }
            break;
        case 'snooze':
            // Reagendar notificação para 1 hora
            const snoozeDate = new Date(Date.now() + 60 * 60 * 1000);
            if (window.mobileNotifications && data.billName) {
                window.mobileNotifications.scheduleReminder(
                    '💳 Lembrete de Conta',
                    `${data.billName} ainda precisa ser paga`,
                    snoozeDate,
                    data
                );
            }
            break;
    }
}

// Inicializar notificações mobile
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileNotifications = new MobileNotifications();
        window.mobileNotifications.startPeriodicChecks();
    });
} else {
    window.mobileNotifications = new MobileNotifications();
    window.mobileNotifications.startPeriodicChecks();
}

// Exportar para uso global
window.MobileNotifications = MobileNotifications;