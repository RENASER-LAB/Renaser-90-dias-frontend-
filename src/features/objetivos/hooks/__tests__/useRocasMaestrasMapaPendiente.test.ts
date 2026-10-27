/**
 * `useRocasMaestras().definir` y el rechazo del servidor cuando todavía no hay Mapa activo (`MAPA_PENDIENTE`, issue
 * #37, 2026-10-27). Tolerante: con ese código el resultado trae `mapaPendiente: true` y el mensaje del servidor; con
 * cualquier otro rechazo, o con un backend que no lo conoce, todo sigue como antes.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { ApiError } from '../../../../services/http/apiClient';
import type { RocaMaestraApi } from '../../types/objetivos.types';

const mockObtener = jest.fn<() => Promise<RocaMaestraApi[]>>();
const mockDefinir = jest.fn<(eje: string, d: unknown) => Promise<RocaMaestraApi>>();
jest.mock('../../api/objetivosApi', () => ({
  obtenerRocasMaestras: () => mockObtener(),
  definirRocaMaestra: (eje: string, d: unknown) => mockDefinir(eje, d),
}));

import { useRocasMaestras } from '../useRocasMaestras';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
let hook: ReturnType<typeof useRocasMaestras>;

async function montar() {
  mockObtener.mockResolvedValue([]);
  function Sonda() {
    hook = useRocasMaestras();
    return null;
  }
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
}

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockObtener.mockReset();
  mockDefinir.mockReset();
});

const MENSAJE = 'Primero completa tu Mapa de Renacimiento: de ahí sale tu objetivo de 90 días.';

describe('useRocasMaestras().definir con el Mapa sin activar', () => {
  it('`MAPA_PENDIENTE` (409): devuelve el mensaje del servidor y marca `mapaPendiente`', async () => {
    await montar();
    mockDefinir.mockRejectedValue(new ApiError(409, MENSAJE, { codigo: 'MAPA_PENDIENTE', message: MENSAJE }));
    let resultado: Awaited<ReturnType<typeof hook.definir>> | undefined;
    await act(async () => {
      resultado = await hook.definir('CUERPO', { objetivo: 'Bajar de peso' });
    });
    expect(resultado).toEqual({ ok: false, mensaje: MENSAJE, mapaPendiente: true });
    expect(hook.rocas).toEqual([]);
  });

  it('`MAPA_PENDIENTE` (403): igual', async () => {
    await montar();
    mockDefinir.mockRejectedValue(new ApiError(403, MENSAJE, { codigo: 'MAPA_PENDIENTE', message: MENSAJE }));
    let resultado: Awaited<ReturnType<typeof hook.definir>> | undefined;
    await act(async () => {
      resultado = await hook.definir('CUERPO', { objetivo: 'Bajar de peso' });
    });
    expect(resultado).toEqual({ ok: false, mensaje: MENSAJE, mapaPendiente: true });
  });

  it('cualquier otro 409 de las rocas sigue mostrando su mensaje, sin ofrecer el Mapa', async () => {
    await montar();
    mockDefinir.mockRejectedValue(new ApiError(409, 'Esa semana ya está planificada.', { message: 'Esa semana ya está planificada.' }));
    let resultado: Awaited<ReturnType<typeof hook.definir>> | undefined;
    await act(async () => {
      resultado = await hook.definir('CUERPO', { objetivo: 'Bajar de peso' });
    });
    expect(resultado).toEqual({ ok: false, mensaje: 'Esa semana ya está planificada.', mapaPendiente: false });
  });

  it('el 409 ROCA_MAESTRA_FIJA sigue releyendo la lista y no ofrece el Mapa', async () => {
    await montar();
    mockDefinir.mockRejectedValue(new ApiError(409, 'Tu objetivo quedó fijo.', { codigo: 'ROCA_MAESTRA_FIJA' }));
    let resultado: Awaited<ReturnType<typeof hook.definir>> | undefined;
    await act(async () => {
      resultado = await hook.definir('CUERPO', { objetivo: 'Bajar de peso' });
    });
    expect(resultado).toEqual({ ok: false, mensaje: 'Tu objetivo quedó fijo.', mapaPendiente: false });
    expect(mockObtener).toHaveBeenCalledTimes(2);
  });

  it('un guardado que sale bien no cambia', async () => {
    await montar();
    const guardada = { id: 'r1', eje: 'CUERPO', objetivo: 'Bajar de peso' } as unknown as RocaMaestraApi;
    mockDefinir.mockResolvedValue(guardada);
    let resultado: Awaited<ReturnType<typeof hook.definir>> | undefined;
    await act(async () => {
      resultado = await hook.definir('CUERPO', { objetivo: 'Bajar de peso' });
    });
    expect(resultado).toEqual({ ok: true });
    expect(hook.rocas).toEqual([guardada]);
  });
});
