jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockUbicacion = {
  getLastKnownPositionAsync: jest.fn(async () => ({ coords: { latitude: -12.12, longitude: -77.03 } }) as unknown),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: -12.1205, longitude: -77.0301 } }) as unknown),
  Accuracy: { Balanced: 3, BestForNavigation: 6 },
};
jest.mock('expo-location', () => mockUbicacion, { virtual: true });
const mockTareas: { fn: ((x: unknown) => Promise<void>) | null } = { fn: null };
jest.mock('expo-task-manager', () => ({ defineTask: (_: string, fn: (x: unknown) => Promise<void>) => (mockTareas.fn = fn) }), { virtual: true });
jest.mock('../notificacionDeCarrera', () => ({ mostrarNotificacionDeCarrera: jest.fn(async () => undefined), quitarNotificacionDeCarrera: jest.fn() }));

import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

import { carreraActual, empezarCarrera, pausarCarrera, reiniciarParaPruebas, seguirCarrera } from '../carreraEnVivo';
import { centroDelMapa, olvidarCentroDelMapa, ponerCentroDelMapa, prepararCentroDelMapa } from '../centroDelMapa';
import { definirTareaDeLaCarrera } from '../tareaDeUbicacion';

/**
 * Spec 042 (2026-11-05): el mapa se centra con la última posición conocida, la aproximada o el primer punto crudo del GPS para no
 * esperar 5 a 30 s. Eso es solo para mirar: nunca entra a la ruta ni a la distancia.
 */
beforeAll(() => {
  Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
  definirTareaDeLaCarrera();
});
beforeEach(() => {
  reiniciarParaPruebas();
  olvidarCentroDelMapa();
});

describe('el centro del mapa no se mide', () => {
  // spec 042 FR-037, FR-030
  it('la última conocida y la aproximada centran el mapa, pero la ruta y la distancia siguen en cero', async () => {
    empezarCarrera({ carreraId: 'c', cuentaId: 'cuenta', pesoKg: 70, conPasos: false });
    pausarCarrera();
    await prepararCentroDelMapa();
    await Promise.resolve();
    expect(centroDelMapa()?.pos).toEqual({ lat: -12.1205, lng: -77.0301 });
    seguirCarrera();
    expect(carreraActual()!.ruta).toHaveLength(0);
    expect(carreraActual()!.distanciaM).toBe(0);
  });

  // spec 042 FR-037, FR-003, FR-030
  it('el punto del GPS que llega en la cuenta 3, 2, 1 centra el mapa y el motor no lo cuenta', async () => {
    empezarCarrera({ carreraId: 'c', cuentaId: 'cuenta', pesoKg: 70, conPasos: false });
    pausarCarrera();
    await mockTareas.fn!({
      data: { locations: [{ timestamp: Date.now(), coords: { latitude: -12.13, longitude: -77.04, accuracy: 5, altitude: null, speed: 0 } }] },
      error: null,
    });
    expect(centroDelMapa()).toEqual({ pos: { lat: -12.13, lng: -77.04 }, fuente: 'gps' });
    expect(carreraActual()!.ruta).toHaveLength(0);
    expect(carreraActual()!.distanciaM).toBe(0);
  });

  // spec 042 FR-037
  it('una fuente peor no pisa a una mejor, el 0,0 se ignora y una lectura tardía de otra carrera tampoco entra', async () => {
    ponerCentroDelMapa({ lat: -12.13, lng: -77.04 }, 'gps');
    ponerCentroDelMapa({ lat: -12.2, lng: -77.1 }, 'ultima-conocida');
    expect(centroDelMapa()?.fuente).toBe('gps');
    olvidarCentroDelMapa();
    ponerCentroDelMapa({ lat: 0, lng: 0 }, 'gps');
    expect(centroDelMapa()).toBeNull();

    let soltar: (v: unknown) => void = () => undefined;
    mockUbicacion.getCurrentPositionAsync.mockImplementationOnce(() => new Promise(res => (soltar = res)));
    mockUbicacion.getLastKnownPositionAsync.mockResolvedValueOnce(null);
    await prepararCentroDelMapa();
    olvidarCentroDelMapa(); // la carrera se cerró
    soltar({ coords: { latitude: -12.3, longitude: -77.2 } });
    await Promise.resolve();
    await Promise.resolve();
    expect(centroDelMapa()).toBeNull();
  });
});
