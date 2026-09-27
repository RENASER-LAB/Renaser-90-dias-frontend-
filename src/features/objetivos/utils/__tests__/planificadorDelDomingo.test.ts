import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
  DOMINGO_10_LIMA,
  DOMINGO_22_LIMA,
  DOMINGO_2330_LIMA,
  MIERCOLES_10_LIMA,
  MIERCOLES_22_LIMA,
  conElRelojEn,
} from './relojDeLima';

/**
 * El camino completo del domingo, más allá del candado (que prueba `diaAgendable.test.ts`): en qué
 * día arranca el planificador de acciones, qué fecha manda, qué dice la pantalla y qué se contesta
 * si falta el plan de la semana que empieza. E-340 del backend: el domingo se planifica el lunes.
 */

afterEach(() => {
  jest.useRealTimers();
});

describe('qué día y qué fecha se agenda el domingo', () => {
  it.each([
    ['10:00', DOMINGO_10_LIMA],
    ['22:00', DOMINGO_22_LIMA],
  ])('a las %s de Lima el planificador arranca en el lunes, agendable, y manda 2026-09-28', (_hora, instante) => {
    const { diaInicialDelPlanificador, fechaAPlanificar, fechasIsoDeLaSemana, diaAgendable } = conElRelojEn(instante);
    const dia = diaInicialDelPlanificador(fechaAPlanificar().fecha);
    expect(dia).toBe('LUN');
    expect(diaAgendable(dia)).toBe(true);
    expect(fechasIsoDeLaSemana()[dia]).toBe('2026-09-28');
  });

  it('un día de semana a la noche arranca en mañana, como siempre', () => {
    const { diaInicialDelPlanificador, fechaAPlanificar, fechasIsoDeLaSemana } = conElRelojEn(MIERCOLES_22_LIMA);
    const dia = diaInicialDelPlanificador(fechaAPlanificar().fecha);
    expect(dia).toBe('JUE');
    expect(fechasIsoDeLaSemana()[dia]).toBe('2026-09-24');
  });
});

describe('lo que dice la pantalla', () => {
  it('el domingo no promete "cualquier día que quede de la semana": nombra el lunes', () => {
    const { textoDeLaFilaDeDias, textoParaEmpezarAAgendar } = conElRelojEn(DOMINGO_22_LIMA);
    expect(textoDeLaFilaDeDias()).not.toMatch(/cualquier día/);
    expect(textoDeLaFilaDeDias()).toMatch(/lunes/);
    expect(textoParaEmpezarAAgendar()).not.toMatch(/cada día que quede/);
    expect(textoParaEmpezarAAgendar()).toMatch(/lunes/);
  });

  it('un día de semana dice lo mismo que antes', () => {
    const { textoDeLaFilaDeDias, textoParaEmpezarAAgendar } = conElRelojEn(MIERCOLES_10_LIMA);
    expect(textoDeLaFilaDeDias()).toBe(
      'Puedes agendar cualquier día que quede de la semana, y corregirlo hasta que llegue. La semana que viene se arma el domingo.'
    );
    expect(textoParaEmpezarAAgendar()).toBe(
      'Elige cuáles caen cada día que quede de la semana, y a qué hora. Desde las 18:00 el día en curso ya no se reacomoda.'
    );
  });
});

describe('sin el plan de la semana que empieza (NO_WEEKLY_ROCK)', () => {
  it.each([
    ['10:00', DOMINGO_10_LIMA],
    ['22:00', DOMINGO_22_LIMA],
    ['23:30', DOMINGO_2330_LIMA],
  ])('el domingo a las %s de Lima manda a armar la semana que empieza', (_hora, instante) => {
    const { mensajeSinPlanSemanal } = conElRelojEn(instante);
    expect(mensajeSinPlanSemanal('2026-09-28')).toBe(
      'Todavía no armaste tu plan de la semana que empieza el lunes, y las acciones del lunes salen de ahí. Ármalo primero y vuelve a agendarlas.'
    );
  });

  it('un día de semana pide el plan de esta semana, como antes', () => {
    const { mensajeSinPlanSemanal } = conElRelojEn(MIERCOLES_22_LIMA);
    expect(mensajeSinPlanSemanal('2026-09-25')).toBe('Primero arma tu plan de la semana: las acciones salen de ahí.');
  });
});
