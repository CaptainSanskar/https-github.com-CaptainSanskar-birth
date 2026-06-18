import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Public VITE_ environment variables to configure Firebase Client
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Check if Firebase Client config has been set up with genuine keys
export const isFirebaseConfigured = () => {
  return (
    firebaseConfig.messagingSenderId && 
    firebaseConfig.messagingSenderId !== "" &&
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== ""
  );
};

// Lazy/guarded app initialization
export const getFirebaseApp = () => {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
};

/**
 * Safely requests permission and returns the FCM registration token.
 * Contains defensive guards to avoid throwing exceptions on devices/browsers/WebViews
 * that do not support standard Service Workers or Push Notifications.
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("⚠️ Push Notifications are not supported by this browser/WebView.");
      return null;
    }

    if (!isFirebaseConfigured()) {
      console.warn("⚠️ Firebase credentials are missing. Please complete the setup instructions.");
      return null;
    }

    // Request browser permissions safely
    if (typeof Notification !== 'undefined') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn("⚠️ Notification permission was denied.");
        return null;
      }
    } else {
      console.warn("⚠️ Notification API is missing on this platform/WebView. Continuing token registration.");
    }

    const app = getFirebaseApp();
    const messaging = getMessaging(app);

    // Register firebase-messaging-sw.js with explicit credentials
    // passed in key-values to dynamic SW load.
    const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(firebaseConfig.apiKey)}` +
                  `&authDomain=${encodeURIComponent(firebaseConfig.authDomain || "")}` +
                  `&projectId=${encodeURIComponent(firebaseConfig.projectId || "")}` +
                  `&storageBucket=${encodeURIComponent(firebaseConfig.storageBucket || "")}` +
                  `&messagingSenderId=${encodeURIComponent(firebaseConfig.messagingSenderId || "")}` +
                  `&appId=${encodeURIComponent(firebaseConfig.appId || "")}`;

    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/firebase-cloud-messaging-push-scope' // Explicit scope for FCM to avoid overriding the index service worker
      });
      console.log("✅ FCM Service Worker registered on scope:", registration.scope);
    } catch (swError) {
      console.error("❌ Failed to register FCM Service Worker:", swError);
      return null;
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";
    if (!vapidKey) {
      console.error("❌ Missing VITE_FIREBASE_VAPID_KEY in environment variables. VAPID Key is required for Web Push.");
      return null;
    }

    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: vapidKey
    });

    if (token) {
      console.log("🔥 FCM Registration Token acquired:", token);
      return token;
    } else {
      console.warn("⚠️ No registration token available. Request permission to generate one.");
      return null;
    }
  } catch (error) {
    console.error("❌ Error fetching FCM Token:", error);
    return null;
  }
};

/**
 * Listens for FCM message payloads when the application is fore-grounded.
 */
export const registerOnMessageListener = async (onNotificationReceived: (payload: any) => void) => {
  try {
    const supported = await isSupported();
    if (!supported || !isFirebaseConfigured()) return;

    const app = getFirebaseApp();
    const messaging = getMessaging(app);

    onMessage(messaging, (payload) => {
      console.log("💬 Foreground message received:", payload);
      onNotificationReceived(payload);
    });
  } catch (error) {
    console.error("❌ Error setting up foreground message listener:", error);
  }
};
