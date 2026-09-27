/**
 * El soporte trae la ruta de SU foto (D-205 del backend, 2026-09-27): la tarjeta de Canva con el primer
 * nombre del aprendiz. Los demás chats no la traen y usan la tarjeta sin nombre.
 *
 * Falla contra el código viejo: el mapeador no conservaba `photoPath` y la conversación no tenía
 * `fotoPath`.
 */
import { describe, expect, it } from '@jest/globals';

import { mapearResumenConversacion } from '../chatMappers';
import { validarRespuesta, wireConversacionesListSchema } from '../chatSchemas';
import type { WireConversacionResumen } from '../../types/chat.types';

function resumen(type: string, photoPath?: string | null): WireConversacionResumen {
  const conversation: Record<string, unknown> = {
    id: 'c-1',
    type,
    celulaId: null,
    nombre: 'Ana – Formación Renaser',
    createdAt: '2026-09-27T10:00:00Z',
  };
  if (photoPath !== undefined) conversation.photoPath = photoPath;
  return { conversation, lastMessage: null, unreadCount: 0 } as unknown as WireConversacionResumen;
}

describe('photoPath en la lista de chats', () => {
  it('el esquema acepta la ruta, null o que no venga (un backend anterior)', () => {
    const lista = [
      resumen('SUPPORT', '/api/v1/chat/conversations/c-1/foto'),
      resumen('GLOBAL', null),
      resumen('CELL'),
    ];

    expect(() => validarRespuesta(wireConversacionesListSchema, lista, 'GET /api/v1/chat/conversations')).not.toThrow();
  });

  it('el soporte conserva la ruta de su foto', () => {
    expect(mapearResumenConversacion(resumen('SUPPORT', '/api/v1/chat/conversations/c-1/foto'), 'yo', {}).fotoPath).toBe(
      '/api/v1/chat/conversations/c-1/foto'
    );
  });

  it('sin ruta, o vacía, no hay foto: la tarjeta sin nombre', () => {
    expect(mapearResumenConversacion(resumen('GLOBAL'), 'yo', {}).fotoPath).toBeNull();
    expect(mapearResumenConversacion(resumen('SUPPORT', null), 'yo', {}).fotoPath).toBeNull();
    expect(mapearResumenConversacion(resumen('SUPPORT', '  '), 'yo', {}).fotoPath).toBeNull();
  });
});
