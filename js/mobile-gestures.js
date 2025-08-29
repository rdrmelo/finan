// Gestos e atalhos para mobile
class MobileGestures {
    constructor() {
        this.isRefreshing = false;
        this.longPressTimer = null;
        this.doubleTapTimer = null;
        this.lastTap = 0;
        
        this.setupPullToRefresh();
        this.setupLongPress();
        this.setupDoubleTap();
        this.setupPinchZoom();
        this.setupEdgeSwipe();
    }
    
    setupPullToRefresh() {
        let startY = 0;
        let pullDistance = 0;
        let isPulling = false;
        
        // Criar indicador de refresh
        this.createRefreshIndicator();
        
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0 && !this.isRefreshing) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (isPulling && startY > 0) {
                pullDistance = e.touches[0].clientY - startY;
                
                if (pullDistance > 0) {
                    e.preventDefault();
                    
                    // Atualizar indicador visual
                    this.updateRefreshIndicator(pullDistance);
                    
                    if (pullDistance > 100) {
                        this.showRefreshIndicator();
                    }
                }
            }
        });
        
        document.addEventListener('touchend', () => {
            if (isPulling && pullDistance > 100 && !this.isRefreshing) {
                this.triggerRefresh();
            } else {
                this.hideRefreshIndicator();
            }
            
            startY = 0;
            pullDistance = 0;
            isPulling = false;
        }, { passive: true });
    }
    
    createRefreshIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'pull-to-refresh';
        indicator.innerHTML = '↻';
        document.body.appendChild(indicator);
    }
    
    updateRefreshIndicator(distance) {
        const indicator = document.querySelector('.pull-to-refresh');
        if (indicator) {
            const rotation = Math.min(distance * 2, 360);
            indicator.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        }
    }
    
    showRefreshIndicator() {
        const indicator = document.querySelector('.pull-to-refresh');
        if (indicator) {
            indicator.classList.add('active');
        }
    }
    
    hideRefreshIndicator() {
        const indicator = document.querySelector('.pull-to-refresh');
        if (indicator) {
            indicator.classList.remove('active');
            indicator.style.transform = 'translateX(-50%) rotate(0deg)';
        }
    }
    
    async triggerRefresh() {
        if (this.isRefreshing) return;
        
        this.isRefreshing = true;
        const indicator = document.querySelector('.pull-to-refresh');
        
        if (indicator) {
            indicator.innerHTML = '⟳';
            indicator.style.animation = 'spin 1s linear infinite';
        }
        
        try {
            // Trigger refresh event
            const event = new CustomEvent('pullToRefresh');
            document.dispatchEvent(event);
            
            // Simular carregamento
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Refresh data if function exists
            if (typeof updateUIWithCharts === 'function') {
                updateUIWithCharts();
            }
            
            this.showNotification('Dados atualizados!', 'success');
            
        } catch (error) {
            this.showNotification('Erro ao atualizar dados', 'error');
        } finally {
            this.isRefreshing = false;
            
            if (indicator) {
                indicator.innerHTML = '↻';
                indicator.style.animation = '';
            }
            
            setTimeout(() => {
                this.hideRefreshIndicator();
            }, 500);
        }
    }
    
    setupLongPress() {
        document.addEventListener('touchstart', (e) => {
            const target = e.target.closest('.transaction-item, .glass-card, .btn');
            if (!target) return;
            
            this.longPressTimer = setTimeout(() => {
                this.handleLongPress(target, e);
            }, 500);
        });
        
        document.addEventListener('touchend', () => {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        });
        
        document.addEventListener('touchmove', () => {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        });
    }
    
    handleLongPress(element, event) {
        // Vibração
        if ('vibrate' in navigator) {
            navigator.vibrate(100);
        }
        
        // Feedback visual
        element.classList.add('long-pressed');
        setTimeout(() => {
            element.classList.remove('long-pressed');
        }, 200);
        
        // Ações específicas baseadas no elemento
        if (element.classList.contains('transaction-item')) {
            this.showTransactionQuickActions(element, event);
        } else if (element.classList.contains('glass-card')) {
            this.showCardQuickActions(element, event);
        }
    }
    
    setupDoubleTap() {
        document.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - this.lastTap;
            
            if (tapLength < 500 && tapLength > 0) {
                // Double tap detectado
                this.handleDoubleTap(e.target, e);
                e.preventDefault();
            }
            
            this.lastTap = currentTime;
        });
    }
    
    handleDoubleTap(element, event) {
        const target = element.closest('.transaction-item, .glass-card');
        if (!target) return;
        
        // Vibração
        if ('vibrate' in navigator) {
            navigator.vibrate([50, 50, 50]);
        }
        
        // Ações específicas
        if (target.classList.contains('transaction-item')) {
            // Editar transação
            const editBtn = target.querySelector('.edit-btn');
            if (editBtn) editBtn.click();
        }
    }
    
    setupSwipeActions() {
        let startX = 0;
        let startY = 0;
        let currentElement = null;
        
        document.addEventListener('touchstart', (e) => {
            const target = e.target.closest('.transaction-item, .swipeable');
            if (target) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                currentElement = target;
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (!currentElement) return;
            
            const deltaX = e.touches[0].clientX - startX;
            const deltaY = e.touches[0].clientY - startY;
            
            // Só processar swipe horizontal
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
                e.preventDefault();
                this.updateSwipePosition(currentElement, deltaX);
            }
        });
        
        document.addEventListener('touchend', (e) => {
            if (!currentElement) return;
            
            const deltaX = e.changedTouches[0].clientX - startX;
            
            if (Math.abs(deltaX) > 100) {
                this.handleSwipeAction(currentElement, deltaX > 0 ? 'right' : 'left');
            } else {
                this.resetSwipePosition(currentElement);
            }
            
            currentElement = null;
            startX = 0;
            startY = 0;
        }, { passive: true });
    }
    
    updateSwipePosition(element, deltaX) {
        const maxSwipe = 100;
        const clampedDelta = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX));
        element.style.transform = `translateX(${clampedDelta}px)`;
        
        // Mostrar ações baseadas na direção
        if (clampedDelta > 50) {
            element.classList.add('swipe-right');
            element.classList.remove('swipe-left');
        } else if (clampedDelta < -50) {
            element.classList.add('swipe-left');
            element.classList.remove('swipe-right');
        } else {
            element.classList.remove('swipe-right', 'swipe-left');
        }
    }
    
    resetSwipePosition(element) {
        element.style.transform = '';
        element.classList.remove('swipe-right', 'swipe-left');
    }
    
    handleSwipeAction(element, direction) {
        if (direction === 'right') {
            // Ação para swipe direita (ex: editar)
            const editBtn = element.querySelector('.edit-btn');
            if (editBtn) editBtn.click();
        } else {
            // Ação para swipe esquerda (ex: deletar)
            const deleteBtn = element.querySelector('.delete-btn');
            if (deleteBtn) deleteBtn.click();
        }
        
        this.resetSwipePosition(element);
    }
    
    showTransactionQuickActions(element, event) {
        const actions = [
            { label: 'Editar', action: 'edit', icon: '✏️' },
            { label: 'Duplicar', action: 'duplicate', icon: '📋' },
            { label: 'Excluir', action: 'delete', icon: '🗑️' }
        ];
        
        this.showContextMenu(actions, event, element);
    }
    
    showCardQuickActions(element, event) {
        const actions = [
            { label: 'Atualizar', action: 'refresh', icon: '🔄' },
            { label: 'Detalhes', action: 'details', icon: '📊' }
        ];
        
        this.showContextMenu(actions, event, element);
    }
    
    showContextMenu(actions, event, element) {
        // Remover menu existente
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 8px;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        `;
        
        actions.forEach(action => {
            const item = document.createElement('div');
            item.className = 'context-menu-item';
            item.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                border-radius: 8px;
                transition: background 0.2s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                white-space: nowrap;
            `;
            item.innerHTML = `${action.icon} ${action.label}`;
            
            item.addEventListener('click', () => {
                this.handleContextAction(action.action, element);
                menu.remove();
            });
            
            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(255, 255, 255, 0.1)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.background = '';
            });
            
            menu.appendChild(item);
        });
        
        // Posicionar menu
        document.body.appendChild(menu);
        
        const rect = element.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        
        let left = rect.left + rect.width / 2 - menuRect.width / 2;
        let top = rect.top - menuRect.height - 10;
        
        // Ajustar se sair da tela
        if (left < 10) left = 10;
        if (left + menuRect.width > window.innerWidth - 10) {
            left = window.innerWidth - menuRect.width - 10;
        }
        if (top < 10) {
            top = rect.bottom + 10;
        }
        
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        
        // Fechar ao clicar fora
        setTimeout(() => {
            document.addEventListener('click', () => {
                menu.remove();
            }, { once: true });
        }, 100);
    }
    
    handleContextAction(action, element) {
        switch (action) {
            case 'edit':
                const editBtn = element.querySelector('.edit-btn');
                if (editBtn) editBtn.click();
                break;
            case 'delete':
                const deleteBtn = element.querySelector('.delete-btn');
                if (deleteBtn) deleteBtn.click();
                break;
            case 'duplicate':
                // Implementar duplicação
                this.showNotification('Funcionalidade em desenvolvimento', 'info');
                break;
            case 'refresh':
                this.triggerRefresh();
                break;
            case 'details':
                this.showNotification('Detalhes em desenvolvimento', 'info');
                break;
        }
    }
    
    showNotification(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// CSS adicional para gestos
const gestureStyles = `
.long-pressed {
    background: rgba(255, 255, 255, 0.1) !important;
    transform: scale(0.98) !important;
}

.swipe-right {
    background: linear-gradient(90deg, rgba(34, 197, 94, 0.2), transparent) !important;
}

.swipe-left {
    background: linear-gradient(270deg, rgba(239, 68, 68, 0.2), transparent) !important;
}

.context-menu-item:hover {
    background: rgba(255, 255, 255, 0.1) !important;
}

@keyframes spin {
    from { transform: translateX(-50%) rotate(0deg); }
    to { transform: translateX(-50%) rotate(360deg); }
}
`;

// Adicionar estilos
const styleSheet = document.createElement('style');
styleSheet.textContent = gestureStyles;
document.head.appendChild(styleSheet);

// Inicializar gestos mobile
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileGestures = new MobileGestures();
    });
} else {
    window.mobileGestures = new MobileGestures();
}

// Exportar para uso global
window.MobileGestures = MobileGestures;