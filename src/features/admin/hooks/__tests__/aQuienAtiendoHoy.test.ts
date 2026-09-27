import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<object>('../../../../services/http/apiClient'),
  apiFetch: (ruta: string) => mockApiFetch(ruta),
}));

import { ApiError } from '../../../../services/http/apiClient';

import { leerTodo } from '../useAQuienAtiendoHoy';
import { textoDeGrupos } from '../../../semaforo/utils/ayudaDelSemaforo';

/**
 * S-4: «¿A quién atiendo hoy?» sale de UNA lectura del padrón (§4.6). Un APK nuevo contra un backend
 * anterior (404) vuelve al camino de antes, grupo por grupo; un 403 no se esquiva por otro lado.
 */
const fila = (id: string, color: string, porcentaje: number, grupos: unknown[]) => ({
  aprendizId: id, nombre: id, avatarUrl: null, porcentaje, color,
  etiqueta: color === 'ROJO' ? 'Con problemas' : 'Requiere atención', diasConDatos: 7, dias: [], motivo: null, grupos,
});

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('¿A quién atiendo hoy?', () => {
  it('usa /admin/semaforo/atencion y NO pide grupo por grupo', async () => {
    mockApiFetch.mockImplementation(async ruta => {
      if (ruta === '/api/v1/admin/semaforo/atencion') {
        return {
          desde: '2026-09-19', hasta: '2026-09-25', cerrada: false, resumen: { rojo: 1, amarillo: 2, total: 3 },
          aprendices: [
            fila('beto', 'AMARILLO', 70, [{ grupoId: 'r', grupoNombre: 'Bienvenida', recepcion: true, mentorNombre: null }]),
            fila('ana', 'ROJO', 55, [{ grupoId: 'g1', grupoNombre: 'Grupo Fénix', recepcion: false, mentorNombre: 'Luisa' }]),
            fila('ceci', 'AMARILLO', 65, []),
          ],
        };
      }
      throw new Error(`no debería pedir ${ruta}`);
    });
    const { personas, gruposSinLeer } = await leerTodo();
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(gruposSinLeer).toBe(0);
    /* Primero los rojos; dentro del amarillo, el peor porcentaje primero. Colores y palabras, los del servidor. */
    expect(personas.map(p => [p.aprendizId, p.color, p.etiqueta, p.grupoId, p.grupoNombre])).toEqual([
      ['ana', 'ROJO', 'Con problemas', 'g1', 'Grupo Fénix'],
      ['ceci', 'AMARILLO', 'Requiere atención', null, 'Sin grupo'],
      ['beto', 'AMARILLO', 'Requiere atención', 'r', 'Bienvenida'],
    ]);
  });

  it('con 404 (backend anterior) cae al camino de antes', async () => {
    mockApiFetch.mockImplementation(async ruta => {
      if (ruta === '/api/v1/admin/semaforo/atencion') throw new ApiError(404, 'No encontrado');
      if (ruta.startsWith('/api/v1/semaforo/groups')) {
        return {
          desde: '2026-09-19', hasta: '2026-09-25',
          grupos: [{ grupoId: 'g1', grupoNombre: 'Fénix', resumen: { verde: 0, amarillo: 0, rojo: 1, sinDatos: 0, total: 1 } }],
        };
      }
      if (ruta.startsWith('/api/v1/admin/semaforo/groups/g1')) {
        return { grupoId: 'g1', grupoNombre: 'Fénix', desde: '2026-09-19', hasta: '2026-09-25', aprendices: [fila('ana', 'ROJO', 40, [])] };
      }
      throw new Error(`ruta inesperada ${ruta}`);
    });
    const { personas } = await leerTodo();
    expect(personas.map(p => [p.aprendizId, p.grupoNombre])).toEqual([['ana', 'Fénix']]);
  });

  it('con 403 no busca por otro lado: la cuenta no puede verlo', async () => {
    mockApiFetch.mockImplementation(async () => {
      throw new ApiError(403, 'Prohibido');
    });
    await expect(leerTodo()).rejects.toMatchObject({ status: 403 });
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it('nombra los grupos con palabras', () => {
    expect(textoDeGrupos([])).toBe('Sin grupo');
    expect(textoDeGrupos([{ grupoId: 'g', grupoNombre: 'Fénix', recepcion: false, mentorNombre: null }])).toBe('Fénix (sin mentor)');
    expect(
      textoDeGrupos([
        { grupoId: 'r', grupoNombre: null, recepcion: true },
        { grupoId: 'g', grupoNombre: 'Fénix', recepcion: false, mentorNombre: 'Luisa' },
      ]),
    ).toBe('Bienvenida · Fénix');
  });
});
