import { describe, expect, it } from '@jest/globals';

import type { HabitoDelProgramaApi } from '../../api/habitosProgramaSchemas';
import type { CategoriaAdmin } from '../../../habits/categorias/types/categorias.types';
import {
  categoriasParaElegir,
  cuerpoDesde,
  faltaEnElFormulario,
  formularioDesde,
  iconoDelHabito,
  nombreDeLaCategoria,
} from '../habitosPrograma';

const cat = (formation: string, key: string, name: string, extra: Partial<CategoriaAdmin> = {}): CategoriaAdmin => ({
  key, code: key, formation, name, icon: null, order: 1, isActive: true, activeHabits: 0, totalHabits: 0,
  canBeDeactivated: true, canBeDeleted: true, ...extra,
});

const CATEGORIAS: CategoriaAdmin[] = [
  cat('ESCUELA', 'CUERPO', 'Cuerpo', { code: 'BODY', icon: 'activity', order: 1 }),
  cat('DIPLOMADO', 'DIPLOMADO_PRACTICA', 'Práctica', { order: 2, icon: 'target' }),
  cat('DIPLOMADO', 'DIPLOMADO_ESTUDIO', 'Estudio profundo', { order: 1, icon: 'bookOpen' }),
  cat('DIPLOMADO', 'DIPLOMADO_VIEJA', 'Vieja', { order: 3, isActive: false }),
  cat('CERTIFICACION', 'CERTIFICACION_ETICA', 'Ética'),
];

const habito = (extra: Partial<HabitoDelProgramaApi> = {}): HabitoDelProgramaApi => ({
  id: 'h1', title: 'Lectura', description: null, habitType: 'CHECKBOX', category: 'DIPLOMADO_ESTUDIO', evidenceRequirement: 'OPTIONAL',
  isOptional: false, isActive: true, ...extra,
});

describe('las categorías que ofrece el formulario de un hábito (spec 023, FR-002)', () => {
  it('solo las ACTIVAS de SU formación, en el orden de Administración, con sus nombres', () => {
    expect(categoriasParaElegir('DIPLOMADO', CATEGORIAS, true)).toEqual([
      { code: 'DIPLOMADO_ESTUDIO', name: 'Estudio profundo' },
      { code: 'DIPLOMADO_PRACTICA', name: 'Práctica' },
    ]);
    expect(categoriasParaElegir('CERTIFICACION', CATEGORIAS, true)).toEqual([{ code: 'CERTIFICACION_ETICA', name: 'Ética' }]);
  });

  it('nunca ofrece las de otra formación', () => {
    const codigos = categoriasParaElegir('ESCUELA', CATEGORIAS, true).map(c => c.code);
    expect(codigos).toEqual(['BODY']);
  });

  it('la categoría que el hábito ya tiene se conserva aunque esté desactivada, para no perderla al editar', () => {
    expect(categoriasParaElegir('DIPLOMADO', CATEGORIAS, true, 'DIPLOMADO_VIEJA').map(c => c.code)).toContain('DIPLOMADO_VIEJA');
    expect(categoriasParaElegir('DIPLOMADO', CATEGORIAS, true).map(c => c.code)).not.toContain('DIPLOMADO_VIEJA');
  });

  it('una formación sin categorías no ofrece ninguna', () => {
    expect(categoriasParaElegir('CERTIFICACION', [], true)).toEqual([]);
  });

  it('contra un backend anterior (sin categorías) la Escuela ofrece las cuatro de siempre y las otras ninguna', () => {
    expect(categoriasParaElegir('ESCUELA', [], false).map(c => c.name)).toEqual(['Cuerpo', 'Mente', 'Emociones', 'Espíritu']);
    expect(categoriasParaElegir('ESCUELA', [], false).map(c => c.code)).toEqual(['BODY', 'MIND', 'CONSCIENCE', 'SPIRIT']);
    expect(categoriasParaElegir('DIPLOMADO', [], false)).toEqual([]);
  });
});

describe('nombre e ícono de la categoría de un hábito', () => {
  const delDiplomado = CATEGORIAS.filter(c => c.formation === 'DIPLOMADO');

  it('el nombre es el que le puso Administración; sin la lista, el de siempre', () => {
    expect(nombreDeLaCategoria('DIPLOMADO_ESTUDIO', delDiplomado)).toBe('Estudio profundo');
    expect(nombreDeLaCategoria('BODY')).toBe('Cuerpo');
  });

  it('el ícono es el de la categoría; si no tiene lista ni ícono, el de la dimensión o uno neutro', () => {
    expect(iconoDelHabito('DIPLOMADO_ESTUDIO', delDiplomado)).toBe('bookOpen');
    expect(iconoDelHabito('DIPLOMADO_VIEJA', delDiplomado)).toBe('listChecks');
    expect(iconoDelHabito('BODY')).toBe('activity');
    expect(iconoDelHabito('X_DESCONOCIDA')).toBe('listChecks');
  });
});

describe('el formulario de un hábito con la formación', () => {
  it('un hábito nuevo parte de la primera categoría de la formación; uno existente, de la suya', () => {
    expect(formularioDesde(null, 'DIPLOMADO_ESTUDIO').categoria).toBe('DIPLOMADO_ESTUDIO');
    expect(formularioDesde(habito({ category: 'DIPLOMADO_PRACTICA' }), 'DIPLOMADO_ESTUDIO').categoria).toBe('DIPLOMADO_PRACTICA');
  });

  it('sin ninguna categoría disponible no se puede guardar: se pide la categoría', () => {
    expect(faltaEnElFormulario(formularioDesde(null, ''), false)).toBe('Elige la categoría del hábito.');
    expect(faltaEnElFormulario({ ...formularioDesde(null, 'X'), titulo: 'Lectura' }, true)).toBeNull();
  });

  it('al crear, el cuerpo lleva la formación; al editar, no (un hábito no cambia de formación: se copia)', () => {
    const f = { ...formularioDesde(null, 'DIPLOMADO_ESTUDIO'), titulo: 'Lectura' };
    expect(cuerpoDesde(f, true, 'DIPLOMADO')).toMatchObject({ title: 'Lectura', category: 'DIPLOMADO_ESTUDIO', formation: 'DIPLOMADO' });
    expect(cuerpoDesde(f, false, 'DIPLOMADO')).not.toHaveProperty('formation');
    expect(cuerpoDesde(f, true)).not.toHaveProperty('formation');
  });
});
