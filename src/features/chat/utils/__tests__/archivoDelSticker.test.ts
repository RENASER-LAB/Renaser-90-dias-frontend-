import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockDescargarNativo = jest.fn<(...args: any[]) => any>();
const mockFromModule = jest.fn<(...args: any[]) => any>();

jest.mock('expo-asset', () => ({ Asset: { fromModule: (m: number) => mockFromModule(m) } }));

import { archivoDelSticker } from '../archivoDelSticker';

function assetCon(localUri: string | null, uri: string) {
  return { downloadAsync: async () => ({ localUri, uri, hash: 'abc123', type: 'webp' }) };
}

describe('archivoDelSticker (E-463)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('en un APK de release copia el recurso embebido a un archivo, porque fetch no lee su nombre', async () => {
    mockFromModule.mockReturnValue(assetCon('assets_stickers_renaser_muybien', 'assets_stickers_renaser_muybien'));
    mockDescargarNativo.mockResolvedValue('file:///data/cache/ExponentAsset-abc123.webp');

    await expect(archivoDelSticker(7, mockDescargarNativo)).resolves.toBe('file:///data/cache/ExponentAsset-abc123.webp');
    expect(mockDescargarNativo).toHaveBeenCalledWith('assets_stickers_renaser_muybien', 'abc123', 'webp');
  });

  it('en desarrollo o web devuelve la URL que ya trae', async () => {
    mockFromModule.mockReturnValue(assetCon(null, 'http://10.0.2.2:8081/assets/muy-bien.webp'));

    await expect(archivoDelSticker(7, mockDescargarNativo)).resolves.toBe('http://10.0.2.2:8081/assets/muy-bien.webp');
    expect(mockDescargarNativo).not.toHaveBeenCalled();
  });
});
