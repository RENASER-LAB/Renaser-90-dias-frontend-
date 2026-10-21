import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Platform } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El sincronizador de `App.tsx` (spec 010): al abrir la app renueva la ventana de 7 días de las repeticiones del
 * recordatorio diario («Repetir si no la atiendo») y pone al día las alarmas de las acciones solo si algún día pide aviso.
 * Quien no usa ninguna de las dos cosas no paga ninguna lectura.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Pedido = { identifier?: string; content: Record<string, unknown>; trigger: Record<string, unknown> };
const mockSistema = new Map<string, Pedido>();

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (p: Pedido) => {
    const identifier = p.identifier ?? `uuid-${mockSistema.size + 1}`;
    mockSistema.set(identifier, { ...p, identifier });
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockSistema.delete(id);
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockSistema.entries()].map(([identifier, p]) => ({ ...p, identifier }))),
}));

const mockSesion = { id: 'u-sync-1' };
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: mockSesion.id } }),
}));
const mockAgendadas = jest.fn<() => Promise<{ desde: string; hasta: string; rocas: unknown[] }>>();
jest.mock('../../api/objetivosApi', () => ({
  obtenerRocasAgendadas: () => mockAgendadas(),
  obtenerRocasDeHoy: async () => [],
  obtenerRocasDeManana: async () => [],
}));

import { guardarPreferenciasDeAcciones } from '../../notificaciones/recordatoriosDeAcciones';
import { SincronizadorDeAcciones } from '../SincronizadorDeAcciones';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
let siguiente = 1;
const repeticiones = () => [...mockSistema.keys()].filter(id => id.startsWith('acciones-diario-rep-'));

async function abrirLaApp(prefs: Parameters<typeof guardarPreferenciasDeAcciones>[1]) {
  // Un usuario distinto por prueba: el sincronizador recuerda con quién corrió por última vez.
  mockSesion.id = `u-sync-${siguiente++}`;
  await guardarPreferenciasDeAcciones(mockSesion.id, prefs);
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(SincronizadorDeAcciones));
    await new Promise(r => setTimeout(r, 10));
  });
}

beforeEach(async () => {
  mockSistema.clear();
  mockAgendadas.mockReset();
  mockAgendadas.mockResolvedValue({ desde: '2999-01-01', hasta: '2999-01-07', rocas: [] });
  await AsyncStorage.clear();
  jest.replaceProperty(Platform, 'OS', 'android');
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('al abrir la app', () => {
  it('renueva la ventana de 7 días de las repeticiones del recordatorio diario, aunque no haya avisos por acción', async () => {
    await abrirLaApp({
      diarioActivo: true, horaDiaria: '07:00', antelaciones: [], alarma: { sonido: true, vibracion: true, voz: false, repetir: true },
    });
    // 7 días con dos repeticiones cada uno (la de hoy puede haber pasado ya).
    expect(repeticiones().length).toBeGreaterThanOrEqual(12);
    // Sin avisos por acción, no se lee la lista de acciones.
    expect(mockAgendadas).not.toHaveBeenCalled();
  });

  it('con aviso en algún día, lee la semana agendada', async () => {
    await abrirLaApp({ diarioActivo: false, horaDiaria: '07:00', antelaciones: [], dias: { 6: { antelaciones: [10] } } });
    expect(mockAgendadas).toHaveBeenCalledTimes(1);
  });

  it('quien no usa ni el recordatorio ni el aviso no paga ninguna lectura', async () => {
    await abrirLaApp({ diarioActivo: false, horaDiaria: '07:00', antelaciones: [] });
    expect(mockAgendadas).not.toHaveBeenCalled();
    expect(mockSistema.size).toBe(0);
  });
});
