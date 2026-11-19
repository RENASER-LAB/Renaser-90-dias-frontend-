import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient'),
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));

import { lecturasDeLaFicha, type LecturasDeLaFicha } from '../lecturasDeLaFicha';

/**
 * Qué ruta pide cada lectura de la ficha según quién la abre (spec 056, T040). El servidor de la prueba rechaza todo: lo único que
 * importa es A QUÉ RUTA se llamó, que es lo que decide qué puerta —la del mentor o la del liderazgo— se usa.
 */
async function rutaDe(lectura: (() => Promise<unknown>) | null): Promise<string> {
  if (!lectura) throw new Error('Esa lectura no existe para este origen.');
  mockApiFetch.mockReset();
  mockApiFetch.mockRejectedValue(new Error('sin servidor'));
  await expect(lectura()).rejects.toThrow('sin servidor');
  return mockApiFetch.mock.calls[0][0];
}

const LECTURAS: ReadonlyArray<keyof LecturasDeLaFicha> = [
  'cargarSemana',
  'cargarDias',
  'cargarRadar',
  'cargarHuecos',
  'cargarCierres',
  'cargarDiagnostico',
  'cargarOchentaVeinte',
];

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('la ficha abierta por un mentor', () => {
  const l = () => lecturasDeLaFicha({ quien: 'mentor', grupoId: 'g1' }, 'p1');

  it('lee todo por las rutas del mentor, con el grupo y la persona', async () => { // spec 056 FR-014
    const ficha = l();
    const base = '/api/v1/mentor/groups/g1/learners/p1';
    expect(await rutaDe(() => ficha.cargarSemana!(null))).toBe(`${base}/semana`);
    expect(await rutaDe(() => ficha.cargarSemana!('2026-11-20'))).toBe(`${base}/semana?semanaHasta=2026-11-20`);
    expect(await rutaDe(() => ficha.cargarDias!('2026-11-01', '2026-11-30'))).toBe(`${base}/dias?desde=2026-11-01&hasta=2026-11-30`);
    expect(await rutaDe(() => ficha.cargarRadar!())).toBe(`${base}/radar`);
    expect(await rutaDe(() => ficha.cargarHuecos!())).toBe(`${base}/huecos`);
    expect(await rutaDe(() => ficha.cargarCierres!())).toBe(`${base}/cierres`);
    expect(await rutaDe(() => ficha.cargarDiagnostico!())).toBe(`${base}/diagnostico`);
    expect(await rutaDe(() => ficha.cargarOchentaVeinte!('SEMANA', null))).toBe(`${base}/analisis-80-20?periodo=SEMANA`);
  });

  it('las notas son las del mentor (con grupo y persona) y los objetivos no se piden: el mentor no los lee por su puerta', () => { // spec 056 FR-014
    const ficha = l();
    expect(ficha.origenDeLasNotas).toEqual({ quien: 'mentor', grupoId: 'g1', aprendizId: 'p1' });
    expect(ficha.cargarObjetivos).toBeNull();
  });

  it('sin grupo no hay a quién preguntarle: ninguna lectura y ninguna nota', () => { // spec 056 FR-014
    const ficha = lecturasDeLaFicha({ quien: 'mentor', grupoId: null }, 'p1');
    for (const clave of LECTURAS) expect(ficha[clave]).toBeNull();
    expect(ficha.cargarObjetivos).toBeNull();
    expect(ficha.origenDeLasNotas).toBeNull();
  });
});

