/**
 * La app Salud de Apple como fuente de los pasos y la distancia (spec 037, D-362, iPhone). `saludDeApple` es el único archivo que habla
 * con HealthKit: aquí se simula la librería nativa y se fija qué pide, qué lee y qué decide la app en cada caso.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Linking, Platform } from 'react-native';
import {
  getRequestStatusForAuthorization,
  isHealthDataAvailableAsync,
  queryStatisticsForQuantity,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';

import { armarLaLectura, cuerpoParaElServidor } from '../../utils/lecturaDelDia';
import { abrirHealthConnect, leerLosPasosDelDia, pedirPermisosDeSalud, permisosDeSalud, soporteDeSalud } from '../saludDeApple';

jest.mock('@kingstinct/react-native-healthkit', () => ({
  getRequestStatusForAuthorization: jest.fn(),
  isHealthDataAvailableAsync: jest.fn(),
  queryStatisticsForQuantity: jest.fn(),
  requestAuthorization: jest.fn(),
}));

const hayDatos = isHealthDataAvailableAsync as jest.MockedFunction<typeof isHealthDataAvailableAsync>;
const estadoDelPedido = getRequestStatusForAuthorization as jest.MockedFunction<typeof getRequestStatusForAuthorization>;
const pedir = requestAuthorization as jest.MockedFunction<typeof requestAuthorization>;
const estadisticas = queryStatisticsForQuantity as jest.MockedFunction<typeof queryStatisticsForQuantity>;

/** `AuthorizationRequestStatus` de HealthKit: 1 = habría que preguntar, 2 = ya se preguntó. */
const DEBERIA_PEDIR = 1;
const YA_SE_PREGUNTO = 2;

const PASOS = 'HKQuantityTypeIdentifierStepCount';
const DISTANCIA = 'HKQuantityTypeIdentifierDistanceWalkingRunning';

const IPHONE = { name: 'iPhone de Ana', bundleIdentifier: 'com.apple.health.7B2E0C3A-1F4D-4E55-9A00-000000000001' };
const RELOJ = { name: 'Apple Watch de Ana', bundleIdentifier: 'com.apple.health.7B2E0C3A-1F4D-4E55-9A00-000000000002' };
const STRAVA = { name: 'Strava', bundleIdentifier: 'com.strava.stravaride' };

const DESDE = new Date(2026, 10, 16, 0, 0, 0);
const HASTA = new Date(2026, 10, 16, 14, 5, 0);

function respuestas(por: { pasos?: number; metros?: number; fuentesDePasos?: object[]; fuentesDeDistancia?: object[] }) {
  estadisticas.mockImplementation((async (tipo: string) => {
    if (tipo === PASOS) {
      return {
        sumQuantity: por.pasos == null ? undefined : { unit: 'count', quantity: por.pasos },
        sources: por.fuentesDePasos ?? [],
      };
    }
    return {
      sumQuantity: por.metros == null ? undefined : { unit: 'm', quantity: por.metros },
      sources: por.fuentesDeDistancia ?? [],
    };
  }) as never);
}

let advertencias: jest.SpiedFunction<typeof console.warn>;

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  hayDatos.mockResolvedValue(true);
  estadoDelPedido.mockResolvedValue(YA_SE_PREGUNTO as never);
  pedir.mockResolvedValue(true);
  advertencias = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('soporteDeSalud', () => {
  // spec 037 FR-017
  it('hay soporte si HealthKit dice que el dispositivo tiene datos de salud', async () => {
    expect(await soporteDeSalud()).toBe('disponible');
  });

  // spec 037 FR-017
  it('sin Salud en el dispositivo (un iPad sin la app) se queda la captura', async () => {
    hayDatos.mockResolvedValue(false);
    expect(await soporteDeSalud()).toBe('no-disponible');
  });

  // spec 037 FR-017
  it('si la librería falla, no hay soporte y no se rompe nada', async () => {
    hayDatos.mockRejectedValue(new Error('HealthKit no responde'));
    expect(await soporteDeSalud()).toBe('no-disponible');
  });

  // spec 037 FR-017, FR-024
  it('fuera de iOS no hay soporte ni se toca la librería', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(await soporteDeSalud()).toBe('no-disponible');
    expect(hayDatos).not.toHaveBeenCalled();
  });
});

