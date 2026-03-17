// ==================== firebase-messaging-sw.js ====================
// Service Worker للإشعارات

importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBZj9QplNw-VmwSl8Ijv_b6nIi4ghcHDms",
    authDomain: "aulobylemmouchi.firebaseapp.com",
    databaseURL: "https://aulobylemmouchi-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "aulobylemmouchi",
    storageBucket: "aulobylemmouchi.firebasestorage.app",
    messagingSenderId: "63959796567",
    appId: "1:63959796567:web:5cb2b14ca64cc01b6d4c12"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('إشعار في الخلفية:', payload);
    
    const notificationTitle = payload.notification?.title || 'Aulo';
    const notificationOptions = {
        body: payload.notification?.body || 'لديك إشعار جديد',
        icon: '/images/l.png',
        badge: '/images/l.png',
        vibrate: [200, 100, 200],
        data: payload.data,
        actions: [
            {
                action: 'open',
                title: 'فتح'
            },
            {
                action: 'close',
                title: 'إغلاق'
            }
        ]
    };
    
    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                return clients.openWindow(urlToOpen);
            })
    );
});