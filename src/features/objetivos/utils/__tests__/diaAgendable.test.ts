import { afterEach, describe, expect, it, jest } from '@jest/globals';

import type { DiaDelPlan } from '../../../habits/utils/semanaDelPlan';
import {
  DOMINGO_0030_LIMA,
  DOMINGO_10_LIMA,
  DOMINGO_22_LIMA,
  DOMINGO_2330_LIMA,
  MIERCOLES_10_LIMA,
  MIERCOLES_22_LIMA,
  SABADO_2359_LIMA,
  SABADO_22_LIMA,
  conElRelojEn,
  type ModulosDelPlanificador,
} from './relojDeLima';

/**
 * Qué días se pueden agendar para las acciones del día, con el reloj fijo (ver `relojDeLima`).
 *
 * **La diferencia con `esPlanificable` es un día, y es a propósito.** Aquélla es la regla de los
 * hábitos (D-91: el horario rige desde mañana, sin excepciones); las acciones sí se agendan hoy
 * mientras la ventana nocturna no haya abierto, y el servidor las acepta — es lo que la app venía
 * haciendo y no se podía romper.
 *
 * > **Corregido 2026-09-27 (E-340 del backend).** Esta prueba usaba el reloj real, así que probaba
 * > el día en que se corría y se salteaba los casos que no tocaban: nunca probó un domingo, y el
 * > domingo fallaba (`esPlanificable(HOY)` da `true` porque ese día se dibuja la semana siguiente).
 * > Ese mismo domingo en la app el lunes salía con candado y no se podía agendar.
 */

/** Los días agendables de la fila, en orden. Una sola comparación en vez de siete. */
function agendables({ DIAS_DEL_PLAN, diaAgendable }: ModulosDelPlanificador): DiaDelPlan[] {
  return DIAS_DEL_PLAN.filter(dia => diaAgendable(dia));
}

afterEach(() => {
  jest.useRealTimers();
});

describe('un día de semana: la regla de siempre', () => {
  it('hoy SÍ, antes de las 18:00, y el resto de la semana también: es el "miércoles y jueves" del dueño', () => {
    expect(agendables(conElRelojEn(MIERCOLES_10_LIMA))).toEqual(['MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']);
  });

  it('hoy NO desde las 18:00, aunque en UTC ya sea jueves: a esa hora se planifica el día siguiente', () => {
    expect(agendables(conElRelojEn(MIERCOLES_22_LIMA))).toEqual(['JUE', 'VIE', 'SÁB', 'DOM']);
  });

  it('el miércoles a la noche la fila sigue siendo la semana en curso', () => {
    const { fechasIsoDeLaSemana } = conElRelojEn(MIERCOLES_22_LIMA);
    expect(fechasIsoDeLaSemana().LUN).toBe('2026-09-21');
    expect(fechasIsoDeLaSemana().JUE).toBe('2026-09-24');
  });

  it('NO es la misma regla que la de hábitos: ahí hoy siempre va con candado', () => {
    const { esPlanificable, diaAgendable } = conElRelojEn(MIERCOLES_10_LIMA);
    expect(esPlanificable('MIÉ')).toBe(false);
    expect(diaAgendable('MIÉ')).toBe(true);
  });
});

describe('el sábado a la noche no cambia nada, aunque en UTC ya sea domingo', () => {
  it.each([
    ['22:00', SABADO_22_LIMA],
    ['23:59', SABADO_2359_LIMA],
  ])('a las %s de Lima se agenda solo el domingo de esta semana', (_hora, instante) => {
    const modulos = conElRelojEn(instante);
    expect(agendables(modulos)).toEqual(['DOM']);
    expect(modulos.fechasIsoDeLaSemana().DOM).toBe('2026-09-27');
  });
});

describe('el domingo se agenda el lunes que empieza (E-340 del backend)', () => {
  it.each([
    ['00:30', DOMINGO_0030_LIMA],
    ['10:00', DOMINGO_10_LIMA],
    ['22:00', DOMINGO_22_LIMA],
    ['23:30', DOMINGO_2330_LIMA],
  ])('a las %s de Lima: el lunes sí, y nada más de esa semana', (_hora, instante) => {
    expect(agendables(conElRelojEn(instante))).toEqual(['LUN']);
  });

  it('antes de las 18:00 el lunes se puede y el martes no', () => {
    const { diaAgendable } = conElRelojEn(DOMINGO_10_LIMA);
    expect(diaAgendable('LUN')).toBe(true);
    expect(diaAgendable('MAR')).toBe(false);
  });

  it('desde las 18:00 el lunes se puede y el martes no', () => {
    const { diaAgendable } = conElRelojEn(DOMINGO_22_LIMA);
    expect(diaAgendable('LUN')).toBe(true);
    expect(diaAgendable('MAR')).toBe(false);
  });

  it('el domingo PRÓXIMO no se ofrece: el servidor lo rechaza', () => {
    expect(conElRelojEn(DOMINGO_10_LIMA).diaAgendable('DOM')).toBe(false);
  });

  it('el lunes que se agenda es mañana en hora local, no el de UTC', () => {
    const { fechasIsoDeLaSemana } = conElRelojEn(DOMINGO_22_LIMA);
    expect(fechasIsoDeLaSemana().LUN).toBe('2026-09-28');
    expect(fechasIsoDeLaSemana().MAR).toBe('2026-09-29');
  });

  it('la fecha que se propone a las 22:00 del domingo es el lunes, no el martes', () => {
    expect(conElRelojEn(DOMINGO_22_LIMA).fechaAPlanificar()).toEqual({ fecha: '2026-09-28', esManana: true });
  });
});
