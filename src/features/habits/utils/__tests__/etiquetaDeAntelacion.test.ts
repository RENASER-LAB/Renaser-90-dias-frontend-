import { describe, expect, it } from '@jest/globals';

import {
  antelacionesAMostrar,
  etiquetaDeAntelacion,
  MAXIMO_MINUTOS_ANTELACION,
  MAXIMO_MINUTOS_RUEDA_ANTELACION,
  minutosDeArranqueDeLaRueda,
  MINUTOS_OTRA_POR_DEFECTO,
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

describe('minutosDeArranqueDeLaRueda', () => {
  it('sin ningún aviso puesto, abre en el valor por defecto y no en el primero de la rueda', () => {
    expect(minutosDeArranqueDeLaRueda([])).toBe(MINUTOS_OTRA_POR_DEFECTO);
  });

  it('abre en el aviso que ya rige', () => {
    expect(minutosDeArranqueDeLaRueda([10])).toBe(10);
  });

  it('con varios avisos abre en el mayor, que es el que llega antes', () => {
    expect(minutosDeArranqueDeLaRueda([10, 45, 30])).toBe(45);
  });

  it('"a la hora" no es un punto de la rueda: con solo el cero abre en el valor por defecto', () => {
    expect(minutosDeArranqueDeLaRueda([0])).toBe(MINUTOS_OTRA_POR_DEFECTO);
    expect(minutosDeArranqueDeLaRueda([0, 10])).toBe(10);
  });

  it('un valor guardado más grande que la rueda la abre en el tope, sin tocar el dato', () => {
    const guardadas = [90];
    expect(minutosDeArranqueDeLaRueda(guardadas)).toBe(MAXIMO_MINUTOS_RUEDA_ANTELACION);
    expect(minutosDeArranqueDeLaRueda([MAXIMO_MINUTOS_ANTELACION])).toBe(MAXIMO_MINUTOS_RUEDA_ANTELACION);
    // Lo que importa del caso: la lista de avisos sigue igual, el clamp es solo de la vista.
    expect(guardadas).toEqual([90]);
  });

  it('un valor imposible no deja a la rueda sin punto de arranque', () => {
    expect(minutosDeArranqueDeLaRueda([Number.NaN])).toBe(MINUTOS_OTRA_POR_DEFECTO);
    expect(minutosDeArranqueDeLaRueda([-5])).toBe(MINUTOS_OTRA_POR_DEFECTO);
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
