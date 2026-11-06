/**
 * Spec 045 FR-011 (D1, 06/11): el recorrido de bienvenida reemplaza el saludo y la guía al Muro de la burbuja de SER; la
 * burbuja queda solo para el Pacto. Contra un backend anterior (sin `/me/recorrido`), la guía sigue como siempre.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockRecorrido = jest.fn<() => Promise<{ mostrar: boolean; paso: number; terminado: boolean }>>();
jest.mock('../../onboarding/api/onboardingApi', () => ({
  obtenerEstado: () => Promise.resolve({ pactSignedAt: null }),
  consultarActivacionPrograma: () => Promise.resolve({ activated: true }),
}));
jest.mock('../../community/api/wallApi', () => ({ contarMisPublicaciones: () => Promise.resolve(0) }));
jest.mock('../../recorrido/api/recorridoApi', () => ({ obtenerRecorrido: () => mockRecorrido() }));

import { avisarRecorridoTerminado } from '../../recorrido/estado/recorridoEnCurso';
import { useArranqueGuiado } from '../hooks/useArranqueGuiado';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
let valor!: ReturnType<typeof useArranqueGuiado>;
function Arnes() {
  valor = useArranqueGuiado(true);
  return null;
}
async function montar() {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Arnes));
  });
}
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockRecorrido.mockReset();
});

describe('la burbuja de SER con el recorrido (spec 045 FR-011, D1)', () => {
  it('mientras le toca el recorrido, la burbuja no saluda ni guía al Muro', async () => {
    mockRecorrido.mockResolvedValue({ mostrar: true, paso: 1, terminado: false });
    await montar();
    expect(valor.estado).toEqual({ paso: 'NINGUNO' });
  });

  it('al terminar el recorrido (aunque no haya publicado), queda solo el Pacto', async () => {
    mockRecorrido.mockResolvedValue({ mostrar: true, paso: 5, terminado: false });
    await montar();
    mockRecorrido.mockResolvedValue({ mostrar: false, paso: 5, terminado: true });
    await act(async () => avisarRecorridoTerminado());
    expect(valor.estado).toEqual({ paso: 'FIRMAR_PACTO' });
  });

  it('contra un backend anterior (sin /me/recorrido) la guía es la de siempre: publicar el primer post', async () => {
    mockRecorrido.mockRejectedValue(new Error('404'));
    await montar();
    expect(valor.estado).toEqual({ paso: 'PUBLICAR_PRIMER_POST' });
  });
});
