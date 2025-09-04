// Service Worker para Controle Financeiro
// Implementa cache inteligente e sincronização offline

const CACHE_NAME = 'controle-financeiro-v1';
const STATIC_CACHE_NAME = 'controle-financeiro-static-v1';
const DATA_CACHE_NAME = 'controle-financeiro-data-v1';

// Arquivos estáticos para cache
const STATIC_FILES = [
    '/',
    '/Controle-Financeiro.html',
    'https://cdn.tailwindcss.com/3.3.0',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
    'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2',
    'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// URLs da API do Firebase
const API_URLS = [
    'https://www.gstatic.com/firebasejs/',
    'https://firestore.googleapis.com/'
];

// Instalação do Service Worker <mcreference link="https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/js13kGames/Offline_Service_workers" index="1">1</mcreference>
self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...');
    
    event.waitUntil(
        Promise.all([
            // Cache de arquivos estáticos
            caches.open(STATIC_CACHE_NAME).then(cache => {
                console.log('Service Worker: Cacheando arquivos estáticos');
                return cache.addAll(STATIC_FILES);
            }),
            // Cache de dados
            caches.open(DATA_CACHE_NAME)
        ])
    );
    
    // Força a ativação imediata
    self.skipWaiting();
});

// Ativação do Service Worker <mcreference link="https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation" index="2">2</mcreference>
self.addEventListener('activate', event => {
    console.log('Service Worker: Ativando...');
    
    event.waitUntil(
        Promise.all([
            // Limpar caches antigos
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DATA_CACHE_NAME) {
                            console.log('Service Worker: Removendo cache antigo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Tomar controle de todas as abas
            self.clients.claim()
        ])
    );
});

// Interceptação de requisições - Estratégia Cache First <mcreference link="https://web.dev/learn/pwa/service-workers" index="3">3</mcreference>
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorar requisições não-HTTP
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Estratégia para arquivos estáticos
    if (STATIC_FILES.some(file => request.url.includes(file)) || 
        request.destination === 'document') {
        event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME));
        return;
    }
    
    // Estratégia para APIs do Firebase
    if (API_URLS.some(apiUrl => request.url.includes(apiUrl))) {
        event.respondWith(networkFirstStrategy(request, DATA_CACHE_NAME));
        return;
    }
    
    // Para outras requisições, tentar rede primeiro
    event.respondWith(networkFirstStrategy(request, DATA_CACHE_NAME));
});

// Estratégia Cache First - para recursos estáticos com atualizações inteligentes
async function cacheFirstStrategy(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            console.log('Service Worker: Servindo do cache:', request.url);
            const response = cachedResponse.clone();
            
            // Atualizar cache em background se online
            if (navigator.onLine) {
                fetch(request).then(networkResponse => {
                    if (networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                        console.log('Service Worker: Cache atualizado em background:', request.url);
                    }
                }).catch(() => {});
            }
            
            return response;
        }
        
        console.log('Service Worker: Buscando da rede:', request.url);
        const networkResponse = await fetch(request);
        
        // Cachear apenas respostas válidas
        if (networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Service Worker: Erro ao buscar recurso:', error);
        
        // Retornar página offline para documentos
        if (request.destination === 'document') {
            return new Response(
                '<html><body><h1>Você está offline</h1><p>Verifique sua conexão com a internet.</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
            );
        }
        
        return new Response('Recurso não disponível offline', { status: 503 });
    }
}

// Estratégia Network First - para dados dinâmicos
async function networkFirstStrategy(request, cacheName) {
    try {
        console.log('Service Worker: Tentando rede primeiro:', request.url);
        const networkResponse = await fetch(request);
        
        // Cachear respostas válidas
        if (networkResponse.status === 200) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Service Worker: Rede falhou, tentando cache:', error);
        
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            console.log('Service Worker: Servindo do cache (fallback):', request.url);
            return cachedResponse;
        }
        
        return new Response('Dados não disponíveis offline', { status: 503 });
    }
}

// Background Sync para sincronização de dados <mcreference link="https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/background-syncs" index="4">4</mcreference>
self.addEventListener('sync', event => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'background-sync-transactions') {
        event.waitUntil(syncTransactions());
    } else if (event.tag === 'background-sync-goals') {
        event.waitUntil(syncGoals());
    } else if (event.tag === 'background-sync-budgets') {
        event.waitUntil(syncBudgets());
    } else if (event.tag === 'background-sync-all') {
        event.waitUntil(syncAllData());
    }
});

// Sync all pending data
async function syncAllData() {
    try {
        await Promise.all([
            syncTransactions(),
            syncGoals(),
            syncBudgets()
        ]);
        console.log('All data synchronized successfully');
    } catch (error) {
        console.error('Error syncing all data:', error);
        throw error;
    }
}

