const CACHE_NAME = 'initiative-dashboard-v1'
const STATIC_CACHE = 'static-v1'
const DYNAMIC_CACHE = 'dynamic-v1'
const API_CACHE = 'api-v1'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  // Add critical CSS and JS files
]

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/dashboard/overview',
  '/api/areas',
  '/api/objectives'
]

// Cache duration in milliseconds
const CACHE_DURATION = {
  STATIC: 7 * 24 * 60 * 60 * 1000, // 7 days
  API: 5 * 60 * 1000, // 5 minutes
  DYNAMIC: 24 * 60 * 60 * 1000 // 1 day
}

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      }),
      caches.open(API_CACHE),
      caches.open(DYNAMIC_CACHE)
    ])
  )
  
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches
          if (cacheName !== STATIC_CACHE && 
              cacheName !== API_CACHE && 
              cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
  } else if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request))
  } else {
    event.respondWith(handleDynamicRequest(request))
  }
})

// Handle API requests with cache-first strategy for specific endpoints
async function handleApiRequest(request) {
  const url = new URL(request.url)
  const isCacheable = CACHEABLE_APIs.some(api => url.pathname.startsWith(api))
  
  if (!isCacheable) {
    // For non-cacheable APIs, go network-first
    return networkFirst(request, API_CACHE)
  }
  
  try {
    const cache = await caches.open(API_CACHE)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      const cachedDate = new Date(cachedResponse.headers.get('sw-cache-date'))
      const now = new Date()
      
      // Check if cache is still valid
      if (now - cachedDate < CACHE_DURATION.API) {
        console.log('Service Worker: Serving API from cache:', request.url)
        
        // Update cache in background
        fetch(request).then(response => {
          if (response.ok) {
            const responseClone = response.clone()
            responseClone.headers.set('sw-cache-date', new Date().toISOString())
            cache.put(request, responseClone)
          }
        }).catch(() => {
          // Silently fail background update
        })
        
        return cachedResponse
      }
    }
    
    // Fetch from network
    const response = await fetch(request)
    
    if (response.ok) {
      const responseClone = response.clone()
      responseClone.headers.set('sw-cache-date', new Date().toISOString())
      cache.put(request, responseClone)
    }
    
    return response
    
  } catch (error) {
    console.log('Service Worker: API request failed, checking cache:', request.url)
    
    // If network fails, try to serve from cache even if expired
    const cache = await caches.open(API_CACHE)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline fallback for critical APIs
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'Data not available offline',
        cached: false 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      console.log('Service Worker: Serving static asset from cache:', request.url)
      return cachedResponse
    }
    
    const response = await fetch(request)
    
    if (response.ok) {
      cache.put(request, response.clone())
    }
    
    return response
    
  } catch (error) {
    console.log('Service Worker: Static asset failed:', request.url)
    return new Response('Asset not available offline', { status: 503 })
  }
}

// Handle dynamic content with network-first strategy
async function handleDynamicRequest(request) {
  return networkFirst(request, DYNAMIC_CACHE)
}

// Network-first strategy with cache fallback
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    
    return response
    
  } catch (error) {
    console.log('Service Worker: Network failed, checking cache:', request.url)
    
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline.html') || new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Offline - Initiative Dashboard</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              text-align: center;
              padding: 2rem;
              color: #374151;
            }
            .offline-container {
              max-width: 400px;
              margin: 2rem auto;
            }
            .offline-icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }
            .retry-button {
              background: #3B82F6;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              cursor: pointer;
              font-size: 1rem;
              margin-top: 1rem;
            }
            .retry-button:hover {
              background: #2563EB;
            }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📡</div>
            <h1>You're offline</h1>
            <p>Check your internet connection and try again.</p>
            <button class="retry-button" onclick="window.location.reload()">
              Try Again
            </button>
          </div>
        </body>
        </html>
        `,
        {
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }
    
    return new Response('Resource not available offline', { status: 503 })
  }
}

// Helper function to determine if a path is a static asset
function isStaticAsset(pathname) {
  return pathname.startsWith('/_next/static/') ||
         pathname.startsWith('/images/') ||
         pathname.startsWith('/icons/') ||
         pathname.endsWith('.ico') ||
         pathname.endsWith('.png') ||
         pathname.endsWith('.jpg') ||
         pathname.endsWith('.jpeg') ||
         pathname.endsWith('.gif') ||
         pathname.endsWith('.svg') ||
         pathname.endsWith('.webp') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.js')
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync())
  }
})

async function handleBackgroundSync() {
  // Implement background sync logic for failed API requests
  console.log('Service Worker: Background sync triggered')
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return
  
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data,
    actions: data.actions
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  )
})