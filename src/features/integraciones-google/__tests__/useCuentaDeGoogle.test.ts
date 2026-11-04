/**
 * El estado de la pantalla «Cuenta de Google» (spec 040): el servidor es la verdad. Conectar abre el navegador y no cambia nada hasta que la
 * app vuelve al frente y relee; desconectar manda un solo pedido; los fallos se dicen con su motivo.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AppState, Linking } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

type Cuenta = { configurada: boolean; conectada: boolean; correo: string | null; estado: string | null; conectadaEn: string | null; ultimoUso: string | null; ultimoError: string | null; acciones: never[] };
const SIN_CUENTA: Cuenta = { configurada: true, conectada: false, correo: null, estado: null, conectadaEn: null, ultimoUso: null, ultimoError: null, acciones: [] };
const CONECTADA: Cuenta = { ...SIN_CUENTA, conectada: true, correo: 'renasercorporation@gmail.com', estado: 'ACTIVA' };

const mockLeer = jest.fn<() => Promise<Cuenta>>();
const mockEmpezar = jest.fn<() => Promise<string>>();
const mockDesconectar = jest.fn<() => Promise<void>>();
jest.mock('../api/cuentaDeGoogleApi', () => ({
  leerLaCuentaDeGoogle: () => mockLeer(),
  empezarLaConexionConGoogle: () => mockEmpezar(),
  desconectarLaCuentaDeGoogle: () => mockDesconectar(),
}));
jest.mock('../../../services/http/apiClient', () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError };
});

import { ApiError } from '../../../services/http/apiClient';
import { useCuentaDeGoogle } from '../hooks/useCuentaDeGoogle';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
let hook!: ReturnType<typeof useCuentaDeGoogle>;
let alCambiarElEstadoDeLaApp: ((estado: string) => void) | null = null;
const abrir = jest.spyOn(Linking, 'openURL');

async function montar(activo = true) {
  function Sonda() {
    hook = useCuentaDeGoogle(activo);
    return null;
  }
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
}

beforeEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockLeer.mockReset().mockResolvedValue(SIN_CUENTA);
  mockEmpezar.mockReset().mockResolvedValue('https://accounts.google.com/o/oauth2/v2/auth?state=abc');
  mockDesconectar.mockReset().mockResolvedValue(undefined);
  abrir.mockReset().mockResolvedValue(undefined as never);
  alCambiarElEstadoDeLaApp = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, manejador: (estado: string) => void) => {
    alCambiarElEstadoDeLaApp = manejador;
    return { remove: () => undefined };
  }) as never);
});

describe('la lectura', () => {
  // spec 040 FR-010
  it('lee al abrir la pantalla, no antes', async () => {
    await montar(false);
    expect(mockLeer).not.toHaveBeenCalled();

    act(() => raiz?.unmount());
    await montar(true);
    expect(mockLeer).toHaveBeenCalledTimes(1);
    expect(hook.cuenta?.conectada).toBe(false);
    expect(hook.cargando).toBe(false);
  });

  // spec 040 FR-015
  it('un 403, un 404 y la falta de red se distinguen', async () => {
    for (const [codigo, esperado] of [[403, 'sin_permiso'], [404, 'no_disponible'], [0, 'sin_red'], [500, 'error']] as const) {
      act(() => raiz?.unmount());
      mockLeer.mockReset().mockRejectedValue(new ApiError(codigo, 'x'));
      await montar();
      expect(hook.fallo).toBe(esperado);
    }
  });
});

describe('conectar', () => {
  // spec 040 FR-010
  it('abre la dirección de Google en el navegador y NO da la cuenta por conectada', async () => {
    await montar();

    let abierto = false;
    await act(async () => {
      abierto = await hook.conectar();
    });

    expect(abierto).toBe(true);
    expect(abrir).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/v2/auth?state=abc');
    expect(hook.esperandoAGoogle).toBe(true);
    expect(hook.cuenta?.conectada).toBe(false);
  });

  // spec 040 FR-010
  it('al volver a Renaser relee en silencio y ahora sí dice lo que diga el servidor', async () => {
    await montar();
    await act(async () => {
      await hook.conectar();
    });
    mockLeer.mockResolvedValue(CONECTADA);

    await act(async () => {
      alCambiarElEstadoDeLaApp?.('active');
    });

    expect(hook.cuenta?.conectada).toBe(true);
    expect(hook.cuenta?.correo).toBe('renasercorporation@gmail.com');
    expect(hook.esperandoAGoogle).toBe(false);
  });

  // spec 040 FR-010
  it('un 409 del servidor (sin credenciales) no abre nada y se dice', async () => {
    mockEmpezar.mockRejectedValue(new ApiError(409, 'sin credenciales'));
    await montar();

    await act(async () => {
      await hook.conectar();
    });

    expect(abrir).not.toHaveBeenCalled();
    expect(hook.fallo).toBe('error');
    expect(hook.esperandoAGoogle).toBe(false);
  });

  // spec 040 FR-010
  it('un doble toque manda un solo pedido', async () => {
    await montar();

    await act(async () => {
      await Promise.all([hook.conectar(), hook.conectar()]);
    });

    expect(mockEmpezar).toHaveBeenCalledTimes(1);
  });
});

describe('desconectar', () => {
  // spec 040 FR-010
  it('desconecta y relee el estado', async () => {
    mockLeer.mockResolvedValue(CONECTADA);
    await montar();
    mockLeer.mockResolvedValue(SIN_CUENTA);

    let bien = false;
    await act(async () => {
      bien = await hook.desconectar();
    });

    expect(bien).toBe(true);
    expect(mockDesconectar).toHaveBeenCalledTimes(1);
    expect(hook.cuenta?.conectada).toBe(false);
  });

  // spec 040 FR-010
  it('si el servidor falla, la cuenta sigue como estaba y se dice', async () => {
    mockLeer.mockResolvedValue(CONECTADA);
    mockDesconectar.mockRejectedValue(new ApiError(500, 'x'));
    await montar();

    let bien = true;
    await act(async () => {
      bien = await hook.desconectar();
    });

    expect(bien).toBe(false);
    expect(hook.fallo).toBe('error');
    expect(hook.cuenta?.conectada).toBe(true);
  });

  // spec 040 FR-010
  it('un doble toque manda un solo pedido', async () => {
    mockLeer.mockResolvedValue(CONECTADA);
    await montar();

    await act(async () => {
      await Promise.all([hook.desconectar(), hook.desconectar()]);
    });

    expect(mockDesconectar).toHaveBeenCalledTimes(1);
  });
});
