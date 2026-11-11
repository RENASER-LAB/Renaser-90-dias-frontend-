/**
 * Spec 048, #182: las lecturas del Plan (objetivos de 90 días, semana y acciones del día) que fallan SIN SEÑAL dejan «Todavía no hay nada
 * guardado de esto en este teléfono…» en vez de «No se pudo conectar con el servidor…», y se vuelven a pedir solas cuando vuelve la señal.
 * Un error de verdad conserva su texto, y con datos en pantalla la vuelta de la señal no relee nada.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { ApiError } from '../../../../services/http/apiClient';
import { _reiniciarConexion, marcarConConexion, marcarSinConexion } from '../../../sinRed/estadoDeConexion';
import { TEXTO_SIN_SENAL_AL_CARGAR } from '../../../sinRed/utils/sinSenal';
import type { RocaDiariaApi, RocaMaestraApi, RocaSemanalApi } from '../../types/objetivos.types';

const mockSemanales = jest.fn<() => Promise<RocaSemanalApi[]>>();
const mockDeHoy = jest.fn<() => Promise<RocaDiariaApi[]>>();
const mockDeManana = jest.fn<() => Promise<RocaDiariaApi[]>>();
const mockAgendadas = jest.fn<() => Promise<{ desde: string; hasta: string; rocas: RocaDiariaApi[] }>>();
const mockMaestras = jest.fn<() => Promise<RocaMaestraApi[]>>();
jest.mock('../../api/objetivosApi', () => ({
  obtenerRocasSemanales: () => mockSemanales(),
  obtenerRocasDeHoy: () => mockDeHoy(),
  obtenerRocasDeManana: () => mockDeManana(),
  obtenerRocasAgendadas: () => mockAgendadas(),
  obtenerRocasMaestras: () => mockMaestras(),
}));
jest.mock('../../../formaciones/hooks/usePlazoDeLaSesion', () => ({ usePlazoDeLaSesion: () => ({ plazo: '90 días' }) }));
jest.mock('@react-navigation/native', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return { useFocusEffect: (cb: () => void) => R.useEffect(cb, [cb]) };
});

import { useRocasDiarias } from '../useRocasDiarias';
import { useRocasMaestras } from '../useRocasMaestras';
import { useRocasSemanales } from '../useRocasSemanales';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SIN_RED = () => new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
let raiz: ReactTestRenderer | null = null;

async function montar<T>(usar: () => T): Promise<{ actual: () => T }> {
  let valor!: T;
  function Sonda() {
    valor = usar();
    return null;
  }
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
  return { actual: () => valor };
}
const alVolverLaSenal = () => act(async () => marcarConConexion());

beforeEach(() => {
  _reiniciarConexion();
  marcarSinConexion();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  for (const m of [mockSemanales, mockDeHoy, mockDeManana, mockAgendadas, mockMaestras]) m.mockReset();
  _reiniciarConexion();
});

describe('la semana (useRocasSemanales) sin señal', () => {
  it('dice que no hay nada guardado en vez de «No se pudo conectar con el servidor»', async () => { // spec 048 FR-004
    mockSemanales.mockRejectedValue(SIN_RED());
    const h = await montar(() => useRocasSemanales([]));
    expect(h.actual().error).toBe(TEXTO_SIN_SENAL_AL_CARGAR);
  });

  it('al volver la señal se vuelve a leer sola y el aviso desaparece', async () => { // spec 048 FR-004
    mockSemanales.mockRejectedValueOnce(SIN_RED());
    const h = await montar(() => useRocasSemanales([]));
    expect(h.actual().error).toBe(TEXTO_SIN_SENAL_AL_CARGAR);
    mockSemanales.mockResolvedValue([]);
    await alVolverLaSenal();
    expect(mockSemanales).toHaveBeenCalledTimes(2);
    expect(h.actual().error).toBeNull();
  });

  it('un error de verdad conserva su texto de siempre', async () => { // spec 048 FR-004
    mockSemanales.mockRejectedValueOnce(new ApiError(500, 'Error del servidor', { message: 'Error del servidor' }));
    const h = await montar(() => useRocasSemanales([]));
    expect(h.actual().error).toBe('Error del servidor');
  });

  it('con datos en pantalla la vuelta de la señal no vuelve a pedir nada', async () => { // spec 048 FR-004
    mockSemanales.mockResolvedValue([]);
    const h = await montar(() => useRocasSemanales([]));
    expect(h.actual().error).toBeNull();
    await alVolverLaSenal();
    expect(mockSemanales).toHaveBeenCalledTimes(1);
  });
});

describe('las acciones del día (useRocasDiarias) sin señal', () => {
  it('dicen que no hay nada guardado y, al volver la señal, se leen solas', async () => { // spec 048 FR-004
    mockDeHoy.mockRejectedValueOnce(SIN_RED());
    mockDeManana.mockRejectedValueOnce(SIN_RED());
    mockAgendadas.mockRejectedValueOnce(SIN_RED());
    const h = await montar(() => useRocasDiarias());
    expect(h.actual().error).toBe(TEXTO_SIN_SENAL_AL_CARGAR);
    mockDeHoy.mockResolvedValue([]);
    mockDeManana.mockResolvedValue([]);
    mockAgendadas.mockResolvedValue({ desde: '2026-11-10', hasta: '2026-11-15', rocas: [] });
    await alVolverLaSenal();
    expect(h.actual().error).toBeNull();
    expect(h.actual().hoyDelServidor).toBe('2026-11-10');
  });
});

describe('los objetivos de 90 días (useRocasMaestras) sin señal', () => {
  it('dicen que no hay nada guardado y, al volver la señal, se leen solos', async () => { // spec 048 FR-004
    mockMaestras.mockRejectedValueOnce(SIN_RED());
    const h = await montar(() => useRocasMaestras());
    expect(h.actual().error).toBe(TEXTO_SIN_SENAL_AL_CARGAR);
    mockMaestras.mockResolvedValue([]);
    await alVolverLaSenal();
    expect(mockMaestras).toHaveBeenCalledTimes(2);
    expect(h.actual().error).toBeNull();
  });
});
