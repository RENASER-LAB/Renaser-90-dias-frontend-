jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
type Lectura = { timestamp: number; coords: { latitude: number; longitude: number; accuracy: number | null; altitude: null; speed: number | null } };
const mockRemover = jest.fn();
const mockWatch: { alLlegar: ((l: Lectura) => void) | null; opciones: Record<string, unknown> | null; resolver: ((s: { remove: () => void }) => void) | null } = {
  alLlegar: null,
  opciones: null,
  resolver: null,
};
const mockUbicacion = {
  getLastKnownPositionAsync: jest.fn(async () => ({ coords: { latitude: -12.12, longitude: -77.03 } }) as unknown),
  // A ~11 m de la casa de las pruebas (-12,1219, -77,0312), con 35 m de precisión: la lectura rápida y gruesa de antes del GPS.
  getCurrentPositionAsync: jest.fn(async () => ({ timestamp: Date.now(), coords: { latitude: -12.1219, longitude: -77.0311, accuracy: 35 } }) as unknown),
  watchPositionAsync: jest.fn(async (opciones: Record<string, unknown>, alLlegar: (l: Lectura) => void) => {
    mockWatch.opciones = opciones;
    mockWatch.alLlegar = alLlegar;
    return { remove: mockRemover };
  }),
  Accuracy: { Balanced: 3, BestForNavigation: 6 },
};
jest.mock('../notificacionDeCarrera', () => ({ mostrarNotificacionDeCarrera: jest.fn(async () => undefined), quitarNotificacionDeCarrera: jest.fn() }));

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { distanciaM, puntoDestino } from '../../utils/geo';
import { ESPERA_DE_LA_LECTURA_FRESCA_MS } from '../../utils/lecturaDelMapa';
import { puntosDeLaUbicacion } from '../../utils/puntosDeLaUbicacion';
import { carreraActual, empezarCarrera, pausarCarrera, recibirPuntos, reiniciarParaPruebas } from '../carreraEnVivo';
import {
  centroDelMapa,
  detalleDelCentro,
  olvidarCentroDelMapa,
  olvidarLoAdelantadoParaPruebas,
  ponerLecturaDelMapa,
  prepararCentroDelMapa,
  usarUbicacionParaPruebas,
} from '../centroDelMapa';

/**
 * Spec 042, lectura fresca, promedio y motor intacto (#236: «estoy en mi casa y me pone al frente o en otra casa»): antes de arrancar se busca una lectura
 * fresca y buena de verdad en vez de fiarse de la última conocida, y las lecturas frescas se promedian para el punto que se dibuja.
 * Todo es solo para mirar: la ruta y la distancia siguen siendo del motor.
 *
 * El módulo de ubicación entra por `usarUbicacionParaPruebas` y no por `jest.mock('expo-location')`: Jest recuerda cómo resolvió ese
 * `require` en el proceso, y una prueba anterior que lo corrió con el módulo de verdad hacía fallar a esta a ratos.
 */
const CASA = { lat: -12.1219, lng: -77.0312 };
const lectura = (dx: number, dy: number, precision: number | null, extra: { timestamp?: number; speed?: number | null } = {}): Lectura => {
  const p = puntoDestino(puntoDestino(CASA, 90, dx), 0, dy);
  return {
    timestamp: extra.timestamp ?? Date.now(),
    coords: { latitude: p.lat, longitude: p.lng, accuracy: precision, altitude: null, speed: extra.speed ?? null },
  };
};
const llega = (l: Lectura): void => mockWatch.alLlegar!(l);
const alCentro = (): number => distanciaM(centroDelMapa()!.pos, CASA);

beforeEach(() => {
  usarUbicacionParaPruebas(mockUbicacion as never);
  reiniciarParaPruebas();
  olvidarCentroDelMapa();
  olvidarLoAdelantadoParaPruebas();
  mockRemover.mockClear();
  mockWatch.alLlegar = null;
  mockWatch.opciones = null;
  mockUbicacion.watchPositionAsync.mockClear();
});
afterEach(() => {
  jest.useRealTimers();
  usarUbicacionParaPruebas(null);
});

