/**
 * Spec 028 (research R5): las alarmas del teléfono con fechas propias —los cambios «solo esta semana»—. Es lo puro: sin
 * librería ni almacenamiento.
 *
 * ## El problema que cierra
 *
 * Una alarma `DAILY` o `WEEKLY` no puede saltarse una fecha: cancelarla borra las de todas las semanas y dejarla la deja
 * sonar a la hora de siempre. Un cambio «solo esta semana» (el sábado a las 09:00 solo este sábado) sonaba igual a las 07:00.
 *
 * ## El arreglo
 *
 * El día de la semana AFECTADO (el que tiene alguna fecha propia vigente) no lleva alarma semanal: lleva alarmas de fecha,
 * una por aviso y por ocurrencia desde hoy hasta la última fecha propia más dos semanas de cola. Los demás días siguen
 * semanales. Sin fechas vigentes, el plan es EXACTAMENTE el de antes.
 *
 * Las pruebas corren en `America/Lima` (jest.config.js). «Hoy» es el martes 20/10/2026.
 */
import { describe, expect, it } from '@jest/globals';

import type { DiaDelHabitoApi, FechaDelHabitoApi } from '../../types/habits.types';
import {
  SEMANAS_DE_COLA,
  TOPE_DE_ALARMAS_DE_FECHA,
  diasPropiosDe,
  fechasPropiasDe,
  fechasVigentes,
  firmaDelPlan,
  hayFechasVigentes,
  planDeAlarmas,
  valoresDelDia,
  type DiaPropio,
  type FechaPropia,
  type PedidoDeAlarmaDelDia,
  type PlanDeAlarmas,
} from '../utils/alarmasPorDia';
import type { CombinacionDeAlarma } from '../utils/combinacionDeAlarma';
import { planDelPuente, puenteQueCorresponde } from '../utils/puenteDeAlarmas';
import { planDeRepeticiones, type EntradaDeRepeticiones } from '../utils/repeticionesDeAlarma';

const HABITO = 'h-gym';
const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const fecha = (y: number, m: number, d: number, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi, 0, 0);
/** Martes 20/10/2026, a la hora que se pida. */
const hoyA = (h: number, mi = 0) => fecha(2026, 10, 20, h, mi);
const MARTES_5AM = hoyA(5, 0);

const c = (sonido: boolean, vibracion: boolean, voz = false, repetir = false): CombinacionDeAlarma => ({
  sonido, vibracion, voz, repetir,
});

/** Una fecha del servidor (`dateOverrides`), con lo que se quiera cambiar. */
function deLaApi(date: string, cambios: Partial<FechaDelHabitoApi> = {}): FechaDelHabitoApi {
  return {
    date,
    weekday: 'SATURDAY',
    triggerTime: '07:00:00',
    active: true,
    reminderEnabled: true,
    reminderMinutesList: [10],
    customTime: false,
    customReminder: false,
    customAlarm: false,
    customDate: true,
    ...cambios,
  };
}

/** Una fecha propia ya leída, sin pasar por el servidor. */
function propia(fechaIso: string, cambios: Partial<FechaPropia> = {}): FechaPropia {
  const [a, m, d] = fechaIso.split('-').map(Number);
  const iso = ((new Date(a, m - 1, d, 12).getDay() + 6) % 7) + 1;
  return { fecha: fechaIso, iso: iso as FechaPropia['iso'], activo: true, hora: null, avisos: null, alarma: null, ...cambios };
}

/** Los siete días del servidor, sin nada propio. */
function semana(cambios: Record<number, Partial<DiaDelHabitoApi>> = {}, hora = '07:00:00'): DiaDelHabitoApi[] {
  return NOMBRES.map((weekday, i) => ({
    weekday, triggerTime: hora, active: true, reminderEnabled: true, reminderMinutesList: [10],
    customTime: false, customReminder: false, ...cambios[i + 1],
  }));
}

