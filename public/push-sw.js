// Powiadomienia Web Push w service workerze (dołączane do sw.js przez vite-plugin-pwa,
// workbox.importScripts). Worker w Cloudflare wysyła JSON: { title, body, url, tag }.

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Ogarnij życie'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      lang: 'pl',
      // ten sam „tag” zastępuje poprzednie powiadomienie (np. poranne podsumowanie)
      tag: data.tag || undefined,
      data: { url: data.url || '/' },
    }),
  )
})

// Dotknięcie powiadomienia: otwarta aplikacja – na wierzch i na właściwy ekran; inaczej – nowe okno.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin)) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
