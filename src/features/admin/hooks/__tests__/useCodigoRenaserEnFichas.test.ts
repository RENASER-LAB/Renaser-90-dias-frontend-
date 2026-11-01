/**
 * El estado de «Código Renaser en las fichas» (spec 034): el servidor es la verdad. El interruptor no se mueve solo, un
 * fallo se dice con su motivo y se puede reintentar, y un cambio doble manda un solo pedido.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { ApiError } from '../../../../services/http/apiClient';

const APAGADO = { visible: false, mixto: false, porRol: {}, ultimoCambio: null };
const ENCENDIDO = { ...APAGADO, visible: true };

const mockLeer = jest.fn<() => Promise<typeof APAGADO>>();
const mockCambiar = jest.fn<(visible: boolean) => Promise<typeof APAGADO>>();
jest.mock('../../api/codigoRenaserEnFichasApi', () => ({
  leerCodigoRenaserEnFichas: () => mockLeer(),
  cambiarCodigoRenaserEnFichas: (visible: boolean) => mockCambiar(visible),
}));

import { useCodigoRenaserEnFichas } from '../useCodigoRenaserEnFichas';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
let hook!: ReturnType<typeof useCodigoRenaserEnFichas>;

async function montar(activo = true) {
  function Sonda() {
    hook = useCodigoRenaserEnFichas(activo);
    return null;
  }
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
}

beforeEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockLeer.mockReset().mockResolvedValue(APAGADO);
  mockCambiar.mockReset().mockResolvedValue(ENCENDIDO);
});

describe('la lectura', () => {
  it('lee al abrir la pantalla', async () => {
    await montar();
    expect(mockLeer).toHaveBeenCalledTimes(1);
    expect(hook.estado?.visible).toBe(false);
    expect(hook.cargando).toBe(false);
    expect(hook.fallo).toBeNull();
  });

  it('inactivo no pide nada: Administración monta sus hooks siempre', async () => {
    await montar(false);
    expect(mockLeer).not.toHaveBeenCalled();
    expect(hook.estado).toBeNull();
  });

  it.each([
    [403, 'sin_permiso'],
    [404, 'no_disponible'],
    [0, 'sin_red'],
    [500, 'error'],
  ])('un %i se dice como «%s»', async (status, fallo) => {
    mockLeer.mockRejectedValue(new ApiError(status, 'x'));
    await montar();
    expect(hook.fallo).toBe(fallo);
    expect(hook.estado).toBeNull();
  });

  it('una respuesta que no es de ApiError (un esquema que no calza) es un error genérico', async () => {
    mockLeer.mockRejectedValue(new Error('esquema'));
    await montar();
    expect(hook.fallo).toBe('error');
  });

  it('«Reintentar» tras fallar la lectura la vuelve a pedir', async () => {
    mockLeer.mockRejectedValueOnce(new ApiError(0, 'sin red'));
    await montar();
    expect(hook.fallo).toBe('sin_red');
    await act(async () => {
      await hook.reintentar();
    });
    expect(mockLeer).toHaveBeenCalledTimes(2);
    expect(hook.fallo).toBeNull();
    expect(hook.estado?.visible).toBe(false);
  });
});

describe('el cambio', () => {
  it('manda lo pedido y toma el estado que devuelve el servidor', async () => {
    await montar();
    let nuevo: unknown;
    await act(async () => {
      nuevo = await hook.cambiar(true);
    });
    expect(mockCambiar).toHaveBeenCalledWith(true);
    expect(nuevo).toEqual(ENCENDIDO);
    expect(hook.estado?.visible).toBe(true);
    expect(hook.guardando).toBe(false);
  });

  it('si el servidor lo rechaza, el interruptor se queda donde estaba y se dice por qué', async () => {
    await montar();
    mockCambiar.mockRejectedValue(new ApiError(403, 'no'));
    let nuevo: unknown = 'sin llamar';
    await act(async () => {
      nuevo = await hook.cambiar(true);
    });
    expect(nuevo).toBeNull();
    expect(hook.estado?.visible).toBe(false);
    expect(hook.fallo).toBe('sin_permiso');
  });

  it('«Reintentar» tras fallar un cambio repite ese cambio, no la lectura', async () => {
    await montar();
    mockCambiar.mockRejectedValueOnce(new ApiError(0, 'sin red'));
    await act(async () => {
      await hook.cambiar(true);
    });
    expect(hook.fallo).toBe('sin_red');
    await act(async () => {
      await hook.reintentar();
    });
    expect(mockCambiar).toHaveBeenCalledTimes(2);
    expect(mockCambiar).toHaveBeenLastCalledWith(true);
    expect(mockLeer).toHaveBeenCalledTimes(1);
    expect(hook.estado?.visible).toBe(true);
    expect(hook.fallo).toBeNull();
  });

  it('dos toques seguidos mandan un solo pedido', async () => {
    await montar();
    let suelta: (v: typeof APAGADO) => void = () => undefined;
    mockCambiar.mockImplementation(() => new Promise(resolver => { suelta = resolver; }));
    let primero!: Promise<unknown>;
    let segundo: unknown = 'sin llamar';
    await act(async () => {
      primero = hook.cambiar(true);
      segundo = await hook.cambiar(true);
    });
    expect(segundo).toBeNull();
    expect(mockCambiar).toHaveBeenCalledTimes(1);
    await act(async () => {
      suelta(ENCENDIDO);
      await primero;
    });
    expect(hook.estado?.visible).toBe(true);
  });
});
