/**
 * El plan de alarmas del teléfono por día de la semana (spec 008, E-640). Puro: sin librería ni almacenamiento.
 *
 * Contra el código anterior falla: `alarmasPorDia` no existía y `programar` ponía UNA alarma diaria a la hora
 * GENERAL, así que si el jueves iba a las 09:00 el teléfono sonaba igual a las 07:00.
 *
 * Las pruebas corren en `America/Lima` (jest.config.js).
 */
import { describe, expect, it } from '@jest/globals';

import type { DiaDelHabitoApi } from '../../types/habits.types';
import {
  diasPropiosDe,
  firmaDelPlan,
  identificadorDelAvisoDelDia,
  planDeAlarmas,
  usaEsquemaPorDia,
  weekdayDeExpo,
  type DiaPropio,
  type PedidoDeAlarmaDelDia,
  type PlanDeAlarmas,
} from '../utils/alarmasPorDia';

const HABITO = 'h-gym';

const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

/** Los siete días del servidor, todos sin nada propio, con lo que se quiera cambiar. */
function semana(cambios: Record<number, Partial<DiaDelHabitoApi>> = {}, hora = '07:00:00'): DiaDelHabitoApi[] {
  return NOMBRES.map((weekday, i) => ({
    weekday,
    triggerTime: hora,
    active: true,
    reminderEnabled: true,
    reminderMinutesList: [10],
    customTime: false,
    customReminder: false,
    ...cambios[i + 1],
  }));
}

const porDia = (plan: PlanDeAlarmas): PedidoDeAlarmaDelDia[] => {
  if (plan.esquema !== 'porDia') throw new Error('se esperaba el esquema por día');
  return plan.pedidos;
};

