// Work Week Warrior service worker — minimal offline cache
const CACHE = 'wwwarrior-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first for the HTML (so updates land fast), cache-first for everything else.
// Firebase + Google Fonts always go to network, never cached, never break offline.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET and Firebase/Google APIs — let them fail naturally if offline
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('firebaseapp.com')) {
    return;
  }

  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(fr => {
        if (fr.ok) {
          const copy = fr.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return fr;
      }))
    );
  }
});
