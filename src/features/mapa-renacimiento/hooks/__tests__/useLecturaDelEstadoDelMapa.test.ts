/**
 * `useLecturaDelEstadoDelMapa` (2026-10-31): el estado del Mapa de siempre (`useEstadoMapa`) y si ya está CONFIRMADO. La tarjeta
 * de acciones de Hoy solo afirma «todavía no hiciste tu Mapa» con el estado confirmado: un teléfono nuevo dice «no iniciado» de
 * alguien que ya lo terminó.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { mapaVacio, type MapaRenacimiento } from '../../tipos';

const mockLeer = jest.fn<(userId: string) => Promise<MapaRenacimiento | null>>();
jest.mock('../../almacen', () => ({ almacenMapa: { leer: (id: string) => mockLeer(id) } }));
const mockConsultar = jest.fn<() => Promise<{ stageCompleted: boolean }>>();
jest.mock('../../api/mapaApi', () => ({ consultarMapa: () => mockConsultar() }));

import { useEstadoMapa, useLecturaDelEstadoDelMapa, type LecturaDelEstadoDelMapa } from '../useEstadoMapa';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
let ultima: LecturaDelEstadoDelMapa;
let soloEstado: unknown;
function Sonda({ userId }: { userId: string | null }) {
  ultima = useLecturaDelEstadoDelMapa(userId, false);
  soloEstado = useEstadoMapa(userId, false);
  return null;
}
async function montar(userId: string | null) {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda, { userId }));
  });
}
const conEstado = (estado: MapaRenacimiento['estado']): MapaRenacimiento => ({ ...mapaVacio(), estado });

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockLeer.mockReset();
  mockConsultar.mockReset();
});

describe('useLecturaDelEstadoDelMapa', () => {
  it('sin cuenta no hay estado ni confirmación', async () => {
    await montar(null);
    expect(ultima).toEqual({ estado: null, confirmado: false });
  });

  it('«activo» en el teléfono está confirmado sin preguntarle al servidor', async () => {
    mockLeer.mockResolvedValue(conEstado('activo'));
    await montar('u1');
    expect(ultima).toEqual({ estado: 'activo', confirmado: true });
    expect(mockConsultar).not.toHaveBeenCalled();
  });

  it('«no iniciado» en el teléfono NO está confirmado hasta que el servidor responde', async () => {
    mockLeer.mockResolvedValue(null);
    let responder: (v: { stageCompleted: boolean }) => void = () => undefined;
    mockConsultar.mockReturnValue(new Promise(r => { responder = r; }));
    await montar('u1');
    expect(ultima).toEqual({ estado: 'no_iniciado', confirmado: false });
    await act(async () => responder({ stageCompleted: false }));
    expect(ultima).toEqual({ estado: 'no_iniciado', confirmado: true });
  });

  it('el servidor puede confirmar que ya está hecho (otro teléfono)', async () => {
    mockLeer.mockResolvedValue(null);
    mockConsultar.mockResolvedValue({ stageCompleted: true });
    await montar('u1');
    expect(ultima).toEqual({ estado: 'activo', confirmado: true });
  });

  it('sin red se queda con el estado del teléfono, sin confirmar', async () => {
    mockLeer.mockResolvedValue(conEstado('en_progreso'));
    mockConsultar.mockRejectedValue(new Error('sin red'));
    await montar('u1');
    expect(ultima).toEqual({ estado: 'en_progreso', confirmado: false });
  });

  it('`useEstadoMapa` sigue devolviendo solo el estado, como antes', async () => {
    mockLeer.mockResolvedValue(conEstado('listo_para_revision'));
    mockConsultar.mockResolvedValue({ stageCompleted: false });
    await montar('u1');
    expect(soloEstado).toBe('listo_para_revision');
  });
});
