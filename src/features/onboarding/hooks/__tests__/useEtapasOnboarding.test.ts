/**
 * `useEtapasOnboarding` sin el Mapa (spec 026): «Mi onboarding» queda con una etapa, El Pacto, y ya no lee
 * `GET /api/v1/mapa-renacimiento`. Ante la duda, pendiente o desconocido: un tilde verde falso es peor que ninguno.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockEstado = jest.fn<() => Promise<{ pactSignedAt: string | null; currentFlow?: string }>>();
jest.mock('../../api/onboardingApi', () => ({ obtenerEstado: () => mockEstado() }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (efecto: () => (() => void) | void) => {
    const R = jest.requireActual<typeof import('react')>('react');
    R.useEffect(() => efecto(), [efecto]);
  },
}));

import { useEtapasOnboarding } from '../useEtapasOnboarding';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
let ultimo: ReturnType<typeof useEtapasOnboarding>;
function Sonda() {
  ultimo = useEtapasOnboarding();
  return null;
}
async function montar() {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
}

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockEstado.mockReset();
});

describe('useEtapasOnboarding', () => {
  it('con el Pacto firmado: completada, y cuenta una etapa completada', async () => {
    mockEstado.mockResolvedValue({ pactSignedAt: '2026-10-29T17:10:00Z' });
    await montar();
    expect(ultimo.pacto).toBe('completada');
    expect(ultimo.pactoFirmadoEn).toBe('2026-10-29T17:10:00Z');
    expect(ultimo.completadas).toBe(1);
  });

  it('sin firmar: pendiente', async () => {
    mockEstado.mockResolvedValue({ pactSignedAt: null });
    await montar();
    expect(ultimo.pacto).toBe('pendiente');
    expect(ultimo.completadas).toBe(0);
  });

  it('si la lectura falla: desconocido, nunca un tilde inventado', async () => {
    mockEstado.mockRejectedValue(new Error('sin red'));
    await montar();
    expect(ultimo.pacto).toBe('desconocido');
    expect(ultimo.completadas).toBe(0);
  });

  it('ya no hay etapa del Mapa en lo que devuelve', async () => {
    mockEstado.mockResolvedValue({ pactSignedAt: '2026-10-29T17:10:00Z' });
    await montar();
    expect(Object.keys(ultimo)).not.toContain('mapaRenacimiento');
  });
});
