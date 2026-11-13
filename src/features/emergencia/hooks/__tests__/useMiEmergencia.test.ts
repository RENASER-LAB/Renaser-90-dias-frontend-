import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * #197: el pedido de emergencia es solo de aprendices. Con una cuenta del personal, Yo no lo consulta (antes dejaba un 403 en el
 * log en cada apertura); con un aprendiz, lo consulta como siempre.
 */

const mockLeer = jest.fn<() => Promise<unknown>>();
jest.mock('../../api/emergenciaApi', () => ({ leerMiEmergencia: () => mockLeer() }));
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return { useFocusEffect: (cb: () => void) => useEffect(cb, [cb]) };
});

import { useMiEmergencia } from '../useMiEmergencia';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function montar(activo?: boolean) {
  function Prueba() {
    useMiEmergencia(activo);
    return null;
  }
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(Prueba));
  });
  return r;
}

beforeEach(() => {
  mockLeer.mockReset().mockResolvedValue(null);
});

describe('useMiEmergencia (#197)', () => {
  it('con una cuenta del personal no consulta el pedido de emergencia', async () => {
    const r = await montar(false);
    expect(mockLeer).not.toHaveBeenCalled();
    act(() => r.unmount());
  });

  it('con un aprendiz lo consulta al entrar', async () => {
    const r = await montar(true);
    expect(mockLeer).toHaveBeenCalledTimes(1);
    act(() => r.unmount());
  });

  it('sin decir nada se comporta como antes (consulta)', async () => {
    const r = await montar();
    expect(mockLeer).toHaveBeenCalledTimes(1);
    act(() => r.unmount());
  });
});
