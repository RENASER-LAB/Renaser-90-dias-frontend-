/**
 * «Repetir si no la atiendo» (spec 009, research R2): la alarma de la hora del hábito vuelve a sonar a los 5 y a los
 * 10 minutos, en una ventana de 7 días de alarmas DE FECHA, y deja de sonar HOY cuando la persona toca una alarma del
 * hábito o lo completa (SC-003). Primero lo puro (qué alarmas, qué identificadores) y luego contra la librería de
 * mentira, que hace lo que la de verdad en Android: programar con un identificador existente lo reemplaza.
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

const mockLista = new Map<string, Pedido & { identifier: string }>();
const mockCanceladas: string[] = [];
const mockCanales: Array<{ id: string; sound?: unknown; enableVibrate?: boolean }> = [];
const mockEstado = { siguiente: 1, permiso: true };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso })),
  setNotificationChannelAsync: jest.fn(async (id: string, canal: { sound?: unknown; enableVibrate?: boolean }) => {
    mockCanales.push({ id, ...canal });
    return null;
  }),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (p: Pedido) => {
    const identifier = p.identifier ?? `uuid-${String(mockEstado.siguiente++).padStart(3, '0')}`;
    mockLista.set(identifier, { ...p, identifier });
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockCanceladas.push(id);
    mockLista.delete(id);
  }),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockLista.clear();
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockLista.values()]),
}));

import * as Notificaciones from 'expo-notifications';

import { soltarAlarmasDeLaCuenta } from '../../../alarmas/alarmasDeLaCuenta';
import { avisarHabitoCumplido } from '../../eventos/habitoCumplido';
import type { DiaDelHabitoApi, PreferenciaHabitoApi } from '../../types/habits.types';
import * as recordatorios from '../recordatoriosDeHabito';
import * as repeticiones from '../repeticiones';
import { diasPropiosDe, type DiaPropio } from '../utils/alarmasPorDia';
import type { CombinacionDeAlarma } from '../utils/combinacionDeAlarma';
import {
  DIAS_DE_LA_VENTANA,
  fechaCompacta,
  habitoDeLaRuta,
  identificadorDeRepeticion,
  planDeRepeticiones,
  repeticionDe,
  type EntradaDeRepeticiones,
} from '../utils/repeticionesDeAlarma';

const USUARIO = 'u-1';
const GYM = 'h-gym';
const TITULO = 'Gimnasio';
const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const c = (sonido: boolean, vibracion: boolean, voz = false, repetir = false): CombinacionDeAlarma => ({
  sonido, vibracion, voz, repetir,
});
const REPITE = c(true, true, false, true);

/** Martes 20/10/2026 a las 06:00 (hora de Lima): el hábito de las 07:00 todavía no suena. */
const MARTES_6AM = new Date(2026, 9, 20, 6, 0, 0, 0);

const entrada = (cambios: Partial<EntradaDeRepeticiones> = {}): EntradaDeRepeticiones => ({
  habitoId: GYM,
  horaGeneral: '07:00',
  avisosGenerales: [10],
  dias: null,
  alarmaGeneral: REPITE,
  ...cambios,
});

const dia = (iso: DiaPropio['iso'], cambios: Partial<DiaPropio> = {}): DiaPropio => ({
  iso, activo: true, hora: null, avisos: null, ...cambios,
});

const fecha = (y: number, m: number, d: number, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi, 0, 0);
const ids = (p: Array<{ identificador: string }>) => p.map(x => x.identificador);

