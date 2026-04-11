const CACHE_VERSION = 16;
const CACHE_NAME = 'study-plan-v' + CACHE_VERSION;
const ASSETS = [
  './',
  './index.html',
  './js/init.js',
  './js/config.js',
  './js/storage.js',
  './js/categories.js',
  './js/schedule.js',
  './js/state.js',
  './js/password.js',
  './js/reading.js',
  './js/sync.js',
  './js/meals.js',
  './js/data.js',
  './js/migration.js',
  './js/router.js',
  './js/ideal.js',
  './js/review.js',
  './js/inbox.js',
  './js/habits.js',
  './js/daily-plan.js',
  './js/time-tracking.js',
  './js/goals.js',
  './js/offline-queue.js',
  './js/analytics.js',
  './js/recurrence.js',
  './js/ui/drag-drop.js',
  './js/ui/theme.js',
  './js/ui/toggle.js',
  './js/ui/global-search.js',
  './js/ui/search.js',
  './js/ui/swipe.js',
  './js/ui/dispatch.js',
  './js/ui/settings.js',
  './js/ui/categories-editor.js',
  './js/render/index.js',
  './js/render/context.js',
  './js/render/header.js',
  './js/render/nav.js',
  './js/render/home.js',
  './js/render/ideal.js',
  './js/render/tools-view.js',
  './js/render/stats-view.js',
  './js/render/review.js',
  './js/render/inbox.js',
  './js/render/habits.js',
  './js/render/daily-plan.js',
  './js/grades.js',
  './js/render/grades.js',
  './js/render/matrix.js',
  './js/render/calendar.js',
  './js/onboarding.js',
  './js/render/onboarding.js',
  './js/render/week-view.js',
  './js/render/day-view.js',
  './js/render/panels.js',
  './js/render/fab.js',
  './js/render/scratchpad.js',
  './js/render/task-item.js',
  './js/render/meals.js',
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
