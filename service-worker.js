// נהג בסדר - Service Worker
// גרסה: 2.0.0 - תיקוני באגים קריטיים לסנכרון ענן, ולידציה ושמירת נתונים

const CACHE_NAME = 'nahag-baseder-v2';

// קבצים לשמירה במטמון
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-167x167.png',
  './icons/icon-180x180.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png'
];

// התקנה - שמירת קבצים במטמון
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installed successfully');
        return self.skipWaiting(); // הפעלה מיידית
      })
      .catch(err => {
        console.error('[Service Worker] Install failed:', err);
      })
  );
});

// הפעלה - ניקוי מטמון ישן
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activated successfully');
        return self.clients.claim(); // שליטה מיידית
      })
  );
});

// טיפול בבקשות - Network First עם Fallback למטמון
self.addEventListener('fetch', event => {
  // דלג על בקשות שאינן GET
  if (event.request.method !== 'GET') {
    return;
  }

  // דלג על בקשות חיצוניות (WhatsApp, וכו')
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    // נסה קודם מהרשת
    fetch(event.request)
      .then(response => {
        // אם הצליח, שמור במטמון ותחזיר
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // אם נכשל (אופליין), נסה מהמטמון
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // אם גם במטמון אין, תחזיר את הדף הראשי
            return caches.match('./index.html');
          });
      })
  );
});

// הודעות מהאפליקציה
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
