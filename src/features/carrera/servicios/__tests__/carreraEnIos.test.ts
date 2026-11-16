jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockUbicacion = {
  hasServicesEnabledAsync: jest.fn(async () => true),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true })),
  hasStartedLocationUpdatesAsync: jest.fn(async () => false),
  stopLocationUpdatesAsync: jest.fn(async () => undefined),
  startLocationUpdatesAsync: jest.fn(async () => undefined),
  Accuracy: { BestForNavigation: 6 },
  ActivityType: { Fitness: 3 },
};
const mockTareas: { nombre?: string; cuerpo?: (arg: { data: unknown; error: unknown }) => Promise<void> } = {};
jest.mock('expo-location', () => mockUbicacion, { virtual: true });
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn((nombre: string, cuerpo: (arg: { data: unknown; error: unknown }) => Promise<void>) => {
    mockTareas.nombre = nombre;
    mockTareas.cuerpo = cuerpo;
  }),
}), { virtual: true });
const mockPasos = {
  isAvailableAsync: jest.fn(async () => true),
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  watchStepCount: jest.fn((_cb: (r: { steps: number }) => void) => ({ remove: jest.fn() })),
};
const mockNotificaciones = { scheduleNotificationAsync: jest.fn(async () => 'id') };
jest.mock('../../../habits/notificaciones/recordatoriosDeHabito', () => ({ cargarNotificaciones: () => mockNotificaciones }));
jest.mock('expo-sensors', () => ({ Pedometer: mockPasos }), { virtual: true });

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { seOfreceLaCarrera } from '../../utils/entradaDeLaCarrera';
import { laCarreraCorreEn } from '../../utils/plataformaDeLaCarrera';
import { crearCarrera } from '../../utils/motorDeCarrera';
import { guardarCarreraEnCurso } from '../almacenCarrera';
import { guiaDeBateriaPendiente } from '../guiaDeBateriaDeLaCarrera';
import { mostrarNotificacionDeCarrera } from '../notificacionDeCarrera';
import { carreraActual, empezarCarrera, pausarCarrera, reiniciarParaPruebas, seguirCarrera } from '../carreraEnVivo';
import { escucharPasos, prepararPodometro } from '../podometro';
import { definirTareaDeLaCarrera, detenerGps, empezarGps, pedirPermisoDeUbicacion, TAREA_GPS_DE_LA_CARRERA } from '../tareaDeUbicacion';

const ponerSistema = (os: string) => Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });

beforeEach(async () => {
  jest.clearAllMocks();
  reiniciarParaPruebas();
  await AsyncStorage.clear();
  mockUbicacion.getForegroundPermissionsAsync.mockResolvedValue({ granted: false });
  mockUbicacion.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
  mockUbicacion.hasServicesEnabledAsync.mockResolvedValue(true);
  mockUbicacion.hasStartedLocationUpdatesAsync.mockResolvedValue(false);
});

type OpcionesDeInicio = Record<string, unknown> & { foregroundService?: Record<string, unknown> };
const opcionesUsadas = () => (mockUbicacion.startLocationUpdatesAsync.mock.calls[0] as unknown as [string, OpcionesDeInicio])[1];

