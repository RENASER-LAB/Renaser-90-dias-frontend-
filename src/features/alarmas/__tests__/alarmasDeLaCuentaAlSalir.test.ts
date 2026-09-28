/**
 * E-413 (emulador, 28/09): al cerrar sesión quedaban programadas las alarmas de la cuenta anterior. Con
 * `e2e-ap-rot2` adentro seguían sonando los cinco hábitos de `e2e-admin` a las 12:00.
 *
 * La prueba usa el `AuthProvider` de verdad (la red, simulada) y una librería de avisos de mentira. Contra
 * el código anterior fallan las dos primeras: cerrar sesión y entrar con otra cuenta no cancelaban nada.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockLista = new Map<string, { identifier: string; content: Record<string, unknown>; trigger: Record<string, unknown> }>();
const mockEstado = { siguiente: 1 };
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (p: { identifier?: string; content: Record<string, unknown>; trigger: Record<string, unknown> }) => {
    const identifier = p.identifier ?? `alarma-${mockEstado.siguiente++}`;
    mockLista.set(identifier, { identifier, content: p.content, trigger: p.trigger });
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockLista.delete(id);
  }),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockLista.clear();
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockLista.values()]),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: () => undefined })),
  addPushTokenListener: jest.fn(() => ({ remove: () => undefined })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
}));

const mockPerfil = { id: 'u-admin' };
jest.mock('../../auth/api/authApi', () => ({
  iniciarSesion: jest.fn(async () => ({ id: mockPerfil.id, email: `${mockPerfil.id}@x.test`, fullName: 'X', role: 'TRAINEE', status: 'ACTIVE' })),
  cerrarSesion: jest.fn(async () => undefined),
  perfilActual: jest.fn(async () => ({ id: mockPerfil.id })),
}));
jest.mock('../../../services/http/apiClient', () => ({
  ApiError: class extends Error {},
  cargarTokenPersistido: jest.fn(async () => null),
  setTokenSesion: jest.fn(),
  suscribirSesionVencida: jest.fn(() => () => undefined),
  apiFetch: jest.fn(async () => ({})),
  getTokenSesion: jest.fn(() => null),
}));
jest.mock('../../onboarding/api/onboardingApi', () => ({ obtenerEstado: jest.fn(async () => ({ completed: true })) }));
jest.mock('../../mentor/api/mentorApi', () => ({ capacidadesDePrograma: jest.fn(async () => ({})) }));
jest.mock('../../chat/tiempoReal/conexionStomp', () => ({ conexionChat: { cerrarTodo: jest.fn() } }));
jest.mock('../../mentor/notificaciones/pushNativo', () => ({
  registrarTokenPushNativo: jest.fn(async () => undefined),
  escucharRotacionDeToken: jest.fn(() => () => undefined),
  olvidarTokenPushRegistrado: jest.fn(async () => undefined),
}));
jest.mock('../../mentor/notificaciones/rutaDeAviso', () => ({
  escucharAperturaDeAviso: jest.fn(() => () => undefined),
  olvidarRutaPendiente: jest.fn(),
}));
jest.mock('../../auth/api/googleAuth', () => ({ loginConGoogle: jest.fn() }));

import { AuthProvider, useAuth } from '../../auth/context/AuthContext';
import * as recordatorios from '../../habits/notificaciones/recordatoriosDeHabito';
import {
  guardarPreferenciasDeAcciones,
  PREFERENCIAS_DE_ACCIONES_POR_DEFECTO,
  programarRecordatorioDiario,
} from '../../objetivos/notificaciones/recordatoriosDeAcciones';
import { rearmarLoLocalDeLaCuenta } from '../alarmasDeLaCuenta';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Sesion = ReturnType<typeof useAuth>;

async function montar(): Promise<{ sesion: () => Sesion }> {
  let actual!: Sesion;
  function Sonda() {
    actual = useAuth();
    return null;
  }
  await act(async () => {
    TestRenderer.create(React.createElement(AuthProvider, null, React.createElement(Sonda)));
  });
  return { sesion: () => actual };
}

async function entrarComo(sesion: () => Sesion, id: string): Promise<void> {
  mockPerfil.id = id;
  await act(async () => {
    await sesion().login(`${id}@x.test`, 'clave');
  });
}

async function armarTodoDe(id: string): Promise<void> {
  await recordatorios.programar(id, 'h-jugo', 'JUGO VERDE', '12:00', [0]);
  await recordatorios.programarRepasoSemanal(id);
  await guardarPreferenciasDeAcciones(id, { ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, diarioActivo: true, horaDiaria: '08:00' });
  await programarRecordatorioDiario(id, '08:00');
}

beforeEach(async () => {
  mockLista.clear();
  mockEstado.siguiente = 1;
  await AsyncStorage.clear();
});

describe('las alarmas locales son de una cuenta (E-413)', () => {
  it('al cerrar sesión no queda ninguna alarma programada', async () => {
    const { sesion } = await montar();
    await entrarComo(sesion, 'u-admin');
    await armarTodoDe('u-admin');
    expect(mockLista.size).toBe(3);

    await act(async () => {
      sesion().logout();
      await new Promise(r => setTimeout(r, 0));
    });

    expect(mockLista.size).toBe(0);
    expect(await recordatorios.idsDeRecordatoriosDeHabitos('u-admin')).toEqual([]);
  });

  it('al entrar con otra cuenta sin haber cerrado sesión, se sueltan las de la anterior', async () => {
    const { sesion } = await montar();
    await entrarComo(sesion, 'u-admin');
    await armarTodoDe('u-admin');

    await entrarComo(sesion, 'u-otra');

    expect(mockLista.size).toBe(0);
  });

  it('con la misma cuenta, las alarmas quedan; y lo que solo sabe el teléfono vuelve al volver a entrar', async () => {
    const { sesion } = await montar();
    await entrarComo(sesion, 'u-admin');
    await armarTodoDe('u-admin');
    await entrarComo(sesion, 'u-admin');
    expect(mockLista.size).toBe(3);

    await act(async () => {
      sesion().logout();
      await new Promise(r => setTimeout(r, 0));
    });
    await entrarComo(sesion, 'u-admin');
    await rearmarLoLocalDeLaCuenta('u-admin');

    const titulos = [...mockLista.values()].map(a => a.content.title).sort();
    expect(titulos).toEqual(['Arma tu semana', 'Tus acciones del día']);
    expect(await recordatorios.tieneRepasoSemanal('u-admin')).toBe(true);
  });
});
