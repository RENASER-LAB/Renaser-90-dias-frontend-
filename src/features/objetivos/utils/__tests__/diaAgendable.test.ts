import { describe, expect, it } from '@jest/globals';

import { DIAS_DEL_PLAN, INDICE_DE_HOY, esPlanificable } from '../../../habits/utils/semanaDelPlan';
import { diaAgendable } from '../ventanasDePlanificacion';

const HOY = DIAS_DEL_PLAN[INDICE_DE_HOY];
const manana = () => DIAS_DEL_PLAN[INDICE_DE_HOY + 1];

const aLas = (hora: number) => {
  const d = new Date();
  d.setHours(hora, 0, 0, 0);
  return d;
};

/**
 * Qué días se pueden agendar para las acciones del día.
 *
 * **La diferencia con `esPlanificable` es un día, y es a propósito.** Aquélla es la regla de los
 * hábitos (D-91: el horario rige desde mañana, sin excepciones); las acciones sí se agendan hoy
 * mientras la ventana nocturna no haya abierto, y el servidor las acepta — es lo que la app venía
 * haciendo y no se podía romper.
 */
describe('diaAgendable', () => {
  it('hoy SÍ, antes de las 18:00', () => {
    expect(diaAgendable(HOY, aLas(10))).toBe(true);
  });

  it('hoy NO, desde las 18:00: a esa hora el programa ya planifica el día siguiente', () => {
    expect(diaAgendable(HOY, aLas(18))).toBe(false);
    expect(diaAgendable(HOY, aLas(21))).toBe(false);
  });

  it('los días que ya pasaron, nunca', () => {
    if (INDICE_DE_HOY === 0) return; // lunes: no hay día anterior en la semana mostrada
    expect(diaAgendable(DIAS_DEL_PLAN[INDICE_DE_HOY - 1], aLas(10))).toBe(false);
  });

  it('el resto de la semana sí: es el "miércoles y jueves" del dueño', () => {
    if (INDICE_DE_HOY >= DIAS_DEL_PLAN.length - 1) return; // domingo: no queda semana
    expect(diaAgendable(manana(), aLas(10))).toBe(true);
    expect(diaAgendable(DIAS_DEL_PLAN[DIAS_DEL_PLAN.length - 1], aLas(10))).toBe(true);
  });

  it('NO es la misma regla que la de hábitos: ahí hoy siempre va con candado', () => {
    expect(esPlanificable(HOY)).toBe(false);
    expect(diaAgendable(HOY, aLas(10))).toBe(true);
  });
});
