const CACHE_NAME = 'livia-presente-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon.png',
  '/music/playlist.json',
  '/photos/photos.json'
];

// Instalação: Armazena arquivos essenciais no cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepção de requisições (Cache-first, depois rede)
self.addEventListener('fetch', (event) => {
  // Ignorar requisições que não sejam do tipo GET (ex: POST, uploads)
  if (event.request.method !== 'GET') return;

  // Tratar arquivos de música e fotos com Cache-First e fallback na rede
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Armazena no cache se for uma resposta válida do mesmo domínio
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // Fallback offline se der erro na rede (ex: para fotos ou mp3)
        return null;
      });
    })
  );
});
