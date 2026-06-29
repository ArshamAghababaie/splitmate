const CACHE_NAME = "splitmate-v1";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [OFFLINE_URL, "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") {
    // For non-navigation requests: try network, fall back to cache
    if (event.request.url.match(/^https:\/\/fonts\.(googleapis|gstatic)\.com/)) {
      event.respondWith(
        caches.open("google-fonts").then((cache) =>
          cache.match(event.request).then(
            (cached) =>
              cached ||
              fetch(event.request).then((response) => {
                cache.put(event.request, response.clone());
                return response;
              })
          )
        )
      );
      return;
    }
    return;
  }

  // Navigation requests: network first, offline fallback
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((cached) => cached || new Response("Offline", { status: 503 }))
    )
  );
});
