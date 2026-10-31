/**
 * `useMetaDeLaAccion` (2026-10-31): la «Meta» de la acción que sigue hoy, con los menos pedidos posibles. Una lectura por acción
 * y por sesión; la semana enlazada por id resuelve sin pedir el objetivo de 90 días; y la tarjeta espera a `lista`.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { RocaMaestraApi, RocaSemanalApi } from '../../types/objetivos.types';

const mockSemanales = jest.fn<() => Promise<Partial<RocaSemanalApi>[]>>();
const mockMaestras = jest.fn<() => Promise<Partial<RocaMaestraApi>[]>>();
jest.mock('../../api/objetivosApi', () => ({
  obtenerRocasSemanales: () => mockSemanales(),
  obtenerRocasMaestras: () => mockMaestras(),
}));

import { useMetaDeLaAccion } from '../useMetaDeLaAccion';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Accion = { id: string; eje: 'CUERPO' | 'TRABAJO' | 'RELACIONES'; rocaSemanalId: string | null };
let raiz: ReactTestRenderer | null = null;
let ultima: { meta: string | null; lista: boolean };
const historial: boolean[] = [];
function Sonda({ accion }: { accion: Accion | null }) {
  ultima = useMetaDeLaAccion(accion);
  historial.push(ultima.lista);
  return null;
}
async function montar(accion: Accion | null) {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda, { accion }));
  });
}
async function cambiar(accion: Accion | null) {
  await act(async () => {
    raiz!.update(React.createElement(Sonda, { accion }));
  });
}

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockSemanales.mockReset();
  mockMaestras.mockReset();
  historial.length = 0;
});

describe('useMetaDeLaAccion', () => {
  it('sin acción no pregunta nada y está lista', async () => {
    await montar(null);
    expect(ultima).toEqual({ meta: null, lista: true });
    expect(mockSemanales).not.toHaveBeenCalled();
    expect(mockMaestras).not.toHaveBeenCalled();
  });

  it('la semana enlazada por id resuelve la meta con UN solo pedido', async () => {
    mockSemanales.mockResolvedValue([{ id: 's1', rocaMaestraId: 'm1', titulo: 'Caminar 5 días' }]);
    await montar({ id: 'r1', eje: 'CUERPO', rocaSemanalId: 's1' });
    expect(ultima).toEqual({ meta: 'Caminar 5 días', lista: true });
    expect(mockMaestras).not.toHaveBeenCalled();
  });

  it('mientras llega no está lista (la tarjeta no se dibuja a medias)', async () => {
    let responder: (v: Partial<RocaSemanalApi>[]) => void = () => undefined;
    mockSemanales.mockReturnValue(new Promise(r => { responder = r; }));
    await montar({ id: 'r1', eje: 'CUERPO', rocaSemanalId: 's1' });
    expect(ultima.lista).toBe(false);
    await act(async () => responder([{ id: 's1', rocaMaestraId: 'm1', titulo: 'Caminar 5 días' }]));
    expect(ultima.lista).toBe(true);
  });

  it('sin semana lee el objetivo de 90 días y toma su primera cláusula', async () => {
    mockSemanales.mockResolvedValue([]);
    mockMaestras.mockResolvedValue([{ id: 'm1', eje: 'CUERPO', objetivo: 'Bajar a 80 kg, caminando cada día' }]);
    await montar({ id: 'r1', eje: 'CUERPO', rocaSemanalId: null });
    expect(ultima).toEqual({ meta: 'Bajar a 80 kg', lista: true });
  });

  it('lo leído se guarda: la misma semana y eje no vuelve a pedir nada', async () => {
    mockSemanales.mockResolvedValue([{ id: 's1', rocaMaestraId: 'm1', titulo: 'Caminar 5 días' }]);
    await montar({ id: 'r1', eje: 'CUERPO', rocaSemanalId: 's1' });
    await cambiar({ id: 'r2', eje: 'CUERPO', rocaSemanalId: 's1' });
    expect(ultima).toEqual({ meta: 'Caminar 5 días', lista: true });
    expect(mockSemanales).toHaveBeenCalledTimes(1);
  });

  it('si todo falla (sin red) queda lista y sin meta; no se guarda el fallo', async () => {
    mockSemanales.mockRejectedValue(new Error('sin red'));
    mockMaestras.mockRejectedValue(new Error('sin red'));
    await montar({ id: 'r1', eje: 'CUERPO', rocaSemanalId: 's1' });
    expect(ultima).toEqual({ meta: null, lista: true });
    mockSemanales.mockResolvedValue([{ id: 's1', rocaMaestraId: 'm1', titulo: 'Caminar 5 días' }]);
    await cambiar({ id: 'r2', eje: 'TRABAJO', rocaSemanalId: null });
    await cambiar({ id: 'r1', eje: 'CUERPO', rocaSemanalId: 's1' });
    expect(ultima.meta).toBe('Caminar 5 días');
  });

  it('al cambiar a otra acción no enseña la meta de la anterior ni por un cuadro', async () => {
    mockSemanales.mockResolvedValue([{ id: 's1', rocaMaestraId: 'm1', titulo: 'Caminar 5 días' }]);
    await montar({ id: 'r1', eje: 'CUERPO', rocaSemanalId: 's1' });
    historial.length = 0;
    let responder: (v: Partial<RocaSemanalApi>[]) => void = () => undefined;
    mockSemanales.mockReturnValue(new Promise(r => { responder = r; }));
    mockMaestras.mockResolvedValue([]);
    await cambiar({ id: 'r9', eje: 'TRABAJO', rocaSemanalId: 's9' });
    expect(historial[0]).toBe(false);
    expect(ultima.meta).toBeNull();
    await act(async () => responder([]));
  });
});
