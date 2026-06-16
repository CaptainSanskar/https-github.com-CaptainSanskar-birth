import { Birthday } from '../types';

export const DB_NAME = 'BirthdayDB';
export const DB_VERSION = 2;

export const registerServiceWorker = () => {
    if ('serviceWorker' in navigator) {
        let swUrl = './service-worker.js'; // Default fallback

        try {
            // Attempt to construct an absolute URL based on the current window location.
            // This fixes "Origin Mismatch" errors in CDNs/WebViews.
            if (window.location.protocol !== 'about:' && !window.location.href.startsWith('blob:')) {
                swUrl = new URL('service-worker.js', window.location.href).href;
            }
        } catch (e) {
            console.warn('⚠️ Could not construct absolute SW URL, using relative path.');
        }

        navigator.serviceWorker.register(swUrl)
            .then(registration => {
                console.log('✅ Service Worker registered with scope:', registration.scope);
                
                // Attempt to register periodic sync
                if ('periodicSync' in registration) {
                    try {
                        // @ts-ignore
                        registration.periodicSync.register('check-birthdays', {
                            minInterval: 24 * 60 * 60 * 1000 // 24 hours
                        }).then(() => console.log('Periodic sync registered'));
                    } catch (e) {
                        console.log('Periodic sync failed (optional feature)', e);
                    }
                }
                
                // Fallback sync
                if ('sync' in registration) {
                    try {
                        // @ts-ignore
                        registration.sync.register('check-birthdays');
                    } catch (e) {
                        console.log('Background sync failed (optional feature)', e);
                    }
                }

                // Initial notification scheduling request
                if (registration.active) {
                    registration.active.postMessage({ action: 'rescheduleNotifications' });
                }
            })
            .catch(error => {
                // Graceful handling for Preview/Sandbox environments
                if (error.message.includes('origin') || error.message.includes('scriptURL') || error.message.includes('Failed to construct')) {
                    console.warn('⚠️ Service Worker registration skipped due to Preview Environment restrictions. This is expected in AI Studio/StackBlitz. It will work correctly in Production/WebIntoApp.');
                } else {
                    console.error('❌ Service Worker registration failed:', error);
                }
            });
            
            navigator.serviceWorker.addEventListener('message', event => {
                console.log("SW Message:", event.data);
            });
    }
};

export const syncToIndexedDB = (birthdays: Birthday[]) => {
    if (typeof window === 'undefined' || !window.indexedDB) return;

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event: any) => {
        console.error('IndexedDB error:', event.target.error);
    };
    
    request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
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

    request.onsuccess = (event: any) => {
        const db = event.target.result;
        const transaction = db.transaction(['birthdays'], 'readwrite');
        const store = transaction.objectStore('birthdays');
        
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
            birthdays.forEach(birthday => {
                store.add(birthday);
            });
        };
        
        transaction.oncomplete = () => {
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    action: 'rescheduleNotifications'
                });
            }
        };
    };
};

export const syncSettingToIndexedDB = (key: string, value: any) => {
    if (typeof window === 'undefined' || !window.indexedDB) return;

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event: any) => {
        console.error('IndexedDB settings error:', event.target.error);
    };

    request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
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
    
    request.onsuccess = (event: any) => {
        const db = event.target.result;
        const transaction = db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        store.put({ key, value });
        
        transaction.oncomplete = () => {
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    action: 'rescheduleNotifications'
                });
            }
        };
    };
};