describe('la carrera con GPS en iPhone (spec 042, 2026-11-16)', () => {
  // spec 042 FR-047
  it('se ofrece en iOS y en Android, no en la web', () => {
    expect(laCarreraCorreEn('ios')).toBe(true);
    expect(laCarreraCorreEn('android')).toBe(true);
    expect(laCarreraCorreEn('web')).toBe(false);
    const base = { esHoy: true, carrerasDelDia: null, disponible: true, prendida: true };
    expect(seOfreceLaCarrera({ ...base, plataforma: 'ios' })).toBe(true);
    expect(seOfreceLaCarrera({ ...base, plataforma: 'android' })).toBe(true);
    expect(seOfreceLaCarrera({ ...base, plataforma: 'web' })).toBe(false);
  });

  // spec 042 FR-047, FR-049
  it('en iOS pide el permiso «mientras se usa» y lo da por concedido', async () => {
    ponerSistema('ios');
    expect(await pedirPermisoDeUbicacion()).toBe('concedido');
    expect(mockUbicacion.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  // spec 042 FR-049
  it('sin permiso o con la ubicación apagada, la carrera no empieza y dice por qué', async () => {
    ponerSistema('ios');
    mockUbicacion.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false });
    expect(await pedirPermisoDeUbicacion()).toBe('denegado');
    mockUbicacion.hasServicesEnabledAsync.mockResolvedValue(false);
    expect(await pedirPermisoDeUbicacion()).toBe('gps-apagado');
  });

  // spec 042 FR-048
  it('en iOS el GPS corre en segundo plano con la tarea, la barra azul y sin pausarse solo', async () => {
    ponerSistema('ios');
    expect(await empezarGps()).toBe(true);
    const [tarea, opciones] = mockUbicacion.startLocationUpdatesAsync.mock.calls[0] as unknown as [string, OpcionesDeInicio];
    expect(tarea).toBe(TAREA_GPS_DE_LA_CARRERA);
    expect(opciones.showsBackgroundLocationIndicator).toBe(true);
    expect(opciones.pausesUpdatesAutomatically).toBe(false);
    expect(opciones.activityType).toBe(mockUbicacion.ActivityType.Fitness);
    expect(opciones.accuracy).toBe(mockUbicacion.Accuracy.BestForNavigation);
    // iOS no tiene servicio en primer plano.
    expect(opciones.foregroundService).toBeUndefined();
    await detenerGps(true);
    expect(mockUbicacion.stopLocationUpdatesAsync).toHaveBeenCalledWith(TAREA_GPS_DE_LA_CARRERA);
  });

  // spec 042 FR-011, FR-048
  it('en Android el GPS arranca igual que hoy: servicio en primer plano y sin lo de iOS', async () => {
    ponerSistema('android');
    expect(await empezarGps()).toBe(true);
    const opciones = opcionesUsadas();
    expect(opciones.foregroundService?.killServiceOnDestroy).toBe(false);
    expect(opciones.showsBackgroundLocationIndicator).toBeUndefined();
    expect(opciones.pausesUpdatesAutomatically).toBe(false);
  });

  // spec 042 FR-047
  it('en la web no arranca nada', async () => {
    ponerSistema('web');
    expect(await pedirPermisoDeUbicacion()).toBe('no-disponible');
    expect(await empezarGps()).toBe(false);
    expect(mockUbicacion.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  // spec 042 FR-005, FR-048
  it('en iOS la tarea del GPS se define y registra los puntos de la carrera, también en segundo plano', async () => {
    ponerSistema('ios');
    definirTareaDeLaCarrera();
    expect(mockTareas.nombre).toBe(TAREA_GPS_DE_LA_CARRERA);
    const T0 = Date.UTC(2026, 10, 16, 11, 0, 0);
    empezarCarrera({ carreraId: 'c-ios', cuentaId: 'ana', pesoKg: 70, conPasos: false }, T0);
    pausarCarrera(T0);
    seguirCarrera(T0 + 3000);
    const punto = (i: number) => ({
      timestamp: T0 + 4000 + i * 1000,
      coords: { latitude: -12.0464 + i * 0.00003, longitude: -77.0428, accuracy: 5, altitude: 100, speed: 3 },
    });
    await mockTareas.cuerpo?.({ data: { locations: [punto(0), punto(1), punto(2)] }, error: null });
    expect(carreraActual()?.ruta.length).toBeGreaterThan(0);
  });

  // spec 042 FR-006, FR-048
  it('en iOS la tarea levanta la carrera guardada si el proceso nació sin ella', async () => {
    ponerSistema('ios');
    const T0 = Date.now();
    await guardarCarreraEnCurso(crearCarrera({ carreraId: 'c-2', cuentaId: 'ana', ahora: T0, pesoKg: 70, conPasos: false, pausaAutomatica: true }));
    definirTareaDeLaCarrera();
    await mockTareas.cuerpo?.({
      data: { locations: [{ timestamp: T0, coords: { latitude: -12.04, longitude: -77.04, accuracy: 5, altitude: null, speed: null } }] },
      error: null,
    });
    expect(carreraActual()?.carreraId).toBe('c-2');
  });

  // spec 042 FR-050
  it('en iOS los pasos salen del podómetro de expo-sensors y piden su permiso', async () => {
    ponerSistema('ios');
    expect(await prepararPodometro()).toBe(true);
    expect(mockPasos.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    const recibidos: number[] = [];
    const dejar = escucharPasos(n => recibidos.push(n));
    const alCambiar = mockPasos.watchStepCount.mock.calls[0][0];
    alCambiar({ steps: 4 });
    alCambiar({ steps: 10 });
    expect(recibidos).toEqual([4, 6]);
    dejar();
  });

  // spec 042 FR-050
  it('sin permiso de movimiento, la carrera sigue solo con el GPS', async () => {
    ponerSistema('ios');
    mockPasos.requestPermissionsAsync.mockResolvedValueOnce({ granted: false });
    expect(await prepararPodometro()).toBe(false);
  });

  // spec 042 FR-047
  it('en la web no hay podómetro', async () => {
    ponerSistema('web');
    expect(await prepararPodometro()).toBe(false);
  });

  // spec 042 FR-051
  it('en iOS no hay guía de batería de marca', async () => {
    ponerSistema('ios');
    expect(await guiaDeBateriaPendiente('ana', 'xiaomi', 'ios')).toBeNull();
  });

  // spec 042 FR-051
  it('en iOS no se publica la notificación local de la carrera (avisa la barra azul del sistema)', async () => {
    ponerSistema('ios');
    await mostrarNotificacionDeCarrera({ metros: 1200, activoMs: 600_000, ritmo: 5, enPausa: false }, Date.now(), true);
    expect(mockNotificaciones.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
