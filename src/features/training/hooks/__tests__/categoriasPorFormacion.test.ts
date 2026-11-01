/**
 * Training con las categorías de la formación (spec 023, historias 1 y 4): las dimensiones salen de las categorías que Administración configuró
 * para la formación de la persona. Un aprendiz del Diplomado ve las suyas y NADA de la Escuela; la Escuela se ve como siempre; un hábito propio
 * con una categoría ajena a la formación va a «Mis hábitos»; y mientras no se sabe cuáles son las categorías no se dibuja un cuadro a medias.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { PlanHabit } from '../../../../screens/PlanScreen';
import type { HabitoCatalogoApi } from '../../../habits/types/habits.types';
import type { DatosEntrenamiento } from '../../api/cargarEntrenamiento';

const mockCargar = jest.fn<() => Promise<DatosEntrenamiento>>();
jest.mock('../../api/cargarEntrenamiento', () => ({ cargarEntrenamiento: () => mockCargar() }));
jest.mock('../../../../services/http/apiClient', () => ({ mensajeDeError: (_e: unknown, porDefecto: string) => porDefecto }));
/* El hook lee el almacén real (que cada prueba llena a mano): así se ve lo que ve la pantalla, sin sesión ni red. */
jest.mock('../../../habits/categorias/hooks/useCategoriasDeHabito', () => {
  const almacen = jest.requireActual<typeof import('../../../habits/categorias/estado/estadoDeCategorias')>('../../../habits/categorias/estado/estadoDeCategorias');
  const R = jest.requireActual<typeof import('react')>('react');
  return {
    useCategoriasDeHabito: () => R.useSyncExternalStore(almacen.suscribirEstadoDeCategorias, almacen.leerEstadoDeCategorias),
  };
});

import { empezarLecturaDeCategorias, reiniciarEstadoDeCategorias, terminarLecturaDeCategorias } from '../../../habits/categorias/estado/estadoDeCategorias';
import { dimensionesDeTraining, nombreDeLaDimension } from '../../data/dimensiones';
import { categoriaDeDimension, dimensionDeCategoria, dimensionDelHabito } from '../../utils/dimensionDelHabito';
import { iconoDeLaDimension } from '../../utils/iconoDeLaDimension';
import { useTraining } from '../useTraining';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DIPLOMADO = {
  formation: 'DIPLOMADO',
  categories: [
    { key: 'DIPLOMADO_ESTUDIO', code: 'DIPLOMADO_ESTUDIO', name: 'Estudio profundo', icon: 'bookOpen', order: 1 },
    { key: 'DIPLOMADO_PRACTICA', code: 'DIPLOMADO_PRACTICA', name: 'Práctica', icon: null, order: 2 },
  ],
};

function leerDeLaFormacion(clave: string, lectura: typeof DIPLOMADO | null) {
  empezarLecturaDeCategorias(clave);
  terminarLecturaDeCategorias(clave, lectura);
}

const catalogo = (id: string, category: string, extra: Partial<HabitoCatalogoApi> = {}): HabitoCatalogoApi =>
  ({ id, title: id, category, evidenceRequirement: 'OPTIONAL', systemKey: null, isSystemHabit: true, ...extra }) as unknown as HabitoCatalogoApi;
const enElPlan = (id: string): PlanHabit =>
  ({ id, title: id, time: '07:00', locked: false, isOptional: false, isDeactivatable: true, days: {} }) as unknown as PlanHabit;

const datos = (habitos: HabitoCatalogoApi[]): DatosEntrenamiento => ({
  tracks: [],
  catalogo: habitos,
  planHabits: habitos.map(h => enElPlan(h.id)),
  rocas: [],
  rocasConEvidencia: new Set(),
});

let raiz: ReactTestRenderer | null = null;
let lectura!: ReturnType<typeof useTraining>;
function Sonda() {
  lectura = useTraining();
  return null;
}
async function montar() {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
}

beforeEach(() => {
  mockCargar.mockReset();
  reiniciarEstadoDeCategorias();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  reiniciarEstadoDeCategorias();
});

