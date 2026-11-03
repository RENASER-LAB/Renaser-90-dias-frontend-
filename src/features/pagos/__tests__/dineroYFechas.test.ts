import { describe, expect, it } from '@jest/globals';

import { formatearMonto, montoConMoneda, montoDeTexto, nombreDeLaMoneda, simboloDeLaMoneda, sumarMontos } from '../utils/dinero';
import {
  aIso,
  ddMmAaaaAIso,
  diasDelMesDePago,
  diasEntre,
  fechaCortaDePago,
  fechaEnPalabrasDePago,
  isoADdMmAaaa,
  partirDdMmAaaa,
  partirIso,
  sumarDias,
  sumarMeses,
} from '../utils/fechasDePago';

/** Los espacios de un monto son duros (U+00A0): la prueba los escribe normales y acá se pasan. */
const nb = (texto: string): string => texto.replace(/ /g, '\u00a0');

describe('el dinero', () => {
  it('se escribe con el símbolo de su moneda y un espacio duro, miles con espacio y céntimos siempre con dos', () => {
    expect(montoConMoneda(1000, 'PEN')).toBe(nb('S/ 1 000'));
    expect(montoConMoneda(1000, 'USD')).toBe(nb('US$ 1 000'));
    expect(montoConMoneda(250.5, 'PEN')).toBe(nb('S/ 250.50'));
    expect(montoConMoneda(1234567.89, 'USD')).toBe(nb('US$ 1 234 567.89'));
    expect(formatearMonto(333.33)).toBe('333.33');
    expect(formatearMonto(0.5)).toBe('0.50');
  });

  it('el símbolo va pegado al monto con un espacio duro: no se parte en dos renglones', () => {
    expect(montoConMoneda(500, 'PEN')).toContain(' ');
    expect(montoConMoneda(500, 'PEN')).not.toContain(' ');
  });

  it('una moneda que no se conoce (un servidor nuevo) no tumba nada: sale el número solo', () => {
    expect(montoConMoneda(900, 'EUR')).toBe('900');
    expect(montoConMoneda(900, null)).toBe('900');
    expect(simboloDeLaMoneda('EUR')).toBe('');
    expect(nombreDeLaMoneda('PEN')).toBe('Soles (S/)');
    expect(nombreDeLaMoneda('USD')).toBe('Dólares (US$)');
  });

  it('lo que se escribe en el campo del monto: coma o punto son decimales, con hasta dos', () => {
    expect(montoDeTexto('1000')).toBe(1000);
    expect(montoDeTexto('1 000')).toBe(1000);
    expect(montoDeTexto('250,5')).toBe(250.5);
    expect(montoDeTexto('250.50')).toBe(250.5);
    expect(montoDeTexto('0.01')).toBe(0.01);
  });

  it('no valen: vacío, cero, negativos, letras, tres decimales, miles con punto y lo que pasa del tope', () => {
    for (const malo of ['', ' ', '0', '0.00', '-5', 'abc', '10abc', '10.123', '1.000.000', '10,5,5', '10000000']) {
      expect(montoDeTexto(malo)).toBeNull();
    }
    expect(montoDeTexto('9999999.99')).toBe(9999999.99);
  });

  it('suma en céntimos exactos', () => {
    expect(sumarMontos([333.33, 333.33, 333.34])).toBe(1000);
    expect(sumarMontos([0.1, 0.2])).toBe(0.3);
    expect(sumarMontos([])).toBe(0);
  });
});

