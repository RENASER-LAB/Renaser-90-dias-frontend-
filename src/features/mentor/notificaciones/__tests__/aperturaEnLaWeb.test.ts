import { describe, expect, it, jest } from '@jest/globals';

import { rutaDelMensajeDelServiceWorker } from '../rutaDeAviso';

/**
 * D-218, web (dueño, 28/09): tocar el push en el navegador abre Training con la categoría del hábito, o
 * Plan → Objetivos. Contra el código viejo falla: el service worker solo enfocaba la ventana abierta, sin
 * decirle adónde ir, y la app web no leía ninguna ruta.
 */
type Oyente = (evento: unknown) => void;

function cargarServiceWorker(clientes: unknown[]) {
  const oyentes: Record<string, Oyente> = {};
  const self = {
    addEventListener: (tipo: string, oyente: Oyente) => { oyentes[tipo] = oyente; },
    clients: {
      matchAll: async () => clientes,
      openWindow: jest.fn(async (_url: string) => null),
    },
    registration: { showNotification: jest.fn() },
  };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path') as typeof import('path');
  const fuente = fs.readFileSync(path.join(__dirname, '../../../../../public/renaser-push-sw.js'), 'utf8');
  new Function('self', fuente)(self);
  const tocar = async (url: string) => {
    let promesa: Promise<unknown> = Promise.resolve();
    oyentes.notificationclick({ notification: { close: () => {}, data: { url } }, waitUntil: (p: Promise<unknown>) => { promesa = p; } });
    await promesa;
  };
  return { self, tocar };
}

describe('tocar el push en la web', () => {
  it('con una ventana abierta, la enfoca y le dice adónde ir', async () => {
    const ventana = { focus: jest.fn(async () => ventana), postMessage: jest.fn() };
    const { tocar } = cargarServiceWorker([ventana]);
    await tocar('/habitos/h-1?dimension=BODY');
    expect(ventana.postMessage).toHaveBeenCalledWith({ tipo: 'renaser-abrir-aviso', ruta: '/habitos/h-1?dimension=BODY' });
    expect(ventana.focus).toHaveBeenCalled();
  });

  it('sin ventana, abre una nueva en la ruta del aviso', async () => {
    const { self, tocar } = cargarServiceWorker([]);
    await tocar('/habitos/h-1?dimension=BODY');
    expect(self.clients.openWindow).toHaveBeenCalledWith('/habitos/h-1?dimension=BODY');
  });

  it('la app toma solo los mensajes de aviso del service worker', () => {
    expect(rutaDelMensajeDelServiceWorker({ tipo: 'renaser-abrir-aviso', ruta: '/habitos/h-1' })).toBe('/habitos/h-1');
    expect(rutaDelMensajeDelServiceWorker({ tipo: 'otro', ruta: '/habitos/h-1' })).toBeNull();
    expect(rutaDelMensajeDelServiceWorker(null)).toBeNull();
  });
});
