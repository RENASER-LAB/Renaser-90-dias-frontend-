import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockApiFetch = jest.fn<(ruta: string) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string) => mockApiFetch(ruta),
  mensajeDeError: (_e: unknown, porDefecto: string) => porDefecto,
}));

import { useCursos } from '../../../academy/hooks/useCursos';
import { useChatConversaciones } from '../../../chat/hooks/useChatConversaciones';
import { useRanking } from '../../../ranking/hooks/useRanking';
import { useCategoriasMuro } from '../useCategoriasMuro';
import { useGruposDelAprendiz } from '../useGruposDelAprendiz';
import { useMiCelula } from '../useMiCelula';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Monta los hooks de Comunidad como los monta la pantalla, con un `activo` por recurso. */
function Sonda({ activo }: { activo: boolean }) {
  useMiCelula(activo);
  useGruposDelAprendiz(activo);
  useChatConversaciones('yo', activo);
  useCursos(activo);
  useRanking(activo);
  useCategoriasMuro(activo);
  return null;
}

async function montar(activo: boolean) {
  let raiz!: ReactTestRenderer;
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda, { activo }));
  });
  return raiz;
}

/**
 * V-3 (26/09/2026): con `activo = false` los hooks de las secciones escondidas de Comunidad no
 * salen a la red. Así, al abrir la pestaña, el Muro no compite con ~11 + N pedidos que nadie ve.
 */
describe('carga diferida de los recursos de Comunidad', () => {
  let raiz: ReactTestRenderer | null = null;

  beforeEach(() => {
    mockApiFetch.mockReset();
    // Respuestas que fallan la validación no importan acá: se cuenta si SALIÓ el pedido.
    mockApiFetch.mockImplementation(() => Promise.reject(new Error('sin backend en la prueba')));
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    act(() => raiz?.unmount());
    raiz = null;
    jest.restoreAllMocks();
  });

  it('inactivos, no hacen ningún pedido', async () => {
    raiz = await montar(false);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('al activarse piden, y una sola vez aunque la pantalla se vuelva a dibujar', async () => {
    raiz = await montar(false);
    await act(async () => raiz!.update(React.createElement(Sonda, { activo: true })));
    const pedidosAlActivar = mockApiFetch.mock.calls.length;
    expect(pedidosAlActivar).toBeGreaterThan(0);
    expect(mockApiFetch.mock.calls.map(([r]) => r)).toEqual(
      expect.arrayContaining(['/api/v1/me/cell', '/api/v1/chat/conversations']),
    );

    await act(async () => raiz!.update(React.createElement(Sonda, { activo: true })));
    expect(mockApiFetch).toHaveBeenCalledTimes(pedidosAlActivar);
  });

  it('sin el parámetro se comportan como siempre (cargan al montar)', async () => {
    function SondaPorOmision() {
      useRanking();
      return null;
    }
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(SondaPorOmision));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });
});
