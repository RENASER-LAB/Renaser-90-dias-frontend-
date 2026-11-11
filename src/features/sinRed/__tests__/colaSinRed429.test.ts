/**
 * Spec 050 (FR-020): la cola de lo hecho sin señal (spec 048) trata un 429 como «reintenta después»: respeta `Retry-After`, no
 * descarta nada de lo que la persona hizo y no lo adelanta cuando vuelve la señal.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { ApiError } from '../../../services/http/apiClient';
import { leerAvisos } from '../avisosDeLoNoAplicado';
import {
  _reiniciarCola,
  agregarEnvio,
  desenlaceDe,
  esperaPedidaPorElServidor,
  leerCola,
  ponerCuentaActual,
  procesarCola,
  registrarManejador,
  type EnvioSinRed,
} from '../colaSinRed';

jest.mock('../../../services/storage/almacenamientoSeguro', () => ({
  almacenamientoSeguro: {
    guardarToken: jest.fn(async () => undefined),
    borrarToken: jest.fn(async () => undefined),
    leerToken: jest.fn(async () => null),
  },
}));

const HORA = { instante: new Date('2026-11-12T03:00:00Z'), origen: 'RELOJ_DEL_SISTEMA' as const };
const CUERPO = { message: 'Espera un momento y vuelve a intentarlo.', codigo: 'DEMASIADOS_PEDIDOS' };

/** El 429 como lo arma `apiFetch`: con `Retry-After` ya leído en `reintentarEnMs`. */
const demasiadosPedidos = (reintentarEnMs: number | null = 42_000) =>
  new ApiError(429, CUERPO.message, CUERPO, false, reintentarEnMs);

beforeEach(async () => {
  await AsyncStorage.clear();
  _reiniciarCola();
});

