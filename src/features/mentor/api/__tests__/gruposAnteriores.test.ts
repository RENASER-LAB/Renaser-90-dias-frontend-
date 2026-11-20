import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient'),
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));

import { obtenerGruposAnteriores } from '../mentorApi';
import { periodoDelGrupoAnterior, comoCerroElGrupo } from '../../utils/gruposAnteriores';

/** Spec 057 FR-020, FR-021: lo que la app lee de `GET /mentor/me/groups/history`. */
beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('los grupos anteriores', () => {
  it('piden la ruta del historial y leen cada tramo con su cierre y sus personas, sin ids', async () => { // spec 057 FR-020
    mockApiFetch.mockResolvedValue([
      {
        grupoId: 'g-9',
        nombre: 'Alba',
        desde: '2026-03-02',
        hasta: '2026-06-26',
        aprendices: 8,
        puestoFinal: { posicion: 2, total: 7 },
        colorFinal: 'VERDE',
        porcentajeFinal: 84.4,
        personas: [{ nombre: ' Ana ', colorFinal: 'ROJO' }, { nombre: '', colorFinal: 'VERDE' }],
      },
    ]);
    const lista = await obtenerGruposAnteriores();
    expect(mockApiFetch.mock.calls[0][0]).toBe('/api/v1/mentor/me/groups/history');
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ nombre: 'Alba', aprendices: 8, colorFinal: 'VERDE', puestoFinal: { posicion: 2, total: 7 } });
    expect(lista[0].personas).toEqual([{ nombre: 'Ana', colorFinal: 'ROJO' }]);
    expect(comoCerroElGrupo(lista[0])).toBe('Cerró en el puesto 2 de 7 · 84 %');
    expect(periodoDelGrupoAnterior(lista[0])).toBe('mar 2026 – jun 2026');
  });

  it('es tolerante: una lista dentro de un objeto, un color raro es «sin datos» y un tramo sin nombre se descarta', async () => { // spec 057 FR-021
    mockApiFetch.mockResolvedValue({ grupos: [{ nombre: 'Alba', colorFinal: 'MORADO' }, { nombre: '  ' }, {}] });
    const lista = await obtenerGruposAnteriores();
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ nombre: 'Alba', colorFinal: 'SIN_DATOS', puestoFinal: null, porcentajeFinal: null, aprendices: null, personas: [] });
  });

  it('sin anteriores devuelve una lista vacía (la pantalla no dibuja la sección)', async () => { // spec 057 FR-022
    mockApiFetch.mockResolvedValue([]);
    expect(await obtenerGruposAnteriores()).toEqual([]);
    mockApiFetch.mockResolvedValue({});
    expect(await obtenerGruposAnteriores()).toEqual([]);
  });
});
