// Service Worker pour ANTL PWA
// Version générée automatiquement lors du build - ne pas modifier manuellement
const BUILD_VERSION = '__BUILD_VERSION__'; // Sera remplacé par Vite lors du build
const CACHE_NAME = `antl-v${BUILD_VERSION}`;
const STATIC_CACHE = `antl-static-v${BUILD_VERSION}`;
const DYNAMIC_CACHE = `antl-dynamic-v${BUILD_VERSION}`;

// Vérifier si nous sommes en mode développement
const isDevelopment = ['localhost', '127.0.0.1'].includes(self.location.hostname)
  && ['5173', '5174', '5175'].includes(self.location.port);

// Mode minimal pour débugger les problèmes de performance
const MINIMAL_MODE = false; // Passer à true pour désactiver temporairement le cache

// Si en développement, désactiver complètement le Service Worker
if (isDevelopment) {
  console.log('[SW] Development mode detected - Service Worker will self-destruct');
  
  // Auto-désinstallation
  self.addEventListener('install', (event) => {
    console.log('[SW] Self-unregistering in development mode');
    self.registration.unregister().then(() => {
      console.log('[SW] Successfully unregistered');
    });
    self.skipWaiting();
  });
  
  self.addEventListener('activate', (event) => {
    console.log('[SW] Activating only to unregister');
    self.clients.claim();
  });
  
  // Ne pas intercepter de requêtes
  self.addEventListener('fetch', () => {});
  
} else {
  // Code normal du Service Worker uniquement en production

// Fichiers à mettre en cache lors de l'installation
const STATIC_FILES = [
  '/manifest.json',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  // Offline fallback
  '/offline'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  // En développement, ne pas mettre en cache
  if (isDevelopment) {
    console.log('[SW] Development mode - skipping cache');
    self.skipWaiting();
    return;
  }
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static files:', error);
      })
  );
  
  // Force l'activation immédiate du nouveau service worker
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          // Supprimer les anciens caches
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return undefined;
        })
      );
      await self.clients.claim();
    })()
  );
});

// Optimisation : Pre-compile des regex pour éviter de les recréer à chaque requête
const DEV_PATTERNS = [
  /\/@vite\//,
  /\/@react-refresh/,
  /\/src\//,
  /\?t=/,
  /\?import/,
  /\.(tsx|ts|jsx)$/,
  /\.js.*\?t=/
];

const EXTERNAL_HOSTS = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com', 
  'unpkg.com'
]);

// Throttling : Limiter le nombre d'opérations de cache simultanées
let activeCacheOperations = 0;
const MAX_CONCURRENT_CACHE_OPS = 3;

// Stratégie de mise en cache optimisée
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // En mode développement ou minimal, ne pas intercepter les requêtes
  if (isDevelopment || MINIMAL_MODE) {
    return;
  }
  
  // Optimisation : Vérifications rapides en premier
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }
  
  const url = new URL(request.url);
  
  // Optimisation : Utiliser Set.has() plus rapide que comparaisons multiples
  if (EXTERNAL_HOSTS.has(url.hostname)) {
    return;
  }
  
  // Optimisation : Test regex optimisé pour le développement
  if (DEV_PATTERNS.some(pattern => pattern.test(url.pathname + url.search))) {
    return;
  }
  
  // Optimisation : Throttling pour éviter trop d'opérations de cache simultanées
  if (activeCacheOperations >= MAX_CONCURRENT_CACHE_OPS) {
    return; // Laisser passer sans cache si trop d'opérations en cours
  }

  // Stratégie Network First pour les documents HTML et navigations SPA afin de toujours servir le dernier build en ligne
  if (request.mode === 'navigate' || request.destination === 'document' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && activeCacheOperations < MAX_CONCURRENT_CACHE_OPS) {
            activeCacheOperations++;
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put('/index.html', responseClone)).catch(() => {}).finally(() => {
              activeCacheOperations--;
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(request).then((cachedResponse) => cachedResponse || caches.match('/index.html') || caches.match('/offline')))
    );
    return;
  }
  
  // Stratégie pour les fichiers statiques (CSS, JS, images)
  if (STATIC_FILES.includes(url.pathname) || 
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image') {
    
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request).then((networkResponse) => {
          // Optimisation : Cache async non-bloquant avec throttling
          if (networkResponse && networkResponse.status === 200 && activeCacheOperations < MAX_CONCURRENT_CACHE_OPS) {
            activeCacheOperations++;
            const responseClone = networkResponse.clone();
            
            // Opération de cache asynchrone qui ne bloque pas la réponse
            caches.open(STATIC_CACHE).then((cache) => {
              return cache.put(request, responseClone);
            }).catch((error) => {
              console.warn('[SW] Cache operation failed:', error);
            }).finally(() => {
              activeCacheOperations--;
            });
          }
          return networkResponse;
        });
      }).catch(() => {
        // Fallback pour les pages HTML quand offline
        if (request.destination === 'document') {
          return caches.match('/offline') || caches.match('/index.html');
        }
      })
    );
    
    return;
  }
  
  // Stratégie pour les appels API (Network First) - Optimisée
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Optimisation : Cache async non-bloquant pour API avec throttling
          if (networkResponse && networkResponse.status === 200 && activeCacheOperations < MAX_CONCURRENT_CACHE_OPS) {
            activeCacheOperations++;
            const responseClone = networkResponse.clone();
            
            // Opération de cache asynchrone qui ne bloque pas la réponse
            caches.open(DYNAMIC_CACHE).then((cache) => {
              return cache.put(request, responseClone);
            }).catch((error) => {
              console.warn('[SW] API cache operation failed:', error);
            }).finally(() => {
              activeCacheOperations--;
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback vers le cache si offline
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Retourner une réponse JSON d'erreur si pas de cache
            return new Response(
              JSON.stringify({
                success: false,
                message: 'Vous êtes hors ligne. Cette fonctionnalité nécessite une connexion internet.',
                offline: true
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );
          });
        })
    );
    
    return;
  }
  
  // Stratégie par défaut (Cache First pour les autres ressources) - Optimisée
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then((networkResponse) => {
        // Optimisation : Cache async non-bloquant avec throttling
        if (networkResponse && networkResponse.status === 200 && activeCacheOperations < MAX_CONCURRENT_CACHE_OPS) {
          activeCacheOperations++;
          const responseClone = networkResponse.clone();
          
          // Opération de cache asynchrone qui ne bloque pas la réponse
          caches.open(DYNAMIC_CACHE).then((cache) => {
            return cache.put(request, responseClone);
          }).catch((error) => {
            console.warn('[SW] Default cache operation failed:', error);
          }).finally(() => {
            activeCacheOperations--;
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Fallback pour les documents HTML
      if (request.destination === 'document') {
        return caches.match('/index.html');
      }
    })
  );
});

// Gestion des messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ 
      version: CACHE_NAME,
      buildVersion: BUILD_VERSION,
      timestamp: Date.now()
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Notification push (pour future extension)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      vibrate: [100, 50, 100],
      data: data.data,
      actions: [
        {
          action: 'open',
          title: 'Ouvrir',
          icon: '/android-chrome-192x192.png'
        },
        {
          action: 'close',
          title: 'Fermer'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'ANTL', options)
    );
  }
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});

} // Fin du bloc production
