/**
 * SPEAXA Firebase Cloud Messaging (FCM) Client Integration
 * Automatically requests permissions, registers service worker, and syncs device tokens.
 */
(function() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    console.warn('[FCM Client] Push notifications not supported in this browser context.');
    return;
  }

  window.initPushNotifications = async function() {
    const activeToken = localStorage.getItem('student_token') || 
                        sessionStorage.getItem('student_token') ||
                        localStorage.getItem('teacher_token') || 
                        sessionStorage.getItem('teacher_token') ||
                        localStorage.getItem('spx_parent_token');

    if (!activeToken) {
      console.warn('[FCM Client] User is not authenticated. Postponing registration.');
      return;
    }

    try {
      const configRes = await fetch('/api/auth/firebase-config');
      if (!configRes.ok) throw new Error('Failed to load Firebase config settings');
      const firebaseConfig = await configRes.json();

      if (!firebaseConfig.apiKey || !firebaseConfig.messagingSenderId) {
        console.info('[FCM Client] Firebase credentials are not seeded in settings. Push notifications are inactive.');
        return;
      }

      if (firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
      }

      const messaging = firebase.messaging();

      // Register background service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('[FCM Client] Service Worker registered successfully');

      // Request Notification Permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[FCM Client] Notification permissions denied by user.');
        return;
      }

      // Get Device Registration Token
      const currentToken = await messaging.getToken({
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        console.log('[FCM Client] Obtained device token');
        
        // Register Token with Speaxa Backend
        const syncRes = await fetch('/api/auth/fcm-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeToken}`
          },
          body: JSON.stringify({
            token: currentToken,
            device_type: 'web'
          })
        });

        if (syncRes.ok) {
          console.log('[FCM Client] Token synchronized with database');
        } else {
          console.error('[FCM Client] Failed to register token with backend');
        }
      } else {
        console.warn('[FCM Client] No registration token available.');
      }

      // Foreground message listener
      messaging.onMessage((payload) => {
        console.log('[FCM Client] Foreground message received:', payload);
        
        const title = payload.notification?.title || payload.data?.title || 'SPEAXA';
        const body = payload.notification?.body || payload.data?.body || '';

        if (typeof showToast === 'function') {
          showToast(`${title}: ${body}`, 'info');
        } else {
          // Use standard HTML5 Notification if in foreground
          new Notification(title, { body, icon: '/logo.png' });
        }
      });

    } catch (err) {
      console.warn('[FCM Client] Integration warning:', err.message);
    }
  };

  // Auto-init on load if authenticated
  window.addEventListener('load', () => {
    setTimeout(() => {
      window.initPushNotifications();
    }, 3000);
  });
})();
