/**
 * El aviso nuevo para Administración y el Alquimista cuando Soporte TI cambia un rol (backend `d523cb21`): tipo
 * `OPERACION_PLATAFORMA`, `rutaApp: null`, «Soporte TI cambió un rol». La app no le dedica pantalla: la bandeja de la app
 * solo lista los avisos de acompañamiento (este no rompe la lectura) y tocar el push sin ruta solo abre la app.
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../../services/storage/almacenamientoSeguro', () => ({
  almacenamientoSeguro: { guardarToken: jest.fn(async () => undefined), borrarToken: jest.fn(async () => undefined), leerToken: jest.fn(async () => null) },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { setTokenSesion } from '../../../services/http/apiClient';
import { destinoDeRuta, obtenerAvisosDeAcompanamiento } from '../../mentor/api/avisosApi';
import { anotarRutaDeAviso } from '../../mentor/notificaciones/rutaDeAviso';

describe('el aviso «Soporte TI cambió un rol»', () => {
  it('en la bandeja no rompe la lectura (no es de acompañamiento) y sin ruta no abre nada', async () => {
    setTokenSesion('sesion-1');
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () =>
        JSON.stringify({
          items: [
            { id: 7, type: 'OPERACION_PLATAFORMA', title: 'Soporte TI cambió un rol', body: 'Rol “Mentor junior” desactivado', createdAt: '2026-10-14T20:00:00Z', readAt: null, route: null },
          ],
        }),
    }));
    await expect(obtenerAvisosDeAcompanamiento()).resolves.toEqual([]);
    expect(destinoDeRuta(null)).toBeNull();
    expect(anotarRutaDeAviso(null)).toBe(false);
    expect(anotarRutaDeAviso(undefined)).toBe(false);
  });
});
