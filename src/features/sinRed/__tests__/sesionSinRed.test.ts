/**
 * Spec 048 (FR-001, FR-002, FR-009): abrir la app sin señal no saca al login. Antes, el arranque trataba igual «sin red» que
 * «token vencido» y borraba la sesión. Usa el `AuthProvider` de verdad con la red simulada.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async () => 'x'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: () => undefined })),
  addPushTokenListener: jest.fn(() => ({ remove: () => undefined })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
}));

const mockRed = { hay: true, token: 'token-de-la-sesion-de-ana-0001' as string | null };
jest.mock('../../../services/http/apiClient', () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, m: string) {
      super(m);
      this.status = status;
    }
    get esDeRed() {
      return this.status === 0;
    }
  }
  return {
    ApiError,
    cargarTokenPersistido: jest.fn(async () => mockRed.token),
    setTokenSesion: jest.fn((t: string | null) => {
      mockRed.token = t;
    }),
    suscribirSesionVencida: jest.fn(() => () => undefined),
    apiFetch: jest.fn(async () => ({})),
    getTokenSesion: jest.fn(() => mockRed.token),
    ponerModoSoloLectura: jest.fn(),
  };
});
const ANA = { id: 'u-ana', email: 'ana@x.test', fullName: 'Ana', role: 'TRAINEE', status: 'ACTIVE' };
jest.mock('../../auth/api/authApi', () => ({
  iniciarSesion: jest.fn(async () => ANA),
  cerrarSesion: jest.fn(async () => undefined),
  perfilActual: jest.fn(async () => {
    if (!mockRed.hay) {
      const { ApiError } = jest.requireMock('../../../services/http/apiClient') as { ApiError: new (s: number, m: string) => Error };
      throw new ApiError(0, 'No se pudo conectar con el servidor.');
    }
    return ANA;
  }),
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
import { guardarPerfil, leerPerfilGuardado } from '../perfilGuardado';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Sesion = ReturnType<typeof useAuth>;

async function abrirLaApp(): Promise<() => Sesion> {
  let actual!: Sesion;
  function Sonda() {
    actual = useAuth();
    return null;
  }
  await act(async () => {
    TestRenderer.create(React.createElement(AuthProvider, null, React.createElement(Sonda)));
  });
  return () => actual;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockRed.hay = true;
  mockRed.token = 'token-de-la-sesion-de-ana-0001';
});

describe('sesión sin señal (spec 048)', () => {
  it('abrir la app sin señal con la sesión guardada entra con el último perfil, sin pasar por el login', async () => { // spec 048 FR-001 FR-002
    await guardarPerfil('token-de-la-sesion-de-ana-0001', ANA as never, true);
    mockRed.hay = false;

    const sesion = await abrirLaApp();

    expect(sesion().user?.id).toBe('u-ana');
    expect(sesion().isAuthenticated).toBe(true);
    expect(mockRed.token).toBe('token-de-la-sesion-de-ana-0001');
  });

  it('sin señal y sin perfil guardado de ESA sesión, no se inventa nada: va al login como antes', async () => {
    await guardarPerfil('token-de-OTRA-sesion-9999', ANA as never, true);
    mockRed.hay = false;

    const sesion = await abrirLaApp();

    expect(sesion().user).toBeNull();
  });

  it('con señal, el arranque guarda el perfil para la próxima vez sin señal', async () => { // spec 048 FR-002
    await abrirLaApp();

    expect((await leerPerfilGuardado('token-de-la-sesion-de-ana-0001'))?.perfil.id).toBe('u-ana');
  });

  it('cerrar sesión borra lo guardado para entrar sin señal', async () => { // spec 048 FR-009
    const sesion = await abrirLaApp();
    await act(async () => {
      sesion().logout();
    });

    expect(await leerPerfilGuardado('token-de-la-sesion-de-ana-0001')).toBeNull();
  });
});