describe('qué repeticiones lleva un hábito (puro)', () => {
  it('con «Repetir»: dos por día, a +5 y +10 min de la hora del hábito, hoy y los 6 días siguientes', () => {
    const pedidos = planDeRepeticiones(entrada(), MARTES_6AM);
    expect(pedidos).toHaveLength(DIAS_DE_LA_VENTANA * 2);
    expect(ids(pedidos).slice(0, 4)).toEqual([
      'habito-h-gym-rep-20261020-5',
      'habito-h-gym-rep-20261020-10',
      'habito-h-gym-rep-20261021-5',
      'habito-h-gym-rep-20261021-10',
    ]);
    expect(ids(pedidos).at(-1)).toBe('habito-h-gym-rep-20261026-10');
    expect(pedidos[0].instanteMs).toBe(fecha(2026, 10, 20, 7, 5).getTime());
    expect(pedidos[1].instanteMs).toBe(fecha(2026, 10, 20, 7, 10).getTime());
    expect(pedidos[0].horaDelDia).toBe('07:00');
  });

  it('el identificador es `habito-{id}-rep-{AAAAMMDD}-{5|10}` y se lee de vuelta', () => {
    expect(identificadorDeRepeticion('abc-123', '20261020', 10)).toBe('habito-abc-123-rep-20261020-10');
    expect(repeticionDe('habito-abc-123-rep-20261020-10')).toEqual({ habitoId: 'abc-123', fecha: '20261020', minutos: 10 });
    // Un id de hábito con guiones (un UUID) no confunde a quien lo lee.
    const uuid = '899a2151-e98c-4b61-a46c-b55134240d17';
    expect(repeticionDe(identificadorDeRepeticion(uuid, '20261020', 5))?.habitoId).toBe(uuid);
    // Las demás alarmas del hábito no son repeticiones.
    expect(repeticionDe('habito-h-gym-inicio')).toBeNull();
    expect(repeticionDe('habito-h-gym-d4-0')).toBeNull();
    expect(repeticionDe(undefined)).toBeNull();
    expect(fechaCompacta(fecha(2026, 1, 5))).toBe('20260105');
  });

  it('sin «Repetir» no hay ninguna', () => {
    expect(planDeRepeticiones(entrada({ alarmaGeneral: c(true, true) }), MARTES_6AM)).toEqual([]);
    expect(planDeRepeticiones(entrada({ alarmaGeneral: null }), MARTES_6AM)).toEqual([]);
    expect(planDeRepeticiones(entrada({ alarmaGeneral: undefined }), MARTES_6AM)).toEqual([]);
  });

  it('la repetición cuelga del aviso: sin aviso, o un día apagado, no hay nada que repetir', () => {
    expect(planDeRepeticiones(entrada({ avisosGenerales: [] }), MARTES_6AM)).toEqual([]);
    const sinElMiercolesNiElJueves = planDeRepeticiones(entrada({
      dias: [dia(3, { activo: false }), dia(4, { avisos: [] })],
    }), MARTES_6AM);
    expect(sinElMiercolesNiElJueves).toHaveLength(10);
    expect(ids(sinElMiercolesNiElJueves).some(i => i.includes('20261021') || i.includes('20261022'))).toBe(false);
  });

  it('solo se repite la alarma de la HORA del hábito: con 30 min antes y a la hora son 2 por día, no 4', () => {
    const pedidos = planDeRepeticiones(entrada({ avisosGenerales: [30, 0] }), MARTES_6AM);
    expect(pedidos).toHaveLength(14);
    expect(pedidos.every(p => p.minutosDespues === 5 || p.minutosDespues === 10)).toBe(true);
    expect(pedidos[0].instanteMs).toBe(fecha(2026, 10, 20, 7, 5).getTime());
  });

  it('cada día con su combinación: el sábado repite y los demás no', () => {
    const pedidos = planDeRepeticiones(entrada({
      alarmaGeneral: c(true, true),
      dias: [dia(6, { alarma: REPITE })],
    }), MARTES_6AM);
    expect(ids(pedidos)).toEqual(['habito-h-gym-rep-20261024-5', 'habito-h-gym-rep-20261024-10']);
    // Y al revés: la general repite y el domingo no.
    const sinDomingo = planDeRepeticiones(entrada({ dias: [dia(7, { alarma: c(true, true) })] }), MARTES_6AM);
    expect(sinDomingo).toHaveLength(12);
    expect(ids(sinDomingo).some(i => i.includes('20261025'))).toBe(false);
  });

  it('la hora de cada día: un día con hora propia repite a ESA hora', () => {
    const pedidos = planDeRepeticiones(entrada({ dias: [dia(4, { hora: '09:00' })] }), MARTES_6AM);
    const jueves = pedidos.filter(p => p.fecha === '20261022');
    expect(jueves.map(p => p.instanteMs)).toEqual([fecha(2026, 10, 22, 9, 5).getTime(), fecha(2026, 10, 22, 9, 10).getTime()]);
    expect(jueves[0].horaDelDia).toBe('09:00');
  });

  it('E-642: un día sin hora propia repite a la hora que el servidor le resolvió, no a la de arriba (que es la de hoy)', () => {
    const pedidos = planDeRepeticiones(entrada({
      horaGeneral: '11:29',
      dias: [dia(2, { hora: '11:29', horaResuelta: '11:29' }), dia(6, { horaResuelta: '07:00' })],
    }), MARTES_6AM);
    const de = (f: string) => pedidos.filter(p => p.fecha === f).map(p => p.instanteMs);
    expect(de('20261024')).toEqual([fecha(2026, 10, 24, 7, 5).getTime(), fecha(2026, 10, 24, 7, 10).getTime()]);
    expect(de('20261020')).toEqual([fecha(2026, 10, 20, 11, 34).getTime(), fecha(2026, 10, 20, 11, 39).getTime()]);
    // Un día que el servidor no informa cae en la general.
    expect(de('20261021')).toEqual([fecha(2026, 10, 21, 11, 34).getTime(), fecha(2026, 10, 21, 11, 39).getTime()]);
  });

  it('con un cambio de hora pendiente, cada día usa la hora que rige en SU fecha (D-91)', () => {
    const pedidos = planDeRepeticiones(entrada({
      cambio: { horaDeHoy: '07:00', horaNueva: '10:00', desde: '2026-10-22' },
    }), MARTES_6AM);
    const hora = (f: string) => pedidos.find(p => p.fecha === f)?.horaDelDia;
    expect(hora('20261020')).toBe('07:00');
    expect(hora('20261021')).toBe('07:00');
    expect(hora('20261022')).toBe('10:00');
    expect(hora('20261026')).toBe('10:00');
  });

  it('cruce de medianoche: un hábito a las 23:58 repite a las 00:03 del día siguiente, con el día del HÁBITO en el identificador', () => {
    const pedidos = planDeRepeticiones(entrada({ horaGeneral: '23:58' }), fecha(2026, 10, 20, 22, 0));
    const primera = pedidos[0];
    expect(primera.identificador).toBe('habito-h-gym-rep-20261020-5');
    expect(primera.instanteMs).toBe(fecha(2026, 10, 21, 0, 3).getTime());
    expect(pedidos[1].instanteMs).toBe(fecha(2026, 10, 21, 0, 8).getTime());
  });

  it('lo que ya pasó no se pone: a las 07:07 queda la de +10 de hoy y no la de +5', () => {
    const pedidos = planDeRepeticiones(entrada(), fecha(2026, 10, 20, 7, 7));
    expect(ids(pedidos).slice(0, 2)).toEqual(['habito-h-gym-rep-20261020-10', 'habito-h-gym-rep-20261021-5']);
    // Pasadas las 07:10, hoy ya no queda ninguna.
    expect(ids(planDeRepeticiones(entrada(), fecha(2026, 10, 20, 7, 11))).slice(0, 1)).toEqual(['habito-h-gym-rep-20261021-5']);
  });

  it('un día atendido no vuelve: las de mañana en adelante siguen', () => {
    const pedidos = planDeRepeticiones(entrada(), MARTES_6AM, new Set(['20261020']));
    expect(pedidos).toHaveLength(12);
    expect(ids(pedidos)[0]).toBe('habito-h-gym-rep-20261021-5');
  });

  it('de una ruta de aviso sale el hábito', () => {
    expect(habitoDeLaRuta('/habitos/h-gym?dimension=BODY')).toBe('h-gym');
    expect(habitoDeLaRuta('/habitos/899a2151-e98c-4b61-a46c-b55134240d17')).toBe('899a2151-e98c-4b61-a46c-b55134240d17');
    expect(habitoDeLaRuta('/eventos/12')).toBeNull();
    expect(habitoDeLaRuta(undefined)).toBeNull();
  });
});

