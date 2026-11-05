/**
 * El permiso de Health Connect (spec 037, D-310; issue #127: «acepto todos los permisos y vuelve a pedirlos»). `saludConectada` es el
 * único archivo que habla con la librería, y hasta ahora no tenía ninguna prueba: aquí se simula la librería —lo que el diálogo del
 * sistema contesta y lo que el sistema dice que tiene concedido— y se fija qué decide la app en cada caso.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';
import {
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  requestPermission,
} from 'react-native-health-connect';

import {
  ESPERA_ENTRE_RELECTURAS_MS,
  pedirPermisosDeSalud,
  permisosDeSalud,
  RELECTURAS_DEL_PERMISO,
  soporteDeSalud,
} from '../saludConectada';

jest.mock('react-native-health-connect', () => ({
  aggregateRecord: jest.fn(),
  getGrantedPermissions: jest.fn(),
  getSdkStatus: jest.fn(),
  initialize: jest.fn(),
  openHealthConnectSettings: jest.fn(),
  readRecords: jest.fn(),
  requestPermission: jest.fn(),
  SdkAvailabilityStatus: { SDK_UNAVAILABLE: 1, SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2, SDK_AVAILABLE: 3 },
}));

const concedidos = getGrantedPermissions as jest.MockedFunction<typeof getGrantedPermissions>;
const sdk = getSdkStatus as jest.MockedFunction<typeof getSdkStatus>;
const iniciar = initialize as jest.MockedFunction<typeof initialize>;
const pedir = requestPermission as jest.MockedFunction<typeof requestPermission>;

const PASOS = { accessType: 'read', recordType: 'Steps' } as const;
const DISTANCIA = { accessType: 'read', recordType: 'Distance' } as const;
/** Lo que la librería devuelve en un teléfono real: también lista `StepsCadence`, que usa el mismo permiso de pasos. */
const CADENCIA = { accessType: 'read', recordType: 'StepsCadence' } as const;

let advertencias: jest.SpiedFunction<typeof console.warn>;
let versionDeAndroid: jest.SpiedGetter<typeof Platform.Version>;

beforeEach(() => {
  jest.useFakeTimers();
  jest.replaceProperty(Platform, 'OS', 'android');
  versionDeAndroid = jest.spyOn(Platform, 'Version', 'get').mockReturnValue(35);
  sdk.mockResolvedValue(3);
  iniciar.mockResolvedValue(true);
  concedidos.mockResolvedValue([]);
  pedir.mockResolvedValue([]);
  advertencias = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  for (const doble of [concedidos, sdk, iniciar, pedir]) doble.mockReset();
});

/** Corre la promesa dejando avanzar el reloj falso (las relecturas esperan 350 ms entre una y otra). */
async function conTiempo<T>(promesa: Promise<T>): Promise<T> {
  let resultado: T | undefined;
  let listo = false;
  void promesa.then(valor => {
    resultado = valor;
    listo = true;
  });
  for (let vuelta = 0; vuelta < 20 && !listo; vuelta += 1) {
    await jest.advanceTimersByTimeAsync(ESPERA_ENTRE_RELECTURAS_MS);
  }
  expect(listo).toBe(true);
  return resultado as T;
}

describe('qué pide', () => {
  // spec 037 FR-003
  it('pide SOLO la lectura de pasos y de distancia: nada de escritura, sueño, ejercicio ni segundo plano', async () => {
    pedir.mockResolvedValue([DISTANCIA, CADENCIA, PASOS]);

    await conTiempo(pedirPermisosDeSalud());

    expect(pedir).toHaveBeenCalledTimes(1);
    expect(pedir.mock.calls[0][0]).toEqual([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'Distance' },
    ]);
  });
});

