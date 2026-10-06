import { describe, expect, it } from '@jest/globals';

import { leerLista, leerRespuestas } from '../asistenciaSchemas';

describe('lectura de los endpoints de asistencia (D-256)', () => {
  it('traduce /responses y descarta la fila sin id sin tumbar las demás', () => {
    const r = leerRespuestas({
      occurrenceStart: '2026-10-06T01:00:00Z',
      people: [
        {
          userId: 'a',
          fullName: 'Ana Ríos',
          avatarUrl: null,
          status: 'GOING',
          respondedAt: '2026-10-04T14:10:00Z',
          history: [{ status: 'NOT_GOING', at: '2026-10-04T02:05:00Z' }, { status: 'GOING', at: '2026-10-04T14:10:00Z' }],
          campoNuevo: 1,
        },
        { fullName: 'Sin id' },
        { userId: 'c', status: 'ALGO_NUEVO' },
      ],
    });
    expect(r.personas.map(p => p.id)).toEqual(['a', 'c']);
    expect(r.personas[0].historial.map(h => h.respuesta)).toEqual(['NOT_GOING', 'GOING']);
    expect(r.personas[1]).toMatchObject({ nombre: 'Sin nombre', respuesta: null, historial: [] });
  });

  it('traduce /attendance: estado desconocido = sin marcar; lista cerrada con quién', () => {
    const l = leerLista({
      occurrenceStart: '2026-10-06T01:00:00Z',
      opensAt: '2026-10-06T00:30:00Z',
      closesAt: '2026-10-06T14:00:00Z',
      open: false,
      closed: { at: '2026-10-06T02:06:00Z', byUserId: 'k', byName: 'Kelin Rojas' },
      people: [
        { userId: 'a', fullName: 'Ana', status: 'GOING', estado: 'A_TIEMPO', markedAt: '2026-10-06T01:02:00Z' },
        { userId: 'b', fullName: 'Beto', estado: 'PRESENTE' },
      ],
    });
    expect(l.cerrada).toEqual({ en: '2026-10-06T02:06:00Z', porId: 'k', porNombre: 'Kelin Rojas' });
    expect(l.personas.map(p => p.llegada)).toEqual(['A_TIEMPO', null]);
    expect(l.abierta).toBe(false);
  });
});
