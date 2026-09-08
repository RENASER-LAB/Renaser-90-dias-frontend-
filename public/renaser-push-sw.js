/* Service worker minimo para Web Push de Renaser. Debe vivir en la raiz del dominio. */
self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Renaser';
  const options = {
    body: payload.body || 'Tienes un aviso pendiente.',
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    data: payload.data || {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destino = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientes => {
      const existente = clientes.find(cliente => 'focus' in cliente);
      if (existente) {
        existente.focus();
        return existente;
      }
      return self.clients.openWindow(destino);
    }),
  );
});
