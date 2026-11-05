/**
 * La cuenta de Google que organiza las salas de Meet (spec 040, D-321, FR-010, FR-011, FR-015): lo que la app pide, entiende y dice.
 * Nada de lo que se muestra es secreto.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string }) => Promise<unknown>>();
jest.mock('../../../services/http/apiClient', () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return {
    ApiError,
    apiFetch: (ruta: string, opciones?: { method?: string }) => {
      return mockApiFetch(ruta, opciones);
    },
  };
});

import { desconectarLaCuentaDeGoogle, empezarLaConexionConGoogle, leerLaCuentaDeGoogle, type CuentaDeGoogleApi } from '../api/cuentaDeGoogleApi';
import {
  ETIQUETA_CONECTAR,
  fechaYHora,
  resultadoDeLaAccion,
  textoDeCuandoSeConecto,
  textoDeLaAccion,
  textoDelUltimoUso,
  vistaDeLaCuenta,
} from '../utils/cuentaDeGoogle';

beforeEach(() => {
  mockApiFetch.mockReset();
});

const cuenta = (parcial: Partial<CuentaDeGoogleApi> = {}): CuentaDeGoogleApi => ({
  configurada: true,
  conectada: true,
  correo: 'renasercorporation@gmail.com',
  estado: 'ACTIVA',
  conectadaEn: '2026-11-05T15:00:00Z',
  ultimoUso: null,
  ultimoError: null,
  acciones: [],
  ...parcial,
});

describe('la API', () => {
  // spec 040 FR-010
  it('lee el estado de GET /admin/integraciones/google', async () => {
    mockApiFetch.mockResolvedValue({
      configurada: true,
      conectada: true,
      correo: 'renasercorporation@gmail.com',
      estado: 'ACTIVA',
      conectadaEn: '2026-11-05T15:00:00Z',
      acciones: [{ en: '2026-11-05T15:00:00Z', accion: 'CONECTAR', quien: 'Kelin', exito: true, codigoHttp: null }],
      campoNuevo: 'se ignora sin romper',
    });

    const leida = await leerLaCuentaDeGoogle();

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/integraciones/google', undefined);
    expect(leida.correo).toBe('renasercorporation@gmail.com');
    expect(leida.acciones).toHaveLength(1);
  });

  // spec 040 FR-011
  it('el estado no trae ni guarda ningún permiso permanente ni token: la API solo conoce los campos que se muestran', async () => {
    mockApiFetch.mockResolvedValue({ configurada: true, conectada: false, acciones: null });

    const leida = await leerLaCuentaDeGoogle();

    expect(leida.acciones).toEqual([]);
    expect(Object.keys(leida).join(' ').toLowerCase()).not.toMatch(/token|secret|refresh/);
  });

  // spec 040 FR-010
  it('conectar hace POST a /connect y devuelve la dirección de Google; una respuesta sin ella es un error', async () => {
    mockApiFetch.mockResolvedValueOnce({ url: 'https://accounts.google.com/o/oauth2/v2/auth?x=1' });
    expect(await empezarLaConexionConGoogle()).toBe('https://accounts.google.com/o/oauth2/v2/auth?x=1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/integraciones/google/connect', { method: 'POST' });

    mockApiFetch.mockResolvedValueOnce({});
    await expect(empezarLaConexionConGoogle()).rejects.toThrow();
  });

  // spec 040 FR-010
  it('desconectar hace DELETE', async () => {
    mockApiFetch.mockResolvedValue(undefined);

    await desconectarLaCuentaDeGoogle();

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/integraciones/google', { method: 'DELETE' });
  });
});

describe('los textos', () => {
  // spec 040 FR-010
  it('qué ve la persona: sin credenciales, sin cuenta, activa o revocada', () => {
    expect(vistaDeLaCuenta(cuenta({ configurada: false, conectada: false }))).toEqual({ tipo: 'sin_credenciales' });
    expect(vistaDeLaCuenta(cuenta({ conectada: false }))).toEqual({ tipo: 'sin_cuenta' });
    expect(vistaDeLaCuenta(cuenta())).toEqual({ tipo: 'activa', correo: 'renasercorporation@gmail.com' });
    expect(vistaDeLaCuenta(cuenta({ estado: 'REVOCADA' }))).toEqual({ tipo: 'revocada', correo: 'renasercorporation@gmail.com' });
    expect(ETIQUETA_CONECTAR).toBe('Conectar cuenta de Google');
  });

  // spec 040 FR-016
  it('las acciones se dicen en palabras, con quién; una acción que esta versión no conoce se dice en genérico y el resultado no depende del color', () => {
    expect(textoDeLaAccion({ accion: 'CREAR_SALA', quien: 'Kelin' })).toBe('Creó una sala · Kelin');
    expect(textoDeLaAccion({ accion: 'CREAR_SALA', quien: 'el sistema' })).toBe('Creó una sala · el sistema');
    expect(textoDeLaAccion({ accion: 'ALGO_NUEVO' })).toBe('Hizo algo con Google');
    expect(resultadoDeLaAccion({ exito: false })).toBe('No salió');
    expect(resultadoDeLaAccion({ exito: true })).toBe('Salió bien');
  });

  // spec 040 FR-010
  it('las fechas salen en la zona del teléfono, y lo que no se entiende no se inventa', () => {
    expect(fechaYHora('2026-11-05T15:00:00Z')).toMatch(/^\d{1,2} nov 2026, \d{2}:\d{2}$/);
    expect(fechaYHora('basura')).toBeNull();
    expect(fechaYHora(null)).toBeNull();
    expect(textoDeCuandoSeConecto(cuenta())).toMatch(/^Conectada el /);
    expect(textoDeCuandoSeConecto(cuenta({ conectadaEn: null }))).toBeNull();
    expect(textoDelUltimoUso(cuenta({ ultimoUso: '2026-11-06T12:00:00Z' }))).toMatch(/^Último uso: /);
    expect(textoDelUltimoUso(cuenta())).toBeNull();
  });
});
