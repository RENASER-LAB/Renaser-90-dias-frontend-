import { describe, expect, it } from '@jest/globals';

import {
  DIAS_DEL_PROGRAMA,
  diasDelProgramaDe,
  estadoDeLaSemana,
  fechasDeLaSemanaDelPrograma,
  fechasDelMes,
  mesAlAbrir,
  mesesDeLaHoja,
  rangoDelMes,
  sePuedeOrganizar,
  semanasDeLaHoja,
  sumarDias,
} from '../mesDelPrograma';

/**
 * E2E de las formaciones (01/11/2026, J2-6): «Planificar mi mes» ofrecía 3 meses a quien tiene un programa de 365 días. Los meses son los del servidor
 * (`duración / 30`: 3 y 12) y todo recibe la duración; sin ella (o con 90) nada cambia.
 */

const UN_LUNES = new Date(2026, 8, 7, 12, 0);
const hoyEnElDia = (dia: number) => sumarDias(UN_LUNES, dia - 1);
const iso = (d: Date | undefined) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null);

describe('los meses de la hoja según la duración', () => {
  it('90 días (o sin dato) son 3; 365 son 12', () => {
    expect(mesesDeLaHoja()).toEqual([1, 2, 3]);
    expect(mesesDeLaHoja(null)).toEqual([1, 2, 3]);
    expect(mesesDeLaHoja(90)).toEqual([1, 2, 3]);
    expect(mesesDeLaHoja(365)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('los días del programa de cada persona: 90 por omisión, 365 como tope', () => {
    expect(diasDelProgramaDe()).toBe(DIAS_DEL_PROGRAMA);
    expect(diasDelProgramaDe(0)).toBe(90);
    expect(diasDelProgramaDe(365)).toBe(365);
    expect(diasDelProgramaDe(9999)).toBe(365);
  });

  it('el mes que se abre es el de la semana de hoy', () => {
    expect(mesAlAbrir(1, hoyEnElDia(1), 365)).toBe(1);
    expect(mesAlAbrir(60, hoyEnElDia(60), 365)).toBe(3); // día 60 = semana 9 = mes 3 (semanas 9 a 13)
    expect(mesAlAbrir(200, hoyEnElDia(200), 365)).toBe(7);
    expect(mesAlAbrir(365, hoyEnElDia(365), 365)).toBe(12);
    // 90 días: igual que siempre.
    expect(mesAlAbrir(90, hoyEnElDia(90), 90)).toBe(3);
    expect(mesAlAbrir(90, hoyEnElDia(90))).toBe(3);
  });
});

describe('las semanas y las fechas de cada mes en un programa de 365 días', () => {
  it('la semana 53 es la última y termina el día 365; la 54 no existe', () => {
    const ultima = fechasDeLaSemanaDelPrograma(53, 365, hoyEnElDia(365), 365);
    expect(iso(ultima?.hasta)).toBe(iso(sumarDias(UN_LUNES, 364)));
    expect(fechasDeLaSemanaDelPrograma(54, 365, hoyEnElDia(365), 365)).toBeNull();
    // Con 90 días la 14 tampoco existe, como siempre.
    expect(fechasDeLaSemanaDelPrograma(14, 60, hoyEnElDia(60))).toBeNull();
  });

  it('el mes 12 tiene las semanas 49 a 53 y sus fechas llegan hasta el día 365', () => {
    const semanas = semanasDeLaHoja(12, 365, hoyEnElDia(365), 365);
    expect(semanas.map(s => s.numero)).toEqual([49, 50, 51, 52, 53]);
    expect(semanas.every(s => s.rango !== null)).toBe(true);
    const mes = fechasDelMes(12, 365, hoyEnElDia(365), 365);
    expect(iso(mes?.hasta)).toBe(iso(sumarDias(UN_LUNES, 364)));
    expect(rangoDelMes(12, 365, hoyEnElDia(365), 365)).toMatch(/ a /);
  });

  it('el mes 3 (días 57 a 90 aprox.) trae las semanas 9 a 13 igual que en 90 días, y el mes 4 empieza en la 14', () => {
    expect(semanasDeLaHoja(3, 60, hoyEnElDia(60), 365).map(s => s.numero)).toEqual([9, 10, 11, 12, 13]);
    expect(semanasDeLaHoja(4, 60, hoyEnElDia(60), 365).map(s => s.numero)).toEqual([14, 15, 16, 17]);
    expect(semanasDeLaHoja(3, 60, hoyEnElDia(60)).map(s => s.numero)).toEqual([9, 10, 11, 12, 13]);
  });

  it('el estado y «organizar» siguen la semana de ahora de ESA duración', () => {
    // Día 60 (lunes + 59 días): semana 9, y no es domingo.
    const hoy = hoyEnElDia(60);
    expect(estadoDeLaSemana(9, 60, hoy, undefined, 365)).toBe('esta-semana');
    expect(estadoDeLaSemana(10, 60, hoy, undefined, 365)).toBe('se-arma-el-domingo');
    expect(sePuedeOrganizar(9, 60, hoy, 365)).toBe(true);
    expect(sePuedeOrganizar(30, 60, hoy, 365)).toBe(false);
  });
});
