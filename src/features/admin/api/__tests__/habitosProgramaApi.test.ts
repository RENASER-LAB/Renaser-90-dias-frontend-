import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));

import {
  cambiarActivoDelHabito,
  copiarHabitoDelPrograma,
  crearHabitoDelPrograma,
  editarHabitoDelPrograma,
  eliminarHabitoDelPrograma,
  leerHabitosDelPrograma,
  leerRolesElegibles,
} from '../habitosProgramaApi';

/**
 * El contrato de `/api/v1/admin/habits` con audiencia por rol (spec 001 del backend, D-264,
 * `contracts/admin-habits.md`): rutas, verbos y cuerpos, y un esquema que aguanta un backend anterior.
 */
const HABITO = {
  id: 'h1',
  title: 'Revisión del grupo',
  description: null,
  habitType: 'CHECKBOX',
  category: 'MIND',
  evidenceRequirement: 'OPTIONAL',
  isOptional: false,
  mandatoryOnIntoxication: false,
  isActive: true,
  systemKey: null,
  isDeactivatable: true,
  targetRoles: ['MENTOR'],
  targetRolesEffectiveFrom: '2026-10-12T15:00:00Z',
  audienceChangedAt: '2026-10-12T15:00:00Z',
  audienceChangedBy: { id: 'a1', name: 'Ana Pérez' },
};

const CUERPO = {
  description: null,
  category: 'MIND',
  evidenceRequirement: 'OPTIONAL',
  isOptional: false,
  mandatoryOnIntoxication: false,
  targetRoles: ['MENTOR'],
};

describe('habitosProgramaApi', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('lee el catálogo, con o sin filtro de rol', async () => {
    mockApiFetch.mockResolvedValue([HABITO]);

    expect(await leerHabitosDelPrograma()).toHaveLength(1);
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habits', undefined);
    await leerHabitosDelPrograma('MENTOR_LEAD');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habits?role=MENTOR_LEAD', undefined);
  });

  it('tolera un backend anterior a D-264: sin campos de audiencia', async () => {
    const { targetRoles, targetRolesEffectiveFrom, audienceChangedAt, audienceChangedBy, systemKey, isDeactivatable, ...viejo } =
      HABITO;
    mockApiFetch.mockResolvedValue([viejo]);

    const [habito] = await leerHabitosDelPrograma();
    expect(habito.targetRoles).toBeUndefined();
    expect(habito.title).toBe('Revisión del grupo');
  });

  it('lee los roles elegibles con su nombre del servidor, también uno nuevo', async () => {
    mockApiFetch.mockResolvedValue([
      { code: 'TRAINEE', name: 'Aprendiz' },
      { code: 'COACH', name: 'Coach' },
    ]);

    expect(await leerRolesElegibles()).toEqual([
      { code: 'TRAINEE', name: 'Aprendiz' },
      { code: 'COACH', name: 'Coach' },
    ]);
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habits/roles', undefined);
  });

  it('crea y edita con POST y el cuerpo del formulario', async () => {
    mockApiFetch.mockResolvedValue(HABITO);

    await crearHabitoDelPrograma({ ...CUERPO, title: 'Revisión del grupo', habitType: 'CHECKBOX' });
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habits', {
      method: 'POST',
      body: { ...CUERPO, title: 'Revisión del grupo', habitType: 'CHECKBOX' },
    });
    await editarHabitoDelPrograma('h1', CUERPO);
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habits/h1', { method: 'POST', body: CUERPO });
  });

  it('activa, desactiva y elimina', async () => {
    mockApiFetch.mockResolvedValue(HABITO);
    await cambiarActivoDelHabito('h1', false);
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habits/h1/toggle', {
      method: 'POST',
      body: { isActive: false },
    });

    mockApiFetch.mockResolvedValue(undefined);
    await eliminarHabitoDelPrograma('h1');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habits/h1', { method: 'DELETE' });
  });
});

describe('habitosProgramaApi por formación (spec 023)', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('lee el catálogo de UNA formación, o de las tres con ALL, y combina con el filtro de rol', async () => {
    mockApiFetch.mockResolvedValue([{ ...HABITO, formation: 'DIPLOMADO', categoryKey: 'DIPLOMADO_ESTUDIO' }]);

    const [habito] = await leerHabitosDelPrograma(null, 'DIPLOMADO');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habits?formation=DIPLOMADO', undefined);
    expect(habito.formation).toBe('DIPLOMADO');
    expect(habito.categoryKey).toBe('DIPLOMADO_ESTUDIO');
    await leerHabitosDelPrograma(null, 'ALL');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habits?formation=ALL', undefined);
    await leerHabitosDelPrograma('MENTOR', 'CERTIFICACION');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habits?role=MENTOR&formation=CERTIFICACION', undefined);
  });

  it('crear manda la formación; copiar manda la formación destino y la categoría de ESA formación', async () => {
    mockApiFetch.mockResolvedValue(HABITO);

    await crearHabitoDelPrograma({ ...CUERPO, title: 'Lectura', habitType: 'CHECKBOX', formation: 'DIPLOMADO' });
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habits', {
      method: 'POST',
      body: expect.objectContaining({ formation: 'DIPLOMADO', title: 'Lectura' }),
    });
    await copiarHabitoDelPrograma('h1', { formacion: 'CERTIFICACION', categoria: 'CERTIFICACION_ETICA' });
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habits/h1/copy', {
      method: 'POST',
      body: { formation: 'CERTIFICACION', category: 'CERTIFICACION_ETICA' },
    });
  });

  it('un backend anterior a la spec 023 no manda formación ni clave de categoría: el hábito se lee igual', async () => {
    mockApiFetch.mockResolvedValue([HABITO]);
    const [habito] = await leerHabitosDelPrograma();
    expect(habito.formation).toBeUndefined();
    expect(habito.categoryKey).toBeUndefined();
  });
});
