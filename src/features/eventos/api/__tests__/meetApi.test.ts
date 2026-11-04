/**
 * Lo que la app pide y entiende del enlace de Meet automático (spec 040, D-321): la disponibilidad del formulario, «Reintentar», y el resumen
 * `meet` que el servidor manda solo a quien administra. Todo tolerante: lo que no se entiende deja la pantalla como la de siempre.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string }) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return {
    ApiError,
    apiFetch: (ruta: string, opciones?: { method?: string }) => {
      return mockApiFetch(ruta, opciones);
    },
  };
});

import { ApiError } from '../../../../services/http/apiClient';
import { leerEvento, leerOcurrencias } from '../eventosSchemas';
import { consultarDisponibilidadDeMeet, reintentarLaSala } from '../meetApi';

const eventoCrudo = (extra: Record<string, unknown> = {}) => ({
  id: 'e1',
  title: 'Clase en vivo',
  startsAt: '2026-11-10T01:00:00Z',
  locationType: 'MEET',
  locationValue: 'https://meet.google.com/abc-defg-hij',
  ...extra,
});

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('la disponibilidad (FR-014)', () => {
  // spec 040 FR-014
  it('pregunta a GET /calendar/events/meet/status y devuelve lo que dice el servidor', async () => {
    mockApiFetch.mockResolvedValue({ disponible: true, motivo: null });

    expect(await consultarDisponibilidadDeMeet()).toEqual({ disponible: true, motivo: null });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/calendar/events/meet/status', undefined);
  });

  // spec 040 FR-014
  it('si no se puede, trae el motivo', async () => {
    mockApiFetch.mockResolvedValue({ disponible: false, motivo: 'SIN_CUENTA' });

    expect(await consultarDisponibilidadDeMeet()).toEqual({ disponible: false, motivo: 'SIN_CUENTA' });
  });

  // spec 040 FR-014, SC-009
  it('un 404 (función apagada o servidor anterior) y un 403 se leen como «no disponible», sin lanzar', async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError(404, 'no'));
    expect((await consultarDisponibilidadDeMeet()).disponible).toBe(false);
    mockApiFetch.mockRejectedValueOnce(new ApiError(403, 'no'));
    expect((await consultarDisponibilidadDeMeet()).disponible).toBe(false);
  });

  // spec 040 FR-014
  it('sin red, o con una respuesta que no se entiende, tampoco se ofrece nada y no lanza', async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError(0, 'sin red'));
    expect((await consultarDisponibilidadDeMeet()).disponible).toBe(false);
    mockApiFetch.mockResolvedValueOnce({ cosa: 1 });
    expect((await consultarDisponibilidadDeMeet()).disponible).toBe(false);
    mockApiFetch.mockResolvedValueOnce(null);
    expect((await consultarDisponibilidadDeMeet()).disponible).toBe(false);
  });
});

describe('«Reintentar» (FR-008)', () => {
  // spec 040 FR-008
  it('hace POST a /{id}/meet/retry y devuelve el evento ya al día', async () => {
    mockApiFetch.mockResolvedValue(eventoCrudo({ meet: { estado: 'CREADO', acceso: 'ABIERTA', accesoAplicado: true, mensaje: null, fechasConSala: 1, fechasConProblema: 0 } }));

    const evento = await reintentarLaSala('e 1');

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/calendar/events/e%201/meet/retry', { method: 'POST' });
    expect(evento.meet?.estado).toBe('CREADO');
  });
});

describe('el resumen de la sala en el evento (FR-019, SC-007, FR-020)', () => {
  // spec 040 FR-019
  it('lee el estado, el acceso y la frase del servidor', () => {
    const evento = leerEvento(
      eventoCrudo({ meet: { estado: 'FALLIDO', acceso: 'CON_PERMISO', accesoAplicado: false, mensaje: ' No pudimos crear el enlace de Meet. ', fechasConSala: 0, fechasConProblema: 2 } }),
    );

    expect(evento.meet).toEqual({
      estado: 'FALLIDO',
      acceso: 'CON_PERMISO',
      accesoAplicado: false,
      mensaje: 'No pudimos crear el enlace de Meet.',
      fechasConSala: 0,
      fechasConProblema: 2,
    });
  });

  // spec 040 SC-007, FR-020
  it('para quien no administra, o con un servidor anterior, el evento es idéntico al de siempre: no tiene `meet`', () => {
    expect('meet' in leerEvento(eventoCrudo())).toBe(false);
    expect('meet' in leerEvento(eventoCrudo({ meet: null }))).toBe(false);
  });

  // spec 040 FR-020
  it('un resumen roto (acceso desconocido, sin estado, de otro tipo) no tumba el evento: solo se pierde él', () => {
    for (const roto of [{ estado: 'CREADO', acceso: 'RESTRINGIDA' }, { acceso: 'ABIERTA' }, 'texto', 7, []]) {
      const evento = leerEvento(eventoCrudo({ meet: roto }));
      expect(evento.titulo).toBe('Clase en vivo');
      expect('meet' in evento).toBe(false);
    }
  });

  // spec 040 FR-017
  it('el enlace de cada fecha de una serie llega en el `locationValue` de su ocurrencia y «Unirme» usa ese', () => {
    const lista = leerOcurrencias([
      { event: eventoCrudo({ locationValue: 'https://meet.google.com/aaa-bbbb-ccc' }), occurrenceStart: '2026-11-10T01:00:00Z', startsAt: '2026-11-10T01:00:00Z' },
      { event: eventoCrudo({ locationValue: 'https://meet.google.com/ddd-eeee-fff' }), occurrenceStart: '2026-11-17T01:00:00Z', startsAt: '2026-11-17T01:00:00Z' },
    ]);

    expect(lista.map(o => o.evento.valorUbicacion)).toEqual(['https://meet.google.com/aaa-bbbb-ccc', 'https://meet.google.com/ddd-eeee-fff']);
  });
});
