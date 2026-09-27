import { describe, expect, it } from '@jest/globals';

import {
  SEMANAS_DEL_PROGRAMA,
  etiquetaDelMes,
  mesDe,
  mesDeLaSemana,
  semanaAPlanificar,
  semanaDe,
  semanasDelMes,
} from '../periodoDelPrograma';

/**
 * La cuenta de semanas del Plan tiene que dar lo mismo que la del servidor (D-203 del backend):
 * semanas de lunes a domingo desde la del primer día, trece, la 13 hasta el día 90, nunca la 14, y
 * el domingo se arma la siguiente. Las tablas son las de `SemanaProgramaTest` del backend, pasadas
 * de «fecha de inicio + fecha» a lo que tiene la app: el día del programa y la fecha de hoy.
 *
 * Contra la cuenta vieja (`⌈día / 7⌉`, acotada a 12) fallan los inicios de martes a domingo y los
 * días 85 a 90 de todos (OBJ-03).
 */

/** Lunes 2026-09-07 al mediodía; los seis días siguientes cubren martes a domingo. */
const UN_LUNES = new Date(2026, 8, 7, 12, 0);

const DIA_DE_INICIO = {
  LUNES: 0,
  MARTES: 1,
  MIERCOLES: 2,
  JUEVES: 3,
  VIERNES: 4,
  SABADO: 5,
  DOMINGO: 6,
} as const;

type DiaDeInicio = keyof typeof DIA_DE_INICIO;

function masDias(fecha: Date, dias: number): Date {
  const otra = new Date(fecha);
  otra.setDate(fecha.getDate() + dias);
  return otra;
}

/** La fecha en que alguien que empezó en `inicio` va por su día `dia`. */
function fechaDelDia(inicio: DiaDeInicio, dia: number): Date {
  return masDias(masDias(UN_LUNES, DIA_DE_INICIO[inicio]), dia - 1);
}

describe('semanaDe: la semana de calendario del servidor (D-203)', () => {
  it.each<[DiaDeInicio, number, number]>([
    ['LUNES', 1, 1], ['LUNES', 7, 1], ['LUNES', 8, 2], ['LUNES', 84, 12], ['LUNES', 85, 13], ['LUNES', 90, 13],
    ['MARTES', 1, 1], ['MARTES', 7, 2], ['MARTES', 8, 2], ['MARTES', 84, 13], ['MARTES', 85, 13], ['MARTES', 90, 13],
    ['MIERCOLES', 1, 1], ['MIERCOLES', 7, 2], ['MIERCOLES', 8, 2], ['MIERCOLES', 84, 13], ['MIERCOLES', 85, 13],
    ['MIERCOLES', 90, 13],
    ['JUEVES', 1, 1], ['JUEVES', 7, 2], ['JUEVES', 8, 2], ['JUEVES', 84, 13], ['JUEVES', 85, 13], ['JUEVES', 90, 13],
    ['VIERNES', 1, 1], ['VIERNES', 7, 2], ['VIERNES', 8, 2], ['VIERNES', 84, 13], ['VIERNES', 85, 13], ['VIERNES', 90, 13],
    ['SABADO', 1, 1], ['SABADO', 7, 2], ['SABADO', 8, 2], ['SABADO', 84, 13], ['SABADO', 85, 13], ['SABADO', 90, 13],
    ['DOMINGO', 1, 1], ['DOMINGO', 7, 2], ['DOMINGO', 8, 2], ['DOMINGO', 84, 13], ['DOMINGO', 85, 13], ['DOMINGO', 90, 13],
  ])('inicio %s, día %i → semana %i', (inicio, dia, esperada) => {
    expect(semanaDe(dia, fechaDelDia(inicio, dia))).toBe(esperada);
  });

  it.each(Object.keys(DIA_DE_INICIO) as DiaDeInicio[])(
    'inicio %s: cada lunes suma una semana, del 1 a la 13, y nunca la 14',
    inicio => {
      let anterior = 1;
      for (let dia = 1; dia <= 90; dia++) {
        const hoy = fechaDelDia(inicio, dia);
        const semana = semanaDe(dia, hoy);
        const esLunes = hoy.getDay() === 1;
        expect(semana).toBe(esLunes && dia > 1 ? Math.min(anterior + 1, SEMANAS_DEL_PROGRAMA) : anterior);
        anterior = semana;
      }
      expect(anterior).toBe(13);
    }
  );

  it('sin arrancar (día 0) es la semana 1, como en el servidor', () => {
    expect(semanaDe(0, UN_LUNES)).toBe(1);
    expect(semanaDe(Number.NaN, UN_LUNES)).toBe(1);
  });

  it('cuenta en la zona de Lima: el domingo a las 22:00 sigue siendo domingo aunque en UTC ya sea lunes', () => {
    // Empezó el lunes 07/09: el domingo 27/09 es su día 21, el último de la semana 3.
    expect(semanaDe(21, new Date('2026-09-28T03:00:00Z'))).toBe(3);
    // Y el lunes 28/09 a las 00:30 de Lima, su día 22, ya es la 4.
    expect(semanaDe(22, new Date('2026-09-28T05:30:00Z'))).toBe(4);
  });
});

