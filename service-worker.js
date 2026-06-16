// service-worker.js
const CACHE_NAME = 'happy4u-v1';
const DB_NAME = 'BirthdayDB';
const DB_VERSION = 2;

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
  event.waitUntil(
    self.clients.claim().then(() => {
      return rescheduleNotifications();
    })
  );
});

// Periodic Background Sync
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'check-birthdays') {
    event.waitUntil(rescheduleNotifications());
  }
});

// Background Sync (fallback)
self.addEventListener('sync', function(event) {
  if (event.tag === 'check-birthdays') {
    event.waitUntil(rescheduleNotifications());
  }
});

// IndexedDB Helper Methods for Background Work
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('birthdays')) {
        db.createObjectStore('birthdays', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('notifications_history')) {
        db.createObjectStore('notifications_history', { keyPath: 'id' });
      }
    };
  });
}

function getFromDB(storeName, key) {
  return openDB().then(db => {
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(null);
        return;
      }
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getReq = store.get(key);
      getReq.onsuccess = () => resolve(getReq.result ? getReq.result.value : null);
      getReq.onerror = () => resolve(null);
    });
  });
}

function getAllFromDB(storeName) {
  return openDB().then(db => {
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains(storeName)) {
        resolve([]);
        return;
      }
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getReq = store.getAll();
      getReq.onsuccess = () => resolve(getReq.result || []);
      getReq.onerror = () => resolve([]);
    });
  });
}

function isNotificationDelivered(birthdayId, year, type) {
  return openDB().then(db => {
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains('notifications_history')) {
        resolve(false);
        return;
      }
      const transaction = db.transaction(['notifications_history'], 'readonly');
      const store = transaction.objectStore('notifications_history');
      const id = `${birthdayId}-${year}-${type}`;
      const getReq = store.get(id);
      getReq.onsuccess = () => resolve(getReq.result ? true : false);
      getReq.onerror = () => resolve(false);
    });
  });
}

function markNotificationDelivered(birthdayId, year, type) {
  return openDB().then(db => {
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains('notifications_history')) {
        resolve();
        return;
      }
      const transaction = db.transaction(['notifications_history'], 'readwrite');
      const store = transaction.objectStore('notifications_history');
      const id = `${birthdayId}-${year}-${type}`;
      const putReq = store.put({ id, birthdayId, year, type, timestamp: Date.now() });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => resolve();
    });
  });
}

// Complex Date Mathematics for PWA Background Timers
function getUpcomingReminderDate(birthDateStr, preferredTimeStr, offsetDays) {
  const today = new Date();
  
  const [prefHour, prefMinute] = preferredTimeStr.split(':').map(Number);
  const parts = birthDateStr.split('-').map(Number);
  const birthMonth = parts[1] - 1;
  const birthDay = parts[2];
  
  const currentYear = today.getFullYear();
  
  // Calculate next birthday date (day-of-birthday)
  let bdayDate = new Date(currentYear, birthMonth, birthDay, prefHour, prefMinute, 0, 0);
  
  // Leap year Feb 29 handling
  if (birthMonth === 1 && birthDay === 29) {
    const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (!isLeap(currentYear)) {
      bdayDate.setDate(28);
    }
  }
  
  // Check if target for this year is already in the past
  let targetDate = new Date(bdayDate.getTime() - (offsetDays * 24 * 60 * 60 * 1000));
  
  if (targetDate.getTime() <= today.getTime()) {
    // Shift birthday to next year and recalculate
    const nextYear = currentYear + 1;
    let nextBdayDate = new Date(nextYear, birthMonth, birthDay, prefHour, prefMinute, 0, 0);
    if (birthMonth === 1 && birthDay === 29) {
      const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      if (!isLeap(nextYear)) {
        nextBdayDate.setDate(28);
      }
    }
    targetDate = new Date(nextBdayDate.getTime() - (offsetDays * 24 * 60 * 60 * 1000));
  }
  
  return targetDate;
}

