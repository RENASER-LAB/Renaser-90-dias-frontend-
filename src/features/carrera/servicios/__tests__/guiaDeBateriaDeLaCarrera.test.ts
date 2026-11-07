import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockMem = new Map<string, string>();
let mockFallar = false;
jest.mock('../almacenamiento', () => ({
  almacen: () => ({
    getItem: async (k: string) => {
      if (mockFallar) throw new Error('x');
      return mockMem.get(k) ?? null;
    },
    setItem: async (k: string, v: string) => {
      if (mockFallar) throw new Error('x');
      mockMem.set(k, v);
    },
  }),
}));

import { lineaDeLaGuia } from '../../../alarmas/data/guiasPorMarca';
import { claveDeLaGuiaDeBateria, guiaDeBateriaPendiente } from '../guiaDeBateriaDeLaCarrera';

beforeEach(() => {
  mockMem.clear();
  mockFallar = false;
});

describe('guía de batería antes de correr', () => {
  it('se muestra una sola vez por cuenta en Honor', async () => {
    expect(await guiaDeBateriaPendiente('u1', 'honor', 'android')).toBe(lineaDeLaGuia('honor'));
    expect(mockMem.has(claveDeLaGuiaDeBateria('u1'))).toBe(true);
    expect(await guiaDeBateriaPendiente('u1', 'honor', 'android')).toBeNull();
    expect(await guiaDeBateriaPendiente('u2', 'honor', 'android')).toBe(lineaDeLaGuia('honor'));
  });

  it.each(['huawei', 'xiaomi', 'samsung', 'oppo', 'vivo'] as const)('también en %s', async marca => {
    expect(await guiaDeBateriaPendiente('u', marca, 'android')).toBe(lineaDeLaGuia(marca));
  });

  it('no se muestra en Google/Pixel (marca «otra»)', async () => {
    expect(await guiaDeBateriaPendiente('u1', 'otra', 'android')).toBeNull();
    expect(mockMem.size).toBe(0);
  });

  it('no se muestra en la web ni en iOS', async () => {
    expect(await guiaDeBateriaPendiente('u1', 'honor', 'web')).toBeNull();
    expect(await guiaDeBateriaPendiente('u1', 'honor', 'ios')).toBeNull();
  });

  it('si el almacenamiento falla, no se muestra', async () => {
    mockFallar = true;
    expect(await guiaDeBateriaPendiente('u1', 'honor', 'android')).toBeNull();
  });
});