describe('semanaAPlanificar: el domingo se arma la siguiente (Domingo Ritual)', () => {
  /** Tabla de `SemanaProgramaTest.semanaAPlanificar` del backend: inicio jueves 2026-09-10. */
  it.each<[string, Date, number, number]>([
    ['domingo antes del día 1', new Date(2026, 8, 6, 12), 0, 1],
    ['miércoles, día 0', new Date(2026, 8, 9, 12), 0, 1],
    ['jueves, día 1', new Date(2026, 8, 10, 12), 1, 1],
    ['sábado, día 3', new Date(2026, 8, 12, 12), 3, 1],
    ['domingo, día 4: prepara la 2', new Date(2026, 8, 13, 12), 4, 2],
    ['lunes, día 5', new Date(2026, 8, 14, 12), 5, 2],
    ['domingo, día 11', new Date(2026, 8, 20, 12), 11, 3],
    ['domingo de la 12 (día 81): prepara la 13', new Date(2026, 10, 29, 12), 81, 13],
    ['lunes de la 13 (día 82)', new Date(2026, 10, 30, 12), 82, 13],
    ['domingo dentro de la 13 (día 88): no hay 14', new Date(2026, 11, 6, 12), 88, 13],
    ['martes, día 90', new Date(2026, 11, 8, 12), 90, 13],
    ['domingo, ya graduado (el día llega acotado a 90)', new Date(2026, 11, 13, 12), 90, 13],
  ])('%s → arma la semana %i', (_caso, hoy, dia, esperada) => {
    expect(semanaAPlanificar(dia, hoy)).toBe(esperada);
  });

  it('el domingo a las 22:00 de Lima arma la siguiente; el sábado a las 22:00, la de hoy', () => {
    // Empezó el lunes 07/09. Sábado 26/09 22:00 de Lima = domingo 03:00 UTC; domingo 27/09 22:00 = lunes 03:00 UTC.
    expect(semanaAPlanificar(20, new Date('2026-09-27T03:00:00Z'))).toBe(3);
    expect(semanaAPlanificar(21, new Date('2026-09-28T03:00:00Z'))).toBe(4);
  });

  it('solo el domingo, dentro del programa y antes de la 13, la semana que se arma no es la de hoy', () => {
    const domingoDia21 = new Date(2026, 8, 27, 12);
    expect(semanaAPlanificar(21, domingoDia21)).not.toBe(semanaDe(21, domingoDia21));
    const sabadoDia20 = new Date(2026, 8, 26, 12);
    expect(semanaAPlanificar(20, sabadoDia20)).toBe(semanaDe(20, sabadoDia20));
    const domingoAntesDelDiaUno = new Date(2026, 8, 6, 12);
    expect(semanaAPlanificar(0, domingoAntesDelDiaUno)).toBe(semanaDe(0, domingoAntesDelDiaUno));
    const domingoDentroDeLa13 = new Date(2026, 11, 6, 12);
    expect(semanaAPlanificar(88, domingoDentroDeLa13)).toBe(semanaDe(88, domingoDentroDeLa13));
  });
});

describe('los meses: bloques de cuatro semanas, y el último se lleva la 13', () => {
  it('las semanas de cada mes', () => {
    expect(semanasDelMes(1)).toEqual([1, 2, 3, 4]);
    expect(semanasDelMes(2)).toEqual([5, 6, 7, 8]);
    expect(semanasDelMes(3)).toEqual([9, 10, 11, 12, 13]);
  });

  it('la 13 es del mes 3 y la etiqueta la nombra', () => {
    expect(mesDeLaSemana(13)).toBe(3);
    expect(etiquetaDelMes(3)).toBe('Mes 3 · Semanas 9 a 13');
    expect(etiquetaDelMes(1)).toBe('Mes 1 · Semanas 1 a 4');
  });

  it('el mes sale de la semana del servidor', () => {
    // Empezó un martes: su día 7 ya es la semana 2 (mes 1) y su día 85, la 13 (mes 3).
    expect(mesDe(7, fechaDelDia('MARTES', 7))).toBe(1);
    expect(mesDe(85, fechaDelDia('MARTES', 85))).toBe(3);
  });
});
