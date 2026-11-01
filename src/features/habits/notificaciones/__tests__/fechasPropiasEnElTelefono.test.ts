/**
 * Spec 028 (research R5): las alarmas del teléfono respetan los cambios «solo esta semana» (`dateOverrides` de
 * `GET /habit-preferences`), contra la librería de mentira.
 *
 * ## El bug que cierra
 *
 * Una alarma `WEEKLY` no se puede saltar una fecha: el sábado a las 09:00 solo ESTE sábado sonaba igual a las 07:00 (la semanal
 * de siempre), y cancelar la semanal habría borrado también los sábados que siguen. Ahora el día afectado lleva alarmas de fecha
 * (una por aviso y por sábado, hasta la última fecha propia más dos semanas de cola) y los demás días siguen semanales; cuando ya
 * no hay fechas propias vigentes, la puesta al día que corre al abrir la app lo deja como estaba.
 *
 * La librería de mentira hace lo que la de verdad en Android: programar con un identificador existente lo reemplaza, cancelar lo
 * quita y la lista sale con la forma de `getAllScheduledNotificationsAsync` (`value` en las de fecha).
 *
 * Las pruebas corren en `America/Lima` (jest.config.js) y con el reloj en el martes 20/10/2026.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Pedido = {
  identifier?: string;
  content: { title?: string | null; body?: string | null; data?: Record<string, unknown>; sound?: unknown };
  trigger: Record<string, unknown>;
};
type Programada = Pedido & { identifier: string };

const mockLista = new Map<string, Programada>();
const mockEstado = { siguiente: 1, permiso: true };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (p: Pedido) => {
    const identifier = p.identifier ?? `uuid-${String(mockEstado.siguiente++).padStart(3, '0')}`;
    const t = p.trigger;
    // Como la librería de verdad: una alarma de fecha vuelve con su instante en `value`.
    const trigger = t.type === 'date'
      ? { type: 'date', value: t.date instanceof Date ? t.date.getTime() : t.date, channelId: t.channelId }
      : { ...t };
    mockLista.set(identifier, { ...p, identifier, trigger });
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockLista.delete(id);
  }),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockLista.clear();
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockLista.values()]),
}));

import * as Notificaciones from 'expo-notifications';

import { soltarAlarmasDeLaCuenta } from '../../../alarmas/alarmasDeLaCuenta';
import { cambiarSonidoDeLosHabitos } from '../../../alarmas/cambioDeSonido';
import { planDeRearmado, type AlarmaProgramada } from '../../../alarmas/rearmarAlarmas';
import type { DiaDelHabitoApi, FechaDelHabitoApi, PreferenciaHabitoApi } from '../../types/habits.types';
import * as recordatorios from '../recordatoriosDeHabito';
import * as repeticiones from '../repeticiones';
import { fechasPropiasDe } from '../utils/alarmasPorDia';

const USUARIO = 'u-1';
const HABITO = 'h-gym';
const OTRO = 'h-agua';
const TITULO = 'Gimnasio';
const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const fecha = (y: number, m: number, d: number, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi, 0, 0);
const MARTES_5AM = fecha(2026, 10, 20, 5, 0);
const MARTES_6_05 = fecha(2026, 10, 20, 6, 5);

/** Solo se finge `Date` (los temporizadores siguen siendo los reales: las promesas de AsyncStorage no los usan). */
function ponerElReloj(ahora: Date) {
  jest.useFakeTimers({
    now: ahora,
    doNotFake: [
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate',
      'nextTick', 'queueMicrotask', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame',
      'requestIdleCallback', 'cancelIdleCallback', 'hrtime',
    ],
  });
}

const SEMANA = (): DiaDelHabitoApi[] =>
  NOMBRES.map(weekday => ({
    weekday, triggerTime: '07:00:00', active: true, reminderEnabled: true, reminderMinutesList: [10],
    customTime: false, customReminder: false, customAlarm: false,
    alarm: { sound: true, vibration: true, voice: false, repeat: false },
  }));

