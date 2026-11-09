// PCM Smart PDF - Offline Service Worker (Cache v15 - Master Tricolor Edition)
const CACHE_NAME = 'pcm-smart-pdf-v15';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './style.css',
  './js/pdf-lib.min.js',
  './pdf-lib.min.js',
  './js/pdf.min.js',
  './pdf.min.js',
  './js/pdf.worker.min.js',
  './pdf.worker.min.js',
  './js/app.js',
  './app.js',
  './js/pcm_kyc_processor.js',
  './pcm_kyc_processor.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/logo-header.png',
  './icons/favicon.ico',
  './favicon.ico',
  './eula.html',
  './privacy-policy.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Cache addAll warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Purging legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // For index.html and sw.js, try network first to guarantee latest branding updates
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('index.html') || url.pathname.endsWith('sw.js') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static library binaries
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
