/**
 * La doble marca de leído (✓✓, D-208 del backend, 2026-09-27): qué dice el servidor, cómo se compara
 * la marca en vivo con cada mensaje y qué NO cambia nunca (lo de otros, lo del programa, un leído).
 */
import { describe, expect, it } from '@jest/globals';

import type { ChatMessage } from '../../../../screens/ComunidadScreen';
import { conLeidoHasta, estadoDeEntrega, instanteNoPosterior, llevaDobleMarca, marcaMasReciente } from '../lecturaDelChat';

describe('estadoDeEntrega', () => {
  it('solo READ es leído; SENT, nada o un valor que esta versión no conoce son ✓', () => {
    expect(estadoDeEntrega('READ')).toBe('read');
    expect(estadoDeEntrega('SENT')).toBe('sent');
    expect(estadoDeEntrega(null)).toBe('sent');
    expect(estadoDeEntrega(undefined)).toBe('sent');
    expect(estadoDeEntrega('DELIVERED')).toBe('sent');
    expect(estadoDeEntrega('read')).toBe('sent');
  });
});

describe('instanteNoPosterior', () => {
  it('compara con la precisión del servidor (microsegundos), no la de Date (milisegundos)', () => {
    // Mismo milisegundo, 0,4 ms después: con Date se vería leído sin estarlo.
    expect(instanteNoPosterior('2026-09-27T17:00:26.869954Z', '2026-09-27T17:00:26.869554Z')).toBe(false);
    expect(instanteNoPosterior('2026-09-27T17:00:26.869554Z', '2026-09-27T17:00:26.869554Z')).toBe(true);
    expect(instanteNoPosterior('2026-09-27T17:00:26.869553Z', '2026-09-27T17:00:26.869554Z')).toBe(true);
  });

  it('entiende los largos que usa Instant.toString(): sin decimales, 3, 6 o 9', () => {
    expect(instanteNoPosterior('2026-09-27T17:00:26Z', '2026-09-27T17:00:26.000001Z')).toBe(true);
    expect(instanteNoPosterior('2026-09-27T17:00:26.5Z', '2026-09-27T17:00:26.499999999Z')).toBe(false);
    expect(instanteNoPosterior('2026-09-27T17:00:26.123Z', '2026-09-27T17:00:26.123000Z')).toBe(true);
  });

  it('lo que no tiene esa forma va con Date, y lo que no se entiende no es anterior', () => {
    expect(instanteNoPosterior('2026-09-27T12:00:26-05:00', '2026-09-27T17:00:27Z')).toBe(true);
    expect(instanteNoPosterior('cualquier cosa', '2026-09-27T17:00:27Z')).toBe(false);
  });
});

describe('marcaMasReciente', () => {
  it('la marca solo avanza: un aviso viejo o repetido que llega tarde no la hace retroceder', () => {
    expect(marcaMasReciente(null, '2026-09-27T17:00:00Z')).toBe('2026-09-27T17:00:00Z');
    expect(marcaMasReciente('2026-09-27T17:00:00Z', '2026-09-27T17:05:00Z')).toBe('2026-09-27T17:05:00Z');
    expect(marcaMasReciente('2026-09-27T17:05:00Z', '2026-09-27T17:00:00Z')).toBe('2026-09-27T17:05:00Z');
  });
});

describe('conLeidoHasta', () => {
  const propio = (id: string, createdAt: string, status: ChatMessage['status'] = 'sent'): ChatMessage => ({
    id,
    sender: 'Tú',
    avatar: '',
    isMe: true,
    time: '12:00',
    type: 'text',
    text: 'hola',
    status,
    createdAt,
  });
  const LEIDO_HASTA = '2026-09-27T17:00:26.869554Z';

  it('pasa a ✓✓ los propios escritos hasta la marca, y deja ✓ los de después', () => {
    const antes = propio('m-1', '2026-09-27T17:00:20Z');
    const justo = propio('m-2', LEIDO_HASTA);
    const despues = propio('m-3', '2026-09-27T17:00:26.869555Z');

    const marcados = conLeidoHasta([antes, justo, despues], LEIDO_HASTA);

    expect(marcados.map(m => m.status)).toEqual(['read', 'read', 'sent']);
    expect(marcados.map(llevaDobleMarca)).toEqual([true, true, false]);
  });

  it('no toca lo de otras personas ni lo del programa, aunque sea anterior a la marca', () => {
    const deOtra = { ...propio('m-1', '2026-09-27T17:00:20Z'), isMe: false };
    const delPrograma = { ...propio('m-2', '2026-09-27T17:00:20Z'), isMe: false, esDelPrograma: true };

    const mensajes = [deOtra, delPrograma];

    expect(conLeidoHasta(mensajes, LEIDO_HASTA)).toBe(mensajes);
    expect(llevaDobleMarca({ ...delPrograma, isMe: true, status: 'read' })).toBe(false);
  });

  it('nunca baja un leído a enviado, y sin cambios devuelve la MISMA lista (no redibuja)', () => {
    const yaLeido = propio('m-1', '2026-09-27T18:00:00Z', 'read');
    const mensajes = [yaLeido];

    expect(conLeidoHasta(mensajes, LEIDO_HASTA)).toBe(mensajes);
    expect(conLeidoHasta(mensajes, null)).toBe(mensajes);
    expect(conLeidoHasta(mensajes, LEIDO_HASTA)[0].status).toBe('read');
  });

  it('un mensaje sin fecha (armado a mano en el teléfono) no se marca', () => {
    const sinFecha = { ...propio('m-1', ''), createdAt: undefined };

    expect(conLeidoHasta([sinFecha], LEIDO_HASTA)[0].status).toBe('sent');
  });
});
