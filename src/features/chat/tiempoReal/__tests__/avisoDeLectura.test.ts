/**
 * El aviso en vivo de la doble marca (D-208 del backend, 2026-09-27): `LecturaFanoutPayload`
 * serializa `{"event":"READ","readUpTo":"…"}` (lo fija `LecturaFanoutPayloadTest` del backend).
 * Contra el parser anterior fallan las dos primeras: un `READ` se descartaba como evento desconocido.
 */
import { describe, expect, it } from '@jest/globals';

import { leerEventoDelChat } from '../eventosDelChat';

describe('el aviso de lectura', () => {
  it('se lee como READ con su marca', () => {
    expect(leerEventoDelChat('{"event":"READ","readUpTo":"2026-09-27T17:00:26.869554Z"}'))
      .toEqual({ event: 'READ', readUpTo: '2026-09-27T17:00:26.869554Z' });
  });

  it('un READ que además trae campos de mensaje sigue siendo un READ, nunca un mensaje', () => {
    const evento = leerEventoDelChat(JSON.stringify({
      event: 'READ',
      readUpTo: '2026-09-27T17:00:26Z',
      id: '6f1c',
      conversationId: 'c1',
      senderId: 'u9',
      type: 'TEXT',
      createdAt: '2026-09-27T17:00:26Z',
    }));

    expect(evento?.event).toBe('READ');
  });

  it('sin marca, o con una marca que no es texto, se descarta sin lanzar', () => {
    expect(leerEventoDelChat('{"event":"READ"}')).toBeNull();
    expect(leerEventoDelChat('{"event":"READ","readUpTo":null}')).toBeNull();
    expect(leerEventoDelChat('{"event":"READ","readUpTo":1759000000}')).toBeNull();
  });

  it('un evento que tampoco esta versión conoce se sigue descartando', () => {
    expect(leerEventoDelChat('{"event":"DELIVERED","readUpTo":"2026-09-27T17:00:26Z"}')).toBeNull();
  });
});
