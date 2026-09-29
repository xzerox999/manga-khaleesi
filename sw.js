// Service Worker - Manga Khaleesi PWA
const CACHE_NAME = 'khaleesi-manga-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/main.css',
  './css/animations.css',
  './css/reader.css',
  './js/vendor/pdf.min.js',
  './js/vendor/pdf.worker.min.js',
  './js/particles.js',
  './js/reader.js',
  './js/app.js',
  './data/chapters.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Stale-while-revalidate for local assets, network-first for PDFs
  const url = new URL(event.request.url);

  if (url.pathname.endsWith('.pdf')) {
    // Cache PDFs dynamically once read so Khaleesi can re-read offline
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
