import { describe, expect, it } from '@jest/globals';
import {
  EDAD_MINIMA,
  FECHA_POR_DEFECTO,
  acotarAFechaMaxima,
  aniosElegibles,
  ajustarDia,
  armarFecha,
  diasDelMes,
  diasElegibles,
  edadCumplida,
  esMayorDeEdad,
  fechaEnPalabras,
  fechaMaximaDeNacimiento,
  hoyEnLima,
  mesesElegibles,
  partirFecha,
} from '../logicaDeFecha';

/**
 * La fecha de nacimiento en ruedas (2026-10-05). Lo que NO podía cambiar: guarda `"DD/MM/AAAA"`,
 * arranca en el 15/06/1995 y ofrece los mismos 80 años. Lo nuevo: la fecha tiene que existir (el
 * selector anterior dejaba confirmar el 31 de febrero y lo mandaba como `1995-02-31`).
 */

describe('el contrato de siempre', () => {
  it('guarda "DD/MM/AAAA" con ceros a la izquierda, ida y vuelta', () => {
    expect(armarFecha({ dia: 5, mes: 3, anio: 1990 })).toBe('05/03/1990');
    expect(partirFecha('05/03/1990')).toEqual({ dia: 5, mes: 3, anio: 1990 });
    expect(armarFecha(partirFecha('31/12/1980')!)).toBe('31/12/1980');
  });

  it('un valor vacío o con otra forma no se interpreta (el selector arranca en la fecha por defecto)', () => {
    expect(partirFecha('')).toBeNull();
    expect(partirFecha('1995-06-15')).toBeNull();
    expect(partirFecha('15/13/1995')).toBeNull();
    expect(FECHA_POR_DEFECTO).toEqual({ dia: 15, mes: 6, anio: 1995 });
  });

  it('ofrece 80 años, de menor a mayor, y el más reciente es el de quien cumple 18 este año (antes: 14)', () => {
    const anioActual = 2026;
    const esperados = Array.from({ length: 80 }, (_, i) => anioActual - 18 - i);
    expect(aniosElegibles(anioActual)).toEqual([...esperados].sort((a, b) => a - b));
    expect(aniosElegibles(anioActual)).not.toContain(2010);
    expect(Math.max(...aniosElegibles(anioActual))).toBe(2008);
  });

  it('si la fecha guardada cae fuera del rango, su año igual está: abrir no cambia nada en silencio', () => {
    expect(aniosElegibles(2026, 1925)).toContain(1925);
    expect(aniosElegibles(2026, 1925)).toHaveLength(81);
    expect(aniosElegibles(2026, 1990)).toHaveLength(80);
  });
});

describe('la fecha tiene que existir', () => {
  it('cada mes tiene sus días, con febrero bisiesto', () => {
    expect(diasDelMes(1, 1995)).toBe(31);
    expect(diasDelMes(4, 1995)).toBe(30);
    expect(diasDelMes(2, 1995)).toBe(28);
    expect(diasDelMes(2, 1996)).toBe(29);
    expect(diasDelMes(2, 2000)).toBe(29);
    expect(diasDelMes(2, 1900)).toBe(28);
  });

  it('el 31 que pasa a un mes más corto queda en el último día de ese mes', () => {
    expect(ajustarDia({ dia: 31, mes: 2, anio: 1996 })).toEqual({ dia: 29, mes: 2, anio: 1996 });
    expect(ajustarDia({ dia: 31, mes: 4, anio: 1996 })).toEqual({ dia: 30, mes: 4, anio: 1996 });
    expect(ajustarDia({ dia: 29, mes: 2, anio: 1997 })).toEqual({ dia: 28, mes: 2, anio: 1997 });
    expect(ajustarDia({ dia: 15, mes: 2, anio: 1997 })).toEqual({ dia: 15, mes: 2, anio: 1997 });
  });

  it('se lee en palabras, con el mes en minúscula', () => {
    expect(fechaEnPalabras({ dia: 15, mes: 6, anio: 1995 })).toBe('15 de junio de 1995');
  });
});

describe('solo mayores de 18 (decisión del dueño, 2026-10-06)', () => {
  const HOY = { dia: 6, mes: 10, anio: 2026 };

  it('la edad mínima es 18', () => {
    expect(EDAD_MINIMA).toBe(18);
  });

  it('17 años y 364 días: no; 18 justos, hoy: sí', () => {
    expect(esMayorDeEdad({ dia: 7, mes: 10, anio: 2008 }, HOY)).toBe(false);
    expect(edadCumplida({ dia: 7, mes: 10, anio: 2008 }, HOY)).toBe(17);
    expect(esMayorDeEdad({ dia: 6, mes: 10, anio: 2008 }, HOY)).toBe(true);
    expect(esMayorDeEdad({ dia: 5, mes: 10, anio: 2008 }, HOY)).toBe(true);
    expect(esMayorDeEdad({ dia: 15, mes: 6, anio: 2010 }, HOY)).toBe(false);
  });

  it('quien nació un 29 de febrero cumple el 1 de marzo en años no bisiestos', () => {
    const nacio = { dia: 29, mes: 2, anio: 2008 };
    expect(esMayorDeEdad(nacio, { dia: 28, mes: 2, anio: 2026 })).toBe(false);
    expect(esMayorDeEdad(nacio, { dia: 1, mes: 3, anio: 2026 })).toBe(true);
  });

  it('«hoy» es el día de Lima: a las 02:00 UTC del 7 de octubre en Lima sigue siendo el 6', () => {
    expect(hoyEnLima(Date.parse('2026-10-07T02:00:00Z'))).toEqual({ dia: 6, mes: 10, anio: 2026 });
    expect(hoyEnLima(Date.parse('2026-10-07T05:00:00Z'))).toEqual({ dia: 7, mes: 10, anio: 2026 });
  });

  it('las ruedas no pasan de la fecha de quien cumple 18 hoy', () => {
    const maxima = fechaMaximaDeNacimiento(HOY);
    expect(maxima).toEqual({ dia: 6, mes: 10, anio: 2008 });
    expect(mesesElegibles(2008, maxima)).toBe(10);
    expect(mesesElegibles(2007, maxima)).toBe(12);
    expect(diasElegibles(10, 2008, maxima)).toBe(6);
    expect(diasElegibles(9, 2008, maxima)).toBe(30);
    expect(diasElegibles(10, 2007, maxima)).toBe(31);
    expect(acotarAFechaMaxima({ dia: 7, mes: 10, anio: 2008 }, maxima)).toEqual(maxima);
    expect(acotarAFechaMaxima({ dia: 20, mes: 12, anio: 2008 }, maxima)).toEqual(maxima);
    expect(acotarAFechaMaxima({ dia: 5, mes: 10, anio: 2008 }, maxima)).toEqual({ dia: 5, mes: 10, anio: 2008 });
  });

  it('un 29 de febrero el tope cae en el 28 si hace 18 años no fue bisiesto', () => {
    expect(fechaMaximaDeNacimiento({ dia: 29, mes: 2, anio: 2028 })).toEqual({ dia: 28, mes: 2, anio: 2010 });
  });
});