/** Una fecha del servidor: por defecto, el sábado 24 a las 09:00 con aviso «a la hora», ambos propios. */
const sabado = (cambios: Partial<FechaDelHabitoApi> = {}): FechaDelHabitoApi => ({
  date: '2026-10-24',
  weekday: 'SATURDAY',
  triggerTime: '09:00:00',
  active: true,
  reminderEnabled: true,
  reminderMinutesList: [0],
  customTime: true,
  customReminder: true,
  customAlarm: false,
  customDate: true,
  alarm: { sound: true, vibration: true, voice: false, repeat: false },
  ...cambios,
});

const preferencia = (p: Partial<PreferenciaHabitoApi> = {}): PreferenciaHabitoApi => ({
  habitId: HABITO,
  title: TITULO,
  triggerTime: '07:00:00',
  limitTime: null,
  customized: true,
  reminderEnabled: true,
  reminderMinutesBefore: 10,
  reminderMinutesList: [10],
  pendingChange: null,
  alarm: { sound: true, vibration: true, voice: false, repeat: false },
  weekdays: SEMANA(),
  dateOverrides: [sabado()],
  ...p,
});

/** Lo que el servidor devuelve de las preferencias: una promesa que no sale a la red. */
const delServidor = (...p: PreferenciaHabitoApi[]) => async () => p;

async function delHabito(habitoId = HABITO): Promise<Programada[]> {
  const guardados = (await recordatorios.recordatoriosPorHabito(USUARIO)).get(habitoId) ?? [];
  const propias = [...mockLista.values()].filter(a => a.identifier.startsWith(`habito-${habitoId}-`));
  return [...new Map([...propias, ...guardados.map(id => mockLista.get(id)).filter((a): a is Programada => !!a)]
    .map(a => [a.identifier, a])).values()];
}
const instante = (a: Programada) => a.trigger.value as number;
const tipo = (a: Programada) => a.trigger.type as string;
const delTipo = async (t: string, habitoId = HABITO) => (await delHabito(habitoId)).filter(a => tipo(a) === t);
const programar = () => Notificaciones.scheduleNotificationAsync as unknown as jest.Mock;
const cancelar = () => Notificaciones.cancelScheduledNotificationAsync as unknown as jest.Mock;

/** Pone al día los hábitos con lo que dice el servidor, como al abrir la app. */
const ponerAlDia = (ahora: Date, ...p: PreferenciaHabitoApi[]) =>
  recordatorios.ajustarRecordatoriosAlServidor(USUARIO, p, { ahora });

