/**
 * El `celulaId` de una conversación de grupo tiene que sobrevivir al mapeo.
 *
 * El backend siempre lo mandó (`ConversacionResponse.celulaId`) y el mapeador lo descartaba, porque
 * hasta D-142 nadie del lado del cliente lo necesitaba. Esa pérdida es la que dejaba a la pantalla
 * "info del grupo" sin saber QUÉ grupo estaba abierto: se armaba con `/me/cell`, que responde
 * siempre por el principal, y mostraba los integrantes del general en la info de cualquier grupo.
 *
 * Falla contra el código viejo: `ChatConversation` no tenía el campo.
 */
import { describe, expect, it } from '@jest/globals';

import { mapearResumenConversacion } from '../chatMappers';
import type { WireConversacionResumen } from '../../types/chat.types';

function resumen(type: string, celulaId: string | null): WireConversacionResumen {
  return {
    conversation: { id: 'c-1', type, celulaId, nombre: null, createdAt: '2026-09-17T10:00:00Z' },
    lastMessage: null,
    unreadCount: 0,
    members: [],
  } as unknown as WireConversacionResumen;
}

describe('celulaId en la conversación mapeada', () => {
  it('un chat de grupo conserva a qué grupo pertenece', () => {
    expect(mapearResumenConversacion(resumen('CELL', 'g-07'), 'yo', {}).celulaId).toBe('g-07');
  });

  it('lo que no es de grupo queda en null, no inventa uno', () => {
    expect(mapearResumenConversacion(resumen('DIRECT', null), 'yo', {}).celulaId).toBeNull();
    expect(mapearResumenConversacion(resumen('GLOBAL', null), 'yo', {}).celulaId).toBeNull();
  });

  it('un tipo que este cliente no conoce tampoco pierde su grupo', () => {
    // Mismo criterio que `tipoDeConversacion.test.ts`: un tipo nuevo del servidor no puede
    // degradar los datos que sí entendemos.
    expect(mapearResumenConversacion(resumen('BROADCAST', 'g-07'), 'yo', {}).celulaId).toBe('g-07');
  });
});
