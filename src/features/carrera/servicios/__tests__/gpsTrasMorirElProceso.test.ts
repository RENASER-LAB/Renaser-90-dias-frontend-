jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockUbicacion = {
  hasStartedLocationUpdatesAsync: jest.fn(async () => true),
  stopLocationUpdatesAsync: jest.fn(async () => undefined),
  startLocationUpdatesAsync: jest.fn(async () => undefined),
  Accuracy: { BestForNavigation: 6 },
  ActivityType: { Fitness: 3 },
};
jest.mock('expo-location', () => mockUbicacion, { virtual: true });
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }), { virtual: true });

import { describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

import { detenerGps, empezarGps } from '../tareaDeUbicacion';

/**
 * Spec 042 (2026-11-05, E2E de la notificación única): tras morir el proceso, `expo-task-manager` restaura la tarea del GPS antes
 * de que la app esté al frente y `expo-location` no levanta el servicio en primer plano. Sin servicio no hay notificación del
 * servicio para reemplazar y el GPS muere al irse a segundo plano: la primera vez de cada proceso se reinicia.
 */
describe('el GPS tras morir el proceso', () => {
  // spec 042 FR-006, FR-011
  it('si la tarea venía de otro proceso, la detiene y la vuelve a empezar con el servicio; después ya no la toca', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
    expect(await empezarGps()).toBe(true);
    expect(mockUbicacion.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    expect(mockUbicacion.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    const opciones = mockUbicacion.startLocationUpdatesAsync.mock.calls[0] as unknown as [string, { foregroundService: { killServiceOnDestroy: boolean } }];
    expect(opciones[0]).toBe('renaser-carrera-gps');
    expect(opciones[1].foregroundService.killServiceOnDestroy).toBe(false);

    expect(await empezarGps()).toBe(true);
    expect(mockUbicacion.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    expect(mockUbicacion.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);

    // Al terminar la carrera se olvida: la próxima vuelve a empezar desde cero.
    await detenerGps();
    mockUbicacion.hasStartedLocationUpdatesAsync.mockResolvedValueOnce(false);
    expect(await empezarGps()).toBe(true);
    expect(mockUbicacion.startLocationUpdatesAsync).toHaveBeenCalledTimes(2);
  });
});