describe('permisosDeSalud: Apple no dice si la lectura se negó, solo si ya se preguntó', () => {
  // spec 037 FR-019
  it('con el diálogo ya mostrado, «otorgados»', async () => {
    expect(await permisosDeSalud()).toBe('otorgados');
  });

  // spec 037 FR-019
  it('sin haber preguntado todavía, «faltan»', async () => {
    estadoDelPedido.mockResolvedValue(DEBERIA_PEDIR as never);
    expect(await permisosDeSalud()).toBe('faltan');
  });

  // spec 037 FR-019
  it('si la librería falla, «faltan» y queda en el registro con su causa', async () => {
    estadoDelPedido.mockRejectedValue(new Error('sin acceso'));
    expect(await permisosDeSalud()).toBe('faltan');
    expect(advertencias).toHaveBeenCalled();
  });

  // spec 037 FR-018
  it('pregunta solo por Pasos y Distancia, y solo para leer', async () => {
    await permisosDeSalud();
    expect(estadoDelPedido).toHaveBeenCalledWith({ toRead: [PASOS, DISTANCIA] });
  });
});

describe('pedirPermisosDeSalud', () => {
  // spec 037 FR-018
  it('abre el diálogo de Salud pidiendo SOLO lectura de pasos y distancia (nada de escribir)', async () => {
    estadoDelPedido.mockResolvedValue(DEBERIA_PEDIR as never);
    expect(await pedirPermisosDeSalud()).toBe(true);
    expect(pedir).toHaveBeenCalledTimes(1);
    const pedido = pedir.mock.calls[0][0] as { toRead?: string[]; toShare?: string[] };
    expect(pedido.toRead).toEqual([PASOS, DISTANCIA]);
    expect(pedido.toShare ?? []).toEqual([]);
  });

  // spec 037 FR-019
  it('si ya se preguntó, no vuelve a abrir el diálogo (iOS no lo mostraría de nuevo)', async () => {
    expect(await pedirPermisosDeSalud()).toBe(true);
    expect(pedir).not.toHaveBeenCalled();
  });

  // spec 037 FR-019
  it('si el diálogo falla o no termina, no se conecta', async () => {
    estadoDelPedido.mockResolvedValue(DEBERIA_PEDIR as never);
    pedir.mockResolvedValue(false);
    expect(await pedirPermisosDeSalud()).toBe(false);
    pedir.mockRejectedValue(new Error('cancelado'));
    expect(await pedirPermisosDeSalud()).toBe(false);
    expect(advertencias).toHaveBeenCalled();
  });

  // spec 037 FR-017
  it('sin Salud en el dispositivo devuelve false sin abrir nada', async () => {
    hayDatos.mockResolvedValue(false);
    expect(await pedirPermisosDeSalud()).toBe(false);
    expect(pedir).not.toHaveBeenCalled();
  });
});

