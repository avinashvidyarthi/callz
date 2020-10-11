self.addEventListener("install", function (event) {
  console.log("[SW] Installing");
  caches.delete("static");
  self.skipWaiting();
  event.waitUntil(
    caches.open("static").then(function (cache) {
      cache.addAll([
        "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.0.0/animate.min.css",
        "https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css",
        "https://unpkg.com/sweetalert/dist/sweetalert.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.3.0/socket.io.js",
        "/styles.css",
        "/manifest.json",
        "/assets/glyphy.png",
        "/assets/clap.png",
        "/assets/heart.png",
        "/assets/thumbsup.png",
        "/assets/waiting.png",
        "/assets/mic-off.svg",
        "/assets/phone-off.svg",
      ]);
    })
  );
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        return response;
      } else {
        return fetch(event.request);
      }
    })
  );
});

self.addEventListener("activate", function (event) {
  console.log("[SW] Activated");
});
