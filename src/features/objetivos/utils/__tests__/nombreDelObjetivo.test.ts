/**
 * El nombre del objetivo grande sigue la duración del programa de la persona (decisión del dueño, 2026-10-31).
 */
import { describe, expect, it } from '@jest/globals';

import { nombreDeLosObjetivos, nombreDelObjetivo, plazoDelObjetivo } from '../nombreDelObjetivo';

describe('nombreDelObjetivo', () => {
  it('la Escuela y la Certificación dicen 90 días', () => {
    expect(nombreDelObjetivo(90, 'ESCUELA')).toBe('objetivo de 90 días');
    expect(nombreDelObjetivo(90, 'CERTIFICACION')).toBe('objetivo de 90 días');
  });

  it('el Diplomado de 3 meses dice 3 meses y el de 1 año dice 1 año', () => {
    expect(nombreDelObjetivo(90, 'DIPLOMADO')).toBe('objetivo de 3 meses');
    expect(nombreDelObjetivo(365, 'DIPLOMADO')).toBe('objetivo de 1 año');
  });

  it('un año completo es «1 año» en cualquier formación', () => {
    expect(nombreDelObjetivo(365, 'ESCUELA')).toBe('objetivo de 1 año');
    expect(nombreDelObjetivo(365)).toBe('objetivo de 1 año');
  });

  it('sin dato (servidor anterior a las formaciones, o /home sin leer) es el de siempre', () => {
    expect(nombreDelObjetivo()).toBe('objetivo de 90 días');
    expect(nombreDelObjetivo(null, null)).toBe('objetivo de 90 días');
    expect(nombreDelObjetivo(0)).toBe('objetivo de 90 días');
    expect(nombreDelObjetivo(Number.NaN)).toBe('objetivo de 90 días');
  });

  it('otra duración configurada se dice en días', () => {
    expect(plazoDelObjetivo(120, 'CERTIFICACION')).toBe('120 días');
  });

  it('el plural sigue el mismo plazo', () => {
    expect(nombreDeLosObjetivos(90)).toBe('objetivos de 90 días');
    expect(nombreDeLosObjetivos(365, 'DIPLOMADO')).toBe('objetivos de 1 año');
    expect(nombreDeLosObjetivos(90, 'DIPLOMADO')).toBe('objetivos de 3 meses');
  });
});
