const CACHE_VERSION = 2;
const CACHE_NAME = 'study-plan-v' + CACHE_VERSION;
const ASSETS = [
  './',
  './index.html',
];
const FONT_CACHE = 'study-plan-fonts-v1';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== FONT_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Cache Google Fonts separately (long-lived, cache-first)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // Firebase SDK and API calls — network only
  if (url.hostname.includes('gstatic.com') || url.hostname.includes('firebase') || url.hostname.includes('googleapis.com')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // University APIs — network only, no cache
  if (url.hostname.includes('istanbul.edu.tr') || url.hostname.includes('sks.istanbul.edu.tr')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // App shell — network first with cache fallback (ensures updates propagate fast)
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});

// Notify clients when a new version is available
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
