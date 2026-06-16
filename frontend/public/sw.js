const CACHE_NAME = "echomood-v2";
const ASSETS = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/covers/calm.png",
  "/covers/energetic.png",
  "/covers/focused.png",
  "/covers/happy.png",
  "/covers/sad.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Don't cache API calls
  if (event.request.url.includes("/api/") || event.request.url.includes(":5000")) {
    return;
  }
  
  // Network-first strategy for navigation (HTML) to avoid serving stale build hashes
  if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for other assets (images, css, js)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        return response;
      }).catch(() => {
        // Return offline fallback if necessary
      });
    })
  );
});
