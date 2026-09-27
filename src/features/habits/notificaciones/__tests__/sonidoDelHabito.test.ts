/**
 * El sonido de Yo → Alarmas llega a TODOS los recordatorios de hábitos (2026-09-26, voz).
 *
 * Contra el código viejo falla: sin sonido fijado por hábito, `sonidoDe` devolvía siempre «El del
 * teléfono», así que elegir «Voz» en Yo → Alarmas no cambiaba ningún hábito salvo Despertar.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Programada = { content: { title: string; sound: unknown }; trigger: { channelId: string; type: string } };
const mockProgramadas: Programada[] = [];
const mockEstado = { siguienteId: 1 };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (pedido: Programada) => {
    mockProgramadas.push(pedido);
    return `alarma-${mockEstado.siguienteId++}`;
  }),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
}));

import * as recordatorios from '../recordatoriosDeHabito';
import { guardarPreferenciasDeAlarmas } from '../../../alarmas/preferenciasDeAlarmas';

const USUARIO = 'u-1';

beforeEach(async () => {
  mockProgramadas.length = 0;
  mockEstado.siguienteId = 1;
  await AsyncStorage.clear();
});

describe('sonido de los recordatorios de hábitos', () => {
  it('sin elegir nada, el del teléfono por el canal de siempre (nada cambia para quien no tocó Alarmas)', async () => {
    await recordatorios.programar(USUARIO, 'h-leer', 'Leer', '21:30', [10]);
    expect(mockProgramadas[0].trigger.channelId).toBe('recordatorios-habitos');
    expect(mockProgramadas[0].content.sound).toBe(true);
  });

  it('con «Voz» en Yo → Alarmas, cualquier hábito sale con la voz y el nombre sigue en el texto', async () => {
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'voz' });
    await recordatorios.programar(USUARIO, 'h-leer', 'Leer', '21:30', [0]);
    expect(mockProgramadas[0]).toMatchObject({
      content: { title: 'Leer', sound: 'voz_habito.wav' },
      trigger: { channelId: 'recordatorios-habitos-voz' },
    });
  });

  it('el sonido fijado a un hábito (Despertar) manda sobre el general', async () => {
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'voz' });
    await recordatorios.fijarSonido(USUARIO, 'h-despertar', 'campana');
    expect(await recordatorios.sonidoDe(USUARIO, 'h-despertar')).toBe('campana');
    expect(await recordatorios.sonidoDe(USUARIO, 'h-leer')).toBe('voz');
  });

  it('lista los ids de todas las alarmas de hábitos de la persona, sin el repaso de los domingos ni las de otro usuario', async () => {
    await recordatorios.programar(USUARIO, 'h-leer', 'Leer', '21:30', [30, 0]);
    await recordatorios.programar(USUARIO, 'h-agua', 'Agua', '08:00', [0]);
    await recordatorios.programar('otro', 'h-leer', 'Leer', '21:30', [0]);
    await recordatorios.programarRepasoSemanal(USUARIO);
    expect((await recordatorios.idsDeRecordatoriosDeHabitos(USUARIO)).sort()).toEqual(['alarma-1', 'alarma-2', 'alarma-3']);
  });
});
