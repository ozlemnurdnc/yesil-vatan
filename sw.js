// Yeşil Vatan - Service Worker
// Uygulama dosyalarını telefonda saklar; internet yokken de uygulama açılır.

const ONBELLEK = "yesil-vatan-v2";
const DOSYALAR = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

// Kurulumda temel dosyaları kaydet
self.addEventListener("install", function (olay) {
  olay.waitUntil(
    caches.open(ONBELLEK).then(function (onbellek) { return onbellek.addAll(DOSYALAR); })
  );
  self.skipWaiting();
});

// Eski önbellekleri temizle
self.addEventListener("activate", function (olay) {
  olay.waitUntil(
    caches.keys().then(function (adlar) {
      return Promise.all(adlar.filter(function (ad) { return ad !== ONBELLEK; })
                              .map(function (ad) { return caches.delete(ad); }));
    })
  );
  self.clients.claim();
});

// Önce internetten almayı dene (her zaman en güncel hâl),
// internet yoksa kayıtlı kopyayı kullan
self.addEventListener("fetch", function (olay) {
  if (olay.request.method !== "GET") return;
  if (!olay.request.url.startsWith(self.location.origin)) return;   // Firebase ve harita kendi işini yapsın

  olay.respondWith(
    fetch(olay.request)
      .then(function (cevap) {
        const kopya = cevap.clone();
        caches.open(ONBELLEK).then(function (onbellek) { onbellek.put(olay.request, kopya); });
        return cevap;
      })
      .catch(function () { return caches.match(olay.request); })
  );
});