const porDia = (plan: PlanDeAlarmas): PedidoDeAlarmaDelDia[] => {
  if (plan.esquema !== 'porDia') throw new Error('se esperaba el esquema por día');
  return plan.pedidos;
};
const deFecha = (plan: PlanDeAlarmas) => porDia(plan).filter(p => p.disparo.tipo === 'fecha');
const semanales = (plan: PlanDeAlarmas) => porDia(plan).filter(p => p.disparo.tipo === 'semanal');
const instante = (p: PedidoDeAlarmaDelDia): number => {
  if (p.disparo.tipo !== 'fecha') throw new Error('se esperaba una alarma de fecha');
  return p.disparo.instanteMs;
};

const entradaDelPlan = (cambios: Partial<Parameters<typeof planDeAlarmas>[0]> = {}) => ({
  habitoId: HABITO,
  horaGeneral: '07:00',
  avisosGenerales: [10],
  dias: null,
  ahora: MARTES_5AM,
  ...cambios,
});

describe('fechasPropiasDe: lo que manda el servidor, leído con tolerancia', () => {
  it('sin nada, o con algo que no es una lista, no hay fechas propias', () => {
    expect(fechasPropiasDe(undefined)).toEqual([]);
    expect(fechasPropiasDe(null)).toEqual([]);
    expect(fechasPropiasDe([])).toEqual([]);
    expect(fechasPropiasDe('no es una lista' as unknown as FechaDelHabitoApi[])).toEqual([]);
  });

  it('una fecha con la hora, el aviso y «cómo suena» propios se lee con su día de la semana ISO', () => {
    const propias = fechasPropiasDe([deLaApi('2026-10-24', {
      customTime: true, triggerTime: '09:00:00',
      customReminder: true, reminderMinutesList: [30, 0],
      customAlarm: true, alarm: { sound: false, vibration: true, voice: false, repeat: true },
    })]);
    expect(propias).toEqual([{
      fecha: '2026-10-24', iso: 6, activo: true, hora: '09:00', avisos: [30, 0], alarma: c(false, true, false, true),
    }]);
  });

  it('lo heredado NO es propio: la hora, el aviso y la alarma resueltos que no son propios salen null (los resuelve el día de la semana)', () => {
    const [f] = fechasPropiasDe([deLaApi('2026-10-24', { customTime: false, customReminder: false, customAlarm: false,
      alarm: { sound: true, vibration: true, voice: false, repeat: false } })]);
    expect(f).toMatchObject({ hora: null, avisos: null, alarma: null });
  });

  it('el endpoint del hábito dice `custom` y la lista `customTime`: se leen los dos', () => {
    expect(fechasPropiasDe([deLaApi('2026-10-24', { customTime: undefined, custom: true, triggerTime: '09:30:00' })])[0].hora).toBe('09:30');
  });

  it('una fecha apagada es una fecha con activo en false; «sin aviso» propio es una lista vacía', () => {
    const [apagada, sinAviso] = fechasPropiasDe([
      deLaApi('2026-10-24', { active: false }),
      deLaApi('2026-10-25', { customReminder: true, reminderEnabled: false, reminderMinutesList: [] }),
    ]);
    expect(apagada.activo).toBe(false);
    expect(sinAviso.avisos).toEqual([]);
  });

  it('un aviso propio activo sin conjunto no se puede leer: se deja heredar el general', () => {
    const [f] = fechasPropiasDe([deLaApi('2026-10-24', { customReminder: true, reminderEnabled: true, reminderMinutesList: null })]);
    expect(f.avisos).toBeNull();
  });

  it('un dato roto se pierde SOLO él: una fecha que no existe se ignora y las demás se leen', () => {
    const propias = fechasPropiasDe([
      deLaApi('2026-02-30'),
      deLaApi('no-es-una-fecha'),
      { weekday: 'SATURDAY' } as FechaDelHabitoApi,
      deLaApi('2026-10-24'),
    ]);
    expect(propias.map(f => f.fecha)).toEqual(['2026-10-24']);
  });

  it('si una fecha se repite manda la última, y salen ordenadas por fecha', () => {
    const propias = fechasPropiasDe([
      deLaApi('2026-10-31', { customTime: true, triggerTime: '10:00:00' }),
      deLaApi('2026-10-24', { customTime: true, triggerTime: '08:00:00' }),
      deLaApi('2026-10-24', { customTime: true, triggerTime: '09:00:00' }),
    ]);
    expect(propias.map(f => [f.fecha, f.hora])).toEqual([['2026-10-24', '09:00'], ['2026-10-31', '10:00']]);
  });

  it('vigente es de hoy en adelante, con la fecha local del teléfono', () => {
    const fechas = [propia('2026-10-19'), propia('2026-10-20'), propia('2026-10-24')];
    expect(fechasVigentes(fechas, hoyA(23, 59)).map(f => f.fecha)).toEqual(['2026-10-20', '2026-10-24']);
    expect(hayFechasVigentes(fechas, fecha(2026, 10, 25, 0, 1))).toBe(false);
    expect(hayFechasVigentes(undefined, MARTES_5AM)).toBe(false);
  });
});

