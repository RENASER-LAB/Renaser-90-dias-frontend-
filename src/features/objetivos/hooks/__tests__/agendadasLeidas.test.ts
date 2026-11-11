/**
 * #185: `useRocasDiarias` dice si lo agendado de la semana (`GET /rocks/upcoming`) se pudo leer. «Agendar mis acciones» reemplaza el día
 * entero en el servidor (E-208): sin esa lectura la hoja no sabe qué tiene cada día y agendar borraría lo que no se vio, así que la hoja
 * se detiene hasta que se lea. Hoy y mañana se leen aparte, y que fallen o no no cambia eso.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { RocaDiariaApi } from '../../types/objetivos.types';

const mockDeHoy = jest.fn<() => Promise<RocaDiariaApi[]>>();
const mockDeManana = jest.fn<() => Promise<RocaDiariaApi[]>>();
const mockAgendadas = jest.fn<() => Promise<{ desde: string; hasta: string; rocas: RocaDiariaApi[] }>>();
jest.mock('../../api/objetivosApi', () => ({
  obtenerRocasDeHoy: () => mockDeHoy(),
  obtenerRocasDeManana: () => mockDeManana(),
  obtenerRocasAgendadas: () => mockAgendadas(),
}));
jest.mock('@react-navigation/native', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return { useFocusEffect: (cb: () => void) => R.useEffect(cb, [cb]) };
});

import { useRocasDiarias } from '../useRocasDiarias';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
async function montar(): Promise<{ actual: () => ReturnType<typeof useRocasDiarias> }> {
  let valor!: ReturnType<typeof useRocasDiarias>;
  function Sonda() {
    valor = useRocasDiarias();
    return null;
  }
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
  return { actual: () => valor };
}

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  for (const m of [mockDeHoy, mockDeManana, mockAgendadas]) m.mockReset();
});

describe('useRocasDiarias.agendadasLeidas (#185)', () => {
  it('con la lectura de la semana, es verdadero', async () => {
    mockDeHoy.mockResolvedValue([]);
    mockDeManana.mockResolvedValue([]);
    mockAgendadas.mockResolvedValue({ desde: '2026-11-10', hasta: '2026-11-15', rocas: [] });
    const h = await montar();
    expect(h.actual().agendadasLeidas).toBe(true);
  });

  it('si solo falla la de la semana, hoy y mañana se ven pero no se da por leído lo agendado; al volver a leer, sí', async () => {
    mockDeHoy.mockResolvedValue([]);
    mockDeManana.mockResolvedValue([]);
    mockAgendadas.mockRejectedValueOnce(new Error('falló'));
    const h = await montar();
    expect(h.actual().error).toBeNull();
    expect(h.actual().agendadasLeidas).toBe(false);
    mockAgendadas.mockResolvedValue({ desde: '2026-11-10', hasta: '2026-11-15', rocas: [] });
    await act(async () => {
      await h.actual().recargar();
    });
    expect(h.actual().agendadasLeidas).toBe(true);
  });
});
