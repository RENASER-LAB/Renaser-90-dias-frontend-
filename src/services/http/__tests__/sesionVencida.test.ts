/**
 * Qué pasa cuando el token deja de valer con la app ABIERTA.
 *
 * El caso real que lo motiva: la sesión vence en Redis, y como nadie la cerraba en un solo lugar,
 * cada pantalla fallaba por su cuenta. La persona quedaba adentro de una app muda, sin que nada
 * le dijera que tenía que volver a entrar — en el chat lo único que aparecía era `Error 403`.
 *
 * Lo que se fija acá es la distinción, que es toda la regla: un 401 **con** sesión mandada es el
 * token vencido; un 401 **sin** sesión es el login con la contraseña mal. Y un 403 no es ninguno
 * de los dos.
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
  mensajeDeError,
  getTokenSesion,
  notificarSesionVencida,
  setTokenSesion,
  suscribirSesionVencida,
} from '../apiClient';

/** Respuesta mínima con la forma que `apiFetch` consume. */
function respuestaCon(status: number, cuerpo = '{"message":"no"}') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: async () => cuerpo,
  };
}

function responderCon(status: number) {
  (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async () => respuestaCon(status));
}

beforeEach(() => {
  setTokenSesion(null);
});

describe('vencimiento de sesión', () => {
  it('un 401 en una request CON sesión la cierra y avisa una sola vez', async () => {
    setTokenSesion('token-vivo');
    const avisos = jest.fn();
    const baja = suscribirSesionVencida(avisos);
    responderCon(401);

    await expect(apiFetch('/api/v1/home')).rejects.toBeInstanceOf(ApiError);
    // Una segunda pantalla que también recibe 401 no puede disparar un segundo cierre: es el
    // mismo hecho, no dos.
    await expect(apiFetch('/api/v1/habits')).rejects.toBeInstanceOf(ApiError);

    expect(avisos).toHaveBeenCalledTimes(1);
    expect(getTokenSesion()).toBeNull();
    baja();
  });

  it('el 401 del login NO cierra sesión: ahí son las credenciales', async () => {
    const avisos = jest.fn();
    const baja = suscribirSesionVencida(avisos);
    responderCon(401);

    const error = (await apiFetch<void>('/api/v1/auth/login', { method: 'POST', conSesion: false })
      .catch((e: unknown) => e)) as ApiError;

    expect(error.sesionVencida).toBe(false);
    expect(avisos).not.toHaveBeenCalled();
    baja();
  });

  it('un 403 con sesión NO se trata como vencimiento: es cuenta suspendida o permiso', async () => {
    setTokenSesion('token-vivo');
    const avisos = jest.fn();
    const baja = suscribirSesionVencida(avisos);
    responderCon(403);

    const error = (await apiFetch<void>('/api/v1/home').catch((e: unknown) => e)) as ApiError;

    expect(error.sesionVencida).toBe(false);
    expect(avisos).not.toHaveBeenCalled();
    // Mandarlo al login sería un bucle: quien está suspendido vuelve a entrar y vuelve a chocar.
    expect(getTokenSesion()).toBe('token-vivo');
    baja();
  });

  it('una sesión nueva rearma el aviso, para que el próximo vencimiento se vea', async () => {
    setTokenSesion('token-viejo');
    const avisos = jest.fn();
    const baja = suscribirSesionVencida(avisos);
    responderCon(401);
    await apiFetch('/api/v1/home').catch(() => undefined);
    expect(avisos).toHaveBeenCalledTimes(1);

    setTokenSesion('token-nuevo');
    await apiFetch('/api/v1/home').catch(() => undefined);

    expect(avisos).toHaveBeenCalledTimes(2);
    baja();
  });

  it('el chat puede reportar el vencimiento aunque no pase por apiFetch', () => {
    setTokenSesion('token-vivo');
    const avisos = jest.fn();
    const baja = suscribirSesionVencida(avisos);

    notificarSesionVencida();

    expect(avisos).toHaveBeenCalledTimes(1);
    expect(getTokenSesion()).toBeNull();
    baja();
  });

  it('el texto distingue la sesión vencida de la contraseña mal', () => {
    // Antes los dos 401 devolvían "Correo o contraseña incorrectos.", y a quien ya estaba adentro
    // eso lo manda a revisar una contraseña que nunca escribió mal.
    const vencida = new ApiError(401, 'no autorizado', null, true);
    const credenciales = new ApiError(401, 'no autorizado', null, false);

    expect(mensajeDeError(vencida, 'algo falló')).toBe('Tu sesión venció. Vuelve a entrar.');
    expect(mensajeDeError(credenciales, 'algo falló')).toBe('Correo o contraseña incorrectos.');
  });
});
