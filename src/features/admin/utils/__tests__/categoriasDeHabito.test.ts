import { describe, expect, it } from '@jest/globals';

import type { CategoriaAdmin } from '../../../habits/categorias/types/categorias.types';
import {
  faltaEnLaCategoria,
  LARGO_MAXIMO_DE_LA_CATEGORIA,
  movida,
  nombreNormalizado,
  textoDeLosHabitosDeLaCategoria,
} from '../categoriasDeHabito';

const cat = (key: string, name: string, extra: Partial<CategoriaAdmin> = {}): CategoriaAdmin => ({
  key, code: key, formation: 'DIPLOMADO', name, icon: null, order: 1, isActive: true, activeHabits: 0, totalHabits: 0,
  canBeDeactivated: true, canBeDeleted: true, ...extra,
});

describe('validar el nombre de una categoría antes de enviar (spec 023)', () => {
  const existentes = [cat('DIPLOMADO_ESTUDIO', 'Estudio'), cat('DIPLOMADO_PRACTICA', 'Práctica')];

  it('un nombre bueno pasa', () => {
    expect(faltaEnLaCategoria('Lectura', existentes, null)).toBeNull();
  });

  it('sin nombre, muy corto o muy largo se dice qué falta', () => {
    expect(faltaEnLaCategoria('   ', existentes, null)).toBe('Escribe el nombre de la categoría.');
    expect(faltaEnLaCategoria('A', existentes, null)).toMatch(/al menos 2/);
    expect(faltaEnLaCategoria('x'.repeat(LARGO_MAXIMO_DE_LA_CATEGORIA + 1), existentes, null)).toMatch(/hasta 40/);
  });

  it('un nombre que ya existe en la formación se rechaza sin distinguir mayúsculas ni tildes', () => {
    expect(faltaEnLaCategoria('PRACTICA', existentes, null)).toBe('Ya hay una categoría con ese nombre en esta formación.');
    expect(faltaEnLaCategoria(' estudio ', existentes, null)).toMatch(/Ya hay una categoría/);
  });

  it('la categoría que se edita no choca consigo misma', () => {
    expect(faltaEnLaCategoria('Estudio', existentes, 'DIPLOMADO_ESTUDIO')).toBeNull();
    expect(faltaEnLaCategoria('Práctica', existentes, 'DIPLOMADO_ESTUDIO')).toMatch(/Ya hay una categoría/);
  });

  it('el mismo nombre normalizado es el mismo', () => {
    expect(nombreNormalizado(' Emoción ')).toBe(nombreNormalizado('EMOCION'));
  });
});

describe('mover una categoría en el orden', () => {
  const claves = ['A', 'B', 'C'];

  it('sube y baja una posición, con TODAS las claves (el servidor pide la lista completa)', () => {
    expect(movida(claves, 'B', -1)).toEqual(['B', 'A', 'C']);
    expect(movida(claves, 'B', 1)).toEqual(['A', 'C', 'B']);
  });

  it('en el borde no hay a dónde: null (el botón queda apagado)', () => {
    expect(movida(claves, 'A', -1)).toBeNull();
    expect(movida(claves, 'C', 1)).toBeNull();
    expect(movida(claves, 'Z', 1)).toBeNull();
  });

  it('no cambia la lista original', () => {
    movida(claves, 'B', 1);
    expect(claves).toEqual(['A', 'B', 'C']);
  });
});

describe('cuántos hábitos tiene, en palabras', () => {
  it('sin hábitos, uno, varios y con historial', () => {
    expect(textoDeLosHabitosDeLaCategoria({ activeHabits: 0, totalHabits: 0 })).toBe('Sin hábitos');
    expect(textoDeLosHabitosDeLaCategoria({ activeHabits: 1, totalHabits: 1 })).toBe('1 hábito activo');
    expect(textoDeLosHabitosDeLaCategoria({ activeHabits: 3, totalHabits: 3 })).toBe('3 hábitos activos');
    expect(textoDeLosHabitosDeLaCategoria({ activeHabits: 2, totalHabits: 5 })).toBe('2 hábitos activos de 5');
    expect(textoDeLosHabitosDeLaCategoria({ activeHabits: 0, totalHabits: 2 })).toBe('0 hábitos activos de 2');
  });
});
