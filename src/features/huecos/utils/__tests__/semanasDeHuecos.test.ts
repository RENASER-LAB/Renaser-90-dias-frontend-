import { describe, expect, it } from '@jest/globals';

import {
  puedeIrALaAnterior,
  puedeIrALaSiguiente,
  semanaAnterior,
  semanaSiguiente,
  sumarDias,
} from '../semanasDeHuecos';

describe('las semanas de lunes a domingo', () => {
  it('se mueven de 7 en 7 días, también al cruzar el mes y el año', () => {
    expect(semanaAnterior('2026-10-26')).toBe('2026-10-19');
    expect(semanaSiguiente('2026-10-26')).toBe('2026-11-02');
    expect(semanaAnterior('2026-01-05')).toBe('2025-12-29');
    expect(semanaSiguiente('2026-12-28')).toBe('2027-01-04');
  });

  it('no dependen del cambio de hora de ninguna zona', () => {
    expect(sumarDias('2026-03-08', 7)).toBe('2026-03-15');
    expect(sumarDias('2026-11-01', -7)).toBe('2026-10-25');
  });

  describe('‹ solo si hay una semana antes y no es la primera', () => {
    it.each([
      ['2026-10-26', '2026-10-12', true],
      ['2026-10-19', '2026-10-12', true],
      ['2026-10-12', '2026-10-12', false],
      ['2026-10-05', '2026-10-12', false],
    ])('desde %s con la primera %s: %s', (lunes, primera, esperado) => {
      expect(puedeIrALaAnterior(lunes, primera)).toBe(esperado);
    });

    it('sin saber la primera semana, o sin semana a la vista, no se inventa un tope: no se puede', () => {
      expect(puedeIrALaAnterior('2026-10-26', null)).toBe(false);
      expect(puedeIrALaAnterior(null, '2026-10-12')).toBe(false);
    });
  });

  describe('› solo mientras no sea la semana en curso: nunca al futuro', () => {
    it.each([
      ['2026-10-12', '2026-10-26', true],
      ['2026-10-19', '2026-10-26', true],
      ['2026-10-26', '2026-10-26', false],
      ['2026-11-02', '2026-10-26', false],
    ])('desde %s con la en curso %s: %s', (lunes, enCurso, esperado) => {
      expect(puedeIrALaSiguiente(lunes, enCurso)).toBe(esperado);
    });

    it('sin saber cuál es la semana en curso no se va a ninguna parte', () => {
      expect(puedeIrALaSiguiente('2026-10-12', null)).toBe(false);
      expect(puedeIrALaSiguiente(null, '2026-10-26')).toBe(false);
    });
  });
});
