import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockHome = jest.fn<() => Promise<unknown>>();
const mockDia = jest.fn<() => Promise<unknown>>();
const mockCapacidades = jest.fn<() => Promise<unknown>>();

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(callback, [callback]);
  },
}));
jest.mock('../../home/api/homeApi', () => ({ obtenerResumenHome: () => mockHome() }));
jest.mock('../../mentor/api/mentorApi', () => ({ capacidadesDePrograma: () => mockCapacidades() }));
jest.mock('../../../services/http/apiClient', () => ({
  apiFetch: () => mockDia(),
  mensajeDeError: (_error: unknown, porDefecto: string) => porDefecto,
}));

import { useCapacidades } from '../../admin/hooks/useCapacidades';
import { useResumenHome } from '../../home/hooks/useResumenHome';
import { useProgramaDia } from '../hooks/useProgramaDia';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let raiz: ReactTestRenderer | null = null;
afterEach(() => { act(() => raiz?.unmount()); raiz = null; });

describe.each(['Home', 'día', 'capacidades'] as const)('relectura de %s después de elegir Día 1', tipo => {
  it.each(['respuesta anterior', 'error anterior'])('%s no reemplaza una confirmación más reciente', async caso => {
    const mock = tipo === 'Home' ? mockHome : tipo === 'día' ? mockDia : mockCapacidades;
    const leer = tipo === 'Home' ? useResumenHome : tipo === 'día' ? useProgramaDia : useCapacidades;
    let lectura!: ReturnType<typeof leer>;
    let resolver!: (value: unknown) => void;
    let rechazar!: (error: Error) => void;
    mock.mockReset();
    mock.mockReturnValueOnce(new Promise((resolve, reject) => { resolver = resolve; rechazar = reject; }));
    mock.mockResolvedValue(tipo === 'capacidades'
      ? { canStartProgram: false, canAdminister: true }
      : { inscrito: true, diaPrograma: 0, fase: 'PHASE_1_REBIRTH' });
    function Lectura() { lectura = leer(); return null; }
    await act(async () => { raiz = TestRenderer.create(React.createElement(Lectura)); });
    await act(async () => { await lectura.recargar(); });
    const confirmada = { ...lectura };
    await act(async () => {
      if (caso === 'respuesta anterior') resolver(tipo === 'capacidades'
        ? { canStartProgram: true, canAdminister: true }
        : { inscrito: false, diaPrograma: 0, fase: null });
      else if (tipo === 'capacidades') resolver(null); // El adaptador convierte errores en null.
      else rechazar(new Error('la consulta anterior perdió la conexión'));
    });
    expect(lectura).toEqual(confirmada);
  });
});