describe('la ficha abierta por el líder, desde un grupo', () => {
  const l = () => lecturasDeLaFicha({ quien: 'lider', grupoId: 'g1' }, 'p1');

  it('lo que ya existía sale por la puerta del grupo; lo nuevo (semana, días, objetivos), por la de la persona', async () => { // spec 056 FR-014
    const ficha = l();
    const delGrupo = '/api/v1/leadership/groups/g1/people/p1';
    const delaPersona = '/api/v1/leadership/people/p1';
    expect(await rutaDe(() => ficha.cargarRadar!())).toBe(`${delGrupo}/radar`);
    expect(await rutaDe(() => ficha.cargarHuecos!())).toBe(`${delGrupo}/huecos`);
    expect(await rutaDe(() => ficha.cargarCierres!())).toBe(`${delGrupo}/cierres`);
    expect(await rutaDe(() => ficha.cargarDiagnostico!())).toBe(`${delGrupo}/diagnostico`);
    expect(await rutaDe(() => ficha.cargarOchentaVeinte!('MES', '2026-11-01'))).toBe(`${delGrupo}/analisis-80-20?periodo=MES&inicio=2026-11-01`);
    expect(await rutaDe(() => ficha.cargarSemana!(null))).toBe(`${delaPersona}/semana`);
    expect(await rutaDe(() => ficha.cargarSemana!('2026-11-13'))).toBe(`${delaPersona}/semana?semanaHasta=2026-11-13`);
    expect(await rutaDe(() => ficha.cargarDias!('2026-11-01', '2026-11-30'))).toBe(`${delaPersona}/dias?desde=2026-11-01&hasta=2026-11-30`);
    expect(await rutaDe(() => ficha.cargarObjetivos!())).toBe(`${delaPersona}/objetivos`);
  });

  it('las notas son del líder: se leen y no se escriben', () => { // spec 056 FR-015
    expect(l().origenDeLasNotas).toEqual({ quien: 'lider', personaId: 'p1' });
  });
});

describe('la ficha abierta por el líder, sin grupo (un aprendiz sin grupo o desde «Todos»)', () => {
  const l = () => lecturasDeLaFicha({ quien: 'lider', grupoId: null }, 'p1');

  it('todo sale por la puerta de la persona', async () => { // spec 056 FR-017
    const ficha = l();
    const base = '/api/v1/leadership/people/p1';
    expect(await rutaDe(() => ficha.cargarRadar!())).toBe(`${base}/radar`);
    expect(await rutaDe(() => ficha.cargarHuecos!())).toBe(`${base}/huecos`);
    expect(await rutaDe(() => ficha.cargarCierres!())).toBe(`${base}/cierres`);
    expect(await rutaDe(() => ficha.cargarDiagnostico!())).toBe(`${base}/diagnostico`);
    expect(await rutaDe(() => ficha.cargarOchentaVeinte!('SEMANA', null))).toBe(`${base}/analisis-80-20?periodo=SEMANA`);
    expect(await rutaDe(() => ficha.cargarSemana!(null))).toBe(`${base}/semana`);
    expect(await rutaDe(() => ficha.cargarDias!('2026-11-01', '2026-11-30'))).toBe(`${base}/dias?desde=2026-11-01&hasta=2026-11-30`);
    expect(await rutaDe(() => ficha.cargarObjetivos!())).toBe(`${base}/objetivos`);
  });

  it('los días del líder salen por la misma ruta con grupo y sin él: se ven desde el día 1, esté o no en un grupo', async () => { // spec 056 FR-017
    const conGrupo = await rutaDe(() => lecturasDeLaFicha({ quien: 'lider', grupoId: 'g1' }, 'p1').cargarDias!('2026-11-01', '2026-11-30'));
    const sinGrupo = await rutaDe(() => l().cargarDias!('2026-11-01', '2026-11-30'));
    expect(sinGrupo).toBe(conGrupo);
  });

  it('un id con «/» o «%» no cambia a qué ruta se llama', async () => { // spec 056 FR-017
    const ficha = lecturasDeLaFicha({ quien: 'lider', grupoId: null }, 'a/b%c');
    expect(await rutaDe(() => ficha.cargarObjetivos!())).toBe('/api/v1/leadership/people/a%2Fb%25c/objetivos');
  });
});

describe('una persona que no sigue su programa (un mentor sin su programa activado)', () => {
  it('no tiene ninguna lectura que pedirle al servidor, con cualquier origen', () => { // spec 056 FR-022
    for (const origen of [{ quien: 'lider' as const, grupoId: null }, { quien: 'lider' as const, grupoId: 'g-1' }, { quien: 'mentor' as const, grupoId: 'g-1' }]) {
      const lecturas = lecturasDeLaFicha(origen, 'p-1', { sinPrograma: true });
      for (const clave of LECTURAS) expect(lecturas[clave]).toBeNull();
      expect(lecturas.origenDeLasNotas).toBeNull();
    }
  });

  it('sin la opción, la ficha sigue leyendo por su puerta de siempre', () => { // spec 056 FR-014
    expect(lecturasDeLaFicha({ quien: 'lider', grupoId: null }, 'p-1').cargarSemana).not.toBeNull();
    expect(lecturasDeLaFicha({ quien: 'lider', grupoId: null }, 'p-1', { sinPrograma: false }).cargarSemana).not.toBeNull();
  });
});

