import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string) => mockApiFetch(ruta),
}));

import {
  obtenerHuecosDeAlumno,
  obtenerHuecosDePersona,
  rutaDeLosHuecosDelAlumno,
  rutaDeLosHuecosDePersona,
} from '../huecosApi';

/**
 * Las dos puertas de los huecos de horario (spec 015): la del mentor y la del liderazgo. Misma respuesta, otra ruta.
 */

const RESPUESTA = { semana: '2026-10-26', primeraSemana: '2026-10-12', cerrada: false, dias: [], resumen: null };

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockResolvedValue(RESPUESTA);
});

describe('las rutas', () => {
  it('el mentor: /mentor/groups/{g}/learners/{u}/huecos, con ?semana= solo si se pide una', () => {
    expect(rutaDeLosHuecosDelAlumno('g1', 'u1')).toBe('/api/v1/mentor/groups/g1/learners/u1/huecos');
    expect(rutaDeLosHuecosDelAlumno('g1', 'u1', null)).toBe('/api/v1/mentor/groups/g1/learners/u1/huecos');
    expect(rutaDeLosHuecosDelAlumno('g1', 'u1', '2026-10-19')).toBe(
      '/api/v1/mentor/groups/g1/learners/u1/huecos?semana=2026-10-19',
    );
  });

  it('el liderazgo: /leadership/groups/{g}/people/{p}/huecos', () => {
    expect(rutaDeLosHuecosDePersona('g1', 'p1')).toBe('/api/v1/leadership/groups/g1/people/p1/huecos');
    expect(rutaDeLosHuecosDePersona('g1', 'p1', '2026-10-19')).toBe(
      '/api/v1/leadership/groups/g1/people/p1/huecos?semana=2026-10-19',
    );
  });

  it('un id con `/` o `%` no cambia a qué ruta se llama', () => {
    expect(rutaDeLosHuecosDePersona('a/b', 'c%d')).toBe('/api/v1/leadership/groups/a%2Fb/people/c%25d/huecos');
    expect(rutaDeLosHuecosDelAlumno('a/b', 'c%d')).toBe('/api/v1/mentor/groups/a%2Fb/learners/c%25d/huecos');
  });
});

describe('las lecturas', () => {
  it('piden la ruta del mentor y devuelven la respuesta ya leída', async () => {
    const r = await obtenerHuecosDeAlumno('g1', 'u1', '2026-10-19');
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/mentor/groups/g1/learners/u1/huecos?semana=2026-10-19');
    expect(r.semana).toBe('2026-10-26');
  });

  it('piden la ruta del liderazgo, sin ?semana= para la semana en curso', async () => {
    await obtenerHuecosDePersona('g1', 'p1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/leadership/groups/g1/people/p1/huecos');
  });

  it('una respuesta que no se entiende es un error que dice de qué ruta', async () => {
    mockApiFetch.mockResolvedValue({ dias: [] });
    await expect(obtenerHuecosDePersona('g1', 'p1')).rejects.toThrow(/leadership\/groups\/\{g\}\/people\/\{p\}\/huecos/);
    await expect(obtenerHuecosDeAlumno('g1', 'u1')).rejects.toThrow(/mentor\/groups\/\{g\}\/learners\/\{u\}\/huecos/);
  });

  it('un error del servidor llega tal cual, para que la sección lo clasifique', async () => {
    const error = Object.assign(new Error('403'), { status: 403 });
    mockApiFetch.mockRejectedValue(error);
    await expect(obtenerHuecosDeAlumno('g1', 'u1')).rejects.toBe(error);
  });
});
