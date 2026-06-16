// firebase-messaging-sw.js
// This file must reside at the root of your web application.

// Import Firebase compat libraries inside the Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
// NOTE: During production, fill in these values from your Firebase Project Settings.
// We also attempt to load them from URL query parameters if they are set dynamically during registration.
const urlParams = new URL(location).searchParams;
const firebaseConfig = {
  apiKey: urlParams.get('apiKey') || "YOUR_API_KEY",
  authDomain: urlParams.get('authDomain') || "YOUR_AUTH_DOMAIN",
  projectId: urlParams.get('projectId') || "YOUR_PROJECT_ID",
  storageBucket: urlParams.get('storageBucket') || "YOUR_STORAGE_BUCKET",
  messagingSenderId: urlParams.get('messagingSenderId') || "YOUR_MESSAGING_SENDER_ID",
  appId: urlParams.get('appId') || "YOUR_APP_ID"
};

// Only initialize if we have at least a sender ID to prevent immediate crashes in development
if (firebaseConfig.messagingSenderId && firebaseConfig.messagingSenderId !== "YOUR_MESSAGING_SENDER_ID") {
  firebase.initializeApp(firebaseConfig);
  
  // Retrieve Firebase Messaging
  const messaging = firebase.messaging();

  // Customize background notifications
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Happy4U Reminder! 🎂';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'Someone has a birthday today!',
      icon: payload.notification?.image || payload.data?.image || 'https://cdn-icons-png.flaticon.com/512/4213/4213652.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/4213/3516/3516709.png',
      tag: payload.data?.tag || 'fcm-push-notification',
      data: payload.data || {}
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn('[firebase-messaging-sw.js] Firebase Config not configured yet. Background notifications will not be processed.');
}
