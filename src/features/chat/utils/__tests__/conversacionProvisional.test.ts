import { describe, expect, it } from '@jest/globals';

import { conversacionProvisional, datosDelChatPedido } from '../conversacionProvisional';

describe('el chat pedido desde la ficha se abre en el acto', () => {
  it('arma un 1 a 1 provisional con el id y el nombre, sin esperar al listado', () => { // spec 055 FR-007
    const c = conversacionProvisional({ id: 'conv-1', titulo: 'E2E Aprendiz' });
    expect(c).toMatchObject({ id: 'conv-1', type: 'direct', title: 'E2E Aprendiz', subtitle: '1 a 1', unreadCount: 0, messages: [] });
  });

  it('sin nombre usa un título neutro (nunca vacío)', () => { // spec 055 FR-007
    expect(conversacionProvisional({ id: 'conv-2', titulo: '  ' }).title).toBe('Chat');
  });

  it('lee el pedido de los parámetros de la pestaña: con título abre en el acto; solo con id, espera al listado como antes', () => { // spec 055 SC-002
    expect(datosDelChatPedido({ abrirChatConversacionId: 'conv-1', abrirChatTitulo: 'Ana' })).toEqual({ id: 'conv-1', titulo: 'Ana', enElActo: true });
    expect(datosDelChatPedido({ abrirChatConversacionId: 'conv-1' })).toEqual({ id: 'conv-1', titulo: null, enElActo: false });
    expect(datosDelChatPedido({})).toBeNull();
    expect(datosDelChatPedido(undefined)).toBeNull();
  });
});