/** Lo que hace la tarea del GPS con cada lote: las lecturas al mapa y los puntos al motor (que, en la cuenta, los descarta). */
function llegaDelGps(l: Lectura): void {
  const [punto] = puntosDeLaUbicacion([l]);
  ponerLecturaDelMapa(punto, 'gps');
  recibirPuntos([punto]);
}

/** Abre la carrera en la cuenta 3, 2, 1 (en pausa), prepara el centro del mapa como el anfitrión y deja correr lo que quedó pendiente. */
async function prepararEnLaCuenta(): Promise<void> {
  empezarCarrera({ carreraId: 'c', cuentaId: 'cuenta', pesoKg: 70, conPasos: false });
  pausarCarrera();
  await prepararCentroDelMapa();
  for (let i = 0; i < 6; i++) await Promise.resolve();
}

describe('antes de arrancar se busca una lectura fresca y buena', () => {
  // spec 042 FR-053
  it('pide lecturas nuevas con la mejor precisión, sin el diálogo de ajustes encima de la cuenta', async () => {
    await prepararEnLaCuenta();
    expect(mockUbicacion.watchPositionAsync).toHaveBeenCalledTimes(1);
    expect(mockWatch.opciones).toMatchObject({ accuracy: 6, mayShowUserSettingsDialog: false });
  });

  // spec 042 FR-053
  it('mientras tanto muestra lo que haya: la última conocida primero y cada lectura nueva a medida que llega', async () => {
    await prepararEnLaCuenta();
    // Lo que había al instante (la aproximada ya trae 35 m de precisión).
    expect(centroDelMapa()).not.toBeNull();
    llega(lectura(0, 0, 40));
    expect(centroDelMapa()!.fuente).toBe('fresca');
    expect(detalleDelCentro().precisionM).toBe(35);
    // Una de 8 m pesa mucho más que la de 40 m: el centro queda casi sobre ella.
    llega(lectura(2, 1, 8));
    expect(alCentro()).toBeLessThan(5);
    expect(detalleDelCentro().precisionM).toBe(8);
  });

  // spec 042 FR-053
  it('se detiene en cuanto llega una de 15 m o menos', async () => {
    await prepararEnLaCuenta();
    llega(lectura(0, 0, 30));
    llega(lectura(1, 0, 18));
    expect(mockRemover).not.toHaveBeenCalled();
    llega(lectura(0, 1, 14));
    expect(mockRemover).toHaveBeenCalledTimes(1);
    // Ya cerrada: lo que llegue después no mueve nada.
    const antes = centroDelMapa()!.pos;
    llega(lectura(80, 0, 5));
    expect(centroDelMapa()!.pos).toEqual(antes);
  });

  // spec 042 FR-053
  it('si ninguna llega a 15 m, busca hasta los 10 s y se queda con la mejor que llegó', async () => {
    jest.useFakeTimers();
    await prepararEnLaCuenta();
    expect(ESPERA_DE_LA_LECTURA_FRESCA_MS).toBe(10_000);
    llega(lectura(0, 0, 45));
    llega(lectura(6, 0, 22));
    llega(lectura(0, 5, 30));
    jest.advanceTimersByTime(ESPERA_DE_LA_LECTURA_FRESCA_MS - 1);
    expect(mockRemover).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(mockRemover).toHaveBeenCalledTimes(1);
    // La de 22 m es la mejor: el centro queda más cerca de ella que de las otras dos, y la precisión es la suya.
    const mejor = puntoDestino(CASA, 90, 6);
    expect(distanciaM(centroDelMapa()!.pos, mejor)).toBeLessThan(4);
    expect(detalleDelCentro().precisionM).toBe(22);
  });

  // spec 042 FR-053
  it('una lectura vieja (la última guardada que algunos teléfonos entregan primero) no cuenta', async () => {
    await prepararEnLaCuenta();
    const antes = centroDelMapa()!;
    llega(lectura(500, 500, 5, { timestamp: Date.now() - 60_000 }));
    expect(centroDelMapa()).toEqual(antes);
    expect(mockRemover).not.toHaveBeenCalled();
  });

  // spec 042 FR-053
  it('al cerrar o cancelar la carrera, la búsqueda se detiene y una lectura tardía no entra', async () => {
    await prepararEnLaCuenta();
    olvidarCentroDelMapa();
    expect(mockRemover).toHaveBeenCalledTimes(1);
    llega(lectura(0, 0, 5));
    expect(centroDelMapa()).toBeNull();
    expect(detalleDelCentro()).toEqual({ precisionM: null, promediado: false });
  });

  // spec 042 FR-053
  it('si la suscripción llega después de haberse cerrado, se cierra en cuanto llega', async () => {
    let abrir: (s: { remove: () => void }) => void = () => undefined;
    mockUbicacion.watchPositionAsync.mockImplementationOnce(() => new Promise(res => (abrir = res)) as never);
    await prepararEnLaCuenta();
    olvidarCentroDelMapa();
    expect(mockRemover).not.toHaveBeenCalled();
    abrir({ remove: mockRemover });
    for (let i = 0; i < 3; i++) await Promise.resolve();
    expect(mockRemover).toHaveBeenCalledTimes(1);
  });

  // spec 042 FR-053
  it('si el teléfono no deja buscar, la cuenta sigue con lo que haya y nada se cae', async () => {
    mockUbicacion.watchPositionAsync.mockRejectedValueOnce(new Error('sin servicio') as never);
    await expect(prepararEnLaCuenta()).resolves.toBeUndefined();
    expect(centroDelMapa()).not.toBeNull();
  });
});

