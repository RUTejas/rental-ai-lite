/* RentWise Lite service worker: cache public static assets only. Private pages,
   API/auth responses, uploaded documents, and dashboard data are never cached. */
const CACHE = "rentwise-public-static-v1";
const STATIC_ASSETS = [
  "/offline", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png",
  "/icons/icon-maskable-512.png", "/icons/apple-touch-icon.png", "/icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});
