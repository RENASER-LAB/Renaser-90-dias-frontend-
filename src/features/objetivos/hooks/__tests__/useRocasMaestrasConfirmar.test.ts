/**
 * `useRocasMaestras().confirmar` (spec 026): confirma los objetivos que nacieron del diagnóstico con un `PUT /rocks/master/{eje}`
 * por eje, en serie, solo con el texto. Se detiene en el primer fallo y dice dónde; lo ya confirmado queda.
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

const porConfirmar = (eje: RocaMaestraApi['eje'], objetivo: string): RocaMaestraApi => ({
  id: `m-${eje}`, eje, objetivo, meta: null, avance: null, unidad: null, lineaBase: null, porcentaje: null,
  creadoEn: '2026-11-02T10:00:00Z', actualizadoEn: '2026-11-02T10:00:00Z', origin: 'DIAGNOSTICO', confirmed: false,
});
const confirmada = (r: RocaMaestraApi, objetivo = r.objetivo): RocaMaestraApi => ({ ...r, objetivo, confirmed: true });

let raiz: ReactTestRenderer | null = null;
let hook: ReturnType<typeof useRocasMaestras>;
async function montar(rocas: RocaMaestraApi[]) {
  mockObtener.mockResolvedValue(rocas);
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

describe('useRocasMaestras().confirmar', () => {
  const cuerpo = porConfirmar('CUERPO', 'Bajar de peso');
  const trabajo = porConfirmar('TRABAJO', 'Facturar más');

  it('manda un PUT por eje con SOLO el objetivo (sin meta), en el orden que se le da', async () => {
    await montar([cuerpo, trabajo]);
    mockDefinir.mockImplementation(async (eje: string) => confirmada(eje === 'CUERPO' ? cuerpo : trabajo));
    let r: Awaited<ReturnType<typeof hook.confirmar>> | undefined;
    await act(async () => {
      r = await hook.confirmar([
        { eje: 'TRABAJO', objetivo: 'Facturar 30 mil' },
        { eje: 'CUERPO', objetivo: 'Bajar de peso' },
      ]);
    });
    expect(mockDefinir.mock.calls).toEqual([
      ['TRABAJO', { objetivo: 'Facturar 30 mil' }],
      ['CUERPO', { objetivo: 'Bajar de peso' }],
    ]);
    expect(r).toEqual({ ok: true, confirmados: ['TRABAJO', 'CUERPO'] });
  });

  it('cada respuesta reemplaza a su roca: confirmadas, dejan de estar «por confirmar»', async () => {
    await montar([cuerpo, trabajo]);
    mockDefinir.mockImplementation(async (eje: string) => confirmada(eje === 'CUERPO' ? cuerpo : trabajo));
    await act(async () => {
      await hook.confirmar([{ eje: 'CUERPO', objetivo: 'Bajar de peso' }, { eje: 'TRABAJO', objetivo: 'Facturar más' }]);
    });
    expect(hook.rocas.every(r => r.confirmed === true)).toBe(true);
    expect(hook.rocas).toHaveLength(2);
  });

  it('si uno falla se detiene ahí y dice cuál; lo que ya se confirmó queda confirmado', async () => {
    await montar([cuerpo, trabajo]);
    mockDefinir
      .mockResolvedValueOnce(confirmada(cuerpo))
      .mockRejectedValueOnce(new ApiError(500, 'Error en el servidor', { message: 'Error en el servidor' }));
    let r: Awaited<ReturnType<typeof hook.confirmar>> | undefined;
    await act(async () => {
      r = await hook.confirmar([{ eje: 'CUERPO', objetivo: 'Bajar de peso' }, { eje: 'TRABAJO', objetivo: 'Facturar más' }]);
    });
    expect(r).toMatchObject({ ok: false, confirmados: ['CUERPO'], falloEn: 'TRABAJO' });
    expect(hook.rocas.find(x => x.eje === 'CUERPO')?.confirmed).toBe(true);
    expect(hook.rocas.find(x => x.eje === 'TRABAJO')?.confirmed).toBe(false);
    expect(hook.guardando).toBe(false);
  });

  it('un fallo en el primero no manda los demás', async () => {
    await montar([cuerpo, trabajo]);
    mockDefinir.mockRejectedValue(new ApiError(400, 'El objetivo es muy largo', { message: 'El objetivo es muy largo' }));
    let r: Awaited<ReturnType<typeof hook.confirmar>> | undefined;
    await act(async () => {
      r = await hook.confirmar([{ eje: 'CUERPO', objetivo: 'x' }, { eje: 'TRABAJO', objetivo: 'y' }]);
    });
    expect(mockDefinir).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ ok: false, confirmados: [], falloEn: 'CUERPO', mensaje: 'El objetivo es muy largo' });
  });

  it('si otro teléfono ya lo confirmó con otro texto (`ROCA_MAESTRA_FIJA`) vuelve a leer lo guardado', async () => {
    await montar([cuerpo]);
    mockObtener.mockClear();
    mockObtener.mockResolvedValue([confirmada(cuerpo, 'Lo que guardó el otro teléfono')]);
    mockDefinir.mockRejectedValue(new ApiError(409, 'Tu objetivo quedó fijo', { codigo: 'ROCA_MAESTRA_FIJA', message: 'Tu objetivo quedó fijo' }));
    await act(async () => {
      await hook.confirmar([{ eje: 'CUERPO', objetivo: 'Mi versión' }]);
    });
    expect(mockObtener).toHaveBeenCalledTimes(1);
    expect(hook.rocas[0].objetivo).toBe('Lo que guardó el otro teléfono');
  });
});