describe('las lecturas frescas se promedian para el punto que se dibuja', () => {
  // spec 042 FR-054
  it('con la persona quieta, las lecturas del GPS que oscilan ±15 m dejan el punto cerca de la verdad, y ya es un promedio', async () => {
    empezarCarrera({ carreraId: 'c', cuentaId: 'cuenta', pesoKg: 70, conPasos: false });
    pausarCarrera();
    const oscilacion: Array<[number, number, number]> = [
      [12, 3, 18],
      [-14, -5, 20],
      [6, 14, 16],
      [-9, -12, 22],
      [15, -4, 19],
      [-12, 9, 17],
    ];
    let ultimaLejos = 0;
    for (const [dx, dy, precision] of oscilacion) {
      const l = lectura(dx, dy, precision, { speed: 0 });
      ultimaLejos = distanciaM(CASA, { lat: l.coords.latitude, lng: l.coords.longitude });
      llegaDelGps(l);
    }
    expect(centroDelMapa()!.fuente).toBe('gps');
    expect(detalleDelCentro()).toEqual({ precisionM: 16, promediado: true });
    expect(ultimaLejos).toBeGreaterThan(10);
    expect(alCentro()).toBeLessThan(ultimaLejos / 2);
    expect(alCentro()).toBeLessThan(6);
  });

  // spec 042 FR-054
  it('al moverse, el punto vuelve a seguir a la lectura real y deja de ser un promedio', async () => {
    empezarCarrera({ carreraId: 'c', cuentaId: 'cuenta', pesoKg: 70, conPasos: false });
    pausarCarrera();
    for (const [dx, dy] of [[0, 0], [2, 1], [1, 2]]) llegaDelGps(lectura(dx, dy, 8, { speed: 0 }));
    expect(detalleDelCentro().promediado).toBe(true);
    const lejos = lectura(70, 0, 6, { speed: 3 });
    llegaDelGps(lejos);
    expect(detalleDelCentro()).toEqual({ precisionM: 6, promediado: false });
    expect(distanciaM(centroDelMapa()!.pos, { lat: lejos.coords.latitude, lng: lejos.coords.longitude })).toBeLessThan(0.01);
  });

  // spec 042 FR-057, FR-030
  it('nada de esto entra a la ruta ni a la distancia: el motor sigue con lo suyo', async () => {
    await prepararEnLaCuenta();
    llega(lectura(0, 0, 10));
    for (const [dx, dy] of [[0, 0], [1, 1], [2, 0]]) llegaDelGps(lectura(dx, dy, 12, { speed: 0 }));
    expect(detalleDelCentro().promediado).toBe(true);
    // La carrera está en la cuenta 3, 2, 1 (en pausa): el motor descarta los puntos, y ni el promedio ni la búsqueda cambian eso.
    expect(carreraActual()!.ruta).toHaveLength(0);
    expect(carreraActual()!.distanciaM).toBe(0);
    expect(carreraActual()!.ventana).toHaveLength(0);
  });
});
