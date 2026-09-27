/**
 * El refresco de la lista de chats (2026-09-27): cuándo se relee al cambiar de conversación y qué
 * se conserva de lo que el teléfono ya tenía.
 */
import { describe, expect, it } from '@jest/globals';

import type { ChatConversation, ChatMessage } from '../../../../screens/ComunidadScreen';
import { conLaFotoDeLaLista, fusionarConLoQueHabia, pideReleerAlCerrarElChat } from '../refrescoDeLaLista';

function conversacion(parcial: Partial<ChatConversation> & { id: string }): ChatConversation {
  return {
    type: 'celula',
    celulaId: null,
    title: 'Mi Grupo',
    subtitle: 'Chat de tu grupo',
    avatar: '👥',
    lastMessage: 'Hola',
    lastTime: '09:00',
    unreadCount: 0,
    messages: [],
    ...parcial,
  };
}

const mensaje = (id: string, parcial: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  sender: 'Ana Rojas',
  avatar: '',
  isMe: false,
  time: '09:00',
  type: 'text',
  text: 'Hola',
  ...parcial,
});

describe('pideReleerAlCerrarElChat', () => {
  it('cerrar una conversación (volver a la lista) relee', () => {
    expect(pideReleerAlCerrarElChat('c-1', null)).toBe(true);
  });

  it('abrir una, pasar de una a otra o quedarse igual, no', () => {
    expect(pideReleerAlCerrarElChat(null, 'c-1')).toBe(false);
    expect(pideReleerAlCerrarElChat('c-1', 'c-2')).toBe(false);
    expect(pideReleerAlCerrarElChat('c-1', 'c-1')).toBe(false);
    expect(pideReleerAlCerrarElChat(null, null)).toBe(false);
  });
});

describe('fusionarConLoQueHabia', () => {
  it('lo de la fila sale del servidor: vista previa, hora, orden y no leídos', () => {
    const previas = [conversacion({ id: 'c-1', lastMessage: 'viejo', unreadCount: 0, lastMessageAt: '2026-09-27T08:00:00Z' })];
    const nuevas = [conversacion({ id: 'c-1', lastMessage: 'nuevo', unreadCount: 2, lastMessageAt: '2026-09-27T09:30:00Z' })];
    const [fusionada] = fusionarConLoQueHabia(previas, nuevas);
    expect(fusionada.lastMessage).toBe('nuevo');
    expect(fusionada.unreadCount).toBe(2);
    expect(fusionada.lastMessageAt).toBe('2026-09-27T09:30:00Z');
  });

  it('conserva el historial ya cargado, para reabrir el chat sin «Cargando mensajes...»', () => {
    const historial = [mensaje('m-1'), mensaje('m-2')];
    const [fusionada] = fusionarConLoQueHabia([conversacion({ id: 'c-1', messages: historial })], [conversacion({ id: 'c-1' })]);
    expect(fusionada.messages).toBe(historial);
  });

  it('conserva el nombre de un 1 a 1 que solo se supo al abrirlo', () => {
    const historial = [mensaje('m-1', { sender: 'Luis Soto' })];
    const previa = conversacion({ id: 'c-1', type: 'direct', title: 'Luis Soto', messages: historial });
    const nueva = conversacion({ id: 'c-1', type: 'direct', title: 'Conversación directa' });
    expect(fusionarConLoQueHabia([previa], [nueva])[0].title).toBe('Luis Soto');
  });

  it('las que ya no vienen se van y las nuevas entran', () => {
    const fusion = fusionarConLoQueHabia(
      [conversacion({ id: 'c-vieja' }), conversacion({ id: 'c-1' })],
      [conversacion({ id: 'c-1' }), conversacion({ id: 'c-nueva' })]
    );
    expect(fusion.map(c => c.id)).toEqual(['c-1', 'c-nueva']);
  });

  it('no toca ninguna de las dos listas', () => {
    const previas = [conversacion({ id: 'c-1', messages: [mensaje('m-1')] })];
    const nuevas = [conversacion({ id: 'c-1' })];
    fusionarConLoQueHabia(previas, nuevas);
    expect(nuevas[0].messages).toEqual([]);
    expect(previas[0].messages).toHaveLength(1);
  });
});

describe('conLaFotoDeLaLista (D-212: la foto propia del grupo cambia sin reinstalar)', () => {
  const RUTA = (v: number) => `/api/v1/chat/conversations/g-1/foto?v=${v}`;

  it('la conversación abierta toma la ruta nueva de la lista, sin perder su historial', () => {
    const abierta = conversacion({ id: 'g-1', fotoPath: RUTA(1), messages: [mensaje('m-1')] });

    const actualizada = conLaFotoDeLaLista(abierta, [conversacion({ id: 'g-1', fotoPath: RUTA(2) })]);

    expect(actualizada.fotoPath).toBe(RUTA(2));
    expect(actualizada.messages).toBe(abierta.messages);
  });

  it('volver a la de Renaser (sin ruta) también llega a la abierta', () => {
    const abierta = conversacion({ id: 'g-1', fotoPath: RUTA(1) });

    expect(conLaFotoDeLaLista(abierta, [conversacion({ id: 'g-1', fotoPath: null })]).fotoPath).toBeNull();
  });

  it('si no cambió, o no está en la lista, es la MISMA conversación (no se vuelve a dibujar)', () => {
    const abierta = conversacion({ id: 'g-1', fotoPath: RUTA(1) });

    expect(conLaFotoDeLaLista(abierta, [conversacion({ id: 'g-1', fotoPath: RUTA(1) })])).toBe(abierta);
    expect(conLaFotoDeLaLista(abierta, [conversacion({ id: 'otra' })])).toBe(abierta);
  });
});
