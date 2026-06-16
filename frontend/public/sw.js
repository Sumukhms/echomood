const CACHE_NAME = "echomood-v1";
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
  if (event.request.url.includes("/api/")) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache external covers/images optionally if needed
        return response;
      });
    })
  );
});
