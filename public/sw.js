const CACHE_NAME = 'voluntarios-cix-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/logos/logo_comision_juventud.png',
  '/logos/logo_diocesis.png'
];

// Instalación: Precargar recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: Limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia Network-First: Siempre intenta obtener lo más reciente de la red
// Si la red falla (ej. sin señal en el evento), responde desde la caché.
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET o sean llamadas a APIs externas de auth/supabase si no deseamos cachearlas
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // No cachear llamadas directas a Supabase o endpoints REST de mutación
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/api/auth/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Si la respuesta es válida, clonamos y guardamos en caché
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback a la caché si no hay internet
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si es navegación a una página, devolver el index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