/** Cómo se lee un pedido: «iso-del-hábito id weekdayDeExpo HH:mm». */
function leer(p: PedidoDeAlarmaDelDia): string {
  if (p.disparo.tipo !== 'semanal') throw new Error('se esperaba una alarma semanal');
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${p.identificador} expo${p.disparo.weekday} ${dos(p.disparo.hora)}:${dos(p.disparo.minuto)}`;
}

describe('el esquema lo decide la misma regla que el servidor', () => {
  it('sin nada propio en ningún día (ni apagado) es el esquema diario, como hoy', () => {
    expect(planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [10], dias: diasPropiosDe(semana()) }))
      .toEqual({ esquema: 'diario' });
  });

  it('un backend anterior no manda días: diario', () => {
    for (const dias of [undefined, null, [] as DiaPropio[]]) {
      expect(planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [10], dias }))
        .toEqual({ esquema: 'diario' });
    }
    expect(diasPropiosDe(undefined)).toBeNull();
    expect(diasPropiosDe([])).toBeNull();
  });

  it('un día con hora propia, con aviso propio o apagado pasa al esquema por día', () => {
    expect(usaEsquemaPorDia(diasPropiosDe(semana({ 4: { customTime: true, triggerTime: '09:00:00' } })))).toBe(true);
    expect(usaEsquemaPorDia(diasPropiosDe(semana({ 6: { customReminder: true, reminderMinutesList: [30] } })))).toBe(true);
    expect(usaEsquemaPorDia(diasPropiosDe(semana({ 7: { active: false } })))).toBe(true);
    expect(usaEsquemaPorDia(diasPropiosDe(semana()))).toBe(false);
  });

  it('spec 009: un día con «cómo suena» propio (customAlarm) también lo pasa al esquema por día: es una fila del servidor', () => {
    const propia = { customAlarm: true, alarm: { sound: false, vibration: true, voice: false, repeat: false } };
    expect(usaEsquemaPorDia(diasPropiosDe(semana({ 5: propia })))).toBe(true);
    // Solo importa que sea propia: sin `customAlarm` (o en `false`) el día sigue a la general.
    expect(usaEsquemaPorDia(diasPropiosDe(semana({ 5: { alarm: propia.alarm } })))).toBe(false);
    expect(usaEsquemaPorDia(diasPropiosDe(semana({ 5: { customAlarm: false, alarm: propia.alarm } })))).toBe(false);
    // Y el plan sale por día, con la etiqueta del push de respaldo de cada día (`-d{iso}-0`).
    const plan = planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [10], dias: diasPropiosDe(semana({ 5: propia })) });
    expect(porDia(plan).map(p => p.identificador)).toEqual([1, 2, 3, 4, 5, 6, 7].map(i => `habito-h-gym-d${i}-0`));
  });

  it('el endpoint del hábito dice `custom` y la lista `customTime`: se leen los dos', () => {
    const dia = (d: Partial<DiaDelHabitoApi>) => diasPropiosDe([{ weekday: 'THURSDAY', triggerTime: '09:00:00', ...d }]);
    // `horaResuelta` (E-642) es la hora que el servidor da para ESE día, propia o no.
    expect(dia({ custom: true })).toEqual([{ iso: 4, activo: true, hora: '09:00', horaResuelta: '09:00', avisos: null }]);
    expect(dia({ customTime: true })).toEqual([{ iso: 4, activo: true, hora: '09:00', horaResuelta: '09:00', avisos: null }]);
    expect(dia({ custom: false })).toEqual([{ iso: 4, activo: true, hora: null, horaResuelta: '09:00', avisos: null }]);
  });

  it('un aviso propio sin aviso («sin aviso») es una lista vacía; uno que no se puede leer, el general', () => {
    const dia = (d: Partial<DiaDelHabitoApi>) => diasPropiosDe([{ weekday: 'SUNDAY', customReminder: true, ...d }])?.[0].avisos;
    expect(dia({ reminderEnabled: false, reminderMinutesList: [] })).toEqual([]);
    expect(dia({ reminderEnabled: true, reminderMinutesList: [30, 0] })).toEqual([30, 0]);
    expect(dia({ reminderEnabled: true, reminderMinutesList: null })).toBeNull();
  });

  it('ignora un día con nombre que no conoce', () => {
    expect(diasPropiosDe([{ weekday: 'FUNDAY' }, { weekday: 'MONDAY', active: false }]))
      .toEqual([{ iso: 1, activo: false, hora: null, avisos: null }]);
  });
});

describe('FR-008: cada día suena a SU hora menos SU antelación', () => {
  it('el jueves a las 09:00 «a la hora» y el resto a las 07:00 con 10 min: el jueves una sola alarma a las 09:00, los demás a las 06:50', () => {
    const dias = diasPropiosDe(semana({ 4: { customTime: true, triggerTime: '09:00:00', customReminder: true, reminderMinutesList: [0] } }));
    const pedidos = porDia(planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [10], dias }));
    expect(pedidos.map(leer)).toEqual([
      'habito-h-gym-d1-0 expo2 06:50',
      'habito-h-gym-d2-0 expo3 06:50',
      'habito-h-gym-d3-0 expo4 06:50',
      'habito-h-gym-d4-0 expo5 09:00', // jueves = 5 en expo (1 = domingo)
      'habito-h-gym-d5-0 expo6 06:50',
      'habito-h-gym-d6-0 expo7 06:50',
      'habito-h-gym-d7-0 expo1 06:50',
    ]);
    // Ninguna a las 07:00 (la hora general) en el jueves.
    expect(pedidos.filter(p => p.diaIso === 4)).toHaveLength(1);
  });

  it('sábado y domingo con 30 min y de lunes a viernes con 10 (escenario E1/E4 del quickstart)', () => {
    const dias = diasPropiosDe(semana({
      6: { customReminder: true, reminderMinutesList: [30] },
      7: { customReminder: true, reminderMinutesList: [30] },
    }));
    const pedidos = porDia(planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [10], dias }));
    expect(pedidos.filter(p => p.diaIso >= 6).map(leer)).toEqual([
      'habito-h-gym-d6-0 expo7 06:30',
      'habito-h-gym-d7-0 expo1 06:30',
    ]);
    expect(pedidos.filter(p => p.diaIso <= 5).every(p => leer(p).endsWith('06:50'))).toBe(true);
    // Ninguna a 06:50 los fines de semana.
    expect(pedidos.filter(p => p.diaIso >= 6 && leer(p).endsWith('06:50'))).toHaveLength(0);
  });

  it('un día sin hora propia sigue a la hora general cuando esta cambia; uno con hora propia no', () => {
    // La general pasó a las 08:00: el servidor ya resuelve cada día con ella (menos el que tiene hora propia).
    const dias = diasPropiosDe(semana({ 6: { customTime: true, triggerTime: '09:00:00' } }, '08:00:00'));
    const pedidos = porDia(planDeAlarmas({ habitoId: HABITO, horaGeneral: '08:00', avisosGenerales: [10], dias }));
    expect(leer(pedidos.find(p => p.diaIso === 2)!)).toBe('habito-h-gym-d2-0 expo3 07:50');
    expect(leer(pedidos.find(p => p.diaIso === 6)!)).toBe('habito-h-gym-d6-0 expo7 08:50');
  });

  it('el cuerpo del aviso lleva la hora de ESE día', () => {
    const dias = diasPropiosDe(semana({ 4: { customTime: true, triggerTime: '09:00:00' } }));
    const pedidos = porDia(planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [10], dias }));
    expect(pedidos.find(p => p.diaIso === 4)!.horaDelDia).toBe('09:00');
    expect(pedidos.find(p => p.diaIso === 2)!.horaDelDia).toBe('07:00');
  });

  it('un día apagado no suena', () => {
    const dias = diasPropiosDe(semana({ 7: { active: false } }));
    const pedidos = porDia(planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [10], dias }));
    expect(pedidos.map(p => p.diaIso)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('un día «sin aviso» no suena aunque el general tenga aviso (y los demás sí)', () => {
    const dias = diasPropiosDe(semana({ 7: { customReminder: true, reminderEnabled: false, reminderMinutesList: [] } }));
    const pedidos = porDia(planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [10], dias }));
    expect(pedidos.map(p => p.diaIso)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('con el aviso general apagado, solo suenan los días con aviso propio', () => {
    const dias = diasPropiosDe(semana({ 6: { customReminder: true, reminderMinutesList: [30] } }));
    const pedidos = porDia(planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [], dias }));
    expect(pedidos.map(leer)).toEqual(['habito-h-gym-d6-0 expo7 06:30']);
  });

  it('varias antelaciones en un día: suenan las dos, la más temprana es la -0', () => {
    const dias = diasPropiosDe(semana({ 4: { customReminder: true, reminderMinutesList: [0, 30] } }));
    const pedidos = porDia(planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [10], dias }));
    expect(pedidos.filter(p => p.diaIso === 4).map(leer)).toEqual([
      'habito-h-gym-d4-0 expo5 06:30',
      'habito-h-gym-d4-1 expo5 07:00',
    ]);
  });

  it('sin hora general ni propia, el día no suena; con hora propia sí', () => {
    // Sin hora general el servidor no resuelve hora para los días sin la suya (`triggerTime: null`).
    const dias = diasPropiosDe(NOMBRES.map(weekday => weekday === 'WEDNESDAY'
      ? { weekday, triggerTime: '18:30:00', active: true, reminderEnabled: true, reminderMinutesList: [10], customTime: true }
      : { weekday, triggerTime: null, active: true, reminderEnabled: true, reminderMinutesList: [10], customTime: false }));
    const pedidos = porDia(planDeAlarmas({ habitoId: HABITO, horaGeneral: null, avisosGenerales: [10], dias }));
    expect(pedidos.map(leer)).toEqual(['habito-h-gym-d3-0 expo4 18:20']);
  });
});

describe('el cruce de la medianoche', () => {
  it('00:10 con 30 min antes: suena el día ANTERIOR a las 23:40 y cuenta como aviso del día del hábito', () => {
    const dias = diasPropiosDe(semana({ 4: { customTime: true, triggerTime: '00:10:00', customReminder: true, reminderMinutesList: [30] } }));
    const jueves = porDia(planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [10], dias }))
      .find(p => p.diaIso === 4)!;
    // Miércoles = 4 en expo.
    expect(leer(jueves)).toBe('habito-h-gym-d4-0 expo4 23:40');
    expect(jueves.horaDelDia).toBe('00:10');
  });

  it('el lunes cruza al domingo y el domingo al sábado', () => {
    const dias = diasPropiosDe(semana({}, '00:10:00').map(d => d.weekday === 'FRIDAY' ? { ...d, active: false } : d));
    const pedidos = porDia(planDeAlarmas({ habitoId: HABITO, horaGeneral: '00:10', avisosGenerales: [30], dias }));
    expect(leer(pedidos.find(p => p.diaIso === 1)!)).toBe('habito-h-gym-d1-0 expo1 23:40'); // lunes → domingo
    expect(leer(pedidos.find(p => p.diaIso === 7)!)).toBe('habito-h-gym-d7-0 expo7 23:40'); // domingo → sábado
  });

  it('una antelación de más de un día cruza más de una vez', () => {
    const dias = diasPropiosDe(semana({ 4: { customReminder: true, reminderMinutesList: [1440 + 60] } }));
    const jueves = porDia(planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [10], dias }))
      .find(p => p.diaIso === 4)!;
    // 07:00 del jueves menos 25 h = 06:00 del miércoles.
    expect(leer(jueves)).toBe('habito-h-gym-d4-0 expo4 06:00');
  });
});

describe('identificadores y firma estables', () => {
  it('las mismas entradas dan los mismos identificadores y la misma firma, en cualquier orden de antelaciones', () => {
    const dias = diasPropiosDe(semana({ 4: { customReminder: true, reminderMinutesList: [0, 30] } }));
    const a = planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [10, 30], dias });
    const b = planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [30, 10], dias: diasPropiosDe(semana({ 4: { customReminder: true, reminderMinutesList: [30, 0] } })) });
    expect(porDia(a).map(p => p.identificador)).toEqual(porDia(b).map(p => p.identificador));
    expect(firmaDelPlan(a)).toBe(firmaDelPlan(b));
  });

  it('cambiar la hora o el aviso de un día cambia la firma', () => {
    const base = diasPropiosDe(semana({ 4: { customReminder: true, reminderMinutesList: [0] } }));
    const otra = diasPropiosDe(semana({ 4: { customReminder: true, reminderMinutesList: [30] } }));
    const a = planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [10], dias: base });
    const b = planDeAlarmas({ habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [10], dias: otra });
    // La general a las 08:00 (el servidor resuelve los días con ella): otra hora, otra firma.
    const c = planDeAlarmas({
      habitoId: HABITO, horaGeneral: '08:00', avisosGenerales: [10],
      dias: diasPropiosDe(semana({ 4: { customReminder: true, reminderMinutesList: [0] } }, '08:00:00')),
    });
    expect(firmaDelPlan(a)).not.toBe(firmaDelPlan(b));
    expect(firmaDelPlan(a)).not.toBe(firmaDelPlan(c));
    expect(firmaDelPlan({ esquema: 'diario' })).toBe('diario');
  });

  it('el identificador de la más temprana de cada día es el que el servidor pone como etiqueta de su push', () => {
    expect(identificadorDelAvisoDelDia('h-1', 6, 0)).toBe('habito-h-1-d6-0');
    expect([1, 2, 3, 4, 5, 6, 7].map(i => weekdayDeExpo(i as 1))).toEqual([2, 3, 4, 5, 6, 7, 1]);
  });
});

describe('el cambio de hora general que rige desde mañana (D-91)', () => {
  // Martes 20/10/2026, hora de Lima.
  const martes = (h: number, m = 0) => new Date(2026, 9, 20, h, m, 0, 0);
  const cambio = { horaDeHoy: '07:00', horaNueva: '08:00', desde: '2026-10-21' };

  it('los días que siguen la hora general llevan la próxima alarma de FECHA, a la hora que rige en esa fecha', () => {
    const dias = diasPropiosDe(semana({ 6: { customTime: true, triggerTime: '09:00:00' } }));
    const pedidos = porDia(planDeAlarmas({
      habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [0], dias, cambio, ahora: martes(6),
    }));
    const fecha = (iso: number) => {
      const p = pedidos.find(x => x.diaIso === iso)!;
      if (p.disparo.tipo !== 'fecha') throw new Error(`el día ${iso} debía ser de fecha`);
      return new Date(p.disparo.instanteMs);
    };
    // Hoy martes, antes del cambio y todavía por sonar: a las 07:00 de hoy.
    expect(fecha(2)).toEqual(new Date(2026, 9, 20, 7, 0));
    // El miércoles ya rige la hora nueva.
    expect(fecha(3)).toEqual(new Date(2026, 9, 21, 8, 0));
    // El lunes siguiente, también.
    expect(fecha(1)).toEqual(new Date(2026, 9, 26, 8, 0));
    // Con hora propia, el cambio general no la toca: sigue siendo semanal a las 09:00.
    expect(leer(pedidos.find(p => p.diaIso === 6)!)).toBe('habito-h-gym-d6-0 expo7 09:00');
  });

  it('hoy ya pasó la hora de hoy: el martes va a la semana que viene, con la hora nueva', () => {
    const dias = diasPropiosDe(semana({ 6: { customTime: true, triggerTime: '09:00:00' } }));
    const pedidos = porDia(planDeAlarmas({
      habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [0], dias, cambio, ahora: martes(10),
    }));
    const martesSiguiente = pedidos.find(x => x.diaIso === 2)!;
    expect(martesSiguiente.disparo).toEqual({ tipo: 'fecha', instanteMs: new Date(2026, 9, 27, 8, 0).getTime() });
    expect(martesSiguiente.horaDelDia).toBe('08:00');
  });

  it('un cambio que ya rige no pide alarmas de fecha: todo semanal a la hora nueva', () => {
    const dias = diasPropiosDe(semana({ 6: { customTime: true, triggerTime: '09:00:00' } }));
    const pedidos = porDia(planDeAlarmas({
      habitoId: HABITO, horaGeneral: '07:00', avisosGenerales: [0], dias,
      cambio: { ...cambio, desde: '2026-10-20' }, ahora: martes(10),
    }));
    expect(pedidos.every(p => p.disparo.tipo === 'semanal')).toBe(true);
    expect(leer(pedidos.find(p => p.diaIso === 2)!)).toBe('habito-h-gym-d2-0 expo3 08:00');
  });
});

describe('E-642: un día sin hora propia usa la hora que el servidor resuelve PARA ESE DÍA, no la de hoy', () => {
  /**
   * El bug del E2E: `GET /habit-preferences` trae arriba `triggerTime` resuelta para HOY. Hoy martes tiene hora
   * propia (11:29), así que esa «hora general» era la del martes, y el sábado —sin hora propia, a las 07:00— quedó
   * a las 10:59 (11:29 menos 30 min). Los demás días ya traen la hora correcta en `weekdays[i].triggerTime`.
   */
  const conHoyDistinta = () => diasPropiosDe(semana({ 2: { customTime: true, triggerTime: '11:29:00' } }));

  it('el sábado sigue a las 07:00 (06:30 con 30 min antes) aunque la de arriba sea la del martes', () => {
    const pedidos = porDia(planDeAlarmas({ habitoId: HABITO, horaGeneral: '11:29', avisosGenerales: [30], dias: conHoyDistinta() }));
    const de = (iso: number) => leer(pedidos.find(p => p.diaIso === iso)!);
    expect(de(6)).toBe('habito-h-gym-d6-0 expo7 06:30');
    expect(de(2)).toBe('habito-h-gym-d2-0 expo3 10:59');
    // Todos los demás, a su hora.
    expect(pedidos.filter(p => p.diaIso !== 2).every(p => leer(p).endsWith('06:30'))).toBe(true);
    expect(pedidos.find(p => p.diaIso === 6)!.horaDelDia).toBe('07:00');
  });

  it('con un cambio de hora general pendiente, hasta su fecha cada día sigue a SU hora y desde la fecha va la nueva', () => {
    const ahora = new Date(2026, 9, 20, 6, 0); // martes
    const plan = planDeAlarmas({
      habitoId: HABITO, horaGeneral: '11:29', avisosGenerales: [30], dias: conHoyDistinta(),
      cambio: { horaDeHoy: '11:29', horaNueva: '09:00', desde: '2026-10-24' }, ahora,
    });
    const sabado = porDia(plan).find(p => p.diaIso === 6)!;
    // El sábado 24 ya rige la hora nueva.
    expect(sabado.disparo).toEqual({ tipo: 'fecha', instanteMs: new Date(2026, 9, 24, 8, 30).getTime() });
    const viernes = porDia(plan).find(p => p.diaIso === 5)!;
    // El viernes 23 todavía va a su hora de siempre (07:00), no a la del martes.
    expect(viernes.disparo).toEqual({ tipo: 'fecha', instanteMs: new Date(2026, 9, 23, 6, 30).getTime() });
  });

  it('sin la hora resuelta del día (un backend que no la informa) se usa la general, como antes', () => {
    const dias = [{ iso: 6 as const, activo: true, hora: null, avisos: [30] }];
    const pedidos = porDia(planDeAlarmas({ habitoId: HABITO, horaGeneral: '08:00', avisosGenerales: [10], dias }));
    expect(leer(pedidos.find(p => p.diaIso === 6)!)).toBe('habito-h-gym-d6-0 expo7 07:30');
  });
});