describe('las fechas fijas del calendario', () => {
  it('leen AAAA-MM-DD y DD/MM/AAAA y rechazan una fecha que no existe', () => {
    expect(partirIso('2026-11-15')).toEqual({ anio: 2026, mes: 11, dia: 15 });
    expect(partirIso('2026-11-15T10:00:00Z')).toEqual({ anio: 2026, mes: 11, dia: 15 });
    expect(partirIso('2026-02-30')).toBeNull();
    expect(partirIso('2026-13-01')).toBeNull();
    expect(partirIso('mañana')).toBeNull();
    expect(partirIso(null)).toBeNull();
    expect(partirDdMmAaaa('15/11/2026')).toEqual({ anio: 2026, mes: 11, dia: 15 });
    expect(partirDdMmAaaa('5/1/2026')).toEqual({ anio: 2026, mes: 1, dia: 5 });
    expect(partirDdMmAaaa('31/02/2026')).toBeNull();
    expect(partirDdMmAaaa('')).toBeNull();
  });

  it('el 29 de febrero existe solo en los años bisiestos', () => {
    expect(diasDelMesDePago(2, 2028)).toBe(29);
    expect(diasDelMesDePago(2, 2026)).toBe(28);
    expect(diasDelMesDePago(2, 2100)).toBe(28);
    expect(diasDelMesDePago(2, 2000)).toBe(29);
    expect(partirIso('2028-02-29')).not.toBeNull();
    expect(partirIso('2026-02-29')).toBeNull();
  });

  it('van y vuelven entre los dos formatos', () => {
    expect(ddMmAaaaAIso('05/01/2027')).toBe('2027-01-05');
    expect(ddMmAaaaAIso('31/04/2026')).toBeNull();
    expect(isoADdMmAaaa('2027-01-05')).toBe('05/01/2027');
    expect(isoADdMmAaaa('basura')).toBe('');
    expect(aIso({ dia: 5, mes: 1, anio: 2027 })).toBe('2027-01-05');
  });

  it('se dicen cortas («15 nov») y con el año si no es el de hoy; y en palabras para el lector de pantalla', () => {
    const hoy = { dia: 3, mes: 11, anio: 2026 };
    expect(fechaCortaDePago('2026-11-15', hoy)).toBe('15 nov');
    expect(fechaCortaDePago('2027-01-15', hoy)).toBe('15 ene 2027');
    expect(fechaCortaDePago('sin fecha', hoy)).toBe('sin fecha');
    expect(fechaEnPalabrasDePago('2026-11-15')).toBe('15 de noviembre de 2026');
  });

  it('suman meses desde la fecha de partida: un 31 cae el último día de los meses cortos y vuelve al 31', () => {
    const inicio = { dia: 31, mes: 1, anio: 2026 };
    expect(sumarMeses(inicio, 1)).toEqual({ dia: 28, mes: 2, anio: 2026 });
    expect(sumarMeses(inicio, 2)).toEqual({ dia: 31, mes: 3, anio: 2026 });
    expect(sumarMeses(inicio, 3)).toEqual({ dia: 30, mes: 4, anio: 2026 });
    expect(sumarMeses({ dia: 15, mes: 11, anio: 2026 }, 2)).toEqual({ dia: 15, mes: 1, anio: 2027 });
    expect(sumarMeses({ dia: 15, mes: 1, anio: 2026 }, 12)).toEqual({ dia: 15, mes: 1, anio: 2027 });
    expect(sumarMeses({ dia: 29, mes: 1, anio: 2028 }, 1)).toEqual({ dia: 29, mes: 2, anio: 2028 });
  });

  it('cuentan y suman días de calendario, también a través de un cambio de mes o de año', () => {
    expect(diasEntre({ dia: 28, mes: 10, anio: 2026 }, { dia: 15, mes: 11, anio: 2026 })).toBe(18);
    expect(diasEntre({ dia: 15, mes: 11, anio: 2026 }, { dia: 15, mes: 11, anio: 2026 })).toBe(0);
    expect(diasEntre({ dia: 15, mes: 11, anio: 2026 }, { dia: 10, mes: 11, anio: 2026 })).toBe(-5);
    expect(sumarDias({ dia: 2, mes: 1, anio: 2027 }, -3)).toEqual({ dia: 30, mes: 12, anio: 2026 });
    expect(sumarDias({ dia: 28, mes: 2, anio: 2026 }, 1)).toEqual({ dia: 1, mes: 3, anio: 2026 });
  });
});
