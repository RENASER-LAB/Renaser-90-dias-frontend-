/**
 * De dónde sale que un hábito esté pausado HOY (caso 7, «Pausar solo hoy»): `itemsDeHoy` mira `diasCatalogo[hoy]`
 * (`HabitItem.diasCatalogo` = `PlanHabit.days`), y esos siete días los arma `cargarPlanHabitos` con `fechasIsoDeLaSemana()` y
 * `aFechaIso(new Date())` (`habits/utils/semanaDelPlan`). Esta prueba carga ese camino de verdad (solo la red es un doble)
 * con el reloj del teléfono en fechas fijas.
 *
 * Hay dos bugs CONOCIDOS acá, ambos del calendario del PLAN reusado por Training (no de `itemsDelDia`), y por eso están
 * como `it.failing`: pasan mientras el bug exista y fallarán cuando se arregle (entonces, cambiarlos por `it`).
 *
 * 1. **Domingo**: `fechasIsoDeLaSemana()` devuelve la semana SIGUIENTE (la que Plan planifica), así que la pausa de hoy
 *    (domingo) no cae en ninguno de los siete días y `days.DOM` queda en `true`.
 * 2. **App abierta varios días**: `INDICE_DE_HOY` y `MOSTRAR_SEMANA_SIGUIENTE` son constantes de MÓDULO, calculadas al
 *    importar. Con el proceso vivo de un día para otro, el "lunes" que se arma queda corrido y cada pausa cae en el día
 *    equivocado de la semana.
 *
 * Consecuencia en Training: una pausa guardada DESPUÉS de generarse el registro de hoy (pendiente) no lo esconde hoy.
 * (Si el servidor ya no genera el registro de un hábito pausado, no se nota; es la segunda defensa que dice `itemsDeHoy`.)
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { PlanHabit } from '../../../../screens/PlanScreen';
import type { DesbloqueoHabitoApi } from '../../../habits/types/habits.types';
import type { HabitItem } from '../../../../screens/TrainingScreen';
import { itemsDeHoy } from '../itemsDelDia';

const mockDesbloqueo: { actual: DesbloqueoHabitoApi } = {
  actual: { habitId: 'h1', unlockDay: 1, chosenAt: null, paused: true, pausedUntil: null },
};
const mockCatalogo = [
  {
    id: 'h1',
    title: 'Agua tibia',
    category: 'BODY',
    iconKey: null,
    description: null,
    isOptional: false,
    isDeactivatable: true,
    locked: false,
    unlockDay: 1,
    daysUntilUnlock: 0,
    activeWeekdays: [],
    systemKey: null,
  },
];
jest.mock('../../../habits/api/habitsApi', () => ({
  obtenerCatalogo: async () => mockCatalogo,
  obtenerPreferencias: async () => [],
  obtenerPlanDesbloqueos: async () => ({ enabled: true, items: [mockDesbloqueo.actual] }),
}));

type CargarPlan = (catalogo?: Promise<unknown[]>) => Promise<PlanHabit[]>;

/**
 * Importa el módulo del plan con el reloj del teléfono en `alCargar` (ahí se fijan sus constantes de módulo) y lee el plan
 * con el reloj en `alLeer`. Dos instantes distintos = una app que lleva abierta varios días.
 */
async function leerElPlan(alCargar: string, alLeer: string, pausadoHasta: string | null): Promise<PlanHabit> {
  mockDesbloqueo.actual = { habitId: 'h1', unlockDay: 1, chosenAt: null, paused: true, pausedUntil: pausadoHasta };
  jest.setSystemTime(new Date(alCargar));
  let cargar!: CargarPlan;
  jest.isolateModules(() => {
    cargar = (require('../../../habits/hooks/usePlanHabitos') as { cargarPlanHabitos: CargarPlan }).cargarPlanHabitos;
  });
  jest.setSystemTime(new Date(alLeer));
  const [habito] = await cargar();
  return habito;
}

const THURSDAY = '2026-10-29T15:00:00Z'; // jueves 29/10, 10:00 en Lima
const MONDAY = '2026-10-26T15:00:00Z'; // lunes 26/10
const SUNDAY = '2026-11-01T15:00:00Z'; // domingo 1/11

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

/** Lo que `itemsDeHoy` hace con esos días: ¿el hábito de hoy sale como pausado? */
const pausadoHoy = (plan: PlanHabit, hoyIso: string): boolean => {
  const habito = {
    id: 'r1', habitoId: 'h1', dimension: 'CUERPO', title: 'Agua tibia', time: '07:00', tag: 'Innegociable', streak: null,
    done: false, hasEvidence: false, tieneTrackHoy: true, estado: 'PENDIENTE', diasCatalogo: plan.days,
  } as HabitItem;
  return itemsDeHoy([habito], [], { hoyIso, zona: 'America/Lima', titulos: {} })[0].pausado === true;
};

describe('caso 7 · de dónde sale «pausado hoy» (cargarPlanHabitos → days → itemsDeHoy)', () => {
  it('PAUSA (control): un jueves, con la app abierta ese mismo día, «solo hoy» apaga el jueves y nada más → pausado', async () => {
    const plan = await leerElPlan(THURSDAY, THURSDAY, '2026-10-29');
    expect(plan.days).toEqual({ LUN: true, MAR: true, 'MIÉ': true, JUE: false, VIE: true, 'SÁB': true, DOM: true });
    expect(pausadoHoy(plan, '2026-10-29')).toBe(true);
    // Al día siguiente la misma pausa ya no cuenta: el viernes aparece.
    expect(pausadoHoy(plan, '2026-10-30')).toBe(false);
  });

  it('PAUSA (lo que Plan necesita): un domingo la fila de Plan es la semana SIGUIENTE, y «hasta el miércoles» apaga lunes a miércoles', async () => {
    const plan = await leerElPlan(SUNDAY, SUNDAY, '2026-11-04');
    expect(plan.days).toEqual({ LUN: false, MAR: false, 'MIÉ': false, JUE: true, VIE: true, 'SÁB': true, DOM: true });
  });

  it.failing('BUG CONOCIDO · DOMINGO: «solo hoy» un domingo debe marcar el domingo como pausado (hoy), no quedar en `true`', async () => {
    const plan = await leerElPlan(SUNDAY, SUNDAY, '2026-11-01');
    expect(pausadoHoy(plan, '2026-11-01')).toBe(true);
  });

  it.failing('BUG CONOCIDO · APP ABIERTA DE LUNES A JUEVES: «solo hoy» el jueves debe apagar el jueves, no el lunes', async () => {
    const plan = await leerElPlan(MONDAY, THURSDAY, '2026-10-29');
    expect(plan.days.JUE).toBe(false);
    expect(plan.days.LUN).toBe(true);
  });
});
