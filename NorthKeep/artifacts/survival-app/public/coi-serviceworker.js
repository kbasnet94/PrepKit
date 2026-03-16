/*! coi-service-worker v0.1.7 - Guido Zuidhof, licensed under MIT */
// Mini service worker that enables cross-origin isolation by adding
// COOP/COEP headers. Required for SharedArrayBuffer (used by expo-sqlite OPFS on web).
if (typeof window === "undefined") {
  // Service worker context
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
  self.addEventListener("fetch", (e) => {
    if (e.request.cache === "only-if-cached" && e.request.mode !== "same-origin") return;
    e.respondWith(
      fetch(e.request).then((r) => {
        if (r.status === 0) return r;
        const headers = new Headers(r.headers);
        headers.set("Cross-Origin-Embedder-Policy", "credentialless");
        headers.set("Cross-Origin-Opener-Policy", "same-origin");
        return new Response(r.body, { status: r.status, statusText: r.statusText, headers });
      })
    );
  });
} else {
  // Window context — register the service worker
  (async () => {
    if (!window.crossOriginIsolated) {
      const reg = await navigator.serviceWorker.register(window.document.currentScript.src);
      if (reg.active && !navigator.serviceWorker.controller) {
        window.location.reload();
      } else if (!reg.active) {
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          sw.addEventListener("statechange", () => {
            if (sw.state === "activated") window.location.reload();
          });
        });
      }
    }
  })();
}
