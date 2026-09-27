import { describe, expect, it } from '@jest/globals';

import { leerEvento, leerOcurrencias, leerUrlDePortada } from '../eventosSchemas';

/**
 * El parser de eventos tiene que aguantar un backend que cambia sin que la app se actualice (no hay
 * actualización por aire): campos que faltan, valores de enum nuevos, un elemento roto en la lista.
 */
const EVENTO = {
  id: 'e1',
  title: 'Clase en vivo',
  description: 'Traer cuaderno',
  coverUrl: null,
  startsAt: '2026-10-01T00:30:00Z',
  durationMinutes: 60,
  timezone: 'America/Lima',
  locationType: 'MEET',
  locationValue: ' https://meet.google.com/abc-defg-hij ',
  eventType: 'SESION_ESPECIAL',
  reminderRules: null,
  notifyOnCreate: true,
  remindByEmail: false,
  recurrenceFrequency: null,
  createdById: 'u-admin',
  audienceType: 'ALL_MEMBERS',
  targetRoles: [],
};

describe('leerOcurrencias', () => {
  it('traduce una ocurrencia completa', () => {
    const [oc] = leerOcurrencias([
      {
        event: EVENTO,
        occurrenceStart: '2026-10-01T00:30:00Z',
        startsAt: '2026-10-01T00:30:00Z',
        durationMinutes: 60,
        title: 'Clase en vivo',
        viewerRsvpStatus: 'GOING',
      },
    ]);
    expect(oc.asistencia).toBe('GOING');
    expect(oc.evento.tipoUbicacion).toBe('MEET');
    expect(oc.evento.valorUbicacion).toBe('https://meet.google.com/abc-defg-hij');
    expect(oc.evento.reglasDeAviso).toBeNull();
    expect(oc.evento.recurrente).toBe(false);
  });

  it('con solo lo imprescindible (backend viejo o recortado) igual muestra el evento', () => {
    const [oc] = leerOcurrencias([{ event: { id: 'e2', title: 'Mentoría', startsAt: '2026-10-02T15:00:00Z' } }]);
    expect(oc.titulo).toBe('Mentoría');
    expect(oc.inicioOcurrencia).toBe('2026-10-02T15:00:00Z');
    expect(oc.iniciaEn).toBe('2026-10-02T15:00:00Z');
    expect(oc.asistencia).toBeNull();
    expect(oc.evento.zona).toBeNull();
    expect(oc.evento.tipoUbicacion).toBe('OTRO');
  });

  it('un valor de enum que esta versión no conoce no rompe nada', () => {
    const [oc] = leerOcurrencias([
      { event: { ...EVENTO, locationType: 'TEAMS' }, viewerRsvpStatus: 'INTERESTED' },
    ]);
    expect(oc.evento.tipoUbicacion).toBe('OTRO');
    expect(oc.asistencia).toBeNull();
  });

  it('descarta el elemento roto y muestra los demás, en orden de hora', () => {
    const lista = leerOcurrencias([
      { event: { ...EVENTO, id: 'tarde', startsAt: '2026-10-05T20:00:00Z' } },
      { event: { title: 'sin id', startsAt: '2026-10-03T20:00:00Z' } },
      'basura',
      { event: { ...EVENTO, id: 'temprano', startsAt: '2026-10-04T20:00:00Z' } },
    ]);
    expect(lista.map(o => o.evento.id)).toEqual(['temprano', 'tarde']);
  });

  it('si la respuesta no es una lista, avisa en vez de mostrar vacío', () => {
    expect(() => leerOcurrencias({ items: [] })).toThrow('GET /api/v1/calendar/events');
  });

  it('lee las reglas propias y descarta las que no entiende', () => {
    const ev = leerEvento({
      ...EVENTO,
      reminderRules: [
        { kind: 'minutesBefore', value: 30 },
        { kind: 'timeOfDay', value: '06:00:00' },
        { kind: 'daysBefore', value: '1' },
        { kind: 'weeksBefore', value: 1 },
        { kind: 'timeOfDay', value: '25:00' },
      ],
    });
    expect(ev.reglasDeAviso).toEqual([
      { tipo: 'minutosAntes', minutos: 30 },
      { tipo: 'horaDelDia', hora: '06:00' },
      { tipo: 'diasAntes', dias: 1 },
    ]);
  });
});

describe('portada (coverUrl)', () => {
  it('trae la URL firmada de la portada', () => {
    const ev = leerEvento({ ...EVENTO, coverUrl: 'https://s3.example.com/calendar/e1/portada-1?X-Amz=1' });
    expect(ev.portadaUrl).toBe('https://s3.example.com/calendar/e1/portada-1?X-Amz=1');
  });

  it('sin portada, o con la URL de un almacenamiento sin configurar, no hay portada', () => {
    expect(leerEvento(EVENTO).portadaUrl).toBeNull();
    expect(leerEvento({ ...EVENTO, coverUrl: 'about:blank#pendiente-s3/x' }).portadaUrl).toBeNull();
  });
});

describe('leerUrlDePortada', () => {
  it('toma la URL de subida y la ruta que se confirma', () => {
    expect(leerUrlDePortada({ url: 'https://s3/x', bucket: 'b', ruta: 'calendar/e1/portada-1' })).toEqual({
      url: 'https://s3/x',
      ruta: 'calendar/e1/portada-1',
    });
    expect(() => leerUrlDePortada({ bucket: 'b' })).toThrow();
  });
});
