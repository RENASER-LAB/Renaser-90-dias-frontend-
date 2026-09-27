/**
 * La lista de chats se refresca sola (2026-09-27, «tipo WhatsApp»): varios disparos juntos
 * comparten un pedido, una respuesta vieja no pisa a una nueva, es en silencio si ya hay lista, y
 * lo que se cambió en el teléfono (abrir un chat, marcarlo leído) no vuelve atrás por una lectura
 * que salió antes. Contra el `recargar` anterior fallan todas: cada llamada salía a la red,
 * prendía «Cargando…» y la última respuesta en llegar ganaba, fuera vieja o no.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

type Pedido = { ruta: string; metodo: string; responder: (valor: unknown) => void };
const pedidos: Pedido[] = [];
const mockApiFetch = jest.fn((ruta: string, opciones?: { method?: string }) =>
  new Promise<unknown>(responder => {
    pedidos.push({ ruta, metodo: opciones?.method ?? 'GET', responder });
  })
);
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: { method?: string }) => mockApiFetch(ruta, opciones),
  mensajeDeError: (_e: unknown, porDefecto: string) => porDefecto,
}));

import { useChatConversaciones } from '../useChatConversaciones';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LISTA = '/api/v1/chat/conversations';

let api: ReturnType<typeof useChatConversaciones>;
function Sonda() {
  api = useChatConversaciones('u-yo', true);
  return null;
}

/** Deja correr las promesas pendientes (y los efectos que disparen). */
async function drenar() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

const pedidosDeLaLista = () => pedidos.filter(p => p.ruta === LISTA);

/** Contesta el último pedido pendiente de esa ruta (y el directorio, que va en paralelo). */
async function contestar(ruta: string, valor: unknown, cual: 'ultimo' | number = 'ultimo') {
  const deEsaRuta = pedidos.filter(p => p.ruta === ruta);
  const pedido = cual === 'ultimo' ? deEsaRuta[deEsaRuta.length - 1] : deEsaRuta[cual];
  pedidos.filter(p => p.ruta.startsWith('/api/v1/chat/members')).forEach(p => p.responder({ members: [], nextCursor: null }));
  await act(async () => {
    pedido.responder(valor);
  });
  await drenar();
}

function resumen(id: string, texto: string, noLeidos: number) {
  return {
    conversation: { id, type: 'CELL', celulaId: 'g-1', nombre: null, createdAt: '2026-09-20T12:00:00Z' },
    lastMessage: {
      id: `m-${id}-${texto}`,
      conversationId: id,
      senderId: 'u-ana',
      senderName: null,
      senderAvatarUrl: null,
      type: 'TEXT',
      text: texto,
      mediaBucket: null,
      mediaPath: null,
      mediaMime: null,
      mediaBytes: null,
      mediaDurationSeconds: null,
      mediaUrl: null,
      hidden: false,
      replyToId: null,
      replyTo: null,
      createdAt: '2026-09-27T09:00:00Z',
    },
    unreadCount: noLeidos,
  };
}

describe('la lista de chats se refresca sola', () => {
  let raiz: ReactTestRenderer | null = null;

  beforeEach(async () => {
    pedidos.length = 0;
    mockApiFetch.mockClear();
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(Sonda));
    });
    await drenar();
  });

  afterEach(() => {
    act(() => raiz?.unmount());
    raiz = null;
  });

  it('varios disparos juntos comparten UN pedido', async () => {
    expect(pedidosDeLaLista()).toHaveLength(1); // el de activar la sección
    await act(async () => {
      void api.recargar(); // volver a la pestaña
      void api.recargar(); // volver de un chat, en el mismo instante
    });
    await drenar();
    expect(pedidosDeLaLista()).toHaveLength(1);
    await contestar(LISTA, [resumen('c-1', 'Hola', 1)]);
    expect(api.conversations.map(c => c.lastMessage)).toEqual(['Hola']);
  });

  it('una respuesta vieja no pisa a una nueva', async () => {
    await contestar(LISTA, [resumen('c-1', 'primera', 0)]);
    await act(async () => {
      void api.recargar();
    });
    await drenar();
    await act(async () => {
      void api.recargar({ forzar: true });
    });
    await drenar();
    expect(pedidosDeLaLista()).toHaveLength(3);
    await contestar(LISTA, [resumen('c-1', 'la más nueva', 4)], 2);
    await contestar(LISTA, [resumen('c-1', 'la vieja', 1)], 1);
    expect(api.conversations[0].lastMessage).toBe('la más nueva');
    expect(api.conversations[0].unreadCount).toBe(4);
  });

  it('con lista a la vista el refresco es en silencio: no vuelve «Cargando…»', async () => {
    expect(api.loading).toBe(true); // la primera vez, sí
    await contestar(LISTA, [resumen('c-1', 'Hola', 0)]);
    expect(api.loading).toBe(false);
    await act(async () => {
      void api.recargar();
    });
    await drenar();
    expect(pedidosDeLaLista()).toHaveLength(2);
    expect(api.loading).toBe(false);
  });

  it('deslizando prende y apaga el indicador del pull-to-refresh', async () => {
    await contestar(LISTA, [resumen('c-1', 'Hola', 0)]);
    let fin!: Promise<void>;
    await act(async () => {
      fin = api.recargar({ deslizando: true });
    });
    expect(api.refrescando).toBe(true);
    await contestar(LISTA, [resumen('c-1', 'Otra', 0)]);
    await act(async () => {
      await fin;
    });
    expect(api.refrescando).toBe(false);
    expect(api.conversations[0].lastMessage).toBe('Otra');
  });

  it('abrir un chat descarta la lectura que salió antes: el contador de no leídos no vuelve', async () => {
    await contestar(LISTA, [resumen('c-1', 'Hola', 3)]);
    await act(async () => {
      void api.recargar(); // salió ANTES de abrir el chat: trae los 3 no leídos
    });
    await drenar();
    let abierta!: Promise<unknown>;
    await act(async () => {
      abierta = api.abrirConversacion(api.conversations[0]);
    });
    await contestar('/api/v1/chat/conversations/c-1/messages', { messages: [], nextCursor: null, hasMore: false });
    await act(async () => {
      await abierta;
    });
    expect(api.conversations[0].unreadCount).toBe(0);
    await contestar(LISTA, [resumen('c-1', 'Hola', 3)], 1);
    expect(api.conversations[0].unreadCount).toBe(0);
  });

  it('la lectura espera a que el chat recién abierto quede marcado como leído', async () => {
    await contestar(LISTA, [resumen('c-1', 'Hola', 3)]);
    let abierta!: Promise<unknown>;
    await act(async () => {
      abierta = api.abrirConversacion(api.conversations[0]);
    });
    await contestar('/api/v1/chat/conversations/c-1/messages', { messages: [], nextCursor: null, hasMore: false });
    await act(async () => {
      await abierta;
    });
    const marca = pedidos.find(p => p.ruta === '/api/v1/chat/conversations/c-1/read');
    expect(marca?.metodo).toBe('POST');

    await act(async () => {
      void api.recargar(); // volver a la lista enseguida
    });
    await drenar();
    expect(pedidosDeLaLista()).toHaveLength(1); // todavía no salió: espera la marca

    await act(async () => {
      marca!.responder(undefined);
    });
    await drenar();
    expect(pedidosDeLaLista()).toHaveLength(2);
  });
});
