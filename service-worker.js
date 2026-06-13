
// service-worker.js
const CACHE_NAME = 'happy4u-v1';
const DB_NAME = 'BirthdayDB';
const DB_VERSION = 1;

// Install Service Worker
self.addEventListener('install', function(event) {
  console.log('Service Worker: Installing...');
  self.skipWaiting(); // Activate immediately
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll([
        './',
        './index.html',
        './manifest.json'
      ]);
    })
  );
});

// Activate Service Worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim());
  checkBirthdaysAndNotify();
});

// Periodic Background Sync
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'check-birthdays') {
    event.waitUntil(checkBirthdaysAndNotify());
  }
});

// Background Sync (fallback)
self.addEventListener('sync', function(event) {
  if (event.tag === 'check-birthdays') {
    event.waitUntil(checkBirthdaysAndNotify());
  }
});

async function checkBirthdaysAndNotify() {
  try {
    const birthdays = await getAllBirthdaysFromDB();
    if (!birthdays || birthdays.length === 0) return;
    
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    
    for (const birthday of birthdays) {
      const parts = birthday.birthDate.split('-').map(Number);
      const birthMonth = parts[1] - 1;
      const birthDay = parts[2];
      const daysUntil = calculateDaysUntil(birthday.birthDate);
      
      if (birthMonth === todayMonth && birthDay === todayDate) {
        await sendNotification(
          '🎂 Happy Birthday!',
          `It's ${birthday.name}'s big day! Wish them now! 🎉`,
          { birthdayId: birthday.id, type: 'today' }
        );
      }
      else if (daysUntil === 1) {
        await sendNotification(
          '⏰ Birthday Tomorrow',
          `${birthday.name}'s birthday is tomorrow! Get ready! 🎈`,
          { birthdayId: birthday.id, type: 'tomorrow' }
        );
      }
    }
  } catch (error) {
    console.error('Error checking birthdays:', error);
  }
}

function sendNotification(title, body, data) {
  return self.registration.showNotification(title, {
    body: body,
    icon: 'https://cdn-icons-png.flaticon.com/512/4213/4213652.png', 
    badge: 'https://cdn-icons-png.flaticon.com/512/4213/4213652.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    tag: data.tag || `birthday-${data.birthdayId}`,
    data: data,
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });
}

function getAllBirthdaysFromDB() {
  return new Promise(function(resolve, reject) {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = function() { reject(request.error); };
    request.onsuccess = function(event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('birthdays')) {
        resolve([]);
        return;
      }
      const transaction = db.transaction(['birthdays'], 'readonly');
      const store = transaction.objectStore('birthdays');
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = function() { resolve(getAllRequest.result); };
      getAllRequest.onerror = function() { reject(getAllRequest.error); };
    };
  });
}

function calculateDaysUntil(birthDateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parts = birthDateString.split('-').map(Number);
  const birth = new Date(parts[0], parts[1] - 1, parts[2]);
  let nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }
  const diffTime = nextBirthday.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'open' || event.action === '') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientList) {
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) return clients.openWindow('./');
        })
    );
  }
});

self.addEventListener('message', function(event) {
  if (event.data.action === 'checkBirthdays') {
    event.waitUntil(checkBirthdaysAndNotify());
  }
  if (event.data.action === 'sendWelcomeNotification') {
      event.waitUntil(sendNotification(
          'Notifications Active! 🔔',
          'Happy4U will remind you about upcoming birthdays. Enjoy!',
          { type: 'welcome', tag: 'welcome-msg' }
      ));
  }
});
