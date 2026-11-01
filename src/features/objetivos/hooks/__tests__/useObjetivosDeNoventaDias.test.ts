/**
 * `useObjetivosDeNoventaDias` (spec 026): lo único que Hoy necesita de los objetivos — cuántos hay y cuántos están por confirmar.
 * Una lectura por foco; si la primera falla no afirma nada; una relectura que falla conserva lo último.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { RocaMaestraApi } from '../../types/objetivos.types';

const mockObtener = jest.fn<() => Promise<Partial<RocaMaestraApi>[]>>();
jest.mock('../../api/objetivosApi', () => ({ obtenerRocasMaestras: () => mockObtener() }));
const mockFocos: (() => (() => void) | void)[] = [];
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (efecto: () => (() => void) | void) => {
    const R = jest.requireActual<typeof import('react')>('react');
    R.useEffect(() => {
      mockFocos.push(efecto);
      return efecto();
    }, [efecto]);
  },
}));

import { useObjetivosDeNoventaDias } from '../useObjetivosDeNoventaDias';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
let ultimo: ReturnType<typeof useObjetivosDeNoventaDias>;
function Sonda() {
  ultimo = useObjetivosDeNoventaDias();
  return null;
}
async function montar() {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
}
const fila = (eje: RocaMaestraApi['eje'], extra: Partial<RocaMaestraApi> = {}): Partial<RocaMaestraApi> => ({ id: eje, eje, ...extra });

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockObtener.mockReset();
  mockFocos.length = 0;
});

describe('useObjetivosDeNoventaDias', () => {
  it('cuenta los objetivos y cuántos están por confirmar (del diagnóstico y sin confirmar)', async () => {
    mockObtener.mockResolvedValue([
      fila('CUERPO', { origin: 'DIAGNOSTICO', confirmed: false }),
      fila('TRABAJO', { origin: 'DIAGNOSTICO', confirmed: false }),
      fila('RELACIONES', { origin: 'PLAN', confirmed: true }),
    ]);
    await montar();
    expect(ultimo.objetivos).toEqual({ estado: 'listo', total: 3, porConfirmar: 2 });
  });

  it('antes de la primera respuesta está cargando (Hoy no afirma nada)', async () => {
    let responder: (r: Partial<RocaMaestraApi>[]) => void = () => undefined;
    mockObtener.mockReturnValue(new Promise(r => { responder = r; }));
    await montar();
    expect(ultimo.objetivos.estado).toBe('cargando');
    await act(async () => responder([]));
    expect(ultimo.objetivos).toEqual({ estado: 'listo', total: 0, porConfirmar: 0 });
  });

  it('un servidor anterior (sin origin ni confirmed) no tiene nada por confirmar', async () => {
    mockObtener.mockResolvedValue([fila('CUERPO'), fila('TRABAJO'), fila('RELACIONES')]);
    await montar();
    expect(ultimo.objetivos).toEqual({ estado: 'listo', total: 3, porConfirmar: 0 });
  });

  it('si la primera lectura falla queda en error (sin red, ruta que no existe), sin romper', async () => {
    mockObtener.mockRejectedValue(new Error('sin red'));
    await montar();
    expect(ultimo.objetivos).toEqual({ estado: 'error', total: 0, porConfirmar: 0 });
  });

  it('una relectura que falla conserva lo último que se leyó', async () => {
    mockObtener.mockResolvedValueOnce([fila('CUERPO', { origin: 'DIAGNOSTICO', confirmed: false })]);
    await montar();
    mockObtener.mockRejectedValue(new Error('sin red'));
    await act(async () => {
      mockFocos[mockFocos.length - 1]();
    });
    expect(ultimo.objetivos).toEqual({ estado: 'listo', total: 1, porConfirmar: 1 });
  });

  it('al recuperar el foco relee: la persona pudo confirmarlos en Plan', async () => {
    mockObtener.mockResolvedValueOnce([fila('CUERPO', { origin: 'DIAGNOSTICO', confirmed: false })]);
    await montar();
    expect(ultimo.objetivos.porConfirmar).toBe(1);
    mockObtener.mockResolvedValue([fila('CUERPO', { origin: 'DIAGNOSTICO', confirmed: true })]);
    await act(async () => {
      mockFocos[mockFocos.length - 1]();
    });
    expect(ultimo.objetivos).toEqual({ estado: 'listo', total: 1, porConfirmar: 0 });
  });
});
