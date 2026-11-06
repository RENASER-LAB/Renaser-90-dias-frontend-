/** Spec 044: la audiencia en el cable, tolerante. */
import { describe, expect, it } from '@jest/globals';

import { leerOpciones, leerResumen } from '../audienciaSchemas';
import { leerEvento } from '../eventosSchemas';

const EVENTO = {
  id: 'e1',
  title: 'Sesión de rescate',
  startsAt: '2026-11-12T01:00:00Z',
  locationType: 'MEET',
  locationValue: 'https://meet.google.com/abc-defg-hij',
  eventType: 'SESION_ESPECIAL',
  audienceType: 'SELECTION',
};

describe('el evento con audiencia elegida', () => {
  // spec 044 FR-032
  it('FR-032: un evento SELECTION se lee como cualquier otro', () => {
    const e = leerEvento(EVENTO);
    expect(e.audiencia).toBe('SELECTION');
    expect(e.audienciaElegida).toBeUndefined();
  });

  // spec 044 FR-016, FR-019
  it('FR-016: sin «audience» (un invitado) no hay audiencia; FR-019: el organizador se lee aparte', () => {
    const e = leerEvento({ ...EVENTO, audience: null, organizer: { id: 'u1', name: 'Rocío Díaz', role: 'Líder de mentores' } });
    expect(e.audienciaElegida).toBeUndefined();
    expect(e.organizador).toEqual({ id: 'u1', nombre: 'Rocío Díaz', fotoUrl: null, rol: 'Líder de mentores', grupo: null });
  });

  // spec 044 FR-035
  it('FR-035: para quien lo gestiona, «Para quién es» con sus partes; una parte rota se pierde ella', () => {
    const e = leerEvento({
      ...EVENTO,
      audience: {
        total: 17,
        parts: [
          { kind: 'TRAFFIC_LIGHT', color: 'RED', count: 15, resolvedAt: '2026-11-06T15:00:00Z' },
          { kind: 'PERSON', count: 2, people: [{ id: 'p1', name: 'Rosa Quispe' }, { roto: true }] },
          { kind: 'ALGO_NUEVO', count: 9 },
        ],
      },
    });
    expect(e.audienciaElegida?.total).toBe(17);
    expect(e.audienciaElegida?.partes.map(p => p.tipo)).toEqual(['TRAFFIC_LIGHT', 'PERSON']);
    expect(e.audienciaElegida?.partes[1].personas.map(p => p.nombre)).toEqual(['Rosa Quispe']);
  });
});

describe('las opciones (FR-029)', () => {
  // spec 044 FR-029
  it('lo que no se entiende se pierde y, sin respuesta, no se puede crear', () => {
    const o = leerOpciones({ canCreate: true, parts: ['MY_LEARNERS', 'NUEVA'], eventTypes: ['SESION_ESPECIAL'], defaultPart: 'MY_LEARNERS',
      trafficLight: { RED: 4 }, myLearners: 6, groups: [{ id: 'g1', name: 'Fénix', members: 5 }, null], staff: [] });
    expect(o.puedeCrear).toBe(true);
    expect(o.partes).toEqual(['MY_LEARNERS']);
    expect(o.colores).toEqual({ GREEN: 0, YELLOW: 0, RED: 4 });
    expect(o.grupos).toEqual([{ id: 'g1', nombre: 'Fénix', integrantes: 5 }]);
    expect(leerOpciones(null).puedeCrear).toBe(false);
    expect(leerResumen(undefined)).toBeNull();
  });
});
