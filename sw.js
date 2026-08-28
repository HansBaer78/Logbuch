/* Logbuch Red Twin II – Offline-Betrieb.
   Die App-Dateien werden beim ersten Aufruf gespeichert und danach
   immer aus dem Gerät geladen. Wetterabrufe gehen weiter ins Netz. */

var CACHE = "logbuch-v1";
var DATEIEN = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(DATEIEN); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(k){
      return Promise.all(k.filter(function(n){ return n !== CACHE; }).map(function(n){ return caches.delete(n); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);

  /* Wetterdienste nie zwischenspeichern */
  if(url.origin !== location.origin) return;

  e.respondWith(
    caches.match(req).then(function(treffer){
      var netz = fetch(req).then(function(res){
        if(res && res.ok){
          var kopie = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, kopie); });
        }
        return res;
      }).catch(function(){ return treffer; });
      return treffer || netz;
    })
  );
});