describe('leerLosPasosDelDia', () => {
  // spec 037 FR-020
  it('lee los pasos y la distancia del día con estadísticas acumuladas, sin lo escrito a mano', async () => {
    respuestas({ pasos: 7120, metros: 5400, fuentesDePasos: [IPHONE], fuentesDeDistancia: [IPHONE] });
    const lectura = await leerLosPasosDelDia(DESDE, HASTA);

    expect(lectura.pasos).toBe(7120);
    expect(lectura.distanciaM).toBe(5400);
    expect(estadisticas).toHaveBeenCalledTimes(2);
    const [tipoPasos, opcionesPasos, filtroPasos] = estadisticas.mock.calls.find(c => c[0] === PASOS) as unknown as [string, string[], any];
    expect(opcionesPasos).toEqual(['cumulativeSum']);
    expect(filtroPasos.unit).toBe('count');
    expect(tipoPasos).toBe(PASOS);
    const filtroDistancia = (estadisticas.mock.calls.find(c => c[0] === DISTANCIA) as unknown as [string, string[], any])[2];
    expect(filtroDistancia.unit).toBe('m');
    for (const filtro of [filtroPasos, filtroDistancia]) {
      // El día del registro: de las 00:00 al instante actual.
      expect(filtro.filter.date).toMatchObject({ startDate: DESDE, endDate: HASTA });
      // Lo que la persona escribió a mano en Salud (`HKWasUserEntered`) no cuenta.
      expect(filtro.filter.NOT).toEqual([{ metadata: { withMetadataKey: 'HKWasUserEntered', value: true } }]);
    }
  });

  // spec 037 FR-020
  it('sin pasos ni distancia devuelve nulos: la app dice «Todavía no vemos pasos hoy»', async () => {
    respuestas({});
    expect(await leerLosPasosDelDia(DESDE, HASTA)).toEqual({ pasos: null, distanciaM: null, origenesUsados: [], registros: [] });
    respuestas({ pasos: 0, metros: 0 });
    const cero = await leerLosPasosDelDia(DESDE, HASTA);
    expect(cero.pasos).toBeNull();
    expect(cero.distanciaM).toBeNull();
  });

  // spec 037 FR-020
  it('si la distancia falla pero los pasos llegaron, se usan los pasos (los km salen estimados)', async () => {
    estadisticas.mockImplementation((async (tipo: string) => {
      if (tipo === DISTANCIA) throw new Error('sin distancia');
      return { sumQuantity: { unit: 'count', quantity: 4000 }, sources: [IPHONE] };
    }) as never);
    const lectura = await leerLosPasosDelDia(DESDE, HASTA);
    expect(lectura.pasos).toBe(4000);
    expect(lectura.distanciaM).toBeNull();
  });

  // spec 037 FR-020
  it('si fallan los pasos, la lectura falla (el hook lo muestra como «sin datos»)', async () => {
    estadisticas.mockRejectedValue(new Error('HealthKit se cerró'));
    await expect(leerLosPasosDelDia(DESDE, HASTA)).rejects.toThrow('HealthKit se cerró');
  });

  // spec 037 FR-021
  it('nombra las fuentes sin el nombre de la persona: «Tu teléfono», «Apple Watch» o la app', async () => {
    respuestas({ pasos: 9000, metros: 6800, fuentesDePasos: [IPHONE, RELOJ, STRAVA], fuentesDeDistancia: [IPHONE, RELOJ] });
    const lectura = armarLaLectura(await leerLosPasosDelDia(DESDE, HASTA), HASTA);
    const etiquetas = [...lectura.fuentes].map(f => f.etiqueta).sort();
    expect(etiquetas).toEqual(['Apple Watch', 'Strava', 'Tu teléfono'].sort());
    expect(JSON.stringify(lectura)).not.toMatch(/Ana/);
    expect(lectura.fuentes[0]).toMatchObject({ etiqueta: 'Apple Watch', dispositivo: 'RELOJ' });
    expect(lectura.fuentes.find(f => f.etiqueta === 'Tu teléfono')?.dispositivo).toBe('TELEFONO');
    expect(lectura.fuentes.find(f => f.etiqueta === 'Strava')?.dispositivo).toBe('OTRO');
    expect(lectura.hayManuales).toBe(false);
  });

  // spec 037 FR-020, FR-023
  it('con pasos y sin fuentes que nombrar, igual se puede registrar (se da por el iPhone)', async () => {
    respuestas({ pasos: 8000, metros: 6000 });
    const lectura = armarLaLectura(await leerLosPasosDelDia(DESDE, HASTA), HASTA);
    expect(cuerpoParaElServidor(lectura)).toMatchObject({ kilometros: 6, pasos: 8000, fuente: 'Salud · Tu teléfono' });
  });

  // spec 037 FR-023
  it('lo que se manda al servidor lleva el prefijo «Salud · » en la fuente y el tipo de dispositivo', async () => {
    respuestas({ pasos: 9000, metros: 6800, fuentesDePasos: [IPHONE, RELOJ], fuentesDeDistancia: [RELOJ] });
    const cuerpo = cuerpoParaElServidor(armarLaLectura(await leerLosPasosDelDia(DESDE, HASTA), HASTA));
    expect(cuerpo).toMatchObject({ kilometros: 6.8, pasos: 9000, fuente: 'Salud · Apple Watch', dispositivo: 'RELOJ' });
  });
});

describe('abrirHealthConnect (aquí: abrir la app Salud)', () => {
  // spec 037 FR-016, FR-022
  it('abre la app Salud', () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    abrirHealthConnect();
    expect(abrir).toHaveBeenCalledWith('x-apple-health://');
  });

  // spec 037 FR-016
  it('si no se puede abrir, no pasa nada', () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('sin Salud'));
    expect(() => abrirHealthConnect()).not.toThrow();
  });
});
