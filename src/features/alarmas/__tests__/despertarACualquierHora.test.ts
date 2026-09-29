/**
 * Despertar (y cualquier hábito) a cualquier hora del día — D-230 del backend, 2026-09-29.
 *
 * Pedido del dueño, probando: «que no se limite a eso… no que despertar sea sí o sí en la mañana…
 * hay gente que trabaja en la noche… no debes bloquearlo».
 *
 * Lo que se prueba acá es lo que depende de esa hora en el teléfono: la alarma DAILY de Despertar a
 * las 22:00 y a las 03:00 (con antelación que cruza la medianoche), y que ni la regla escrita de
 * «Despertar es de mañana» (`MOMENTO_ESPERADO`) ni el texto «Desde mañana tu hora de despertar…»
 * sigan ahí. Contra el código anterior fallan las dos últimas: `MOMENTO_ESPERADO` existía con
 * `WAKE_UP: ['madrugada', 'mañana']` y el texto decía «mañana».
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Salida = {
  identifier: string;
  content: { title: string | null; body: string | null; data?: Record<string, unknown>; sound: string | null };
  trigger: Record<string, unknown>;
};

const mockLista = new Map<string, Salida>();
const mockCanales = new Map<string, { sound?: string | null }>();
const mockEstado = { siguiente: 1 };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async (id: string, c: { sound?: string | null }) => {
    mockCanales.set(id, c);
    return null;
  }),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (p: {
    identifier?: string;
    content: { title?: string | null; body?: string | null; data?: Record<string, unknown>; sound?: unknown };
    trigger: Record<string, unknown>;
  }) => {
    const identifier = p.identifier ?? `alarma-${String(mockEstado.siguiente++).padStart(3, '0')}`;
    const t = p.trigger;
    const trigger = t.type === 'date'
      ? { type: 'date', value: t.date instanceof Date ? t.date.getTime() : t.date, channelId: t.channelId }
      : { ...t };
    mockLista.set(identifier, {
      identifier,
      content: {
        title: p.content.title ?? null,
        body: p.content.body ?? null,
        data: p.content.data,
        sound: p.content.sound === false ? null : typeof p.content.sound === 'string' ? 'custom' : 'default',
      },
      trigger,
    });
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockLista.delete(id);
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockLista.values()]),
}));

import * as recordatorios from '../../habits/notificaciones/recordatoriosDeHabito';
import * as momentosDelDia from '../../habits/utils/momentosDelDia';
import { textoDelCambioDeDespertar } from '../textoDelCambioDeDespertar';

const USUARIO = 'u-1';
const DESPERTAR = { id: '899a2151-e98c-4b61-a46c-b55134240d17', titulo: 'DESPERTAR' };

function diarias(): Array<{ hora: unknown; minuto: unknown }> {
  return [...mockLista.values()]
    .filter(a => a.trigger.type === 'daily')
    .map(a => ({ hora: a.trigger.hour, minuto: a.trigger.minute }));
}

beforeEach(async () => {
  mockLista.clear();
  mockCanales.clear();
  mockEstado.siguiente = 1;
  await AsyncStorage.clear();
});

describe('Despertar a cualquier hora (D-230)', () => {
  it('a las 22:00, con aviso 30 min antes y a la hora: suena 21:30 y 22:00 todos los días', async () => {
    const ok = await recordatorios.programar(USUARIO, DESPERTAR.id, DESPERTAR.titulo, '22:00', [30, 0]);

    expect(ok).toBe(true);
    expect(diarias()).toEqual(expect.arrayContaining([{ hora: 21, minuto: 30 }, { hora: 22, minuto: 0 }]));
    expect(diarias()).toHaveLength(2);
  });

  it('a las 03:00 de la madrugada: suena 02:30 y 03:00', async () => {
    await recordatorios.programar(USUARIO, DESPERTAR.id, DESPERTAR.titulo, '03:00', [30, 0]);

    expect(diarias()).toEqual(expect.arrayContaining([{ hora: 2, minuto: 30 }, { hora: 3, minuto: 0 }]));
  });

  it('a las 00:10 con 30 min de antelación: el aviso cae a las 23:40 del día anterior, sin hora inválida', async () => {
    await recordatorios.programar(USUARIO, DESPERTAR.id, DESPERTAR.titulo, '00:10', [30]);

    expect(diarias()).toEqual([{ hora: 23, minuto: 40 }]);
  });

  it('no queda escrita ninguna franja esperada por hábito (antes: WAKE_UP solo madrugada o mañana)', () => {
    expect('MOMENTO_ESPERADO' in momentosDelDia).toBe(false);
  });

  it('el aviso del cambio no dice «mañana», que junto a «despertar» se lee como franja', () => {
    const texto = textoDelCambioDeDespertar('22:00', '06:00');

    expect(texto).toBe('Desde el día siguiente, tu hora de despertar es a las 22:00. Hoy la alarma sigue a las 06:00.');
    expect(texto).not.toMatch(/mañana/i);
    expect(textoDelCambioDeDespertar('03:00', null)).toBe('Desde el día siguiente, tu hora de despertar es a las 03:00.');
  });
});
