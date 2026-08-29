/* Logbuch Red Twin II – Offline-Betrieb und saubere Updates.
   Strategie:
   - Seite selbst (Navigation): immer zuerst aus dem Netz, Cache nur als Rückfall.
     Damit erscheint eine neue Version ohne Löschen der Browserdaten.
   - Übrige Dateien: aus dem Cache, im Hintergrund aktualisiert.
   Gespeicherte Logbucheinträge liegen im localStorage und werden hiervon nie berührt. */

var VERSION = "1.5.1";
var CACHE = "logbuch-" + VERSION;
var DATEIEN = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./logo.png"];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(DATEIEN); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(k){
      return Promise.all(k.filter(function(n){ return n !== CACHE; }).map(function(n){ return caches.delete(n); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("message", function(e){
  if(e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
  if(e.data && e.data.type === "VERSION"){
    if(e.source) e.source.postMessage({type:"VERSION", version:VERSION});
  }
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);
  if(url.origin !== location.origin) return;   /* Wetterdienste nie zwischenspeichern */

  var istSeite = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html");

  if(istSeite){
    /* Netz zuerst: neue Version wird sofort sichtbar */
    e.respondWith(
      fetch(req).then(function(res){
        var kopie = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, kopie); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(t){ return t || caches.match("./index.html"); });
      })
    );
    return;
  }

  /* Übrige Dateien: Cache zuerst, Aktualisierung im Hintergrund */
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
