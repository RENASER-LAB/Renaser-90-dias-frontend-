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
/** `JUGO VERDE` del catálogo (V4 del backend), uno de los dos que se pueden renombrar. */
const JUGO_VERDE = '00006bd5-ab74-4317-b022-ae2e3a878d55';

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

  it('con «Voz» en Yo → Alarmas, un hábito propio sale con la frase genérica y el nombre sigue en el texto', async () => {
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'voz' });
    await recordatorios.programar(USUARIO, 'h-leer', 'Leer', '21:30', [0]);
    expect(mockProgramadas[0]).toMatchObject({
      content: { title: 'Leer', sound: 'voz_habito.mp3' },
      trigger: { channelId: 'recordatorios-habitos-voz' },
    });
  });

  it('con «Voz», un hábito del catálogo sale por su canal y la voz dice su nombre (2026-09-27)', async () => {
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'voz' });
    await recordatorios.programar(USUARIO, JUGO_VERDE, 'JUGO VERDE', '09:00', [10, 0]);
    expect(mockProgramadas.map(p => [p.content.title, p.content.sound, p.trigger.channelId])).toEqual([
      ['En 10 min: JUGO VERDE', 'voz_habito_jugo_verde.mp3', 'recordatorios-habitos-voz-jugo_verde'],
      ['JUGO VERDE', 'voz_habito_jugo_verde.mp3', 'recordatorios-habitos-voz-jugo_verde'],
    ]);
  });

  it('con «Voz», el mismo hábito renombrado dice la frase genérica (no el nombre que ya no tiene)', async () => {
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'voz' });
    await recordatorios.programar(USUARIO, JUGO_VERDE, 'Agua con miel', '09:00', [0]);
    expect(mockProgramadas[0].trigger.channelId).toBe('recordatorios-habitos-voz');
  });

  it('con un sonido para alertar, cualquier hábito sale por el canal de ese sonido', async () => {
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'alertar-kalimba' });
    await recordatorios.programar(USUARIO, JUGO_VERDE, 'JUGO VERDE', '09:00', [0]);
    expect(mockProgramadas[0]).toMatchObject({
      content: { sound: 'alertar_kalimba.mp3' },
      trigger: { channelId: 'recordatorios-habitos-alertar-kalimba' },
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

  it('y agrupados por hábito, para que el cambio de sonido sepa de quién es cada alarma', async () => {
    await recordatorios.programar(USUARIO, 'h-leer', 'Leer', '21:30', [30, 0]);
    await recordatorios.programar(USUARIO, JUGO_VERDE, 'JUGO VERDE', '08:00', [0]);
    await recordatorios.programar('otro', 'h-leer', 'Leer', '21:30', [0]);
    const porHabito = await recordatorios.recordatoriosPorHabito(USUARIO);
    expect(Object.fromEntries(porHabito)).toEqual({ 'h-leer': ['alarma-1', 'alarma-2'], [JUGO_VERDE]: ['alarma-3'] });
  });
});
