import { describe, expect, it } from '@jest/globals';

import {
  etiquetaDelMes,
  mesDe,
  mesDeLaSemana,
  mesesDelProgramaDe,
  semanaAPlanificar,
  semanaDe,
  semanasDelMes,
  semanasDelProgramaDe,
} from '../periodoDelPrograma';

/**
 * Spec 026 (tras la 022): las semanas y los meses del plan siguen la duración del programa de CADA persona, igual que `SemanaPrograma` del backend:
 * 13 semanas con 90 días y 53 con 365 (la última llega hasta el último día). Sin duración —un backend anterior— todo es lo de siempre.
 */

/** Un lunes cualquiera; la cuenta solo mira el día de la semana de «hoy». */
const LUNES = new Date(2026, 8, 7, 12);
const dia = (n: number) => new Date(2026, 8, 7 + n, 12);

describe('las semanas del programa de cada persona', () => {
  it('90 días son 13 semanas y 365 son 53; sin dato, las de siempre', () => {
    expect(semanasDelProgramaDe(90)).toBe(13);
    expect(semanasDelProgramaDe(365)).toBe(53);
    expect(semanasDelProgramaDe(undefined)).toBe(13);
    expect(semanasDelProgramaDe(null)).toBe(13);
    expect(semanasDelProgramaDe(0)).toBe(13);
    expect(semanasDelProgramaDe(9999)).toBe(53);
  });

  it('los meses son los del servidor (duración / 30): 3 en 90 días y 12 en 365', () => {
    expect(mesesDelProgramaDe(90)).toBe(3);
    expect(mesesDelProgramaDe(365)).toBe(12);
    expect(mesesDelProgramaDe(180)).toBe(6);
    expect(mesesDelProgramaDe(10)).toBe(1);
    expect(mesesDelProgramaDe(undefined)).toBe(3);
    expect(mesesDelProgramaDe(0)).toBe(3);
    expect(mesesDelProgramaDe(9999)).toBe(12);
  });

  it('empezando un lunes con 365 días, el día 365 es la semana 53 y el 364 todavía la 53 (nunca la 54)', () => {
    // El día n del programa cae n-1 días después del lunes del día 1: hoy = lunes + (n-1).
    expect(semanaDe(365, dia(364), 365)).toBe(53);
    expect(semanaDe(364, dia(363), 365)).toBe(52);
    expect(semanaDe(360, dia(359), 365)).toBe(52);
    expect(semanaDe(8, dia(7), 365)).toBe(2);
    expect(semanaDe(90, dia(89), 365)).toBe(13);
  });

  it('con 90 días (o sin dato) la cuenta no cambia: el día 90 es la 13', () => {
    expect(semanaDe(90, dia(89), 90)).toBe(13);
    expect(semanaDe(90, dia(89))).toBe(13);
    expect(semanaDe(1, LUNES, 90)).toBe(1);
    expect(semanaDe(0, LUNES, 365)).toBe(1);
  });

  it('el domingo prepara la semana siguiente, sin pasar de la última de ESA duración', () => {
    // Domingo del día 7 de quien empezó un lunes: prepara la 2.
    expect(semanaAPlanificar(7, dia(6), 365)).toBe(2);
    // Un domingo dentro de la 13 pide la 14 en un programa de un año (y la 13 en uno de 90).
    const domingoDeLaTrece = dia(12 * 7 + 6);
    expect(semanaAPlanificar(12 * 7 + 7, domingoDeLaTrece, 365)).toBe(14);
    expect(semanaAPlanificar(12 * 7 + 7, domingoDeLaTrece, 90)).toBe(13);
  });

  it('las semanas se reparten parejo entre los meses: 4, 4 y 5 en 90 días (como siempre); 12 meses de 4 o 5 semanas en 365, hasta la 53', () => {
    expect(semanasDelMes(1, 90)).toEqual([1, 2, 3, 4]);
    expect(semanasDelMes(2, 90)).toEqual([5, 6, 7, 8]);
    expect(semanasDelMes(3, 90)).toEqual([9, 10, 11, 12, 13]);
    expect(semanasDelMes(1, 365)).toEqual([1, 2, 3, 4]);
    expect(semanasDelMes(3, 365)).toEqual([9, 10, 11, 12, 13]);
    expect(semanasDelMes(12, 365)).toEqual([49, 50, 51, 52, 53]);
    expect(mesDeLaSemana(53, 365)).toBe(12);
    expect(mesDeLaSemana(13, 90)).toBe(3);
    expect(mesDeLaSemana(13, 365)).toBe(3);
    expect(mesDeLaSemana(14, 365)).toBe(4);
    expect(mesDe(365, dia(364), 365)).toBe(12);
    expect(etiquetaDelMes(3)).toBe('Mes 3 · Semanas 9 a 13');
    expect(etiquetaDelMes(12, 365)).toBe('Mes 12 · Semanas 49 a 53');
  });

  it('en 365 días cada semana es de un mes, los 12 meses no dejan huecos ni se cruzan, y cada semana cae en el mes que la contiene', () => {
    const vistas: number[] = [];
    for (let mes = 1; mes <= 12; mes += 1) {
      const semanas = semanasDelMes(mes, 365);
      expect(semanas.length).toBeGreaterThanOrEqual(4);
      expect(semanas.length).toBeLessThanOrEqual(5);
      for (const semana of semanas) expect(mesDeLaSemana(semana, 365)).toBe(mes);
      vistas.push(...semanas);
    }
    expect(vistas).toEqual(Array.from({ length: 53 }, (_, i) => i + 1));
  });

  it('el mes de las semanas de un programa de 90 días no cambia respecto de los bloques de cuatro semanas de siempre', () => {
    const deSiempre = (semana: number) => Math.min(Math.ceil(semana / 4), 3);
    for (let semana = 1; semana <= 13; semana += 1) expect(mesDeLaSemana(semana, 90)).toBe(deSiempre(semana));
  });
});