// Sincronizar transações pendentes
async function syncTransactions() {
    try {
        console.log('Service Worker: Sincronizando transações...');
        
        // Buscar dados pendentes do IndexedDB ou localStorage
        const pendingTransactions = await getPendingData('pendingTransactions');
        
        if (pendingTransactions && pendingTransactions.length > 0) {
            // Enviar para o servidor (Firebase)
            for (const transaction of pendingTransactions) {
                await syncDataToServer('transactions', transaction);
            }
            
            // Limpar dados pendentes após sincronização
            await clearPendingData('pendingTransactions');
            
            console.log('Service Worker: Transações sincronizadas com sucesso');
        }
    } catch (error) {
        console.error('Service Worker: Erro ao sincronizar transações:', error);
        throw error; // Re-throw para tentar novamente
    }
}

// Sincronizar metas pendentes
async function syncGoals() {
    try {
        console.log('Service Worker: Sincronizando metas...');
        
        const pendingGoals = await getPendingData('pendingGoals');
        
        if (pendingGoals && pendingGoals.length > 0) {
            for (const goal of pendingGoals) {
                await syncDataToServer('goals', goal);
            }
            
            await clearPendingData('pendingGoals');
            console.log('Service Worker: Metas sincronizadas com sucesso');
        }
    } catch (error) {
        console.error('Service Worker: Erro ao sincronizar metas:', error);
        throw error;
    }
}

// Sincronizar orçamentos pendentes
async function syncBudgets() {
    try {
        console.log('Service Worker: Sincronizando orçamentos...');
        
        const pendingBudgets = await getPendingData('pendingBudgets');
        
        if (pendingBudgets && pendingBudgets.length > 0) {
            for (const budget of pendingBudgets) {
                await syncDataToServer('budgets', budget);
            }
            
            await clearPendingData('pendingBudgets');
            console.log('Service Worker: Orçamentos sincronizados com sucesso');
        }
    } catch (error) {
        console.error('Service Worker: Erro ao sincronizar orçamentos:', error);
        throw error;
    }
}

// Buscar dados pendentes do localStorage
async function getPendingData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Service Worker: Erro ao buscar dados pendentes:', error);
        return [];
    }
}

// Limpar dados pendentes
async function clearPendingData(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Service Worker: Erro ao limpar dados pendentes:', error);
    }
}

// Sincronizar dados com o servidor (placeholder - implementar com Firebase)
async function syncDataToServer(collection, data) {
    // Esta função seria implementada para enviar dados para o Firebase
    // Por enquanto, apenas simula o envio
    console.log(`Service Worker: Enviando ${collection}:`, data);
    
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
}

// Notificação de status de conectividade
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CONNECTIVITY_CHANGED') {
        console.log('Service Worker: Status de conectividade mudou:', event.data.online);
        
        if (event.data.online) {
            // Quando voltar online, tentar sincronizar dados pendentes
            self.registration.sync.register('background-sync-transactions');
            self.registration.sync.register('background-sync-goals');
            self.registration.sync.register('background-sync-budgets');
        }
    }
});

// Limpeza periódica de cache e otimização de dados
self.addEventListener('periodicsync', event => {
    if (event.tag === 'cache-cleanup') {
        event.waitUntil(cleanupOldCaches());
    } else if (event.tag === 'data-optimization') {
        event.waitUntil(optimizeStoredData());
    }
});

// Limpar caches antigos e otimizar armazenamento
async function cleanupOldCaches() {
    try {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
            name !== STATIC_CACHE_NAME && name !== DATA_CACHE_NAME
        );
        
        await Promise.all(
            oldCaches.map(cacheName => caches.delete(cacheName))
        );
        
        console.log('Service Worker: Caches antigos removidos:', oldCaches);
    } catch (error) {
        console.error('Service Worker: Erro na limpeza de cache:', error);
    }
}

// Otimizar dados armazenados removendo entradas antigas
async function optimizeStoredData() {
    try {
        const cache = await caches.open(DATA_CACHE_NAME);
        const requests = await cache.keys();
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
        
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const dateHeader = response.headers.get('date');
                if (dateHeader) {
                    const responseDate = new Date(dateHeader).getTime();
                    if (now - responseDate > maxAge) {
                        await cache.delete(request);
                        console.log('Service Worker: Entrada de cache antiga removida:', request.url);
                    }
                }
            }
        }
        
        console.log('Service Worker: Cache de dados otimizado');
    } catch (error) {
        console.error('Service Worker: Erro ao otimizar cache de dados:', error);
    }
}
