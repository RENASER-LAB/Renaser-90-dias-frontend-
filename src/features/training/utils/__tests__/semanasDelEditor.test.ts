import { describe, expect, it } from '@jest/globals';

import {
  RECORRIDO_PARA_CAMBIAR,
  cambioAlSoltar,
  diasDelMesDeLaSemana,
  empiezaElDeslizamiento,
  fechasDeLaSemana,
  hoyDesdeLaPrimeraSemana,
  lunesDeLaFecha,
  lunesDeLasSemanas,
  primeraSemanaConCambiosPropios,
  rangoCortoDeLaSemana,
  rotuloDeLaSemana,
  ultimoDiaDelPrograma,
} from '../semanasDelEditor';

/**
 * «Por semana» del editor de Planificar: las semanas que se pueden ver, hasta la última del programa, y deslizar la fila de días para
 * pasar de una a otra. Todo puro. Hoy es el miércoles 4 de noviembre de 2026 y la persona va por el día 20 de su programa.
 */

const HOY = '2026-11-04';
const LUNES_INICIAL = '2026-11-02';

describe('lunesDeLaFecha y hoyDesdeLaPrimeraSemana', () => {
  it('el lunes de cualquier día de la semana, también del domingo y del primer día del mes', () => {
    expect(lunesDeLaFecha('2026-11-04')).toBe('2026-11-02');
    expect(lunesDeLaFecha('2026-11-02')).toBe('2026-11-02');
    expect(lunesDeLaFecha('2026-11-08')).toBe('2026-11-02');
    expect(lunesDeLaFecha('2026-12-01')).toBe('2026-11-30');
    expect(lunesDeLaFecha('2027-01-01')).toBe('2026-12-28');
  });

  it('hoy sale del lunes de la primera semana: la en curso o, un domingo, la que empieza', () => {
    expect(hoyDesdeLaPrimeraSemana(LUNES_INICIAL, 2, false)).toBe(HOY);
    // Domingo 8: la primera semana es la del lunes 9, y hoy es el día 6 (domingo) de la anterior.
    expect(hoyDesdeLaPrimeraSemana('2026-11-09', 6, true)).toBe('2026-11-08');
  });
});

describe('ultimoDiaDelPrograma', () => {
  it('es hoy más lo que le queda: día 20 de 90 → el día 90 es 70 días después', () => {
    expect(ultimoDiaDelPrograma(HOY, 20, 90)).toBe('2027-01-13');
  });

  it('un programa de un año (365) llega mucho más lejos', () => {
    expect(ultimoDiaDelPrograma(HOY, 20, 365)).toBe('2027-10-15');
  });

  it('sin día de programa, sin duración o con valores que no valen no se inventa un tope', () => {
    expect(ultimoDiaDelPrograma(HOY, 0, 90)).toBeNull();
    expect(ultimoDiaDelPrograma(HOY, null, 90)).toBeNull();
    expect(ultimoDiaDelPrograma(HOY, 20, undefined)).toBeNull();
    expect(ultimoDiaDelPrograma(HOY, 20, 0)).toBeNull();
  });

  it('pasado el día 90 el último día ya quedó atrás, nunca después de hoy', () => {
    expect(ultimoDiaDelPrograma(HOY, 95, 90)).toBe('2026-11-04');
  });
});

describe('lunesDeLasSemanas: de la semana en curso a la última del programa', () => {
  it('sin último día conocido, solo la primera semana (como antes)', () => {
    expect(lunesDeLasSemanas(LUNES_INICIAL, null)).toEqual([LUNES_INICIAL]);
  });

  it('día 20 de 90: la semana en curso y las 10 siguientes (el lunes 11 de enero es la última; el programa termina el miércoles 13)', () => {
    const lunes = lunesDeLasSemanas(LUNES_INICIAL, '2027-01-13');
    expect(lunes[0]).toBe('2026-11-02');
    expect(lunes[1]).toBe('2026-11-09');
    expect(lunes.at(-1)).toBe('2027-01-11');
    expect(lunes).toHaveLength(11);
    // Siempre lunes y de 7 en 7.
    for (let i = 1; i < lunes.length; i++) expect(lunesDeLaFecha(lunes[i])).toBe(lunes[i]);
  });

  it('el programa termina un lunes: esa semana cuenta (tiene un día del programa)', () => {
    expect(lunesDeLasSemanas(LUNES_INICIAL, '2026-11-16')).toEqual(['2026-11-02', '2026-11-09', '2026-11-16']);
  });

  it('el programa termina un domingo: esa semana es la última, no una más', () => {
    expect(lunesDeLasSemanas(LUNES_INICIAL, '2026-11-15')).toEqual(['2026-11-02', '2026-11-09']);
  });

  it('un programa de un año da más de cuarenta semanas, con tope de seguridad', () => {
    const anio = lunesDeLasSemanas(LUNES_INICIAL, '2027-10-15');
    expect(anio.length).toBeGreaterThan(40);
    expect(anio.length).toBeLessThanOrEqual(60);
    expect(lunesDeLasSemanas(LUNES_INICIAL, '2099-01-01')).toHaveLength(60);
  });

  it('si el programa ya terminó antes de la primera semana no hay ninguna que ofrecer', () => {
    // Un domingo, última noche del programa: la primera semana (la que empieza mañana) ya es de después.
    expect(lunesDeLasSemanas('2026-11-09', '2026-11-08')).toEqual([]);
  });
});

