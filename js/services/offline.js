import { showNotification } from '../utils/ui.js';

export function storePendingData(key, data) {
    const pendingKey = `pending_${key}`;
    const pending = JSON.parse(localStorage.getItem(pendingKey)) || [];
    pending.push(data);
    localStorage.setItem(pendingKey, JSON.stringify(pending));
}

export function registerBackgroundSync(tag) {
    if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(registration => {
            registration.sync.register(tag).catch(err => console.log('Background sync failed:', err));
        });
    }
}

export function handleOfflineAction(actionName, dataKey, data) {
    storePendingData(dataKey, data);
    registerBackgroundSync(`background-sync-${dataKey}`);
    showNotification(`${actionName} salvo offline. Será sincronizado quando a conexão for restaurada.`, 'info');
}
