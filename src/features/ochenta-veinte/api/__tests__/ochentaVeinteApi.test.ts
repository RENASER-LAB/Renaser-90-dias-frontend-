import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({ apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones) }));

import {
  obtenerOchentaVeinteDeLaPersona,
  obtenerOchentaVeinteDeUnAlumno,
  obtenerOchentaVeinteDeUnaPersona,
  rutaDeLaPersona,
  rutaDelAlumno,
  rutaPropia,
} from '../ochentaVeinteApi';

/** Las tres puertas del análisis (spec 031, `contracts/api.md`): la persona sobre sí misma, su mentor y el liderazgo. */

const CUERPO = {
  tipo: 'SEMANA',
  numero: 3,
  inicio: '2026-10-26',
  fin: '2026-11-01',
  cerrado: false,
  anterior: '2026-10-19',
  siguiente: null,
  cifras: { desde: '2026-10-26', hasta: '2026-11-01', planificadas: 0, cumplidas: 0, diasConAcciones: 0, porVenir: 0, impactoPlanificado: 0, impactoCumplido: 0 },
  estado: 'EN_CURSO',
  minimoDeAcciones: 5,
};

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockResolvedValue(CUERPO);
});

describe('las rutas', () => {
  it('la de la persona pide el periodo en curso sin `inicio`', () => {
    expect(rutaPropia('SEMANA', null)).toBe('/api/v1/analisis-80-20?periodo=SEMANA');
    expect(rutaPropia('MES', '2026-10-05')).toBe('/api/v1/analisis-80-20?periodo=MES&inicio=2026-10-05');
  });

  it('la del mentor va por el grupo y el aprendiz, con los ids escapados', () => {
    expect(rutaDelAlumno('g-1', 'u-2', 'SEMANA', '2026-10-19')).toBe('/api/v1/mentor/groups/g-1/learners/u-2/analisis-80-20?periodo=SEMANA&inicio=2026-10-19');
    expect(rutaDelAlumno('g/1', 'u?2', 'MES', null)).toBe('/api/v1/mentor/groups/g%2F1/learners/u%3F2/analisis-80-20?periodo=MES');
  });

  it('la del liderazgo va por el grupo o, sin grupo, por la puerta de las personas', () => {
    expect(rutaDeLaPersona('g-1', 'p-2', 'SEMANA', null)).toBe('/api/v1/leadership/groups/g-1/people/p-2/analisis-80-20?periodo=SEMANA');
    expect(rutaDeLaPersona(null, 'p-2', 'MES', '2026-10-05')).toBe('/api/v1/leadership/people/p-2/analisis-80-20?periodo=MES&inicio=2026-10-05');
  });
});

describe('los pedidos', () => {
  it('cada puerta lee con la ruta que le toca y devuelve el periodo ya validado', async () => {
    const propia = await obtenerOchentaVeinteDeLaPersona('SEMANA', null);
    expect(propia.estado).toBe('EN_CURSO');
    await obtenerOchentaVeinteDeUnAlumno('g-1', 'u-2', 'SEMANA', null);
    await obtenerOchentaVeinteDeUnaPersona(null, 'p-3', 'MES', null);
    expect(mockApiFetch.mock.calls.map(c => c[0])).toEqual([
      '/api/v1/analisis-80-20?periodo=SEMANA',
      '/api/v1/mentor/groups/g-1/learners/u-2/analisis-80-20?periodo=SEMANA',
      '/api/v1/leadership/people/p-3/analisis-80-20?periodo=MES',
    ]);
  });

  it('los pedidos cortos vencen', async () => {
    await obtenerOchentaVeinteDeLaPersona('SEMANA', null);
    expect(mockApiFetch.mock.calls[0][1]).toEqual({ timeoutMs: 15_000 });
  });

  it('una respuesta que no es un periodo es un fallo', async () => {
    mockApiFetch.mockResolvedValueOnce({ hola: 1 });
    await expect(obtenerOchentaVeinteDeLaPersona('SEMANA', null)).rejects.toThrow('Respuesta inesperada');
  });
});
