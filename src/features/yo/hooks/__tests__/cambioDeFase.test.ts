/** El momento de «entraste en una fase nueva» ocurre una sola vez, y no para quien ya venía de antes. */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const mockAlmacen = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => mockAlmacen.get(k) ?? null,
    setItem: async (k: string, v: string) => { mockAlmacen.set(k, v); },
  },
}));

import { useCambioDeFase } from '../useCambioDeFase';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function celebra(fase: string): Promise<boolean> {
  let valor = false;
  function Sonda() { valor = useCambioDeFase('u-1', fase); return null; }
  await act(async () => { TestRenderer.create(React.createElement(Sonda)); });
  return valor;
}

describe('useCambioDeFase', () => {
  beforeEach(() => mockAlmacen.clear());

  it('la primera vez no celebra, pero deja anotada la fase', async () => {
    expect(await celebra('PHASE_3_ALCHEMIST_WARRIOR')).toBe(false);
    expect(mockAlmacen.get('yo.faseVista.u-1')).toBe('3');
  });

  it('al pasar de la fase 1 a la 2 celebra, y la segunda vez ya no', async () => {
    mockAlmacen.set('yo.faseVista.u-1', '1');
    expect(await celebra('PHASE_2_DEVELOPMENT')).toBe(true);
    expect(mockAlmacen.get('yo.faseVista.u-1')).toBe('2');
    expect(await celebra('PHASE_2_DEVELOPMENT')).toBe(false);
  });

  it('en la misma fase no celebra', async () => {
    mockAlmacen.set('yo.faseVista.u-1', '2');
    expect(await celebra('PHASE_2_DEVELOPMENT')).toBe(false);
  });
});
