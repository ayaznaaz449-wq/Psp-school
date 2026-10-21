/* PSP Attendance - offline helper.
   Our own files: network first (so updates always arrive), cache only as a fallback when offline.
   Firebase SDK files: cached after the first load so the app opens even with weak internet.
   Live data (Firestore / login) is never cached here. */
const VER = "psp-v2-2026-10";
const CORE = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(VER).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const h = url.hostname;
  if (h.endsWith("googleapis.com") || h.endsWith("firebaseio.com") || h.endsWith("firebaseapp.com")) return;
  if (h === "www.gstatic.com") {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)).catch(() => {}); return r;
    })));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(r => {
      if (r && r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)).catch(() => {}); }
      return r;
    }).catch(() => caches.match(req).then(hit => hit || caches.match("index.html")))
  );
});