describe('los textos y las fechas de una semana', () => {
  it('«Semana del 9 al 15 nov»; cruzando de mes, con los dos meses', () => {
    expect(rotuloDeLaSemana('2026-11-09')).toBe('Semana del 9 al 15 nov');
    expect(rotuloDeLaSemana('2026-10-26')).toBe('Semana del 26 oct al 1 nov');
    expect(rotuloDeLaSemana('2026-12-28')).toBe('Semana del 28 dic al 3 ene');
  });

  it('en el botón va corta: «9–15 nov» y «26 oct–1 nov»', () => {
    expect(rangoCortoDeLaSemana('2026-11-09')).toBe('9–15 nov');
    expect(rangoCortoDeLaSemana('2026-10-26')).toBe('26 oct–1 nov');
  });

  it('las fechas de los siete días y el número que dibuja cada pastilla', () => {
    expect(fechasDeLaSemana('2026-11-23')).toEqual({
      LUN: '2026-11-23', MAR: '2026-11-24', 'MIÉ': '2026-11-25', JUE: '2026-11-26', VIE: '2026-11-27', 'SÁB': '2026-11-28', DOM: '2026-11-29',
    });
    expect(diasDelMesDeLaSemana('2026-11-30')).toEqual({
      LUN: '30', MAR: '01', 'MIÉ': '02', JUE: '03', VIE: '04', 'SÁB': '05', DOM: '06',
    });
  });
});

describe('primeraSemanaConCambiosPropios: abrir en «Por semana» cuando ya hay algo guardado', () => {
  const semanas = lunesDeLasSemanas(LUNES_INICIAL, '2027-01-13');
  const fila = (date: string, customDate?: boolean) => ({ date, customDate });

  it('la semana en curso con un cambio propio de un día que todavía se puede cambiar', () => {
    expect(primeraSemanaConCambiosPropios([fila('2026-11-07', true)], semanas, HOY)).toBe('2026-11-02');
  });

  it('una semana que viene también cuenta: lo guardado no se pierde de vista', () => {
    expect(primeraSemanaConCambiosPropios([fila('2026-11-18', true)], semanas, HOY)).toBe('2026-11-16');
  });

  it('con cambios en varias semanas abre en la más cercana', () => {
    expect(primeraSemanaConCambiosPropios([fila('2026-11-21'), fila('2026-11-06')], semanas, HOY)).toBe('2026-11-02');
  });

  it('hoy y lo pasado no cuentan: ya no se pueden cambiar y la pastilla no los marca', () => {
    expect(primeraSemanaConCambiosPropios([fila('2026-11-04', true), fila('2026-11-02', true)], semanas, HOY)).toBeNull();
  });

  it('sin cambios propios, sin lista o con una lista que no es una lista, abre en «Siempre»', () => {
    expect(primeraSemanaConCambiosPropios([], semanas, HOY)).toBeNull();
    expect(primeraSemanaConCambiosPropios(undefined, semanas, HOY)).toBeNull();
    expect(primeraSemanaConCambiosPropios(null, semanas, HOY)).toBeNull();
    expect(primeraSemanaConCambiosPropios('algo' as never, semanas, HOY)).toBeNull();
  });

  it('una fecha que dice customDate=false no es un cambio propio; sin el dato, la lista ya es de fechas con fila propia', () => {
    expect(primeraSemanaConCambiosPropios([fila('2026-11-07', false)], semanas, HOY)).toBeNull();
    expect(primeraSemanaConCambiosPropios([fila('2026-11-07')], semanas, HOY)).toBe('2026-11-02');
  });

  it('una fecha de una semana que no se ofrece (fuera del programa) no abre nada', () => {
    expect(primeraSemanaConCambiosPropios([fila('2027-03-06', true)], semanas, HOY)).toBeNull();
    expect(primeraSemanaConCambiosPropios([fila('2026-11-07', true)], [], HOY)).toBeNull();
  });
});

describe('deslizar la fila de días', () => {
  it('empieza solo cuando el dedo va claramente de lado, no con el desplazamiento vertical ni con un toque', () => {
    expect(empiezaElDeslizamiento(0, 0)).toBe(false);
    expect(empiezaElDeslizamiento(6, 0)).toBe(false);
    expect(empiezaElDeslizamiento(20, 18)).toBe(false);
    expect(empiezaElDeslizamiento(3, 40)).toBe(false);
    expect(empiezaElDeslizamiento(24, 4)).toBe(true);
    expect(empiezaElDeslizamiento(-24, 4)).toBe(true);
  });

  it('el dedo a la izquierda trae la semana siguiente; a la derecha, la anterior', () => {
    expect(cambioAlSoltar({ dx: -80, dy: 6, vx: -0.1 })).toBe('siguiente');
    expect(cambioAlSoltar({ dx: 80, dy: 6, vx: 0.1 })).toBe('anterior');
  });

  it('un recorrido corto no cambia nada, pero un golpe rápido sí aunque recorra poco', () => {
    expect(cambioAlSoltar({ dx: -RECORRIDO_PARA_CAMBIAR + 8, dy: 0, vx: -0.1 })).toBeNull();
    expect(cambioAlSoltar({ dx: -RECORRIDO_PARA_CAMBIAR, dy: 0, vx: 0 })).toBe('siguiente');
    expect(cambioAlSoltar({ dx: -26, dy: 3, vx: -0.6 })).toBe('siguiente');
    expect(cambioAlSoltar({ dx: 8, dy: 1, vx: 0.9 })).toBeNull();
  });

  it('un movimiento más vertical que horizontal nunca cambia de semana', () => {
    expect(cambioAlSoltar({ dx: -60, dy: 90, vx: -0.8 })).toBeNull();
  });
});