describe('Training dibuja las categorías de la formación (spec 023)', () => {
  it('un aprendiz del Diplomado ve sus hábitos en SUS categorías y nada de la Escuela', async () => {
    leerDeLaFormacion('u1|DIPLOMADO', DIPLOMADO);
    mockCargar.mockResolvedValueOnce(
      datos([
        catalogo('lectura', 'DIPLOMADO_ESTUDIO'),
        catalogo('ejercicio', 'DIPLOMADO_PRACTICA'),
        // No debería llegar nunca (el servidor filtra por formación); si llegara, no se muestra: no es de esta formación.
        catalogo('agua-de-la-escuela', 'BODY'),
      ]),
    );
    await montar();

    expect(lectura.planHabits.map(h => [h.id, h.dimension])).toEqual([
      ['lectura', 'DIPLOMADO_ESTUDIO'],
      ['ejercicio', 'DIPLOMADO_PRACTICA'],
    ]);
    expect(dimensionesDeTraining().map(d => d.nombre)).toEqual(['Estudio profundo', 'Práctica', 'Vida y negocio']);
    expect(lectura.habits.map(h => h.id)).not.toContain('agua-de-la-escuela');
  });

  it('el nombre, el ícono y la categoría del servidor se resuelven por la clave de la dimensión', () => {
    leerDeLaFormacion('u1|DIPLOMADO', DIPLOMADO);
    expect(nombreDeLaDimension('DIPLOMADO_ESTUDIO')).toBe('Estudio profundo');
    expect(iconoDeLaDimension('DIPLOMADO_ESTUDIO')).toBe('bookOpen');
    expect(iconoDeLaDimension('DIPLOMADO_PRACTICA')).toBe('listChecks');
    expect(categoriaDeDimension('DIPLOMADO_ESTUDIO')).toBe('DIPLOMADO_ESTUDIO');
    expect(dimensionDeCategoria('DIPLOMADO_ESTUDIO')).toBe('DIPLOMADO_ESTUDIO');
    expect(dimensionDeCategoria('BODY')).toBeNull();
    expect(nombreDeLaDimension('VIDA Y NEGOCIO')).toBe('Vida y negocio');
  });

  it('la Escuela se ve como siempre: las cuatro de siempre, con sus claves y nombres', async () => {
    leerDeLaFormacion('u1|ESCUELA', null);
    mockCargar.mockResolvedValueOnce(datos([catalogo('agua', 'BODY'), catalogo('leer', 'MIND'), catalogo('gratitud', 'CONSCIENCE'), catalogo('rezo', 'SPIRIT')]));
    await montar();
    expect(lectura.planHabits.map(h => h.dimension)).toEqual(['CUERPO', 'MENTE', 'EMOCIONES', 'ESPÍRITU']);
    expect(dimensionesDeTraining().map(d => d.nombre)).toEqual(['Cuerpo', 'Mente', 'Emociones', 'Espíritu', 'Vida y negocio']);
  });

  it('un hábito PROPIO con una categoría que no es de la formación se agrupa en «Mis hábitos» (no se pierde)', async () => {
    leerDeLaFormacion('u1|DIPLOMADO', DIPLOMADO);
    mockCargar.mockResolvedValueOnce(
      datos([
        catalogo('lectura', 'DIPLOMADO_ESTUDIO'),
        catalogo('mi-caminata', 'BODY', { isSystemHabit: false }),
        catalogo('mi-estudio', 'DIPLOMADO_ESTUDIO', { isSystemHabit: false }),
      ]),
    );
    await montar();
    expect(lectura.planHabits.map(h => [h.id, h.dimension])).toEqual([
      ['lectura', 'DIPLOMADO_ESTUDIO'],
      ['mi-caminata', 'MIS_HABITOS'],
      ['mi-estudio', 'DIPLOMADO_ESTUDIO'],
    ]);
    expect(nombreDeLaDimension('MIS_HABITOS')).toBe('Mis hábitos');
    expect(dimensionesDeTraining({ conMisHabitos: true }).map(d => d.key)).toEqual(['DIPLOMADO_ESTUDIO', 'DIPLOMADO_PRACTICA', 'MIS_HABITOS', 'VIDA Y NEGOCIO']);
    expect(dimensionesDeTraining().map(d => d.key)).not.toContain('MIS_HABITOS');
  });

  it('dimensionDelHabito: la categoría de la formación; un hábito del catálogo ajeno no se muestra; uno propio ajeno va a «Mis hábitos»', () => {
    leerDeLaFormacion('u1|DIPLOMADO', DIPLOMADO);
    expect(dimensionDelHabito({ category: 'DIPLOMADO_PRACTICA', isSystemHabit: true })).toBe('DIPLOMADO_PRACTICA');
    expect(dimensionDelHabito({ category: 'BODY', isSystemHabit: true })).toBeNull();
    expect(dimensionDelHabito({ category: 'BODY', isSystemHabit: false })).toBe('MIS_HABITOS');
  });

  it('una formación sin hábitos: la lista queda vacía (no un error) y Training lo dice con su texto', async () => {
    leerDeLaFormacion('u1|DIPLOMADO', { formation: 'DIPLOMADO', categories: [] });
    mockCargar.mockResolvedValueOnce(datos([]));
    await montar();
    expect(lectura.error).toBeNull();
    expect(lectura.loading).toBe(false);
    expect(lectura.planHabits).toEqual([]);
  });

  it('mientras no se sabe cuáles son las categorías, Training sigue cargando: no se dibuja a medias', async () => {
    empezarLecturaDeCategorias('u1|DIPLOMADO');
    mockCargar.mockResolvedValueOnce(datos([catalogo('lectura', 'DIPLOMADO_ESTUDIO')]));
    await montar();
    expect(lectura.loading).toBe(true);
    expect(lectura.planHabits).toEqual([]);
    await act(async () => {
      terminarLecturaDeCategorias('u1|DIPLOMADO', DIPLOMADO);
    });
    expect(lectura.loading).toBe(false);
    expect(lectura.planHabits.map(h => h.dimension)).toEqual(['DIPLOMADO_ESTUDIO']);
  });
});
