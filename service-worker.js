// service-worker.js

/**
 * @fileoverview Service Worker for WebX Journal PWA.
 * Manages caching of static assets for offline access and improved performance.
 */

// Define the cache name. Increment this version whenever you make changes to cached assets.
const CACHE_NAME = 'webx-journal-cache-v1';

// List of files to cache (your app shell). These are the core assets needed for the app to function offline.
const urlsToCache = [
    '/', // The root path, typically resolves to index.html
    '/index.html',
    '/src/main.js',
    '/manifest.json',
    // Placeholder for icons. You will need to create these images.
    // Example: create an 'icons' directory at the root and place your icon files there.
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png'
    // Note: Tailwind CSS is loaded via CDN, so it won't be cached by this service worker directly.
    // If you were self-hosting Tailwind, you would include its CSS file here.
    // Google Fonts are also external and won't be cached here.
];

/**
 * Event Listener for 'install' event.
 * This is triggered when the service worker is first installed.
 * It opens a cache and adds all specified URLs to it.
 */
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching app shell:', urlsToCache);
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('[Service Worker] Cache addAll failed:', error);
            })
    );
});

/**
 * Event Listener for 'fetch' event.
 * This is triggered for every network request made by the page.
 * It attempts to serve content from the cache first, falling back to the network if not found.
 */
self.addEventListener('fetch', (event) => {
    // Only cache GET requests for now
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    console.log('[Service Worker] Serving from cache:', event.request.url);
                    return response;
                }

                // No cache hit - fetch from network
                console.log('[Service Worker] Fetching from network:', event.request.url);
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and can only be consumed once. We must clone it so that
                        // both the browser and the cache can consume it.
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                // Don't cache range requests or third-party resources that might cause issues
                                if (!event.request.url.startsWith(self.location.origin) && !event.request.url.includes('google')) {
                                     // For external resources like Google Fonts or CDNs, you might implement
                                     // a stale-while-revalidate strategy or not cache them at all.
                                     // For simplicity, this example only caches same-origin requests.
                                    console.log('[Service Worker] Not caching external resource:', event.request.url);
                                    return;
                                }
                                cache.put(event.request, responseToCache);
                                console.log('[Service Worker] Caching new resource:', event.request.url);
                            })
                            .catch(error => {
                                console.error('[Service Worker] Failed to cache network response:', error);
                            });

                        return networkResponse;
                    })
                    .catch((error) => {
                        // This catch block handles network errors (e.g., user is offline)
                        console.error('[Service Worker] Network request failed:', event.request.url, error);
                        // You could return a custom offline page here if desired.
                        // For now, it will simply result in a network error for the user.
                    });
            })
    );
});

/**
 * Event Listener for 'activate' event.
 * This is triggered when the service worker is activated (e.g., after a new version is installed).
 * It's used to clean up old caches to save space and ensure users get the latest content.
 */
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating new service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete old caches that don't match the current CACHE_NAME
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] Old caches cleared. Ready to handle fetches.');
            // Ensure the service worker takes control of clients immediately.
            // This is useful for PWAs that need to work offline immediately after activation.
            return self.clients.claim();
        })
    );
});
