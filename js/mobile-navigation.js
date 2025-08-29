// Navegação por gestos
class MobileNavigation {
    constructor() {
        this.currentPage = 'dashboard';
        this.pages = ['dashboard', 'transactions', 'reports', 'settings'];
        this.setupSwipeNavigation();
        this.setupBottomNavigation();
        this.setupFAB();
        this.init();
    }
    
    init() {
        // Criar bottom navigation se não existir
        this.createBottomNavigation();
        this.createFAB();
        this.updateActiveNavItem();
    }
    
    createBottomNavigation() {
        const existingNav = document.querySelector('.mobile-bottom-nav');
        if (existingNav) return;
        
        const nav = document.createElement('div');
        nav.className = 'mobile-bottom-nav';
        nav.innerHTML = `
            <div class="nav-items">
                <div class="nav-item" data-page="dashboard">
                    <div class="icon">📊</div>
                    <div class="label">Dashboard</div>
                </div>
                <div class="nav-item" data-page="transactions">
                    <div class="icon">💳</div>
                    <div class="label">Transações</div>
                </div>
                <div class="nav-item" data-page="reports">
                    <div class="icon">📈</div>
                    <div class="label">Relatórios</div>
                </div>
                <div class="nav-item" data-page="settings">
                    <div class="icon">⚙️</div>
                    <div class="label">Config</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(nav);
        
        // Adicionar event listeners
        nav.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.navigateToPage(page);
            });
        });
    }
    
    createFAB() {
        const existingFAB = document.querySelector('.fab-add');
        if (existingFAB) return;
        
        const fab = document.createElement('button');
        fab.className = 'fab-add';
        fab.innerHTML = '+';
        fab.title = 'Nova Transação';
        
        document.body.appendChild(fab);
        
        fab.addEventListener('click', () => {
            this.showQuickActions();
        });
    }
    
    setupSwipeNavigation() {
        let startX = 0;
        let startY = 0;
        let isScrolling = false;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isScrolling = false;
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;
            
            const deltaX = Math.abs(e.touches[0].clientX - startX);
            const deltaY = Math.abs(e.touches[0].clientY - startY);
            
            if (deltaY > deltaX) {
                isScrolling = true;
            }
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            if (isScrolling) return;
            
            const endX = e.changedTouches[0].clientX;
            const deltaX = endX - startX;
            
            // Swipe horizontal para navegar entre páginas
            if (Math.abs(deltaX) > 100) {
                if (deltaX > 0) {
                    this.navigatePrevious();
                } else {
                    this.navigateNext();
                }
            }
            
            startX = 0;
            startY = 0;
        }, { passive: true });
    }
    
    setupBottomNavigation() {
        // Event delegation para bottom navigation
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem) {
                const page = navItem.dataset.page;
                this.navigateToPage(page);
            }
        });
    }
    
    setupFAB() {
        // Criar quick actions
        this.createQuickActions();
    }
    
    createQuickActions() {
        const existingActions = document.querySelector('.quick-actions');
        if (existingActions) return;
        
        const quickActions = document.createElement('div');
        quickActions.className = 'quick-actions';
        quickActions.innerHTML = `
            <button class="quick-action-btn quick-action-income" data-action="income" title="Nova Receita">
                💰
            </button>
            <button class="quick-action-btn quick-action-expense" data-action="expense" title="Nova Despesa">
                💸
            </button>
            <button class="quick-action-btn quick-action-transfer" data-action="transfer" title="Transferência">
                🔄
            </button>
        `;
        
        document.body.appendChild(quickActions);
        
        // Event listeners para quick actions
        quickActions.addEventListener('click', (e) => {
            const btn = e.target.closest('.quick-action-btn');
            if (btn) {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
                this.hideQuickActions();
            }
        });
    }
    
    navigateToPage(page) {
        if (page === this.currentPage) return;
        
        this.currentPage = page;
        this.updateActiveNavItem();
        
        // Trigger page change event
        const event = new CustomEvent('pageChange', {
            detail: { page }
        });
        document.dispatchEvent(event);
        
        // Call existing navigation function if available
        if (typeof switchPage === 'function') {
            switchPage(page);
        }
        
        // Add haptic feedback
        this.addHapticFeedback();
    }
    
    navigateNext() {
        const currentIndex = this.pages.indexOf(this.currentPage);
        const nextIndex = (currentIndex + 1) % this.pages.length;
        this.navigateToPage(this.pages[nextIndex]);
    }
    
    navigatePrevious() {
        const currentIndex = this.pages.indexOf(this.currentPage);
        const prevIndex = currentIndex === 0 ? this.pages.length - 1 : currentIndex - 1;
        this.navigateToPage(this.pages[prevIndex]);
    }
    
    updateActiveNavItem() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === this.currentPage) {
                item.classList.add('active');
            }
        });
    }
    
    showQuickActions() {
        const quickActions = document.querySelector('.quick-actions');
        if (quickActions) {
            quickActions.classList.add('active');
            
            // Fechar ao clicar fora
            setTimeout(() => {
                document.addEventListener('click', this.hideQuickActionsHandler.bind(this), { once: true });
            }, 100);
        }
    }
    
    hideQuickActions() {
        const quickActions = document.querySelector('.quick-actions');
        if (quickActions) {
            quickActions.classList.remove('active');
        }
    }
    
    hideQuickActionsHandler(e) {
        if (!e.target.closest('.quick-actions') && !e.target.closest('.fab-add')) {
            this.hideQuickActions();
        }
    }
    
    handleQuickAction(action) {
        switch (action) {
            case 'income':
                if (typeof document.getElementById('add-income-btn')?.click === 'function') {
                    document.getElementById('add-income-btn').click();
                }
                break;
            case 'expense':
                if (typeof document.getElementById('add-expense-btn')?.click === 'function') {
                    document.getElementById('add-expense-btn').click();
                }
                break;
            case 'transfer':
                if (typeof document.getElementById('add-transfer-btn')?.click === 'function') {
                    document.getElementById('add-transfer-btn').click();
                }
                break;
        }
    }
    
    addHapticFeedback() {
        // Simular feedback háptico visual
        document.body.classList.add('haptic-feedback');
        setTimeout(() => {
            document.body.classList.remove('haptic-feedback');
        }, 100);
        
        // Vibração real se disponível
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }
    
    // Método para atualizar página atual externamente
    setCurrentPage(page) {
        this.currentPage = page;
        this.updateActiveNavItem();
    }
}

// Inicializar navegação mobile quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileNav = new MobileNavigation();
    });
} else {
    window.mobileNav = new MobileNavigation();
}

// Exportar para uso global
window.MobileNavigation = MobileNavigation;