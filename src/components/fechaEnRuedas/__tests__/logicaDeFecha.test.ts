import { describe, expect, it } from '@jest/globals';
import {
  FECHA_POR_DEFECTO,
  aniosElegibles,
  ajustarDia,
  armarFecha,
  diasDelMes,
  fechaEnPalabras,
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

  it('ofrece los mismos 80 años que antes (de 14 a 93 años), ahora de menor a mayor', () => {
    const anioActual = 2026;
    const deAntes = Array.from({ length: 80 }, (_, i) => anioActual - 14 - i);
    expect(aniosElegibles(anioActual)).toEqual([...deAntes].sort((a, b) => a - b));
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
