// Service worker: cache offline (network-first), click en notificaciones locales y Web Push de OneSignal.
try {
  importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
} catch {
  // sin conexión o CDN caído: sigue funcionando el resto
}

const CACHE = "training-helper-v3";
const SCOPE = self.registration.scope; // ej: https://user.github.io/training-helper/

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([SCOPE])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match(SCOPE)))
  );
});

// Solo las notificaciones locales de la app; las de OneSignal las maneja su propio SW.
self.addEventListener("notificationclick", (event) => {
  if (event.notification.tag !== "th-local") return;
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow(SCOPE);
    })
  );
});