describe('planDeAlarmas: sin fechas vigentes es EXACTAMENTE el de antes (SC-007)', () => {
  it('sin nada propio sigue siendo el esquema diario', () => {
    for (const fechas of [undefined, null, [], [propia('2026-10-19', { hora: '09:00' })]]) {
      expect(planDeAlarmas(entradaDelPlan({ fechas }))).toEqual({ esquema: 'diario' });
    }
  });

  it('con días distintos el plan y su firma son los mismos con o sin fechas pasadas', () => {
    const dias = diasPropiosDe(semana({ 4: { customTime: true, triggerTime: '09:00:00' } }));
    const sin = planDeAlarmas(entradaDelPlan({ dias }));
    const con = planDeAlarmas(entradaDelPlan({ dias, fechas: [propia('2026-10-19', { hora: '10:00' })] }));
    expect(con).toEqual(sin);
    expect(firmaDelPlan(con)).toBe(firmaDelPlan(sin));
  });
});

describe('planDeAlarmas: un día afectado por una fecha propia lleva alarmas de fecha', () => {
  it('el sábado 24 a las 09:00 «a la hora»: ese sábado y los dos siguientes son de fecha, los demás días siguen semanales', () => {
    const plan = planDeAlarmas(entradaDelPlan({
      fechas: [propia('2026-10-24', { hora: '09:00', avisos: [0] })],
    }));
    expect(plan.esquema).toBe('porDia');
    // Los otros seis días: una semanal a las 06:50 con la etiqueta de su día.
    expect(semanales(plan).map(p => p.identificador).sort()).toEqual([1, 2, 3, 4, 5, 7].map(i => `habito-h-gym-d${i}-0`).sort());
    expect(semanales(plan).every(p => p.disparo.tipo === 'semanal' && p.disparo.hora === 6 && p.disparo.minuto === 50)).toBe(true);
    // El sábado: el 24 (propio, 09:00) y los dos de la cola (31 y 7 de noviembre) con lo de siempre (07:00, 10 min antes).
    const sabados = deFecha(plan);
    expect(sabados.map(p => [p.identificador, new Date(instante(p)).getTime()])).toEqual([
      ['habito-h-gym-d6-0', fecha(2026, 10, 24, 9, 0).getTime()],
      ['habito-h-gym-f20261031-0', fecha(2026, 10, 31, 6, 50).getTime()],
      ['habito-h-gym-f20261107-0', fecha(2026, 11, 7, 6, 50).getTime()],
    ]);
    expect(sabados.map(p => p.horaDelDia)).toEqual(['09:00', '07:00', '07:00']);
    expect(sabados.every(p => p.diaIso === 6)).toBe(true);
    // Y NINGUNA semanal del sábado: no podría saltarse esa fecha.
    expect(semanales(plan).some(p => p.diaIso === 6)).toBe(false);
  });

  it('la cola son SEMANAS_DE_COLA semanas después de la última fecha propia de ese día', () => {
    const plan = planDeAlarmas(entradaDelPlan({
      fechas: [propia('2026-10-24', { avisos: [0] }), propia('2026-10-31', { avisos: [0] })],
    }));
    const ultimas = deFecha(plan).map(p => instante(p));
    // 24 y 31 propios (a la hora, «a la hora»), y la cola: 7 y 14 de noviembre con lo de siempre (06:50).
    expect(ultimas).toHaveLength(2 + SEMANAS_DE_COLA);
    expect(Math.max(...ultimas)).toBe(fecha(2026, 11, 14, 6, 50).getTime());
  });

  it('un aviso propio con varias antelaciones: una alarma de fecha por aviso; el primero lleva la etiqueta del push de respaldo', () => {
    const plan = planDeAlarmas(entradaDelPlan({ fechas: [propia('2026-10-24', { avisos: [30, 0] })] }));
    const delPropio = deFecha(plan).filter(p => p.horaDelDia === '07:00').slice(0, 2);
    expect(delPropio.map(p => p.identificador)).toEqual(['habito-h-gym-d6-0', 'habito-h-gym-f20261024-1']);
    expect(delPropio.map(p => p.minutosAntes)).toEqual([30, 0]);
    expect(delPropio.map(p => instante(p))).toEqual([fecha(2026, 10, 24, 6, 30).getTime(), fecha(2026, 10, 24, 7, 0).getTime()]);
  });

  it('«sin aviso» solo esa fecha: ese sábado no suena pero los siguientes sí, con el aviso de siempre', () => {
    const plan = planDeAlarmas(entradaDelPlan({ fechas: [propia('2026-10-24', { avisos: [] })] }));
    // El 24 no está; el primero con etiqueta del push de respaldo es el siguiente sábado.
    expect(deFecha(plan).map(p => new Date(instante(p)).getDate())).toEqual([31, 7]);
    expect(deFecha(plan).map(p => p.identificador)).toEqual(['habito-h-gym-d6-0', 'habito-h-gym-f20261107-0']);
  });

  it('una fecha apagada no suena; la semana siguiente de ese día sí', () => {
    const plan = planDeAlarmas(entradaDelPlan({ fechas: [propia('2026-10-24', { activo: false })] }));
    expect(deFecha(plan).map(p => new Date(instante(p)).getDate())).toEqual([31, 7]);
    expect(deFecha(plan).map(p => p.identificador)).toEqual(['habito-h-gym-d6-0', 'habito-h-gym-f20261107-0']);
  });

  it('«cómo suena» propio de la fecha: solo esa alarma sale por el canal que pide; las demás, la general', () => {
    const plan = planDeAlarmas(entradaDelPlan({
      alarmaGeneral: c(true, true),
      fechas: [propia('2026-10-24', { alarma: c(false, true) })],
    }));
    const [propiaDelDia, ...cola] = deFecha(plan);
    expect(propiaDelDia.alarma).toEqual(c(false, true));
    expect(cola.every(p => p.alarma.sonido)).toBe(true);
    expect(semanales(plan).every(p => p.alarma.sonido && p.alarma.vibracion)).toBe(true);
  });

  it('hoy mismo: una fecha de hoy con la hora cambiada suena a la nueva, y el aviso que ya pasó no se pone', () => {
    const fechas = [propia('2026-10-20', { hora: '08:00', avisos: [60, 0] })];
    const temprano = deFecha(planDeAlarmas(entradaDelPlan({ fechas, ahora: hoyA(5, 0) }))).filter(p => new Date(instante(p)).getDate() === 20);
    expect(temprano.map(p => new Date(instante(p)).getHours() * 100 + new Date(instante(p)).getMinutes())).toEqual([700, 800]);
    // A las 07:30 ya sonó el de 60 min: queda el de la hora.
    const tarde = deFecha(planDeAlarmas(entradaDelPlan({ fechas, ahora: hoyA(7, 30) }))).filter(p => new Date(instante(p)).getDate() === 20);
    expect(tarde).toHaveLength(1);
    expect(tarde[0].minutosAntes).toBe(0);
  });

  it('una fecha de hoy cuyos avisos YA pasaron todos: no pone nada de hoy, y sigue la cola con lo de siempre', () => {
    const plan = planDeAlarmas(entradaDelPlan({ fechas: [propia('2026-10-20', { avisos: [10] })], ahora: hoyA(9, 0) }));
    expect(deFecha(plan).map(p => new Date(instante(p)).getDate())).toEqual([27, 3]);
    // El martes no queda semanal: no podría saltarse el de hoy.
    expect(semanales(plan).some(p => p.diaIso === 2)).toBe(false);
  });

  it('el día de la semana apagado gana a una fecha que dice que va: ese día no suena', () => {
    const plan = planDeAlarmas(entradaDelPlan({
      dias: diasPropiosDe(semana({ 6: { active: false } })),
      fechas: [propia('2026-10-24', { activo: true, hora: '09:00' })],
    }));
    expect(deFecha(plan)).toEqual([]);
    expect(semanales(plan).some(p => p.diaIso === 6)).toBe(false);
  });

  it('la hora propia del día de la semana se respeta en la cola, y la fecha manda ese día', () => {
    const plan = planDeAlarmas(entradaDelPlan({
      dias: diasPropiosDe(semana({ 6: { customTime: true, triggerTime: '08:00:00' } })),
      fechas: [propia('2026-10-24', { hora: '10:00', avisos: [0] })],
    }));
    expect(deFecha(plan).map(p => p.horaDelDia)).toEqual(['10:00', '08:00', '08:00']);
  });

  it('un cambio de hora que espera su fecha (D-91): la cola usa la hora que rija en CADA fecha', () => {
    const plan = planDeAlarmas(entradaDelPlan({
      cambio: { horaDeHoy: '07:00', horaNueva: '09:00', desde: '2026-10-26' },
      horaGeneral: '09:00',
      fechas: [propia('2026-10-24', { avisos: [0] })],
    }));
    // Sábado 24 (antes del cambio): 07:00. Sábados 31 y 7 (después): 09:00. Los demás días esperan su fecha, de fecha también.
    expect(deFecha(plan).filter(p => p.diaIso === 6).map(p => p.horaDelDia)).toEqual(['07:00', '09:00', '09:00']);
  });

  it('la fecha propia con hora gana al cambio pendiente ese día', () => {
    const plan = planDeAlarmas(entradaDelPlan({
      cambio: { horaDeHoy: '07:00', horaNueva: '09:00', desde: '2026-10-26' },
      horaGeneral: '09:00',
      fechas: [propia('2026-10-31', { hora: '11:00', avisos: [0] })],
    }));
    const sabados = deFecha(plan).filter(p => p.diaIso === 6);
    expect(sabados.map(p => [new Date(instante(p)).getDate(), p.horaDelDia])).toEqual([[24, '07:00'], [31, '11:00'], [7, '09:00'], [14, '09:00']]);
  });

  it('el cruce de medianoche: un hábito a las 00:10 con aviso de 30 min suena a las 23:40 del día anterior y sigue siendo del día del hábito', () => {
    const plan = planDeAlarmas(entradaDelPlan({
      horaGeneral: '00:10',
      avisosGenerales: [30],
      fechas: [propia('2026-10-24', { hora: '00:10', avisos: [30] })],
    }));
    const [primera] = deFecha(plan);
    // Suena el viernes 23 a las 23:40, pero es el aviso del SÁBADO 24 (día del hábito) y lleva su etiqueta.
    expect(instante(primera)).toBe(fecha(2026, 10, 23, 23, 40).getTime());
    expect(primera.diaIso).toBe(6);
    expect(primera.identificador).toBe('habito-h-gym-d6-0');
    expect(primera.horaDelDia).toBe('00:10');
  });

  it('el tope: nunca más de TOPE_DE_ALARMAS_DE_FECHA alarmas de fecha, las más próximas primero', () => {
    const fechas = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26']
      .map(f => propia(f, { avisos: [60, 30, 20, 10, 5, 0] }));
    const plan = planDeAlarmas(entradaDelPlan({ fechas }));
    const delPlan = deFecha(plan);
    expect(delPlan).toHaveLength(TOPE_DE_ALARMAS_DE_FECHA);
    // Las 48 más próximas: los 42 avisos propios de la primera semana y los 6 primeros de la cola (uno por día, de siempre).
    expect(delPlan.filter(p => instante(p) < fecha(2026, 10, 27, 0, 0).getTime())).toHaveLength(42);
    expect(Math.max(...delPlan.map(instante))).toBeLessThan(fecha(2026, 11, 2, 0, 0).getTime());
    // Identificadores únicos (programar dos con el mismo se reemplazarían).
    expect(new Set(porDia(plan).map(p => p.identificador)).size).toBe(porDia(plan).length);
  });

  it('los identificadores no se repiten entre las alarmas de fecha de un mismo hábito', () => {
    const plan = planDeAlarmas(entradaDelPlan({
      fechas: [propia('2026-10-24', { avisos: [30, 10, 0] }), propia('2026-10-25', { avisos: [30, 0] })],
    }));
    const ids = porDia(plan).map(p => p.identificador);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('la firma distingue una fecha propia de otra (cambia la alarma de fecha), así que el teléfono se entera de que hay que rehacer', () => {
    const a = planDeAlarmas(entradaDelPlan({ fechas: [propia('2026-10-24', { hora: '09:00' })] }));
    const b = planDeAlarmas(entradaDelPlan({ fechas: [propia('2026-10-24', { hora: '10:00' })] }));
    expect(firmaDelPlan(a)).not.toBe(firmaDelPlan(b));
    expect(firmaDelPlan(a)).toBe(firmaDelPlan(planDeAlarmas(entradaDelPlan({ fechas: [propia('2026-10-24', { hora: '09:00' })] }))));
  });
});

describe('valoresDelDia: una sola cuenta por día', () => {
  const base = { horaGeneral: '07:00', avisosGenerales: [10], dias: null as DiaPropio[] | null };

  it('sin fechas es lo del día de la semana o lo general', () => {
    expect(valoresDelDia(base, fecha(2026, 10, 24, 12))).toEqual({ activo: true, hora: '07:00', avisos: [10], alarma: c(true, true) });
  });

  it('la fecha propia manda campo por campo y deja el resto', () => {
    const v = valoresDelDia({ ...base, fechas: [propia('2026-10-24', { hora: '09:00' })] }, fecha(2026, 10, 24, 12));
    expect(v).toEqual({ activo: true, hora: '09:00', avisos: [10], alarma: c(true, true) });
  });

  it('otra fecha no la afecta', () => {
    const v = valoresDelDia({ ...base, fechas: [propia('2026-10-24', { hora: '09:00' })] }, fecha(2026, 10, 31, 12));
    expect(v.hora).toBe('07:00');
  });
});

describe('el puente de un hábito cumplido (#33) respeta la fecha propia', () => {
  const entrada = (cambios: Partial<EntradaDeRepeticiones> = {}): EntradaDeRepeticiones => ({
    habitoId: HABITO, horaGeneral: '06:30', avisosGenerales: [30, 10, 0], dias: null, alarmaGeneral: null, ...cambios,
  });

  it('mañana con otra hora: el puente de mañana suena a la hora de la fecha propia', () => {
    const plan = planDelPuente(entrada({ fechas: [propia('2026-10-21', { hora: '09:00', avisos: [0] })] }), hoyA(6, 5));
    const manana = plan.pedidos.filter(p => p.fecha === '20261021');
    expect(manana.map(p => [p.horaDelDia, p.minutosAntes, p.instanteMs])).toEqual([['09:00', 0, fecha(2026, 10, 21, 9, 0).getTime()]]);
    // Con fechas vigentes el hábito va por día: los identificadores son los de ese esquema.
    expect(manana[0].identificador).toBe('habito-h-gym-d3-0');
    // Los demás días, la de siempre.
    expect(plan.pedidos.filter(p => p.fecha === '20261022')).toHaveLength(3);
  });

  it('una fecha apagada no tiene puente ese día', () => {
    const plan = planDelPuente(entrada({ fechas: [propia('2026-10-22', { activo: false })] }), hoyA(6, 5));
    expect(plan.pedidos.some(p => p.fecha === '20261022')).toBe(false);
  });

  it('lo que le queda a hoy sale de la fecha de hoy: si ya no tiene aviso, no hace falta puente', () => {
    const fechas = [propia('2026-10-20', { avisos: [] })];
    expect(planDelPuente(entrada({ fechas }), hoyA(5, 0)).quedanHoy).toBe(0);
    expect(puenteQueCorresponde('20261020', entrada({ fechas }), hoyA(5, 0))).toBeNull();
    // Con otra hora hoy, lo que queda cambia.
    expect(planDelPuente(entrada({ fechas: [propia('2026-10-20', { hora: '10:00', avisos: [0] })] }), hoyA(6, 5)).quedanHoy).toBe(1);
  });

  it('sin fechas el puente es el de siempre', () => {
    const sin = planDelPuente(entrada(), hoyA(6, 5));
    expect(planDelPuente(entrada({ fechas: [] }), hoyA(6, 5))).toEqual(sin);
    expect(planDelPuente(entrada({ fechas: [propia('2026-10-19', { hora: '09:00' })] }), hoyA(6, 5))).toEqual(sin);
  });
});

describe('«Repetir si no la atiendo» (spec 009) respeta la fecha propia', () => {
  const entrada = (cambios: Partial<EntradaDeRepeticiones> = {}): EntradaDeRepeticiones => ({
    habitoId: HABITO, horaGeneral: '06:30', avisosGenerales: [0], dias: null, alarmaGeneral: c(true, true, false, true), ...cambios,
  });

  it('la repetición cuelga de la hora de la fecha propia', () => {
    const pedidos = planDeRepeticiones(entrada({ fechas: [propia('2026-10-21', { hora: '09:00' })] }), MARTES_5AM);
    const deMananaHoras = pedidos.filter(p => p.fecha === '20261021');
    expect(deMananaHoras.map(p => [p.horaDelDia, p.minutosDespues])).toEqual([['09:00', 5], ['09:00', 10]]);
  });

  it('una fecha que apaga «Repetir» no repite ese día; una fecha que lo enciende repite aunque el general no', () => {
    const sinRepetir = planDeRepeticiones(entrada({ fechas: [propia('2026-10-21', { alarma: c(true, true, false, false) })] }), MARTES_5AM);
    expect(sinRepetir.some(p => p.fecha === '20261021')).toBe(false);
    expect(sinRepetir.some(p => p.fecha === '20261022')).toBe(true);

    const conRepetir = planDeRepeticiones(
      entrada({ alarmaGeneral: c(true, true), fechas: [propia('2026-10-21', { alarma: c(true, true, false, true) })] }),
      MARTES_5AM,
    );
    expect([...new Set(conRepetir.map(p => p.fecha))]).toEqual(['20261021']);
  });

  it('una fecha apagada o sin aviso no repite', () => {
    const pedidos = planDeRepeticiones(entrada({ fechas: [propia('2026-10-21', { activo: false }), propia('2026-10-22', { avisos: [] })] }), MARTES_5AM);
    expect(pedidos.some(p => p.fecha === '20261021' || p.fecha === '20261022')).toBe(false);
  });

  it('sin fechas es la cuenta de siempre', () => {
    expect(planDeRepeticiones(entrada({ fechas: [] }), MARTES_5AM)).toEqual(planDeRepeticiones(entrada(), MARTES_5AM));
  });
});
