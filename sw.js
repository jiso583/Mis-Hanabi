// Hanabi PWA — Service Worker v1.0
const CACHE_NAME = 'hanabi-v1';
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=Cinzel:wght@400;600&display=swap'
];

// Instalar: cachear recursos esenciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Si falla algún asset externo, continuar igual
        return cache.add('./index.html');
      });
    }).then(() => self.skipWaiting())
  );
});

// Activar: limpiar cachés viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network first, fallback a caché
self.addEventListener('fetch', event => {
  // Ignorar peticiones de Firebase (siempre requieren red)
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('firestore') ||
      event.request.url.includes('googleapis.com/identitytoolkit')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar copia en caché si es exitosa
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Sin red: devolver desde caché
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback: devolver la app principal
          return caches.match('./index.html');
        });
      })
  );
});
