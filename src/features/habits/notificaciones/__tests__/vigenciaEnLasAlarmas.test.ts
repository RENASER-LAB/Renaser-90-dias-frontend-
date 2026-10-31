/**
 * Issue #40 (2026-10-31): todo aviso de inicio de un hábito lleva `data.vigenteMin` —los minutos, desde su hora nominal,
 * durante los que sigue siendo verdad— para que Android, al entregar una alarma atrasada, sepa que ya no vale
 * (`scripts/arreglar-aviso-tardio.js`). Lo llevan los cuatro caminos que arman un aviso de inicio (diario, por día, puente
 * del hábito cumplido y cambio de hora que rige desde mañana), y el rearmado se lo pone a los que se programaron antes.
 *
 * Contra el código anterior estas pruebas fallan: el contenido no traía el campo. Corren en `America/Lima`.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Pedido = {
  identifier?: string;
  content: { title?: string | null; body?: string | null; data?: Record<string, unknown>; sound?: unknown };
  trigger: Record<string, unknown>;
};

const mockLista = new Map<string, Pedido & { identifier: string }>();
const mockEstado = { siguiente: 1 };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (p: Pedido) => {
    const identifier = p.identifier ?? `uuid-${String(mockEstado.siguiente++).padStart(3, '0')}`;
    mockLista.set(identifier, { ...p, identifier });
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

import { planDeRearmado, type AlarmaProgramada } from '../../../alarmas/rearmarAlarmas';
import { anotarCumplido } from '../cumplidoDeHoy';
import * as recordatorios from '../recordatoriosDeHabito';
import { diasPropiosDe } from '../utils/alarmasPorDia';
import type { DiaDelHabitoApi } from '../../types/habits.types';

const USUARIO = 'u-1';
const GYM = 'h-gym';
const TITULO = 'Gimnasio';
const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const semana = (cambios: Record<number, Partial<DiaDelHabitoApi>> = {}): DiaDelHabitoApi[] =>
  NOMBRES.map((weekday, i) => ({
    weekday, triggerTime: '07:00:00', active: true, reminderEnabled: true, reminderMinutesList: [30, 10],
    customTime: false, customReminder: false, customAlarm: false,
    alarm: { sound: true, vibration: true, voice: false, repeat: false },
    ...cambios[i + 1],
  }));

/** La antelación que dice el título de la alarma (`En 30 min: …` = 30; sin prefijo = a la hora = 0). */
const antelacionDe = (a: Pedido): number => {
  const m = /^En (\d+) min: /.exec(a.content.title ?? '');
  return m ? Number(m[1]) : 0;
};

beforeEach(async () => {
  mockLista.clear();
  mockEstado.siguiente = 1;
  await AsyncStorage.clear();
  jest.replaceProperty(Platform, 'OS', 'android');
});

describe('cada aviso de inicio dice hasta cuándo vale', () => {
  it('esquema diario: la antelación del aviso más la gracia, en cada alarma', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [30, 10, 0]);
    expect(mockLista.size).toBe(3);
    for (const a of mockLista.values()) {
      expect(a.content.data?.vigenteMin).toBe(antelacionDe(a) + 2);
      expect(a.content.data?.route).toBe('/habitos/h-gym');
    }
    expect([...mockLista.values()].map(a => a.content.data?.vigenteMin as number).sort((x, y) => x - y)).toEqual([2, 12, 32]);
  });

  it('esquema por día: lo mismo, con la combinación propia del día intacta', async () => {
    const dias = diasPropiosDe(semana({
      6: { customAlarm: true, alarm: { sound: false, vibration: true, voice: false, repeat: false }, reminderMinutesList: [30] },
    }));
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [30, 10], { dias });
    const delSabado = [...mockLista.values()].filter(a => a.identifier.startsWith('habito-h-gym-d6'));
    expect(delSabado.length).toBeGreaterThan(0);
    for (const a of mockLista.values()) {
      expect(a.content.data?.vigenteMin).toBe(antelacionDe(a) + 2);
    }
    for (const a of delSabado) {
      expect(a.content.data?.alarma).toEqual({ sonido: false, vibracion: true, voz: false, repetir: false });
    }
  });

  it('el puente de un hábito cumplido hoy (issue #33): sus alarmas de fecha también', async () => {
    const ahora = new Date(2098, 11, 31, 6, 0);
    await AsyncStorage.clear();
    // La nota de «se cumplió» de HOY (el 31/12/2098 para esta prueba).
    await anotarCumplido(USUARIO, GYM, '20981231');
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [30, 10], { ahora });
    const deFecha = [...mockLista.values()].filter(a => a.trigger.type === 'date');
    expect(deFecha.length).toBeGreaterThan(0);
    for (const a of deFecha) {
      expect(a.content.data?.vigenteMin).toBe(antelacionDe(a) + 2);
    }
  });

  it('el cambio de hora que rige desde mañana (D-91): la de hoy y la nueva', async () => {
    await recordatorios.programarConCambioDiferido(USUARIO, GYM, TITULO,
      { horaDeHoy: '07:00', horaNueva: '09:00', desde: '2099-01-02' }, [30], { ahora: new Date(2098, 11, 31, 5, 0) });
    expect(mockLista.size).toBeGreaterThan(0);
    for (const a of mockLista.values()) {
      expect(a.content.data?.vigenteMin).toBe(antelacionDe(a) + 2);
    }
  });
});

