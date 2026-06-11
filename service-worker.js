const CACHE_NAME = "running-web-v10";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(createFreshRequest(event.request))
      .then((networkResponse) => {
        const requestUrl = new URL(event.request.url);
        if (requestUrl.origin === self.location.origin && networkResponse.ok) {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        if (event.request.mode === "navigate") {
          const cachedIndex = await caches.match("./index.html");
          if (cachedIndex) return cachedIndex;
        }

        return new Response("Offline", { status: 503, statusText: "Offline" });
      })
  );
});

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    APP_SHELL.map(async (url) => {
      const response = await fetch(new Request(url, { cache: "reload" }));
      await cache.put(url, response);
    })
  );
}

function createFreshRequest(request) {
  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return request;
  }

  return new Request(request, { cache: "reload" });
}
