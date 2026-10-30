import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...(jest.requireActual('../../../../services/http/apiClient') as object),
  apiFetch: (...args: unknown[]) => (mockApiFetch as (...a: unknown[]) => Promise<unknown>)(...args),
}));

import {
  RUTA_DEL_CIERRE,
  guardarCierreDelDia,
  obtenerCierreDelDia,
  obtenerCierresDeAlumno,
  obtenerCierresDePersona,
  rutaDeLosCierresDePersona,
  rutaDeLosCierresDelAlumno,
} from '../cierreApi';

/** Las rutas de «Cierra tu día» (spec 017): cada rol por su puerta, y la persona con su GET y su PUT. */

const DIA = { fecha: '2026-10-29', estado: 'ABIERTO', puedeCerrar: true, acciones: [] };
const SEMANA = { semana: '2026-10-26', primeraSemana: null, dias: [] };

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('la persona', () => {
  it('lee hoy sin fecha y un día con `date`', async () => {
    mockApiFetch.mockResolvedValue(DIA);
    await obtenerCierreDelDia();
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/rocks/day-closure', expect.objectContaining({ timeoutMs: 15_000 }));
    await obtenerCierreDelDia('2026-10-28');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/rocks/day-closure?date=2026-10-28', expect.anything());
  });

  it('cierra con un PUT al mismo recurso, con el cuerpo tal cual', async () => {
    mockApiFetch.mockResolvedValue({ ...DIA, estado: 'CERRADO' });
    const cuerpo = { fecha: '2026-10-29', acciones: [{ id: 'a', motivo: 'SIN_TIEMPO', manana: 'DEJARLA' }] };
    const r = await guardarCierreDelDia(cuerpo);
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(mockApiFetch).toHaveBeenCalledWith(RUTA_DEL_CIERRE, expect.objectContaining({ method: 'PUT', body: cuerpo }));
    expect(r.estado).toBe('CERRADO');
  });

  it('una respuesta que no es un cierre falla en vez de inventar un día', async () => {
    mockApiFetch.mockResolvedValue([]);
    await expect(obtenerCierreDelDia()).rejects.toThrow(/Respuesta inesperada/);
  });
});

describe('el acompañamiento: la misma semana por dos puertas', () => {
  it('el mentor o la guía, por /mentor/…/learners/…/cierres', async () => {
    mockApiFetch.mockResolvedValue(SEMANA);
    await obtenerCierresDeAlumno('g-7', 'a-1', '2026-10-19');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/mentor/groups/g-7/learners/a-1/cierres?semana=2026-10-19');
    await obtenerCierresDeAlumno('g-7', 'a-1');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/mentor/groups/g-7/learners/a-1/cierres');
  });

  it('el líder, Administración y Alquimista, por /leadership/…/people/…/cierres', async () => {
    mockApiFetch.mockResolvedValue(SEMANA);
    await obtenerCierresDePersona('g-7', 'p-2', '2026-10-19');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/leadership/groups/g-7/people/p-2/cierres?semana=2026-10-19');
    await obtenerCierresDePersona('g-7', 'p-2', null);
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/leadership/groups/g-7/people/p-2/cierres');
  });

  it('un id con caracteres raros no puede cambiar a qué ruta se llama', () => {
    expect(rutaDeLosCierresDelAlumno('g/../x', 'a?b', null)).toBe('/api/v1/mentor/groups/g%2F..%2Fx/learners/a%3Fb/cierres');
    expect(rutaDeLosCierresDePersona('g', 'p#1', null)).toBe('/api/v1/leadership/groups/g/people/p%231/cierres');
  });

  it('ninguna lectura de la ficha escribe', async () => {
    mockApiFetch.mockResolvedValue(SEMANA);
    await obtenerCierresDeAlumno('g', 'a');
    await obtenerCierresDePersona('g', 'p');
    for (const [, opciones] of mockApiFetch.mock.calls) {
      expect((opciones as { method?: string } | undefined)?.method ?? 'GET').toBe('GET');
    }
  });
});