describe('el rearmado le pone la vigencia a los avisos que se programaron antes', () => {
  const ahoraMs = new Date(2026, 9, 21, 12, 0).getTime();
  const alarma = (identifier: string, content: AlarmaProgramada['content'], trigger: unknown = { type: 'daily', hour: 6, minute: 30, channelId: 'recordatorios-habitos-vib' }): AlarmaProgramada => ({
    identifier,
    content,
    trigger,
  });
  const inicio = (extra: Record<string, unknown> = {}): AlarmaProgramada['content'] => ({
    title: 'En 30 min: GIMNASIO',
    body: 'Te toca a las 07:00.',
    sound: 'default',
    data: { route: '/habitos/h-gym', ...extra },
  });

  it('un aviso de antes (sin `vigenteMin`) lo recibe en el pedido de rearmado, y el resto del contenido queda igual', () => {
    const [pedido] = planDeRearmado([alarma('habito-h-gym-inicio', inicio())], ahoraMs, 0);
    expect(pedido.content.data).toEqual({ route: '/habitos/h-gym', vigenteMin: 32 });
    expect(pedido.content.title).toBe('En 30 min: GIMNASIO');
    expect(pedido.content.body).toBe('Te toca a las 07:00.');
    expect(pedido.identifier).toBe('habito-h-gym-inicio');
  });

  it('el aviso a la hora (sin «En N min») recibe la gracia sola', () => {
    const [pedido] = planDeRearmado([alarma('uuid-1', { ...inicio(), title: 'GIMNASIO' })], ahoraMs, 0);
    expect(pedido.content.data?.vigenteMin).toBe(2);
  });

  it('uno que ya lo trae no se toca (idempotente)', () => {
    const [pedido] = planDeRearmado([alarma('uuid-1', inicio({ vigenteMin: 32 }))], ahoraMs, 0);
    expect(pedido.content.data).toEqual({ route: '/habitos/h-gym', vigenteMin: 32 });
    const [otra] = planDeRearmado([alarma('uuid-1', inicio({ vigenteMin: 99 }))], ahoraMs, 0);
    expect(otra.content.data?.vigenteMin).toBe(99);
  });

  it('un aviso agrupado (E-410) toma la vigencia de su texto original, no de «2 hábitos a las 07:00»', () => {
    const agrupado = alarma('uuid-2', {
      title: '2 hábitos a las 07:00',
      body: 'GIMNASIO · Agua',
      data: { route: '/habitos/h-gym', avisoOriginal: { title: 'En 10 min: GIMNASIO', body: 'Te toca a las 07:00.' } },
    });
    const [pedido] = planDeRearmado([agrupado], ahoraMs, 0);
    expect(pedido.content.data?.vigenteMin).toBe(12);
    expect(pedido.content.title).toBe('2 hábitos a las 07:00');
  });

  it('lo que no es un aviso de inicio queda sin el campo: repeticiones, acciones, eventos, el aviso diario de las acciones', () => {
    const fecha = { type: 'date', value: ahoraMs + 3_600_000, channelId: 'recordatorios-habitos-vib' };
    const pedidos = planDeRearmado([
      alarma('habito-h-gym-rep-20261021-5', { title: 'GIMNASIO', body: 'Te tocaba a las 07:00.', data: { route: '/habitos/h-gym' } }, fecha),
      alarma('accion-1', { title: 'En 30 min: Llamar', body: 'Te toca a las 07:00.', data: { route: '/objetivos' } }, fecha),
      alarma('evento-1', { title: 'Mentoría', body: 'Empieza a las 07:00.', data: { route: '/eventos/e-1' } }, fecha),
      alarma('radar', { title: 'Código Renaser', body: 'Responde', data: {} }, fecha),
    ], ahoraMs, 0);
    expect(pedidos).toHaveLength(4);
    for (const p of pedidos) expect(p.content.data).not.toHaveProperty('vigenteMin');
  });

  it('un aviso de inicio sin `data` (antes de la ruta) no se inventa uno: lo arregla primero el paso de las rutas', () => {
    const [pedido] = planDeRearmado([alarma('uuid-3', { title: 'En 30 min: GIMNASIO', body: 'Te toca a las 07:00.', data: null })], ahoraMs, 0);
    expect(pedido.content.data).toBeUndefined();
  });
});
