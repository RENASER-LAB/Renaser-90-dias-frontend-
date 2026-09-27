/**
 * «Escuchar» en Yo → Alarmas (2026-09-27, pedido del dueño: que la persona oiga cada sonido antes de
 * elegirlo). Contra el código anterior falla: solo existía «Probar el sonido», que hacía sonar el ya
 * elegido a los 3 segundos; no había forma de oír una opción sin elegirla.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Pedido = { identifier?: string; content: { title: string; body: string; sound: unknown }; trigger: Record<string, unknown> };
const mockPedidos: Pedido[] = [];
const mockCanales: Array<{ id: string; sound?: unknown }> = [];
const mockPermiso = { dado: true };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockPermiso.dado, canAskAgain: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: mockPermiso.dado })),
  setNotificationChannelAsync: jest.fn(async (id: string, canal: { sound?: unknown }) => {
    mockCanales.push({ id, ...canal });
    return null;
  }),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval', DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (pedido: Pedido) => {
    mockPedidos.push(pedido);
    return pedido.identifier ?? 'x';
  }),
}));

import { guardarPreferenciasDeAlarmas, preferenciasDeAlarmas } from '../preferenciasDeAlarmas';
import { escucharSonido, probarSonido } from '../probarSonido';

beforeEach(async () => {
  mockPedidos.length = 0;
  mockCanales.length = 0;
  mockPermiso.dado = true;
  await AsyncStorage.clear();
  // Los canales solo existen en Android: `asegurarCanal` no hace nada en otra plataforma.
  jest.replaceProperty(Platform, 'OS', 'android');
});

describe('escuchar un sonido antes de elegirlo', () => {
  it('suena YA, por el canal de ese sonido (no por una alarma: no depende del permiso de alarmas exactas)', async () => {
    expect(await escucharSonido('relajar-lluvia')).toBe(true);
    expect(mockPedidos).toEqual([
      {
        identifier: 'renaser-prueba-de-sonido',
        content: { title: 'Así suena tu alarma', body: 'Lluvia. Esta es una prueba de Renaser.', sound: 'relajar_lluvia.mp3' },
        trigger: { channelId: 'recordatorios-habitos-relajar-lluvia' },
      },
    ]);
    expect(mockCanales).toEqual([
      expect.objectContaining({ id: 'recordatorios-habitos-relajar-lluvia', sound: 'relajar_lluvia.mp3' }),
    ]);
  });

  it('con «Voz» suena la de Despertar, que dice su nombre', async () => {
    await escucharSonido('voz');
    expect(mockPedidos[0]).toMatchObject({
      content: { body: 'Con «Voz», cada hábito dice su nombre. Este es Despertar.', sound: 'voz_habito_despertar.mp3' },
      trigger: { channelId: 'recordatorios-habitos-voz-despertar' },
    });
  });

  it('no cambia lo elegido: escuchar la marimba no la deja puesta', async () => {
    await guardarPreferenciasDeAlarmas('u-1', { eventosActivas: true, sonido: 'campana' });
    await escucharSonido('alertar-marimba');
    expect((await preferenciasDeAlarmas('u-1')).sonido).toBe('campana');
  });

  it('sin permiso para avisar, no suena y lo dice', async () => {
    mockPermiso.dado = false;
    expect(await escucharSonido('alertar-amanecer')).toBe(false);
    expect(mockPedidos).toEqual([]);
  });

  it('«Probar el sonido» sigue como antes: el elegido, a los 3 segundos, y reemplaza a la prueba anterior', async () => {
    await probarSonido('alertar-campana');
    expect(mockPedidos[0]).toMatchObject({
      identifier: 'renaser-prueba-de-sonido',
      content: { body: 'Campanas. Esta es una prueba de Renaser.', sound: 'alertar_campana.mp3' },
      trigger: { type: 'timeInterval', seconds: 3, channelId: 'recordatorios-habitos-alertar-campana' },
    });
  });
});