function calculateDaysUntil(birthDateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const parts = birthDateString.split('-').map(Number);
  const birth = new Date(parts[0], parts[1] - 1, parts[2]);
  const currentYear = today.getFullYear();
  
  let nextBirthday = new Date(currentYear, birth.getMonth(), birth.getDate());
  
  if (birth.getMonth() === 1 && birth.getDate() === 29) {
    const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (!isLeap(currentYear)) {
      nextBirthday.setDate(28);
    }
  }
  
  if (nextBirthday < today) {
    nextBirthday.setFullYear(currentYear + 1);
  }
  
  const diffTime = nextBirthday.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

async function rescheduleNotifications() {
  try {
    if (self.Notification.permission !== 'granted') {
      console.log('Notification permission is not granted in Service Worker.');
      return;
    }

    const notificationsEnabledSetting = await getFromDB('settings', 'notificationsEnabled');
    if (notificationsEnabledSetting === false) {
      console.log('Notifications disabled by user in settings. Cancelling all schedules.');
      const currentNotifications = await self.registration.getNotifications({ includeTriggered: true });
      for (const n of currentNotifications) {
        if (n.tag && n.tag.startsWith('birthday-')) {
          n.close();
        }
      }
      return;
    }

    const birthdays = await getAllFromDB('birthdays');
    const notificationTimeSetting = await getFromDB('settings', 'notificationTime');
    const notificationTime = notificationTimeSetting || '09:00';
    
    // Check if notification triggers are supported
    let hasNotificationTriggers = false;
    try {
      if ('showTrigger' in Notification.prototype || 'TimestampTrigger' in self) {
        hasNotificationTriggers = true;
      }
    } catch (e) {}

    if (!hasNotificationTriggers) {
      console.log('Notification Triggers not supported in this browser. Falling back to live sync checks.');
      await checkBirthdaysAndNotify();
      return;
    }

    const activeTags = new Set();
    const todayMs = Date.now();
    const events = [];
    
    for (const birthday of birthdays) {
      if (birthday.notificationEnabled === false) continue;
      
      // Calculate today & tomorrow dates
      const todayDate = getUpcomingReminderDate(birthday.birthDate, notificationTime, 0);
      const tomorrowDate = getUpcomingReminderDate(birthday.birthDate, notificationTime, 1);

      if (todayDate.getTime() > todayMs) {
        events.push({
          birthday,
          type: 'today',
          time: todayDate.getTime(),
          year: todayDate.getFullYear(),
          tag: `birthday-${birthday.id}-${todayDate.getFullYear()}-today`,
          title: `🎂 Happy Birthday ${birthday.name}!`,
          body: `It's ${birthday.name}'s big day today! Send your best wishes and celebrate! 🎉`
        });
      }
      
      if (tomorrowDate.getTime() > todayMs) {
        events.push({
          birthday,
          type: 'tomorrow',
          time: tomorrowDate.getTime(),
          year: tomorrowDate.getFullYear(),
          tag: `birthday-${birthday.id}-${tomorrowDate.getFullYear()}-tomorrow`,
          title: `⏰ Birthday Tomorrow: ${birthday.name}`,
          body: `Don't forget, it is ${birthday.name}'s birthday tomorrow! 🎈`
        });
      }
    }
    
    // Chronologically sort and schedule the top 20 upcoming alerts to respect browser quotas
    events.sort((a, b) => a.time - b.time);
    const eventsToSchedule = events.slice(0, 20);
    
    for (const ev of eventsToSchedule) {
      activeTags.add(ev.tag);
      
      // Force schedule OS-level reliable notification trigger
      await self.registration.showNotification(ev.title, {
        body: ev.body,
        icon: 'https://cdn-icons-png.flaticon.com/512/4213/4213652.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/4213/3516/3516709.png',
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
        tag: ev.tag,
        data: { birthdayId: ev.birthday.id, type: ev.type, year: ev.year, screen: 'home' },
        actions: [
          { action: 'open', title: 'Open Happy4U 🎉' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
        showTrigger: new self.TimestampTrigger(ev.time)
      });
    }
    
    // Cancel old schedules which are no longer active (prevents ghost alarms for removed/edited birthdays)
    const currentNotifications = await self.registration.getNotifications({ includeTriggered: true });
    for (const n of currentNotifications) {
      if (n.tag && n.tag.startsWith('birthday-')) {
        if (!activeTags.has(n.tag)) {
          n.close();
          console.log(`Successfully cancelled stale notification trigger tag: ${n.tag}`);
        }
      }
    }
    
    console.log(`OS Notification Triggers configured: ${eventsToSchedule.length} active alarms.`);
  } catch (error) {
    console.error('Failed to configure OS triggers:', error);
  }
}

async function checkBirthdaysAndNotify() {
  try {
    if (self.Notification.permission !== 'granted') return;

    const birthdays = await getAllFromDB('birthdays');
    if (!birthdays || birthdays.length === 0) return;
    
    const today = new Date();
    const currentYear = today.getFullYear();
    
    for (const birthday of birthdays) {
      if (birthday.notificationEnabled === false) continue;
      
      const daysUntil = calculateDaysUntil(birthday.birthDate);
      
      if (daysUntil === 0) {
        // Today Alert
        const alreadyNotified = await isNotificationDelivered(birthday.id, currentYear, 'today');
        if (!alreadyNotified) {
          const tag = `birthday-${birthday.id}-${currentYear}-today`;
          await sendNotification(
            `🎂 Happy Birthday ${birthday.name}!`,
            `It's ${birthday.name}'s big day today! Send your best wishes and celebrate! 🎉`,
            { birthdayId: birthday.id, type: 'today', year: currentYear, tag: tag }
          );
          await markNotificationDelivered(birthday.id, currentYear, 'today');
        }
      } else if (daysUntil === 1) {
        // Tomorrow Alert
        const alreadyNotified = await isNotificationDelivered(birthday.id, currentYear, 'tomorrow');
        if (!alreadyNotified) {
          const tag = `birthday-${birthday.id}-${currentYear}-tomorrow`;
          await sendNotification(
            `⏰ Birthday Tomorrow: ${birthday.name}`,
            `Don't forget, it is ${birthday.name}'s birthday tomorrow! 🎈`,
            { birthdayId: birthday.id, type: 'tomorrow', year: currentYear, tag: tag }
          );
          await markNotificationDelivered(birthday.id, currentYear, 'tomorrow');
        }
      }
    }
  } catch (error) {
    console.error('Fallback checks failed:', error);
  }
}

function sendNotification(title, body, data) {
  return self.registration.showNotification(title, {
    body: body,
    icon: 'https://cdn-icons-png.flaticon.com/512/4213/4213652.png', 
    badge: 'https://cdn-icons-png.flaticon.com/512/4213/3516/3516709.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    tag: data.tag || `birthday-${data.birthdayId}`,
    data: data,
    actions: [
      { action: 'open', title: 'Open Happy4U 🎉' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });
}

// Handle notification interaction and DeepLink matching
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const data = event.notification.data || {};
  let targetUrl = './';
  
  if (data.birthdayId) {
    targetUrl = `./?view=home&birthdayId=${data.birthdayId}`;
  } else if (data.type === 'welcome') {
    targetUrl = './?view=settings';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          const selfUrl = new URL(self.location.href);
          if (clientUrl.origin === selfUrl.origin && 'focus' in client) {
            if ('navigate' in client) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// App Messaging Interfaces
self.addEventListener('message', function(event) {
  if (event.data.action === 'checkBirthdays') {
    event.waitUntil(checkBirthdaysAndNotify());
  }
  if (event.data.action === 'rescheduleNotifications') {
    event.waitUntil(rescheduleNotifications());
  }
  if (event.data.action === 'sendWelcomeNotification') {
    event.waitUntil(sendNotification(
      'Notifications Active! 🔔',
      'Happy4U will remind you about upcoming birthdays. Enjoy!',
      { type: 'welcome', tag: 'welcome-msg' }
    ));
  }
});