beforeEach(async () => {
  mockLista.clear();
  mockEstado.siguiente = 1;
  mockEstado.permiso = true;
  programar().mockClear();
  cancelar().mockClear();
  await AsyncStorage.clear();
  ponerElReloj(MARTES_5AM);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('la puesta al día arma las fechas propias', () => {
  it('el sábado 24 a las 09:00 solo este sábado: ese sábado y los dos siguientes son de fecha; los otros seis días, semanales', async () => {
    expect(await ponerAlDia(MARTES_5AM, preferencia())).toBe(1);

    const semanales = await delTipo('weekly');
    expect(semanales.map(a => a.identifier).sort()).toEqual([1, 2, 3, 4, 5, 7].map(i => `habito-h-gym-d${i}-0`).sort());
    // 07:00 con 10 min de aviso: 06:50 todos los días, menos el sábado.
    expect(semanales.every(a => a.trigger.hour === 6 && a.trigger.minute === 50)).toBe(true);
    // Ninguna semanal el sábado (expo numera el sábado como 7): no podría saltarse esa fecha.
    expect(semanales.some(a => a.trigger.weekday === 7)).toBe(false);

    const fechas = (await delTipo('date')).sort((a, b) => instante(a) - instante(b));
    expect(fechas.map(a => [a.identifier, instante(a)])).toEqual([
      ['habito-h-gym-d6-0', fecha(2026, 10, 24, 9, 0).getTime()],
      ['habito-h-gym-f20261031-0', fecha(2026, 10, 31, 6, 50).getTime()],
      ['habito-h-gym-f20261107-0', fecha(2026, 11, 7, 6, 50).getTime()],
    ]);
    // El texto, la ruta y el canal son los de siempre.
    expect(fechas[0].content.title).toBe('Gimnasio');
    expect(fechas[0].content.body).toBe('Te toca a las 09:00.');
    expect(fechas[1].content.body).toBe('Te toca a las 07:00.');
    expect(fechas[0].content.data?.route).toBe('/habitos/h-gym');
    expect((fechas[0].trigger as { channelId: string }).channelId).toBe('recordatorios-habitos-vib');
  });

  it('recuerda las fechas con las que programó, junto a los días', async () => {
    await ponerAlDia(MARTES_5AM, preferencia());
    const guardado = JSON.parse((await AsyncStorage.getItem(`renaser.habitos.esquema.${USUARIO}.${HABITO}`)) as string);
    expect(guardado.fechas).toEqual(fechasPropiasDe([sabado()]));
    expect(typeof guardado.firma).toBe('string');
  });

  it('la fecha con otro aviso suena con ese aviso (dos alarmas ese sábado) y las demás semanas, con el de siempre', async () => {
    await ponerAlDia(MARTES_5AM, preferencia({ dateOverrides: [sabado({ reminderMinutesList: [30, 0] })] }));
    const sabados = (await delTipo('date')).sort((a, b) => instante(a) - instante(b));
    expect(sabados.map(a => instante(a))).toEqual([
      fecha(2026, 10, 24, 8, 30).getTime(),
      fecha(2026, 10, 24, 9, 0).getTime(),
      fecha(2026, 10, 31, 6, 50).getTime(),
      fecha(2026, 11, 7, 6, 50).getTime(),
    ]);
  });

  it('una fecha apagada no suena ese día y los demás sábados siguen', async () => {
    await ponerAlDia(MARTES_5AM, preferencia({ dateOverrides: [sabado({ active: false, customTime: false, customReminder: false })] }));
    const sabados = (await delTipo('date')).sort((a, b) => instante(a) - instante(b));
    expect(sabados.map(a => new Date(instante(a)).getDate())).toEqual([31, 7]);
  });

  it('un hábito que no tiene aviso general pero sí una fecha con aviso propio: solo suena esa fecha', async () => {
    await ponerAlDia(MARTES_5AM, preferencia({ reminderEnabled: false, reminderMinutesBefore: null, reminderMinutesList: null }));
    expect(await delTipo('weekly')).toHaveLength(0);
    const fechas = await delTipo('date');
    expect(fechas.map(a => instante(a))).toEqual([fecha(2026, 10, 24, 9, 0).getTime()]);
  });

  it('sin fechas propias (o con un backend que no las manda) es lo de siempre: un hábito sin días distintos queda diario', async () => {
    for (const dateOverrides of [undefined, [] as FechaDelHabitoApi[]]) {
      mockLista.clear();
      await AsyncStorage.clear();
      await ponerAlDia(MARTES_5AM, preferencia({ dateOverrides }));
      expect((await delHabito()).map(tipo)).toEqual(['daily']);
      expect(mockLista.has('habito-h-gym-inicio')).toBe(true);
    }
  });

  it('sin permiso de avisos no arma nada', async () => {
    mockEstado.permiso = false;
    await ponerAlDia(MARTES_5AM, preferencia());
    expect(mockLista.size).toBe(0);
  });
});

describe('converge: no repite trabajo y se rehace solo cuando hace falta', () => {
  it('una segunda puesta al día con lo mismo no vuelve a tocar la librería', async () => {
    await ponerAlDia(MARTES_5AM, preferencia());
    programar().mockClear();
    cancelar().mockClear();
    expect(await ponerAlDia(MARTES_5AM, preferencia())).toBe(0);
    expect(programar()).not.toHaveBeenCalled();
    expect(cancelar()).not.toHaveBeenCalled();
  });

  it('cambia la hora de la fecha en otro teléfono: la siguiente puesta al día mueve esa alarma', async () => {
    await ponerAlDia(MARTES_5AM, preferencia());
    expect(await ponerAlDia(MARTES_5AM, preferencia({ dateOverrides: [sabado({ triggerTime: '10:00:00' })] }))).toBe(1);
    const primera = (await delTipo('date')).find(a => a.identifier === 'habito-h-gym-d6-0')!;
    expect(instante(primera)).toBe(fecha(2026, 10, 24, 10, 0).getTime());
  });

  it('cuando una alarma de fecha ya sonó, la siguiente puesta al día rehace el hábito sin ella', async () => {
    await ponerAlDia(MARTES_5AM, preferencia());
    const sabado9_05 = fecha(2026, 10, 24, 9, 5);
    ponerElReloj(sabado9_05);
    // La fecha sigue siendo de hoy para el servidor y la alarma de las 09:00 ya sonó.
    expect(await ponerAlDia(sabado9_05, preferencia())).toBe(1);
    const fechas = (await delTipo('date')).sort((a, b) => instante(a) - instante(b));
    expect(fechas.map(a => new Date(instante(a)).getDate())).toEqual([31, 7]);
    // Y el sábado de hoy sigue sin semanal.
    expect((await delTipo('weekly')).some(a => a.trigger.weekday === 7)).toBe(false);
  });

  it('REVIERTE SOLO: pasada la última fecha propia, vuelve a lo de siempre (diario), sin alarmas de fecha', async () => {
    await ponerAlDia(MARTES_5AM, preferencia());
    expect((await delTipo('date')).length).toBe(3);
    const domingo = fecha(2026, 10, 25, 8, 0);
    ponerElReloj(domingo);
    // El servidor ya no manda la fecha (pasó): ningún día distinto ni fecha vigente.
    expect(await ponerAlDia(domingo, preferencia({ dateOverrides: [] }))).toBe(1);
    expect((await delHabito()).map(tipo)).toEqual(['daily']);
    expect(mockLista.has('habito-h-gym-inicio')).toBe(true);
    expect(await AsyncStorage.getItem(`renaser.habitos.esquema.${USUARIO}.${HABITO}`)).toBeNull();
    // Y una vez revertido no se vuelve a rehacer en cada apertura.
    programar().mockClear();
    expect(await ponerAlDia(domingo, preferencia({ dateOverrides: [] }))).toBe(0);
    expect(programar()).not.toHaveBeenCalled();
  });

  it('REVIERTE al esquema por día si el hábito tiene días distintos: vuelven las semanales de cada día', async () => {
    const conJueves = () => {
      const s = SEMANA();
      s[3] = { ...s[3], customTime: true, triggerTime: '09:00:00' };
      return s;
    };
    await ponerAlDia(MARTES_5AM, preferencia({ weekdays: conJueves() }));
    expect((await delTipo('date')).length).toBe(3);
    const domingo = fecha(2026, 10, 25, 8, 0);
    ponerElReloj(domingo);
    await ponerAlDia(domingo, preferencia({ weekdays: conJueves(), dateOverrides: [] }));
    expect(await delTipo('date')).toHaveLength(0);
    expect((await delTipo('weekly')).map(a => a.identifier).sort()).toEqual([1, 2, 3, 4, 5, 6, 7].map(i => `habito-h-gym-d${i}-0`).sort());
  });
});

describe('quien reprograma sin saber de fechas no las pierde, y el servidor manda cuando sí sabe', () => {
  it('el editor guarda «todas las semanas» (`programar` sin `fechas`): las fechas propias que el teléfono tenía siguen', async () => {
    await ponerAlDia(MARTES_5AM, preferencia());
    // La persona cambia el aviso general a 30 min desde el editor, que reprograma sin pasar fechas.
    expect(await recordatorios.programar(USUARIO, HABITO, TITULO, '07:00', [30], { dimension: 'CUERPO' })).toBe(true);
    const fechas = (await delTipo('date')).sort((a, b) => instante(a) - instante(b));
    // El sábado 24 sigue a las 09:00 (su cambio es propio) y los siguientes siguen el aviso general nuevo (30 min antes).
    expect(instante(fechas[0])).toBe(fecha(2026, 10, 24, 9, 0).getTime());
    expect(fechas.slice(1).map(a => instante(a))).toEqual([fecha(2026, 10, 31, 6, 30).getTime(), fecha(2026, 11, 7, 6, 30).getTime()]);
    expect((await delTipo('weekly')).every(a => a.trigger.hour === 6 && a.trigger.minute === 30)).toBe(true);
  });

  it('«Deshacer» o «Volver al plan de siempre»: el servidor ya no manda la fecha y NO se resucita la que el teléfono recordaba', async () => {
    await ponerAlDia(MARTES_5AM, preferencia());
    expect((await delTipo('date')).length).toBe(3);
    // Sigue siendo martes: la fecha (sábado 24) todavía no pasó, pero el servidor ya no la tiene.
    expect(await ponerAlDia(MARTES_5AM, preferencia({ dateOverrides: [] }))).toBe(1);
    expect((await delHabito()).map(tipo)).toEqual(['daily']);
  });

  it('un cambio de hora que espera su fecha (D-91) con una fecha propia: el teléfono respeta las dos cosas', async () => {
    const p = preferencia({
      triggerTime: '07:00:00',
      pendingChange: { triggerTime: '09:00:00', limitTime: null, effectiveDate: '2026-10-26' },
    });
    await ponerAlDia(MARTES_5AM, p);
    // Los demás días, que siguen la hora general, esperan la fecha del cambio con una alarma de fecha cada uno (D-91): solo se
    // miran los sábados.
    const sabados = (await delTipo('date')).filter(a => new Date(instante(a)).getDay() === 6).sort((a, b) => instante(a) - instante(b));
    // El 24 (propio, 09:00 a la hora); el 31 y el 7, ya con la hora nueva (09:00, 10 min antes).
    expect(sabados.map(a => instante(a))).toEqual([
      fecha(2026, 10, 24, 9, 0).getTime(),
      fecha(2026, 10, 31, 8, 50).getTime(),
      fecha(2026, 11, 7, 8, 50).getTime(),
    ]);
  });
});

describe('lo que ya existía sigue funcionando con las fechas propias', () => {
  it('cumplir el hábito hoy y tener un cambio mañana: hoy no suena y mañana suena a la hora de la fecha', async () => {
    const manana = fecha(2026, 10, 21, 0, 0);
    const miercoles = (cambios: Partial<FechaDelHabitoApi> = {}): FechaDelHabitoApi =>
      sabado({ date: '2026-10-21', weekday: 'WEDNESDAY', triggerTime: '09:00:00', reminderMinutesList: [0], ...cambios });
    const p = preferencia({ reminderMinutesList: [30, 10, 0], reminderMinutesBefore: 30, triggerTime: '06:30:00', dateOverrides: [miercoles()] });
    await recordatorios.programar(USUARIO, HABITO, TITULO, '06:30', [30, 10, 0], { fechas: fechasPropiasDe(p.dateOverrides) });
    // Los avisos de hoy (martes) siguen semanales hasta que se cumple.
    expect((await delTipo('weekly')).some(a => a.trigger.weekday === 3)).toBe(true);

    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(p) });

    const alarmas = await delHabito();
    // Ninguna semanal ni diaria: el puente son alarmas de fecha desde mañana, con la hora de la fecha propia.
    expect(alarmas.every(a => tipo(a) === 'date')).toBe(true);
    expect(Math.min(...alarmas.map(instante))).toBeGreaterThanOrEqual(manana.getTime());
    const delMiercoles = alarmas.filter(a => new Date(instante(a)).getDate() === 21);
    expect(delMiercoles.map(a => instante(a))).toEqual([fecha(2026, 10, 21, 9, 0).getTime()]);
    // El jueves en adelante, los tres avisos de siempre (06:00, 06:20, 06:30).
    expect(alarmas.filter(a => new Date(instante(a)).getDate() === 22)).toHaveLength(3);
  });

  it('cambiar la hora general desde Plan conserva las fechas propias (las recuerda el teléfono)', async () => {
    await ponerAlDia(MARTES_5AM, preferencia());
    expect(await recordatorios.reprogramarTrasCambioDeHora(USUARIO, HABITO, TITULO, '08:00')).toBe(true);
    const fechas = (await delTipo('date')).sort((a, b) => instante(a) - instante(b));
    // Ese sábado sigue a las 09:00; los siguientes siguen la hora general nueva (08:00, 10 min antes).
    expect(fechas.map(a => instante(a))[0]).toBe(fecha(2026, 10, 24, 9, 0).getTime());
    expect(fechas.slice(1).map(a => instante(a))).toEqual([fecha(2026, 10, 31, 7, 50).getTime(), fecha(2026, 11, 7, 7, 50).getTime()]);
    expect((await delTipo('weekly')).every(a => a.trigger.hour === 7 && a.trigger.minute === 50)).toBe(true);
  });

  it('cambiar el sonido en Yo → Alarmas pasa también las alarmas de fecha a su canal nuevo, con la misma hora', async () => {
    await ponerAlDia(MARTES_5AM, preferencia());
    const horasAntes = (await delTipo('date')).map(instante).sort((a, b) => a - b);
    await cambiarSonidoDeLosHabitos(USUARIO, 'campana');
    const fechas = await delTipo('date');
    expect(fechas.map(instante).sort((a, b) => a - b)).toEqual(horasAntes);
    expect([...new Set((await delHabito()).map(a => (a.trigger as { channelId: string }).channelId))]).toEqual(['recordatorios-habitos-campana-vib']);
  });

  it('el rearmado de la spec 007 conserva las alarmas de fecha (misma id, mismo texto, mismo canal)', async () => {
    await ponerAlDia(MARTES_5AM, preferencia());
    const plan = planDeRearmado([...mockLista.values()] as unknown as AlarmaProgramada[], MARTES_5AM.getTime());
    const ids = plan.map(p => p.identifier).filter(i => i.startsWith('habito-h-gym-'));
    expect(ids.sort()).toEqual((await delHabito()).map(a => a.identifier).sort());
    const primera = plan.find(p => p.identifier === 'habito-h-gym-d6-0')!;
    expect(primera.content.title).toBe('Gimnasio');
    expect((primera.trigger as { channelId: string }).channelId).toBe('recordatorios-habitos-vib');
  });

  it('dos hábitos con un cambio a la misma hora siguen juntos en un solo aviso (E-410)', async () => {
    const otra = preferencia({ habitId: OTRO, title: 'Agua' });
    await ponerAlDia(MARTES_5AM, preferencia(), otra);
    const juntas = [...mockLista.values()].filter(a => a.trigger.type === 'date' && instante(a) === fecha(2026, 10, 24, 9, 0).getTime());
    expect(juntas).toHaveLength(2);
    expect(juntas.some(a => a.content.title === '2 hábitos a las 09:00')).toBe(true);
  });

  it('«Repetir si no la atiendo»: la repetición de esa fecha cuelga de su hora', async () => {
    const conRepetir = { sound: true, vibration: true, voice: false, repeat: true };
    await ponerAlDia(MARTES_5AM, preferencia({
      alarm: conRepetir,
      dateOverrides: [sabado({ date: '2026-10-21', weekday: 'WEDNESDAY', alarm: conRepetir })],
    }));
    const reps = [...mockLista.keys()].filter(i => i.startsWith('habito-h-gym-rep-20261021-'));
    expect(reps.sort()).toEqual(['habito-h-gym-rep-20261021-10', 'habito-h-gym-rep-20261021-5']);
    expect(instante(mockLista.get('habito-h-gym-rep-20261021-5')!)).toBe(fecha(2026, 10, 21, 9, 5).getTime());
  });

  it('cerrar sesión suelta las alarmas de fecha y todo lo que el teléfono recordaba', async () => {
    await ponerAlDia(MARTES_5AM, preferencia());
    expect(mockLista.size).toBeGreaterThan(0);
    await soltarAlarmasDeLaCuenta();
    expect(mockLista.size).toBe(0);
    expect((await AsyncStorage.getAllKeys()).filter(k => k.startsWith('renaser.habitos.') && !k.startsWith('renaser.habitos.antelaciones.'))).toEqual([]);
  });

  it('cancelar el hábito quita sus alarmas de fecha', async () => {
    await ponerAlDia(MARTES_5AM, preferencia());
    await recordatorios.cancelar(USUARIO, HABITO);
    expect(mockLista.size).toBe(0);
  });
});
