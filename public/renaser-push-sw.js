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
  // D-221 (2026-09-29): los avisos de chat traen `tag` (`chat-<conversacion>`): el nuevo REEMPLAZA al
  // anterior de esa conversacion en vez de apilarse, y `renotify` hace que igual vuelva a sonar.
  if (payload.tag) {
    options.tag = payload.tag;
    options.renotify = true;
  }
  const ruta = options.data && options.data.url ? options.data.url : '';
  const esDeChat = typeof ruta === 'string' && ruta.indexOf('/chat/') === 0;
  if (!esDeChat) {
    event.waitUntil(self.registration.showNotification(title, options));
    return;
  }
  // Con Renaser a la vista (ventana visible y enfocada), un mensaje de chat no sale como aviso del
  // sistema: se le pasa a la pagina, que suena si es de OTRO chat y no hace nada si es el abierto.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientes => {
      const aLaVista = clientes.find(cliente => cliente.visibilityState === 'visible' && cliente.focused);
      if (aLaVista) {
        aLaVista.postMessage({ tipo: 'renaser-mensaje-chat', ruta: ruta });
        return undefined;
      }
      return self.registration.showNotification(title, options);
    }),
  );
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
        // D-218 (2026-09-28): la ventana abierta tambien va a lo del aviso (Training con la categoria
        // del habito, Plan -> Objetivos). Antes solo se enfocaba y quedaba donde estaba.
        existente.postMessage({ tipo: 'renaser-abrir-aviso', ruta: destino });
        return existente.focus();
      }
      return self.clients.openWindow(destino);
    }),
  );
});
