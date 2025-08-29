// Service Worker para Controle Financeiro PWA
const CACHE_NAME = 'controle-financeiro-v1';
const urlsToCache = [
  '/',
  '/Controle Financeiro.html',
  'https://cdn.tailwindcss.com/3.3.0',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Instalar o Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - retorna a resposta
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Atualizar o Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Sincronização em background (opcional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Sincronização em background executada');
  }
});

// Notificações push (opcional)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png'
  };

  event.waitUntil(
    self.registration.showNotification('Controle Financeiro', options)
  );
});