/**
 * D-249: los chats de soporte de quien atiende, de a una página y con búsqueda en el servidor. Contra el
 * código anterior no existe el hook ni el endpoint: la app traía los 300 soportes en la lista completa.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

type Pedido = { ruta: string; responder: (valor: unknown) => void; fallar: (e: unknown) => void };
const pedidos: Pedido[] = [];
const mockApiFetch = jest.fn((ruta: string) =>
  new Promise<unknown>((responder, fallar) => {
    pedidos.push({ ruta, responder, fallar });
  })
);
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string) => mockApiFetch(ruta),
  mensajeDeError: (_e: unknown, porDefecto: string) => porDefecto,
}));

import { useSoportesPaginados } from '../useSoportesPaginados';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let api: ReturnType<typeof useSoportesPaginados>;
function Sonda({ activo }: { activo: boolean }) {
  api = useSoportesPaginados(activo, 'u-admin');
  return null;
}

async function drenar() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

function soporte(id: string) {
  return {
    conversation: { id, type: 'SUPPORT', celulaId: null, nombre: `${id} – Formación Renaser`, createdAt: '2026-09-20T12:00:00Z' },
    lastMessage: null,
    unreadCount: 0,
  };
}

function pagina(ids: string[], nextCursor: string | null, extra: Record<string, unknown> = {}) {
  return { conversations: ids.map(soporte), nextCursor, hasMore: nextCursor !== null, ...extra };
}

async function contestar(valor: unknown, cual = pedidos.length - 1) {
  await act(async () => {
    pedidos[cual].responder(valor);
  });
  await drenar();
}

let raiz: ReactTestRenderer;

beforeEach(() => {
  jest.useFakeTimers();
  pedidos.length = 0;
  mockApiFetch.mockClear();
});

afterEach(() => {
  act(() => raiz?.unmount());
  jest.useRealTimers();
});

async function montar(activo = true) {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda, { activo }));
  });
  await drenar();
}

async function escribir(texto: string) {
  await act(async () => {
    api.setTexto(texto);
  });
}

describe('useSoportesPaginados', () => {
  it('sin estar activo no pide nada', async () => {
    await montar(false);
    expect(pedidos).toHaveLength(0);
  });

  it('pide la primera página de 25 y trae total y no leídos para la cabecera', async () => {
    await montar();
    expect(pedidos.map(p => p.ruta)).toEqual(['/api/v1/chat/support-conversations?size=25']);
    await contestar(pagina(['s1', 's2'], 'c1', { totalCount: 312, unreadConversations: 4 }));

    expect(api.filas.map(f => f.id)).toEqual(['s1', 's2']);
    expect(api.filas[0].type).toBe('soporte');
    expect(api.totalSinBusqueda).toBe(312);
    expect(api.conNoLeidos).toBe(4);
    expect(api.hayMas).toBe(true);
  });

  it('pide la siguiente con el cursor, suma sin repetir y no pide de nuevo mientras hay una en vuelo', async () => {
    await montar();
    await contestar(pagina(['s1', 's2'], 'c1', { totalCount: 4 }));

    await act(async () => {
      void api.pedirMas();
      void api.pedirMas();
    });
    expect(pedidos.map(p => p.ruta)).toEqual([
      '/api/v1/chat/support-conversations?size=25',
      '/api/v1/chat/support-conversations?cursor=c1&size=25',
    ]);
    expect(api.cargandoMas).toBe(true);
    await contestar(pagina(['s2', 's3', 's4'], null));

    expect(api.filas.map(f => f.id)).toEqual(['s1', 's2', 's3', 's4']);
    expect(api.hayMas).toBe(false);
    expect(api.cargandoMas).toBe(false);

    await act(async () => {
      void api.pedirMas();
    });
    expect(pedidos).toHaveLength(2);
  });

  it('busca en el servidor una sola vez, 300 ms después de la última tecla', async () => {
    await montar();
    await contestar(pagina(['s1'], null, { totalCount: 1 }));

    await escribir('jo');
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await escribir('josé');
    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(pedidos).toHaveLength(1);
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    await drenar();

    expect(pedidos.map(p => p.ruta)).toEqual([
      '/api/v1/chat/support-conversations?size=25',
      `/api/v1/chat/support-conversations?q=${encodeURIComponent('josé')}&size=25`,
    ]);
  });

  it('una respuesta vieja no pisa la búsqueda nueva', async () => {
    await montar();
    await contestar(pagina(['s1'], 'c1', { totalCount: 300 }));
    await act(async () => {
      void api.pedirMas();
    });
    await escribir('maria');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await drenar();
    expect(pedidos).toHaveLength(3);

    await contestar(pagina(['maria'], null, { totalCount: 1 }), 2);
    await contestar(pagina(['vieja'], null), 1);

    expect(api.filas.map(f => f.id)).toEqual(['maria']);
    expect(api.cargandoMas).toBe(false);
    expect(api.totalSinBusqueda).toBe(300);
  });

  it('sin resultados queda vacía, y al borrar el texto vuelve la lista', async () => {
    await montar();
    await contestar(pagina(['s1'], null, { totalCount: 1 }));
    await escribir('zzz');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await drenar();
    await contestar(pagina([], null, { totalCount: 0 }));
    expect(api.filas).toHaveLength(0);
    expect(api.buscando).toBe(true);

    await escribir('');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await drenar();
    await contestar(pagina(['s1'], null, { totalCount: 1 }));
    expect(api.filas.map(f => f.id)).toEqual(['s1']);
    expect(api.buscando).toBe(false);
  });
});
