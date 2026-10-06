const parameters = new URL(self.location.href).searchParams
const side = parameters.get('side') || 'logistics'
const cachePrefix = `iamd-logistics-${side}-`
const cacheName = `${cachePrefix}v2`
const manifest = side === 'red' || side === 'blue' ? `./manifest-${side}.webmanifest` : './'
const icon = side === 'red' || side === 'blue' ? `./icon-${side}.svg` : './'
const shell = ['./', './index.html', manifest, icon]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(shell)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(cachePrefix) && key !== cacheName)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const requestUrl = new URL(event.request.url)
  if (requestUrl.origin !== self.location.origin) return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(cacheName).then((cache) => cache.put('./index.html', copy))
          return response
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(cacheName).then((cache) => cache.put(event.request, copy))
      }
      return response
    })),
  )
})