describe('cola sin red con un 429 (spec 050)', () => {
  it('es reintentar, nunca final: ni con el código DEMASIADOS_PEDIDOS ni sin él', () => { // spec 050 FR-020
    expect(desenlaceDe(demasiadosPedidos())).toBe('reintentar');
    expect(desenlaceDe(Object.assign(new Error('x'), { status: 429 }))).toBe('reintentar');
  });

  it('lee la espera que pidió el servidor, venga de un ApiError o de cualquier error con ese campo', () => { // spec 050 FR-020
    expect(esperaPedidaPorElServidor(demasiadosPedidos(42_000))).toBe(42_000);
    expect(esperaPedidaPorElServidor(Object.assign(new Error('x'), { status: 429, reintentarEnMs: 7_000 }))).toBe(7_000);
    expect(esperaPedidaPorElServidor(demasiadosPedidos(null))).toBeNull();
    expect(esperaPedidaPorElServidor(new Error('x'))).toBeNull();
    expect(esperaPedidaPorElServidor(undefined)).toBeNull();
  });

  it('el envío se queda en la cola, con sus datos, sin aviso de «no se aplicó», y no sale antes del plazo', async () => { // spec 050 FR-020
    const enviados: string[] = [];
    let respuesta: Error | null = demasiadosPedidos(42_000);
    registrarManejador('publicarMuro', async (e: EnvioSinRed) => {
      if (respuesta) throw respuesta;
      enviados.push(String(e.datos.texto));
    });
    ponerCuentaActual('ana');
    await agregarEnvio('ana', 'publicarMuro', { texto: 'Mi publicación', fotos: [] }, HORA, 1_000);

    expect(await procesarCola('ana', 1_000)).toBe(1);

    const [envio] = await leerCola('ana');
    expect(envio.datos).toEqual({ texto: 'Mi publicación', fotos: [] });
    expect(envio.intentos).toBe(1);
    expect(envio.proximoIntentoMs).toBe(1_000 + 42_000);
    expect(envio.noAntesDeMs).toBe(1_000 + 42_000);
    expect(envio.bloqueado).toBeNull();
    expect(await leerAvisos('ana')).toEqual([]);

    respuesta = null;
    expect(await procesarCola('ana', 20_000)).toBe(1);
    expect(enviados).toEqual([]);

    expect(await procesarCola('ana', 43_001)).toBe(0);
    expect(enviados).toEqual(['Mi publicación']);
  });

  it('volver la señal o la app al frente (adelantar) NO adelanta lo que el servidor pidió esperar', async () => { // spec 050 FR-020
    let llamadas = 0;
    registrarManejador('completarHabito', async () => {
      llamadas++;
      throw demasiadosPedidos(42_000);
    });
    ponerCuentaActual('ana');
    await agregarEnvio('ana', 'completarHabito', { registroId: 'r1' }, HORA, 1_000);
    await procesarCola('ana', 1_000);
    expect(llamadas).toBe(1);

    await procesarCola('ana', 10_000, { adelantar: true });
    await procesarCola('ana', 30_000, { adelantar: true });
    expect(llamadas).toBe(1);

    await procesarCola('ana', 44_000, { adelantar: true });
    expect(llamadas).toBe(2);
  });

  it('el contraste: sin red, adelantar sí lo manda ya (lo que no cambia)', async () => { // spec 050 FR-020
    let llamadas = 0;
    registrarManejador('completarHabito', async () => {
      llamadas++;
      throw Object.assign(new Error('sin red'), { status: 0 });
    });
    ponerCuentaActual('ana');
    await agregarEnvio('ana', 'completarHabito', { registroId: 'r1' }, HORA, 1_000);
    await procesarCola('ana', 1_000);

    await procesarCola('ana', 2_000, { adelantar: true });

    expect(llamadas).toBe(2);
  });

  it('sin Retry-After vale la espera creciente de siempre', async () => { // spec 050 FR-020
    registrarManejador('completarHabito', async () => {
      throw demasiadosPedidos(null);
    });
    ponerCuentaActual('ana');
    await agregarEnvio('ana', 'completarHabito', { registroId: 'r1' }, HORA, 1_000);

    await procesarCola('ana', 1_000);

    const [envio] = await leerCola('ana');
    expect(envio.proximoIntentoMs).toBe(1_000 + 5_000);
    expect(envio.noAntesDeMs).toBeUndefined();
  });

  it('si la espera creciente es mayor que el Retry-After, manda la creciente (el mayor de las dos)', async () => { // spec 050 FR-020
    registrarManejador('completarHabito', async () => {
      throw demasiadosPedidos(1_000);
    });
    ponerCuentaActual('ana');
    await agregarEnvio('ana', 'completarHabito', { registroId: 'r1' }, HORA, 1_000);

    await procesarCola('ana', 1_000);

    const [envio] = await leerCola('ana');
    expect(envio.proximoIntentoMs).toBe(1_000 + 5_000);
    expect(envio.noAntesDeMs).toBe(1_000 + 1_000);
  });

  it('lo siguiente espera con el que recibió el 429: el orden no cambia y nada se pierde', async () => { // spec 050 FR-020
    const enviados: string[] = [];
    let limitado = true;
    registrarManejador('escritura', async (e: EnvioSinRed) => {
      if (e.datos.ruta === '/uno' && limitado) throw demasiadosPedidos(30_000);
      enviados.push(String(e.datos.ruta));
    });
    ponerCuentaActual('ana');
    await agregarEnvio('ana', 'escritura', { etiqueta: 'Uno', ruta: '/uno' }, HORA, 1_000);
    await agregarEnvio('ana', 'escritura', { etiqueta: 'Dos', ruta: '/dos' }, HORA, 1_000);

    expect(await procesarCola('ana', 1_000)).toBe(2);
    expect(enviados).toEqual([]);

    limitado = false;
    expect(await procesarCola('ana', 31_001)).toBe(0);
    expect(enviados).toEqual(['/uno', '/dos']);
    expect(await leerAvisos('ana')).toEqual([]);
  });

  it('un 429 seguido de un fallo sin Retry-After borra el plazo anterior', async () => { // spec 050 FR-020
    let error: Error = demasiadosPedidos(42_000);
    registrarManejador('completarHabito', async () => {
      throw error;
    });
    ponerCuentaActual('ana');
    await agregarEnvio('ana', 'completarHabito', { registroId: 'r1' }, HORA, 1_000);
    await procesarCola('ana', 1_000);

    error = Object.assign(new Error('sin red'), { status: 0 });
    await procesarCola('ana', 43_000);

    const [envio] = await leerCola('ana');
    expect(envio.noAntesDeMs).toBeUndefined();
    expect(envio.intentos).toBe(2);
  });
});