describe('«Conectar»: cuándo cuenta como concedido', () => {
  it('la persona acepta todo: el diálogo devuelve Steps (junto a Distance y StepsCadence) y queda concedido', async () => {
    pedir.mockResolvedValue([DISTANCIA, CADENCIA, PASOS]);

    expect(await conTiempo(pedirPermisosDeSalud())).toBe(true);
    expect(advertencias).not.toHaveBeenCalled();
  });

  it('si el sistema YA tiene el permiso, no se abre el diálogo', async () => {
    concedidos.mockResolvedValue([DISTANCIA, CADENCIA, PASOS]);

    expect(await conTiempo(pedirPermisosDeSalud())).toBe(true);
    expect(pedir).not.toHaveBeenCalled();
  });

  it('solo se concede la distancia, sin pasos: no queda conectada (sin pasos no hay nada que contar)', async () => {
    pedir.mockResolvedValue([DISTANCIA]);
    concedidos.mockResolvedValue([DISTANCIA]);

    expect(await conTiempo(pedirPermisosDeSalud())).toBe(false);
  });

  it('el diálogo contesta VACÍO pero el sistema sí guardó el permiso (la respuesta se perdió o llegó tarde): se hace caso al sistema', async () => {
    pedir.mockResolvedValue([]);
    concedidos
      .mockResolvedValueOnce([]) // antes de abrir el diálogo, todavía nada
      .mockResolvedValue([DISTANCIA, CADENCIA, PASOS]); // después, el sistema ya lo tiene

    expect(await conTiempo(pedirPermisosDeSalud())).toBe(true);
    expect(pedir).toHaveBeenCalledTimes(1);
    expect(advertencias).toHaveBeenCalledWith(expect.stringContaining('no devolvió el permiso de pasos'));
  });

  it('el permiso aparece unos instantes DESPUÉS de volver del diálogo: se vuelve a preguntar antes de decir que no', async () => {
    pedir.mockResolvedValue([]);
    concedidos
      .mockResolvedValueOnce([]) // antes del diálogo
      .mockResolvedValueOnce([]) // primera lectura al volver
      .mockResolvedValue([PASOS]); // segunda lectura: ya está

    expect(await conTiempo(pedirPermisosDeSalud())).toBe(true);
  });

  it('el diálogo FALLA (la librería lanza): queda en el registro con su causa y, si el sistema tiene el permiso, igual queda concedido', async () => {
    const causa = new Error('ClientNotInitialized');
    pedir.mockRejectedValue(causa);
    concedidos.mockResolvedValueOnce([]).mockResolvedValue([PASOS]);

    expect(await conTiempo(pedirPermisosDeSalud())).toBe(true);
    expect(advertencias).toHaveBeenCalledWith(expect.stringContaining('falló el diálogo'), causa);
  });

  it('el diálogo falla y el sistema tampoco tiene el permiso: no concedido, y la causa quedó en el registro (antes se tragaba en silencio)', async () => {
    const causa = new Error('boom');
    pedir.mockRejectedValue(causa);

    expect(await conTiempo(pedirPermisosDeSalud())).toBe(false);
    expect(advertencias).toHaveBeenCalledWith(expect.any(String), causa);
  });

  it('la persona rechaza: el diálogo no devuelve nada y el sistema tampoco tiene el permiso → no concedido', async () => {
    pedir.mockResolvedValue([]);

    expect(await conTiempo(pedirPermisosDeSalud())).toBe(false);
  });

  it('sin soporte (Android menor a 14) ni siquiera se intenta', async () => {
    versionDeAndroid.mockReturnValue(33);

    expect(await conTiempo(pedirPermisosDeSalud())).toBe(false);
    expect(pedir).not.toHaveBeenCalled();
  });
});

describe('lo que el sistema dice que hay concedido', () => {
  it('con los pasos concedidos: «otorgados», con una sola lectura', async () => {
    concedidos.mockResolvedValue([PASOS]);

    expect(await conTiempo(permisosDeSalud())).toBe('otorgados');
    expect(concedidos).toHaveBeenCalledTimes(1);
  });

  it('«faltan» solo después de comprobarlo varias veces (un teléfono lento no pierde los pasos por una lectura vacía)', async () => {
    concedidos.mockResolvedValue([DISTANCIA]);

    expect(await conTiempo(permisosDeSalud())).toBe('faltan');
    expect(concedidos).toHaveBeenCalledTimes(1 + RELECTURAS_DEL_PERMISO);
  });

  it('con `reintentos: 0` es una sola lectura', async () => {
    concedidos.mockResolvedValue([]);

    expect(await conTiempo(permisosDeSalud({ reintentos: 0 }))).toBe('faltan');
    expect(concedidos).toHaveBeenCalledTimes(1);
  });

  it('si leer el permiso lanza, se registra y cuenta como «faltan», no como un error que tumba la pantalla', async () => {
    concedidos.mockRejectedValue(new Error('sin servicio'));

    expect(await conTiempo(permisosDeSalud({ reintentos: 0 }))).toBe('faltan');
    expect(advertencias).toHaveBeenCalled();
  });
});

describe('el soporte', () => {
  // spec 037 FR-002
  it('Android 14 o más con Health Connect listo: disponible; menor a 14 o sin Health Connect: la captura de siempre', async () => {
    versionDeAndroid.mockReturnValue(34);
    expect(await soporteDeSalud()).toBe('disponible');

    versionDeAndroid.mockReturnValue(33);
    expect(await soporteDeSalud()).toBe('no-disponible');

    versionDeAndroid.mockReturnValue(35);
    sdk.mockResolvedValue(1);
    expect(await soporteDeSalud()).toBe('no-disponible');
  });
});
