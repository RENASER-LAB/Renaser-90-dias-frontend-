/**
 * Spec 050 (FR-015 y FR-020): el 429 del límite de pedidos. El servidor, el WAF y nginx responden con el mismo cuerpo
 * (`{"message":"Espera un momento y vuelve a intentarlo.","codigo":"DEMASIADOS_PEDIDOS"}`) y `Retry-After`. La app lo trata como
 * «espera», no como un fallo: muestra el mensaje y deja a la vista cuánto esperar para que las colas lo respeten.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../storage/almacenamientoSeguro', () => ({
  almacenamientoSeguro: {
    guardarToken: jest.fn(async () => undefined),
    borrarToken: jest.fn(async () => undefined),
    leerToken: jest.fn(async () => null),
  },
}));

import {
  ApiError,
  apiFetch,
  CODIGO_DEMASIADOS_PEDIDOS,
  getTokenSesion,
  MENSAJE_DEMASIADOS_PEDIDOS,
  mensajeDeError,
  setTokenSesion,
} from '../apiClient';
import { ESPERA_MAXIMA_DE_RETRY_AFTER_MS, esperaDeRetryAfterMs } from '../retryAfter';

const CUERPO_DEL_SERVIDOR = JSON.stringify({
  message: 'Espera un momento y vuelve a intentarlo.',
  timestamp: '2026-11-12T03:00:00Z',
  codigo: 'DEMASIADOS_PEDIDOS',
});

function responder(status: number, cuerpo: string, cabeceras: Record<string, string> = {}) {
  const fetchFalso = jest.fn(async () => ({
    ok: false,
    status,
    headers: { get: (nombre: string) => cabeceras[nombre] ?? null },
    text: async () => cuerpo,
  }));
  (globalThis as unknown as { fetch: unknown }).fetch = fetchFalso;
  return fetchFalso;
}

async function errorDe(ruta = '/api/v1/wall'): Promise<ApiError> {
  try {
    await apiFetch(ruta, { method: 'POST', body: {} });
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('apiFetch no falló');
}

beforeEach(() => {
  setTokenSesion('sesion-1');
});

describe('Retry-After', () => {
  it('segundos enteros → milisegundos', () => { // spec 050 FR-020
    expect(esperaDeRetryAfterMs('42')).toBe(42_000);
    expect(esperaDeRetryAfterMs(' 1 ')).toBe(1_000);
    expect(esperaDeRetryAfterMs('60')).toBe(60_000);
  });

  it('también acepta la fecha HTTP que admite el estándar', () => { // spec 050 FR-020
    const ahora = Date.parse('2026-11-12T03:00:00Z');
    expect(esperaDeRetryAfterMs('Thu, 12 Nov 2026 03:00:30 GMT', ahora)).toBe(30_000);
    expect(esperaDeRetryAfterMs('Thu, 12 Nov 2026 02:59:00 GMT', ahora)).toBeNull();
  });

  it('lo que no sirve da null: vacío, ausente, cero, basura', () => { // spec 050 FR-020
    expect(esperaDeRetryAfterMs(null)).toBeNull();
    expect(esperaDeRetryAfterMs(undefined)).toBeNull();
    expect(esperaDeRetryAfterMs('')).toBeNull();
    expect(esperaDeRetryAfterMs('0')).toBeNull();
    expect(esperaDeRetryAfterMs('pronto')).toBeNull();
  });

  it('nunca pide esperar más de media hora dentro de una cola', () => { // spec 050 FR-020
    expect(esperaDeRetryAfterMs('86400')).toBe(ESPERA_MAXIMA_DE_RETRY_AFTER_MS);
  });
});

describe('apiFetch con un 429 DEMASIADOS_PEDIDOS', () => {
  it('queda como un ApiError que dice cuánto esperar y se reconoce sin leer el texto', async () => { // spec 050 FR-020
    responder(429, CUERPO_DEL_SERVIDOR, { 'Retry-After': '42' });

    const error = await errorDe();

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(429);
    expect(error.codigo).toBe(CODIGO_DEMASIADOS_PEDIDOS);
    expect(error.esDemasiadosPedidos).toBe(true);
    expect(error.reintentarEnMs).toBe(42_000);
    expect(error.sesionVencida).toBe(false);
  });

  it('a la persona se le muestra el mensaje del servidor, en tuteo y sin el código', async () => { // spec 050 FR-020
    responder(429, CUERPO_DEL_SERVIDOR, { 'Retry-After': '42' });

    const mensaje = mensajeDeError(await errorDe(), 'No se pudo publicar.');

    expect(mensaje).toBe('Espera un momento y vuelve a intentarlo.');
    expect(mensaje).toBe(MENSAJE_DEMASIADOS_PEDIDOS);
    expect(mensaje).not.toMatch(/DEMASIADOS|429/);
  });

  it('un 429 NO cierra la sesión ni la descarta: es esperar, no entrar de nuevo', async () => { // spec 050 FR-020
    responder(429, CUERPO_DEL_SERVIDOR, { 'Retry-After': '5' });

    await errorDe();

    expect(getTokenSesion()).toBe('sesion-1');
  });

  it('no reintenta solo: un pedido, un 429 (reintentar es cosa de la cola, que espera lo que dice Retry-After)', async () => { // spec 050 FR-020
    const fetchFalso = responder(429, CUERPO_DEL_SERVIDOR, { 'Retry-After': '1' });

    await errorDe();

    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it('sin Retry-After, reintentarEnMs es null y el mensaje sigue siendo el del servidor', async () => { // spec 050 FR-020
    responder(429, CUERPO_DEL_SERVIDOR);

    const error = await errorDe();

    expect(error.reintentarEnMs).toBeNull();
    expect(mensajeDeError(error, 'x')).toBe(MENSAJE_DEMASIADOS_PEDIDOS);
  });
});

describe('un 429 que no trae el cuerpo del servidor', () => {
  it('sin cuerpo (lo respondió un intermediario) dice el mismo texto, no «Error 429»', async () => { // spec 050 FR-020
    responder(429, '', { 'Retry-After': '60' });

    const error = await errorDe();

    expect(error.message).toBe(MENSAJE_DEMASIADOS_PEDIDOS);
    expect(mensajeDeError(error, 'x')).toBe(MENSAJE_DEMASIADOS_PEDIDOS);
    expect(error.reintentarEnMs).toBe(60_000);
  });

  it('con una página HTML no la muestra: dice el mismo texto', async () => { // spec 050 FR-020
    responder(429, '<HTML><BODY><H1>429 Too Many Requests</H1></BODY></HTML>');

    const mensaje = mensajeDeError(await errorDe(), 'x');

    expect(mensaje).toBe(MENSAJE_DEMASIADOS_PEDIDOS);
    expect(mensaje).not.toContain('<');
  });

  it('un 429 de otro límite con su propio mensaje (el login, SER) lo conserva', async () => { // spec 050 FR-020
    responder(429, JSON.stringify({ message: 'Ya usaste todas tus preguntas por hoy. Vuelve mañana.' }));

    const error = await errorDe();

    expect(error.esDemasiadosPedidos).toBe(false);
    expect(mensajeDeError(error, 'x')).toBe('Ya usaste todas tus preguntas por hoy. Vuelve mañana.');
  });

  it('un 503 con Retry-After (nginx en un despliegue) también deja a la vista cuánto esperar', async () => { // spec 050 FR-020
    responder(503, '{"message":"Estamos actualizando. Vuelve a intentarlo en un momento.","codigo":"SERVICIO_NO_DISPONIBLE"}',
      { 'Retry-After': '30' });

    const error = await errorDe();

    expect(error.status).toBe(503);
    expect(error.reintentarEnMs).toBe(30_000);
    expect(mensajeDeError(error, 'x')).toBe('Estamos actualizando. Vuelve a intentarlo en un momento.');
  });
});
