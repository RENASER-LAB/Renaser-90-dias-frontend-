import { describe, expect, it } from '@jest/globals';

import type { AprendizDelSemaforo } from '../../types/semaforo.types';
import {
  aprendicesEnPalabras,
  cantidadEnPalabras,
  dichoDelAprendiz,
  promedioEnPalabras,
  resumenEnPalabras,
  rotuloDeVentana,
} from '../lecturaDelSemaforo';

/**
 * Cómo se DICEN las vistas del mentor, del líder y de administración: cantidades con la palabra de
 * su color (RL-30), el promedio de un grupo sin inventarle color, y qué días se están mirando.
 */

/** El espacio duro del kit (U+00A0): el `%` nunca queda solo en el renglón de abajo. */
const ESPACIO_DURO = '\u00A0';

describe('cada cantidad con la palabra de su color', () => {
  it('las cuatro, en minúscula porque van dentro de una frase', () => {
    expect(cantidadEnPalabras('VERDE', 5)).toBe('5 al día');
    expect(cantidadEnPalabras('AMARILLO', 2)).toBe('2 requieren atención');
    expect(cantidadEnPalabras('ROJO', 1)).toBe('1 con problemas');
    expect(cantidadEnPalabras('SIN_DATOS', 0)).toBe('0 sin datos');
  });

  it('«requiere» concuerda con uno solo', () => {
    expect(cantidadEnPalabras('AMARILLO', 1)).toBe('1 requiere atención');
    expect(cantidadEnPalabras('AMARILLO', 0)).toBe('0 requieren atención');
  });

  it('la línea entera, con las cuatro aunque alguna sea cero', () => {
    expect(resumenEnPalabras({ verde: 5, amarillo: 2, rojo: 1, sinDatos: 0, total: 8 })).toBe(
      '8 aprendices: 5 al día, 2 requieren atención, 1 con problemas, 0 sin datos',
    );
    expect(resumenEnPalabras({ verde: 1, amarillo: 0, rojo: 0, sinDatos: 0, total: 1 })).toBe(
      '1 aprendiz: 1 al día, 0 requieren atención, 0 con problemas, 0 sin datos',
    );
  });

  it('aprendiz, aprendices', () => {
    expect(aprendicesEnPalabras(1)).toBe('1 aprendiz');
    expect(aprendicesEnPalabras(62)).toBe('62 aprendices');
  });
});

describe('el promedio de un grupo (§4.4)', () => {
  it('tal cual llega, con su %', () => {
    expect(promedioEnPalabras(76.4)).toBe(`Promedio del grupo: 76.4${ESPACIO_DURO}%`);
  });

  it('sin número dice «sin datos», nunca 0 %', () => {
    expect(promedioEnPalabras(null)).toBe('Promedio del grupo: sin datos');
    expect(promedioEnPalabras(null, 'VERDE', 'Al día')).toBe('Promedio del grupo: sin datos');
  });

  it('con color, dice la palabra antes del número', () => {
    expect(promedioEnPalabras(76.4, 'AMARILLO', 'Requiere atención')).toBe(
      `Promedio del grupo: Requiere atención, 76.4${ESPACIO_DURO}%`,
    );
    expect(promedioEnPalabras(84.2, 'VERDE', null)).toBe(`Promedio del grupo: Al día, 84.2${ESPACIO_DURO}%`);
  });

  it('un 0 real se dice: es un promedio medido, no una falta de datos', () => {
    expect(promedioEnPalabras(0)).toBe(`Promedio del grupo: 0${ESPACIO_DURO}%`);
  });
});

describe('qué días se están mirando', () => {
  it('la ventana vigente', () => {
    expect(rotuloDeVentana('vigente', { desde: '2026-09-18', hasta: '2026-09-24' }, false)).toEqual({
      titulo: 'Últimos 7 días',
      rango: 'Del viernes 18 al jueves 24 de septiembre',
    });
  });

  it('una semana cerrada, de sábado a viernes', () => {
    expect(rotuloDeVentana('semana', { desde: '2026-09-12', hasta: '2026-09-18' }, true)).toEqual({
      titulo: 'Semana cerrada',
      rango: 'Del sábado 12 al viernes 18 de septiembre',
    });
  });

  it('una semana que el servidor todavía no cerró, y una que todavía no llegó', () => {
    expect(rotuloDeVentana('semana', { desde: '2026-09-12', hasta: '2026-09-18' }, false).titulo).toBe(
      'Semana todavía sin cerrar',
    );
    expect(rotuloDeVentana('semana', { desde: '2026-09-12', hasta: '2026-09-18' }, null).titulo).toBe('Semana');
  });

  it('una semana que cruza de mes nombra los dos', () => {
    expect(rotuloDeVentana('semana', { desde: '2026-09-26', hasta: '2026-10-02' }, true).rango).toBe(
      'Del sábado 26 de septiembre al viernes 2 de octubre',
    );
  });

  it('sin rango todavía, solo el título', () => {
    expect(rotuloDeVentana('vigente', null, null)).toEqual({ titulo: 'Últimos 7 días', rango: null });
  });
});

describe('lo que se oye en la fila de una persona', () => {
  const ana: AprendizDelSemaforo = {
    aprendizId: 'u-1',
    nombre: 'Ana Pérez',
    avatarUrl: null,
    porcentaje: 78.3,
    color: 'AMARILLO',
    etiqueta: 'Requiere atención',
    diasConDatos: 6,
    dias: [],
  };

  it('nombre primero, después la palabra, el porcentaje y los días con datos', () => {
    expect(dichoDelAprendiz(ana)).toBe(`Ana Pérez. Requiere atención, 78.3${ESPACIO_DURO}%. 6 de 7 días con datos.`);
  });

  it('sin datos no dice ningún porcentaje', () => {
    expect(
      dichoDelAprendiz({ ...ana, nombre: 'Beto Soto', porcentaje: null, color: 'SIN_DATOS', etiqueta: 'Sin datos', diasConDatos: 0 }),
    ).toBe('Beto Soto. Sin datos. 0 de 7 días con datos.');
  });

  it('sin nombre no inventa uno', () => {
    expect(dichoDelAprendiz({ ...ana, nombre: '  ', diasConDatos: null })).toBe(
      `Aprendiz sin nombre. Requiere atención, 78.3${ESPACIO_DURO}%.`,
    );
  });
});
