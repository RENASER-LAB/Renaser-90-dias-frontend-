import { describe, expect, it } from '@jest/globals';

import {
  antelacionesAMostrar,
  etiquetaDeAntelacion,
  MAXIMO_MINUTOS_ANTELACION,
} from '../etiquetaDeAntelacion';

describe('etiquetaDeAntelacion', () => {
  it('el cero es "A la hora", que es su propia pastilla', () => {
    expect(etiquetaDeAntelacion(0)).toBe('A la hora');
  });

  it('por debajo de la hora, minutos', () => {
    expect(etiquetaDeAntelacion(7)).toBe('7 min antes');
    expect(etiquetaDeAntelacion(59)).toBe('59 min antes');
  });

  it('las horas exactas no arrastran un cero que no dice nada', () => {
    expect(etiquetaDeAntelacion(60)).toBe('1 h antes');
    expect(etiquetaDeAntelacion(120)).toBe('2 h antes');
  });

  it('con resto, hora y minutos', () => {
    expect(etiquetaDeAntelacion(90)).toBe('1 h 30 antes');
    expect(etiquetaDeAntelacion(135)).toBe('2 h 15 antes');
  });

  it('el día entero se nombra como día', () => {
    expect(etiquetaDeAntelacion(MAXIMO_MINUTOS_ANTELACION)).toBe('1 día antes');
  });

  it('un valor imposible no rompe la pastilla', () => {
    expect(etiquetaDeAntelacion(Number.NaN)).toBe('A la hora');
    expect(etiquetaDeAntelacion(-5)).toBe('A la hora');
  });
});

describe('antelacionesAMostrar', () => {
  const FIJAS = [30, 10, 0];

  it('sin nada elegido, solo las fijas, de la mas temprana a la mas tardia', () => {
    expect(antelacionesAMostrar(FIJAS, [])).toEqual([30, 10]);
  });

  it('suma la que la persona escribio, en su lugar por tiempo', () => {
    expect(antelacionesAMostrar(FIJAS, [45])).toEqual([45, 30, 10]);
    expect(antelacionesAMostrar(FIJAS, [7])).toEqual([30, 10, 7]);
  });

  it('no repite una que ya era fija', () => {
    expect(antelacionesAMostrar(FIJAS, [30])).toEqual([30, 10]);
  });

  it('el cero no entra: se dibuja aparte como "A la hora"', () => {
    expect(antelacionesAMostrar(FIJAS, [0])).toEqual([30, 10]);
  });

  it('varias propias conviven ordenadas', () => {
    expect(antelacionesAMostrar(FIJAS, [90, 5])).toEqual([90, 30, 10, 5]);
  });
});
