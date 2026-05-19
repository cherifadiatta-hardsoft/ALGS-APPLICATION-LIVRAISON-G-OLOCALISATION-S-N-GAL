const CACHE_NAME = "algs-delivery-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("[ALGS Service Worker] Pre-caching Core App Shell...");
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[ALGS Service Worker] Clearing old cache storage:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interceptor
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Crucial: Bypass Service Worker caching for backend API calls and WebSocket sync connections
  if (
    requestUrl.pathname.startsWith("/api/") || 
    requestUrl.pathname.includes("/socket.io/") || 
    event.request.method !== "GET"
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-First strategy with Cache fallback for general static assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline: Retrieve from cache or fallback to root page
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            if (event.request.headers.get("accept")?.includes("text/html")) {
              return caches.match("/");
            }
          });
      })
  );
});
