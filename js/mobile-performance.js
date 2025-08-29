// Otimizações de performance para mobile
class MobilePerformance {
    constructor() {
        this.observers = new Map();
        this.lazyElements = new Set();
        this.deferredTasks = [];
        this.init();
    }
    
    init() {
        this.setupLazyLoading();
        this.setupVirtualScrolling();
        this.setupImageOptimization();
        this.setupMemoryManagement();
        this.setupNetworkOptimization();
        this.deferNonCriticalTasks();
    }
    
    // Lazy loading para elementos pesados
    setupLazyLoading() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '50px'
        };
        
        const lazyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadElement(entry.target);
                    lazyObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        this.observers.set('lazy', lazyObserver);
        
        // Observar elementos com data-lazy
        document.querySelectorAll('[data-lazy]').forEach(el => {
            lazyObserver.observe(el);
            this.lazyElements.add(el);
        });
    }
    
    loadElement(element) {
        const type = element.dataset.lazy;
        
        switch (type) {
            case 'chart':
                this.loadChart(element);
                break;
            case 'image':
                this.loadImage(element);
                break;
            case 'component':
                this.loadComponent(element);
                break;
        }
        
        element.removeAttribute('data-lazy');
        this.lazyElements.delete(element);
    }
    
    loadChart(element) {
        const chartType = element.dataset.chartType;
        const chartId = element.id;
        
        // Carregar chart apenas quando visível
        if (chartType === 'expense' && typeof updateExpenseChart === 'function') {
            requestIdleCallback(() => {
                updateExpenseChart();
            });
        } else if (chartType === 'balance' && typeof updateBalanceChart === 'function') {
            requestIdleCallback(() => {
                updateBalanceChart();
            });
        }
    }
    
    loadImage(element) {
        const src = element.dataset.src;
        if (src) {
            element.src = src;
            element.removeAttribute('data-src');
        }
    }
    
    loadComponent(element) {
        const component = element.dataset.component;
        // Carregar componente específico
        this.loadDynamicComponent(component, element);
    }
    
    // Virtual scrolling para listas grandes
    setupVirtualScrolling() {
        const virtualLists = document.querySelectorAll('[data-virtual-scroll]');
        
        virtualLists.forEach(list => {
            this.createVirtualList(list);
        });
    }
    
    createVirtualList(container) {
        const itemHeight = parseInt(container.dataset.itemHeight) || 60;
        const bufferSize = parseInt(container.dataset.bufferSize) || 5;
        
        const virtualList = new VirtualList(container, {
            itemHeight,
            bufferSize,
            renderItem: (item, index) => this.renderListItem(item, index)
        });
        
        container.virtualList = virtualList;
    }
    
    renderListItem(item, index) {
        // Renderizar item da lista baseado no tipo
        if (item.type === 'transaction') {
            return this.renderTransactionItem(item, index);
        }
        return `<div class="list-item">${item.description || 'Item ' + index}</div>`;
    }
    
    renderTransactionItem(transaction, index) {
        const typeIcon = transaction.type === 'income' ? '💰' : 
                        transaction.type === 'expense' ? '💸' : '🔄';
        const typeColor = transaction.type === 'income' ? 'var(--neon-green)' : 
                         transaction.type === 'expense' ? 'var(--neon-pink)' : 'var(--neon-blue)';
        
        return `
            <div class="transaction-item glass-card" data-id="${transaction.id}" style="height: 60px; margin-bottom: 8px;">
                <div class="flex-between" style="height: 100%; align-items: center; padding: 0 16px;">
                    <div class="flex gap-3" style="align-items: center;">
                        <div style="font-size: 20px;">${typeIcon}</div>
                        <div>
                            <div style="font-weight: 600; font-size: 14px;">${transaction.description}</div>
                            <div style="color: var(--text-secondary); font-size: 12px;">
                                ${transaction.category} • ${new Date(transaction.date).toLocaleDateString('pt-BR')}
                            </div>
                        </div>
                    </div>
                    <div style="color: ${typeColor}; font-weight: 600; font-family: monospace;">
                        ${transaction.type === 'expense' ? '-' : '+'}R$ ${transaction.amount.toFixed(2)}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Otimização de imagens
    setupImageOptimization() {
        // Usar WebP quando suportado
        this.supportsWebP = this.checkWebPSupport();
        
        // Lazy loading para imagens
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    this.optimizeImage(img);
                    imageObserver.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    checkWebPSupport() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    
    optimizeImage(img) {
        const src = img.dataset.src;
        if (!src) return;
        
        // Usar WebP se suportado
        if (this.supportsWebP && src.includes('.jpg') || src.includes('.png')) {
            const webpSrc = src.replace(/\.(jpg|png)$/, '.webp');
            
            // Tentar carregar WebP primeiro
            const testImg = new Image();
            testImg.onload = () => {
                img.src = webpSrc;
            };
            testImg.onerror = () => {
                img.src = src;
            };
            testImg.src = webpSrc;
        } else {
            img.src = src;
        }
        
        img.removeAttribute('data-src');
    }
    
    // Gerenciamento de memória
    setupMemoryManagement() {
        // Limpar elementos fora da viewport
        const cleanupObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    this.cleanupElement(entry.target);
                }
            });
        }, {
            rootMargin: '-100px'
        });
        
        // Observar elementos pesados
        document.querySelectorAll('canvas, .heavy-component').forEach(el => {
            cleanupObserver.observe(el);
        });
        
        // Limpar cache periodicamente
        setInterval(() => {
            this.cleanupCache();
        }, 5 * 60 * 1000); // A cada 5 minutos
    }
    
    cleanupElement(element) {
        // Limpar canvas charts quando fora da viewport
        if (element.tagName === 'CANVAS') {
            const ctx = element.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, element.width, element.height);
            }
        }
        
        // Remover event listeners desnecessários
        if (element.cleanup && typeof element.cleanup === 'function') {
            element.cleanup();
        }
    }
    
    cleanupCache() {
        // Limpar localStorage se muito grande
        const storageSize = new Blob(Object.values(localStorage)).size;
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (storageSize > maxSize) {
            this.cleanupLocalStorage();
        }
        
        // Forçar garbage collection se disponível
        if (window.gc && typeof window.gc === 'function') {
            window.gc();
        }
    }
    
    cleanupLocalStorage() {
        // Manter apenas dados essenciais
        const essentialKeys = [
            'gemini_api_key',
            'user_preferences',
            'app_settings'
        ];
        
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!essentialKeys.includes(key)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
    }
    
    // Otimização de rede
    setupNetworkOptimization() {
        // Detectar tipo de conexão
        this.connectionType = this.getConnectionType();
        
        // Ajustar qualidade baseada na conexão
        if (this.connectionType === 'slow') {
            this.enableDataSaver();
        }
        
        // Monitorar mudanças na conexão
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', () => {
                this.connectionType = this.getConnectionType();
                this.adjustForConnection();
            });
        }
    }
    
    getConnectionType() {
        if (!('connection' in navigator)) {
            return 'unknown';
        }
        
        const connection = navigator.connection;
        const effectiveType = connection.effectiveType;
        
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            return 'slow';
        } else if (effectiveType === '3g') {
            return 'medium';
        } else {
            return 'fast';
        }
    }
    
    enableDataSaver() {
        // Reduzir qualidade de imagens
        document.documentElement.classList.add('data-saver');
        
        // Desabilitar animações pesadas
        document.documentElement.classList.add('reduced-motion');
        
        // Reduzir frequência de atualizações
        this.updateInterval = 10000; // 10 segundos
    }
    
    adjustForConnection() {
        if (this.connectionType === 'slow') {
            this.enableDataSaver();
        } else {
            document.documentElement.classList.remove('data-saver', 'reduced-motion');
            this.updateInterval = 5000; // 5 segundos
        }
    }
    
    // Diferir tarefas não críticas
    deferNonCriticalTasks() {
        // Usar requestIdleCallback para tarefas não críticas
        const deferredTasks = [
            () => this.preloadNextPageData(),
            () => this.optimizeAnimations(),
            () => this.setupAnalytics(),
            () => this.preloadFonts()
        ];
        
        deferredTasks.forEach(task => {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(task, { timeout: 5000 });
            } else {
                setTimeout(task, 100);
            }
        });
    }
    
    preloadNextPageData() {
        // Pré-carregar dados da próxima página provável
        const currentPage = window.mobileNav?.currentPage || 'dashboard';
        const nextPage = this.predictNextPage(currentPage);
        
        if (nextPage) {
            this.preloadPageData(nextPage);
        }
    }
    
    predictNextPage(currentPage) {
        // Lógica simples de predição baseada em padrões de uso
        const patterns = {
            'dashboard': 'transactions',
            'transactions': 'reports',
            'reports': 'settings',
            'settings': 'dashboard'
        };
        
        return patterns[currentPage];
    }
    
    preloadPageData(page) {
        // Pré-carregar dados específicos da página
        switch (page) {
            case 'transactions':
                // Pré-processar lista de transações
                if (typeof transactions !== 'undefined') {
                    this.preprocessTransactions(transactions);
                }
                break;
            case 'reports':
                // Pré-calcular dados de relatórios
                this.precalculateReportData();
                break;
        }
    }
    
    preprocessTransactions(transactionList) {
        // Criar índices para busca rápida
        const categoryIndex = new Map();
        const dateIndex = new Map();
        
        transactionList.forEach(transaction => {
            // Índice por categoria
            if (!categoryIndex.has(transaction.category)) {
                categoryIndex.set(transaction.category, []);
            }
            categoryIndex.get(transaction.category).push(transaction);
            
            // Índice por data
            const dateKey = transaction.date.substring(0, 7); // YYYY-MM
            if (!dateIndex.has(dateKey)) {
                dateIndex.set(dateKey, []);
            }
            dateIndex.get(dateKey).push(transaction);
        });
        
        // Salvar índices para uso posterior
        this.transactionIndexes = { categoryIndex, dateIndex };
    }
    
    optimizeAnimations() {
        // Reduzir animações em dispositivos lentos
        const isLowEnd = this.isLowEndDevice();
        
        if (isLowEnd) {
            document.documentElement.classList.add('low-end-device');
        }
    }
    
    isLowEndDevice() {
        // Detectar dispositivos de baixo desempenho
        const memory = navigator.deviceMemory || 4;
        const cores = navigator.hardwareConcurrency || 2;
        
        return memory < 2 || cores < 4;
    }
    
    setupAnalytics() {
        // Configurar analytics de performance
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    this.trackPerformanceMetric(entry);
                });
            });
            
            observer.observe({ entryTypes: ['measure', 'navigation'] });
        }
    }
    
    trackPerformanceMetric(entry) {
        // Enviar métricas de performance (implementar conforme necessário)
        console.log('Performance metric:', entry.name, entry.duration);
    }
    
    preloadFonts() {
        // Pré-carregar fontes críticas
        const criticalFonts = [
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'
        ];
        
        criticalFonts.forEach(fontUrl => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'font';
            link.href = fontUrl;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        });
    }
    
    // Métodos públicos para controle manual
    pauseOptimizations() {
        this.observers.forEach(observer => observer.disconnect());
    }
    
    resumeOptimizations() {
        this.setupLazyLoading();
        this.setupImageOptimization();
    }
    
    getPerformanceStats() {
        return {
            connectionType: this.connectionType,
            lazyElementsCount: this.lazyElements.size,
            memoryUsage: this.getMemoryUsage(),
            isLowEndDevice: this.isLowEndDevice()
        };
    }
    
    getMemoryUsage() {
        if ('memory' in performance) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }
}

// Virtual List implementation
class VirtualList {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            itemHeight: 60,
            bufferSize: 5,
            renderItem: (item, index) => `<div>${item}</div>`,
            ...options
        };
        
        this.data = [];
        this.visibleStart = 0;
        this.visibleEnd = 0;
        this.scrollTop = 0;
        
        this.init();
    }
    
    init() {
        this.container.style.overflow = 'auto';
        this.container.style.position = 'relative';
        
        this.viewport = document.createElement('div');
        this.viewport.style.position = 'relative';
        this.container.appendChild(this.viewport);
        
        this.container.addEventListener('scroll', () => {
            this.handleScroll();
        });
    }
    
    setData(data) {
        this.data = data;
        this.updateVisibleRange();
        this.render();
    }
    
    handleScroll() {
        this.scrollTop = this.container.scrollTop;
        this.updateVisibleRange();
        this.render();
    }
    
    updateVisibleRange() {
        const containerHeight = this.container.clientHeight;
        const itemHeight = this.options.itemHeight;
        const bufferSize = this.options.bufferSize;
        
        this.visibleStart = Math.max(0, Math.floor(this.scrollTop / itemHeight) - bufferSize);
        this.visibleEnd = Math.min(
            this.data.length,
            Math.ceil((this.scrollTop + containerHeight) / itemHeight) + bufferSize
        );
    }
    
    render() {
        const itemHeight = this.options.itemHeight;
        const totalHeight = this.data.length * itemHeight;
        
        this.viewport.style.height = `${totalHeight}px`;
        
        const visibleItems = this.data.slice(this.visibleStart, this.visibleEnd);
        
        this.viewport.innerHTML = visibleItems
            .map((item, index) => {
                const actualIndex = this.visibleStart + index;
                const top = actualIndex * itemHeight;
                
                return `
                    <div style="position: absolute; top: ${top}px; width: 100%; height: ${itemHeight}px;">
                        ${this.options.renderItem(item, actualIndex)}
                    </div>
                `;
            })
            .join('');
    }
}

// CSS para otimizações
const performanceStyles = `
.data-saver img {
    filter: contrast(0.8) brightness(0.9);
}

.reduced-motion * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
}

.low-end-device .glass {
    backdrop-filter: none;
    background: rgba(255, 255, 255, 0.1);
}

.low-end-device .btn {
    transition: none;
}

.low-end-device .glass-card:hover {
    transform: none;
}
`;

// Adicionar estilos
const performanceStyleSheet = document.createElement('style');
performanceStyleSheet.textContent = performanceStyles;
document.head.appendChild(performanceStyleSheet);

// Inicializar otimizações de performance
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobilePerformance = new MobilePerformance();
    });
} else {
    window.mobilePerformance = new MobilePerformance();
}

// Exportar para uso global
window.MobilePerformance = MobilePerformance;
window.VirtualList = VirtualList;