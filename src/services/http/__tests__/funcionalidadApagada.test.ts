/**
 * Spec 002 (interruptores de Soporte TI): `apiFetch` manda cabeceras extra, deja leer el `ETag` y el 304 de la lectura
 * condicional, y avisa cuando el servidor responde 503 `FUNCIONALIDAD_APAGADA`, sin dejar de lanzar el error (el
 * mensaje es el aviso escrito por Soporte TI).
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
  apiFetchConRespuesta,
  mensajeDeError,
  setTokenSesion,
  suscribirFuncionalidadApagada,
} from '../apiClient';
import { mensajeDeFallo } from '../../../features/admin/utils/mensajes';

type Pedido = { method: string; headers: Record<string, string> };

function responder(status: number, cuerpo: unknown, cabeceras: Record<string, string> = {}): Pedido[] {
  const pedidos: Pedido[] = [];
  (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async (_url: string, opciones: Pedido) => {
    pedidos.push(opciones);
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (nombre: string) => cabeceras[nombre.toLowerCase()] ?? null },
      text: async () => (cuerpo === undefined ? '' : JSON.stringify(cuerpo)),
    };
  });
  return pedidos;
}

const APAGADO = {
  message: 'El chat está en mantenimiento. Volvemos a las 18:00.',
  timestamp: '2026-10-13T22:00:00Z',
  codigo: 'FUNCIONALIDAD_APAGADA',
  funcionalidad: 'chat.grupos',
};

beforeEach(() => {
  setTokenSesion('sesion-1');
});

describe('apiFetch con cabeceras extra', () => {
  it('las manda sin pisar la sesión ni Accept', async () => {
    const pedidos = responder(200, { ok: true });
    await apiFetch('/api/v1/soporte-ti/funcionalidades', {
      cabeceras: { 'X-Consola-Token': 'tok', Accept: 'text/plain', 'X-Auth-Token': 'otra' },
    });
    expect(pedidos[0].headers['X-Consola-Token']).toBe('tok');
    expect(pedidos[0].headers.Accept).toBe('application/json');
    expect(pedidos[0].headers['X-Auth-Token']).toBe('sesion-1');
  });
});

describe('apiFetchConRespuesta', () => {
  it('devuelve el cuerpo y deja leer el ETag', async () => {
    responder(200, { version: 42, apagadas: [] }, { etag: '"v42"' });
    const respuesta = await apiFetchConRespuesta<{ version: number }>('/api/v1/funcionalidades/mias');
    expect(respuesta.status).toBe(200);
    expect(respuesta.datos?.version).toBe(42);
    expect(respuesta.cabecera('ETag')).toBe('"v42"');
  });

  it('toma el 304 como respuesta sin cuerpo; apiFetch lo sigue tomando como error (compatibilidad)', async () => {
    responder(304, undefined);
    const respuesta = await apiFetchConRespuesta('/api/v1/funcionalidades/mias', { cabeceras: { 'If-None-Match': '"v42"' } });
    expect(respuesta).toMatchObject({ status: 304, datos: undefined });
    await expect(apiFetch('/api/v1/algo')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('503 FUNCIONALIDAD_APAGADA', () => {
  it('avisa a los oyentes con la clave y el aviso, y lanza el error con el aviso como mensaje', async () => {
    responder(503, APAGADO);
    const oyente = jest.fn();
    const baja = suscribirFuncionalidadApagada(oyente);
    const error = (await apiFetch('/api/v1/chat/conversations/c-1/messages').catch(e => e)) as ApiError;
    baja();

    expect(oyente).toHaveBeenCalledWith({ clave: 'chat.grupos', aviso: APAGADO.message });
    expect(error).toBeInstanceOf(ApiError);
    expect(error.esFuncionalidadApagada).toBe(true);
    expect(error.codigo).toBe('FUNCIONALIDAD_APAGADA');
    expect(mensajeDeError(error, 'genérico')).toBe(APAGADO.message);
    expect(mensajeDeFallo(error, 'genérico')).toBe(APAGADO.message);
  });

  it('un 503 cualquiera (un despliegue) no avisa', async () => {
    responder(503, { message: 'Service Unavailable' });
    const oyente = jest.fn();
    const baja = suscribirFuncionalidadApagada(oyente);
    const error = (await apiFetch('/api/v1/home').catch(e => e)) as ApiError;
    baja();
    expect(oyente).not.toHaveBeenCalled();
    expect(error.esFuncionalidadApagada).toBe(false);
  });

  it('un oyente que revienta no tapa el error ni a los demás', async () => {
    responder(503, APAGADO);
    const otro = jest.fn();
    const bajas = [
      suscribirFuncionalidadApagada(() => {
        throw new Error('roto');
      }),
      suscribirFuncionalidadApagada(otro),
    ];
    await expect(apiFetch('/api/v1/wall')).rejects.toBeInstanceOf(ApiError);
    bajas.forEach(b => b());
    expect(otro).toHaveBeenCalledTimes(1);
  });
});

describe('un 401 que es contraseña mal (consola Soporte TI)', () => {
  it('no cierra la sesión de la app', async () => {
    responder(401, { message: 'Contraseña incorrecta' });
    const oyente = jest.fn();
    const { suscribirSesionVencida, getTokenSesion } = jest.requireActual<typeof import('../apiClient')>('../apiClient');
    const baja = suscribirSesionVencida(oyente);
    const error = (await apiFetch('/api/v1/soporte-ti/desbloqueo', { method: 'POST', body: {}, el401EsContrasena: true }).catch(e => e)) as ApiError;
    baja();
    expect(error.status).toBe(401);
    expect(error.sesionVencida).toBe(false);
    expect(oyente).not.toHaveBeenCalled();
    expect(getTokenSesion()).toBe('sesion-1');
  });
});
