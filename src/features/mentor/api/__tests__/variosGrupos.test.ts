import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
  ApiError: class extends Error {},
}));

import { obtenerMiCelula } from '../mentorApi';
import { esOtroDeMisGrupos } from '../../utils/entradaAlGrupo';
import { mesDelRanking } from '../../utils/mesDelRanking';

/**
 * Un mentor con varios grupos en curso (D-141). Antes `obtenerMiCelula` se quedaba con uno
 * —el primero REGULAR— y los demás no se podían ver; estas pruebas fallan contra ese código.
 */

function asignacion(groupId: string, groupName: string, type = 'REGULAR') {
  return {
    groupId,
    groupName,
    cohortId: 'c-1',
    type,
    function: 'MENTOR',
    from: '2026-09-01T00:00:00Z',
    to: null,
    coverage: 'CON_MENTOR',
    learners: 1,
    capacity: type === 'REGULAR' ? 10 : null,
  };
}

const CONTEXTO = {
  personalProgram: { enrolled: false, day: null },
  canAccompany: true,
  capabilities: { programRequired: false, canStartProgram: false, canAccompany: true },
  assignments: [
    asignacion('g-recepcion', 'Recepción', 'RECEPCION'),
    asignacion('g-fenix', 'Fénix'),
    asignacion('g-roble', 'Roble'),
    asignacion('g-fenix', 'Fénix'),
  ],
};

function padron(groupId: string, nombre: string) {
  return {
    groupId,
    groupName: groupId,
    coverage: 'CON_MENTOR',
    total: 1,
    learners: [{ userId: `u-${groupId}`, fullName: nombre, avatarUrl: null, active: true }],
    nextCursor: null,
  };
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(async (ruta: string) => {
    if (ruta === '/api/v1/mentor/context') return CONTEXTO;
    const grupo = /groups\/([^/]+)\/learners/.exec(ruta)?.[1] ?? '';
    return padron(grupo, `Alumno de ${grupo}`);
  });
});

describe('obtenerMiCelula con varios grupos', () => {
  it('sin elección abre un grupo estable y lista todos, sin repetir, los estables primero', async () => {
    const datos = await obtenerMiCelula();
    expect(datos.celula.id).toBe('g-fenix');
    expect(datos.grupos.map(g => g.id)).toEqual(['g-fenix', 'g-roble', 'g-recepcion']);
  });

  it('con un grupo elegido trae el padrón de ESE grupo', async () => {
    const datos = await obtenerMiCelula('g-roble');
    expect(datos.celula.id).toBe('g-roble');
    expect(datos.celula.nombre).toBe('Roble');
    expect(datos.alumnos.map(a => a.nombre)).toEqual(['Alumno de g-roble']);
    expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('/groups/g-roble/learners'), undefined);
  });

  it('si el grupo elegido ya no es suyo, vuelve al de siempre en vez de fallar', async () => {
    const datos = await obtenerMiCelula('g-que-roto');
    expect(datos.celula.id).toBe('g-fenix');
  });

  it('con un solo grupo hay un solo elemento en la lista (la pantalla no muestra selector)', async () => {
    mockApiFetch.mockImplementation(async (ruta: string) =>
      ruta === '/api/v1/mentor/context'
        ? { ...CONTEXTO, assignments: [asignacion('g-unico', 'Único')] }
        : padron('g-unico', 'Ana'),
    );
    const datos = await obtenerMiCelula();
    expect(datos.grupos).toHaveLength(1);
  });
});

describe('el aviso de otro de sus grupos', () => {
  const vista = { celula: { id: 'g-fenix' }, grupos: [{ id: 'g-fenix' }, { id: 'g-roble' }] };

  it('de otro grupo suyo: hay que cambiar a ese grupo', () => {
    expect(esOtroDeMisGrupos('g-roble', vista)).toBe(true);
  });

  it('del grupo que mira, o de uno que ya no es suyo: no se cambia', () => {
    expect(esOtroDeMisGrupos('g-fenix', vista)).toBe(false);
    expect(esOtroDeMisGrupos('g-viejo', vista)).toBe(false);
  });
});

describe('mes del ranking de grupos', () => {
  it('este mes y el anterior, en YYYY-MM', () => {
    expect(mesDelRanking(new Date(2026, 9, 1, 0, 30), 'actual')).toBe('2026-10');
    expect(mesDelRanking(new Date(2026, 9, 1, 0, 30), 'anterior')).toBe('2026-09');
  });

  it('enero pide diciembre del año anterior, y el 31 no salta un mes', () => {
    expect(mesDelRanking(new Date(2027, 0, 15), 'anterior')).toBe('2026-12');
    expect(mesDelRanking(new Date(2026, 2, 31), 'anterior')).toBe('2026-02');
  });
});