/* ------------------------------------------------------------------------------------------------
 * Contra la librería de mentira
 * ---------------------------------------------------------------------------------------------- */

const SEMANA = (cambios: Record<number, Partial<DiaDelHabitoApi>> = {}): DiaDelHabitoApi[] =>
  NOMBRES.map((weekday, i) => ({
    weekday, triggerTime: '07:00:00', active: true, reminderEnabled: true, reminderMinutesList: [0],
    customTime: false, customReminder: false, customAlarm: false,
    alarm: { sound: true, vibration: true, voice: false, repeat: true },
    ...cambios[i + 1],
  }));

const preferencia = (p: Partial<PreferenciaHabitoApi> = {}): PreferenciaHabitoApi => ({
  habitId: GYM,
  title: TITULO,
  triggerTime: '07:00:00',
  limitTime: null,
  customized: true,
  reminderEnabled: true,
  reminderMinutesBefore: 0,
  pendingChange: null,
  alarm: { sound: true, vibration: true, voice: false, repeat: true },
  ...p,
});

/** Las repeticiones puestas, por identificador. */
const puestas = () => [...mockLista.keys()].filter(k => repeticionDe(k)).sort();

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

beforeEach(async () => {
  mockLista.clear();
  mockCanceladas.length = 0;
  mockCanales.length = 0;
  mockEstado.siguiente = 1;
  mockEstado.permiso = true;
  await AsyncStorage.clear();
  ponerElReloj(MARTES_6AM);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('las repeticiones en el teléfono', () => {
  it('guardar el hábito con «Repetir» pone 14 alarmas de fecha, con el texto, la ruta y el canal de su combinación', async () => {
    const ok = await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { dimension: 'CUERPO', alarma: REPITE });
    expect(ok).toBe(true);
    const reps = puestas();
    expect(reps).toHaveLength(14);
    expect(reps[0]).toBe('habito-h-gym-rep-20261020-10');
    const primera = mockLista.get('habito-h-gym-rep-20261020-5')!;
    expect((primera.trigger as { type: string }).type).toBe('date');
    expect(new Date((primera.trigger as { date: Date }).date).getTime()).toBe(fecha(2026, 10, 20, 7, 5).getTime());
    expect(primera.content).toMatchObject({ title: 'Gimnasio', body: 'Te tocaba a las 07:00.' });
    expect(primera.content.data?.route).toBe('/habitos/h-gym?dimension=BODY');
    expect((primera.trigger as { channelId: string }).channelId).toBe('recordatorios-habitos');
    // La alarma de siempre sigue: la diaria con la etiqueta del push (spec 007).
    expect(mockLista.get('habito-h-gym-inicio')).toBeDefined();
  });

  it('sin «Repetir» (o sin aviso) no pone ninguna, y apagarlo quita las que había', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: c(true, true) });
    expect(puestas()).toEqual([]);
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: REPITE });
    expect(puestas()).toHaveLength(14);
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: c(true, true) });
    expect(puestas()).toEqual([]);
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: REPITE });
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [], { alarma: REPITE });
    expect(puestas()).toEqual([]);
  });

  it('con una combinación distinta por día, solo los días que repiten las llevan, cada una por el canal de SU combinación', async () => {
    const dias = diasPropiosDe(SEMANA({
      6: { customAlarm: true, alarm: { sound: false, vibration: true, voice: false, repeat: true } },
    }))!;
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], {
      alarma: c(true, true), dias,
    });
    expect(puestas()).toEqual(['habito-h-gym-rep-20261024-10', 'habito-h-gym-rep-20261024-5']);
    const sabado = mockLista.get('habito-h-gym-rep-20261024-5')!;
    expect((sabado.trigger as { channelId: string }).channelId).toBe('recordatorios-habitos-vibrar');
    expect(sabado.content.data?.alarma).toEqual(c(false, true, false, true));
  });

  it('cancelar el hábito quita también sus repeticiones', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: REPITE });
    expect(puestas()).toHaveLength(14);
    await recordatorios.cancelar(USUARIO, GYM);
    expect(puestas()).toEqual([]);
    expect(mockLista.size).toBe(0);
  });

  it('tocar una alarma del hábito cancela las repeticiones de HOY y deja las de mañana', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: REPITE });
    const atendido = await repeticiones.atenderLaAlarmaDeUnHabito('/habitos/h-gym?dimension=BODY', MARTES_6AM.getTime());
    expect(atendido).toBe('h-gym');
    const reps = puestas();
    expect(reps).toHaveLength(12);
    expect(reps.some(i => i.includes('20261020'))).toBe(false);
    expect(reps.some(i => i.includes('20261021'))).toBe(true);
    expect(mockCanceladas).toEqual(expect.arrayContaining(['habito-h-gym-rep-20261020-5', 'habito-h-gym-rep-20261020-10']));
  });

  it('tocar el aviso de OTRO hábito, o uno que no es de hábitos, no toca estas repeticiones', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: REPITE });
    await repeticiones.atenderLaAlarmaDeUnHabito('/habitos/h-otro', MARTES_6AM.getTime());
    await repeticiones.atenderLaAlarmaDeUnHabito('/eventos/12', MARTES_6AM.getTime());
    expect(puestas()).toHaveLength(14);
  });

  it('un toque VIEJO (la última respuesta que devuelve la librería al abrir la app en frío) no atiende lo de hoy', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: REPITE });
    const ayerALasSiete = fecha(2026, 10, 19, 7, 0).getTime();
    expect(await repeticiones.atenderLaAlarmaDeUnHabito('/habitos/h-gym', ayerALasSiete)).toBeNull();
    expect(puestas()).toHaveLength(14);
    expect(repeticiones.esUnToqueReciente(ayerALasSiete, MARTES_6AM)).toBe(false);
    // Una alarma de las 23:55 tocada a las 00:02 sí es de ahora.
    expect(repeticiones.esUnToqueReciente(fecha(2026, 10, 19, 23, 55).getTime(), fecha(2026, 10, 20, 0, 2))).toBe(true);
  });

  it('completar el hábito cancela las de hoy (el aviso `habitoCumplido` con su hábito)', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: REPITE });
    const dejarDeEscuchar = repeticiones.atenderAlCumplirUnHabito();
    try {
      avisarHabitoCumplido({ registroId: 'r-1', puntosOtorgados: 8, habitoId: GYM });
      await new Promise(resolver => setImmediate(resolver));
      await new Promise(resolver => setImmediate(resolver));
    } finally {
      dejarDeEscuchar();
    }
    expect(puestas()).toHaveLength(12);
    expect(puestas().some(i => i.includes('20261020'))).toBe(false);
  });

  it('un cierre sin saber de qué hábito es no cancela nada', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: REPITE });
    const dejarDeEscuchar = repeticiones.atenderAlCumplirUnHabito();
    try {
      avisarHabitoCumplido({ registroId: 'r-1', puntosOtorgados: 8 });
      await new Promise(resolver => setImmediate(resolver));
    } finally {
      dejarDeEscuchar();
    }
    expect(puestas()).toHaveLength(14);
  });

  it('SC-003: después de atender, la renovación de la ventana (al abrir la app) NO resucita las de hoy', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: REPITE });
    await repeticiones.atenderHabito(GYM, MARTES_6AM);
    expect(puestas()).toHaveLength(12);
    // La puesta al día vuelve a mirar al servidor y renueva las repeticiones de todos los hábitos.
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: SEMANA() })]);
    expect(puestas()).toHaveLength(12);
    expect(puestas().some(i => i.includes('20261020'))).toBe(false);
    // Reprogramar el hábito (guardar en el editor) tampoco las trae de vuelta.
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: REPITE });
    expect(puestas().some(i => i.includes('20261020'))).toBe(false);
  });

  it('al día siguiente la nota de «atendida» ya no cuenta: las de ese día vuelven a estar', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: REPITE });
    await repeticiones.atenderHabito(GYM, MARTES_6AM);
    ponerElReloj(fecha(2026, 10, 21, 6, 0));
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: SEMANA() })]);
    const reps = puestas();
    // Hoy (miércoles) hasta el martes siguiente: 7 días × 2; las del martes 20 quedaron atrás.
    expect(reps).toHaveLength(14);
    expect(reps[0]).toBe('habito-h-gym-rep-20261021-10');
    expect(reps.at(-1)).toBe('habito-h-gym-rep-20261027-5');
    expect(reps.some(i => i.includes('20261020'))).toBe(false);
  });

  it('la puesta al día renueva la ventana: tres días después hay otra vez 7 días por delante', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: REPITE });
    expect(puestas().at(-1)).toBe('habito-h-gym-rep-20261026-5');
    ponerElReloj(fecha(2026, 10, 23, 6, 0));
    const programar = Notificaciones.scheduleNotificationAsync as unknown as jest.Mock;
    const antes = programar.mock.calls.length;
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: SEMANA() })]);
    const reps = puestas();
    expect(reps.at(-1)).toBe('habito-h-gym-rep-20261029-5');
    expect(reps).toHaveLength(14);
    // Las vencidas se quitan…
    expect(reps.some(i => i.includes('20261020') || i.includes('20261021') || i.includes('20261022'))).toBe(false);
    // …y solo se programan las de los 3 días que entran a la ventana (27, 28 y 29): las que ya estaban no se tocan.
    const nuevas = programar.mock.calls.slice(antes).map(([p]) => (p as Pedido).identifier);
    expect(nuevas.sort()).toEqual([
      'habito-h-gym-rep-20261027-10', 'habito-h-gym-rep-20261027-5',
      'habito-h-gym-rep-20261028-10', 'habito-h-gym-rep-20261028-5',
      'habito-h-gym-rep-20261029-10', 'habito-h-gym-rep-20261029-5',
    ]);
  });

  it('la puesta al día quita las repeticiones de un hábito cuando el servidor dice que ya no se repite o que no hay aviso', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: REPITE });
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [
      preferencia({ alarm: { sound: true, vibration: true, voice: false, repeat: false }, weekdays: undefined }),
    ]);
    expect(puestas()).toEqual([]);
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia()]);
    expect(puestas()).toHaveLength(14);
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ reminderEnabled: false })]);
    expect(puestas()).toEqual([]);
  });

  it('sin permiso de avisos la puesta al día no pone repeticiones (y no pide el permiso)', async () => {
    mockEstado.permiso = false;
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia()]);
    expect(puestas()).toEqual([]);
  });

  it('cerrar sesión las borra, con sus notas de «atendida»', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: REPITE });
    await repeticiones.atenderHabito(GYM, MARTES_6AM);
    expect((await AsyncStorage.getAllKeys()).some(k => k.startsWith('renaser.habitos.repeticiones.atendidas.'))).toBe(true);
    expect((await AsyncStorage.getAllKeys()).some(k => k.startsWith('renaser.habitos.combinacion.'))).toBe(true);
    await soltarAlarmasDeLaCuenta();
    expect(mockLista.size).toBe(0);
    const claves = await AsyncStorage.getAllKeys();
    expect(claves.filter(k => k.startsWith('renaser.habitos.repeticiones.') || k.startsWith('renaser.habitos.combinacion.'))).toEqual([]);
  });

  it('reprogramar la hora del hábito desde Plan conserva «cómo suena» y las repeticiones', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: REPITE });
    const r = await recordatorios.reprogramarTrasCambioDeHora(USUARIO, GYM, TITULO, '08:00');
    expect(r).toBe(true);
    const reps = puestas();
    expect(reps).toHaveLength(14);
    const primera = mockLista.get('habito-h-gym-rep-20261020-5')!;
    expect(new Date((primera.trigger as { date: Date }).date).getTime()).toBe(fecha(2026, 10, 20, 8, 5).getTime());
    expect(primera.content.body).toBe('Te tocaba a las 08:00.');
  });
});
