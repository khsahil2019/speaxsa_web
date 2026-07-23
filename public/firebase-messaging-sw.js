importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

fetch('/api/auth/firebase-config')
  .then(res => res.json())
  .then(config => {
    if (!config.apiKey || !config.messagingSenderId) {
      console.warn('[firebase-messaging-sw.js] Firebase config is not seeded yet in database settings.');
      return;
    }
    
    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      
      const title = payload.notification?.title || payload.data?.title || 'SPEAXA Notification';
      const options = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: '/logo.png',
        badge: '/logo.png',
        data: payload.data
      };

      self.registration.showNotification(title, options);
    });
  })
  .catch(err => {
    console.error('[firebase-messaging-sw.js] Config loading failed:', err.message);
  });
