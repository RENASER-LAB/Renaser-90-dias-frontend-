/**
 * El entorno REAL de la imagen del podio (spec 006): cómo se le pide la captura a `react-native-view-shot` y
 * cómo se abre la hoja de `expo-sharing`. Las dos librerías son nativas: acá se reemplazan por dobles que solo
 * anotan con qué las llamaron.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

const mockCaptureRef = jest.fn<(vista: unknown, opciones: Record<string, unknown>) => Promise<string>>();
const mockReleaseCapture = jest.fn<(uri: string) => void>();
const mockIsAvailable = jest.fn<() => Promise<boolean>>();
const mockShare = jest.fn<(uri: string, opciones: Record<string, unknown>) => Promise<void>>();

jest.mock('react-native-view-shot', () => ({
  captureRef: (vista: unknown, opciones: Record<string, unknown>) => mockCaptureRef(vista, opciones),
  releaseCapture: (uri: string) => mockReleaseCapture(uri),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockIsAvailable(),
  shareAsync: (uri: string, opciones: Record<string, unknown>) => mockShare(uri, opciones),
}));

import { entornoDeLaPlataforma } from '../compartirImagenDelPodio';

const VISTA = { current: 'la-tarjeta' };

afterEach(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
  mockCaptureRef.mockReset().mockResolvedValue('file:///data/user/0/app/cache/podio-general-2026-10-19123.png');
  mockReleaseCapture.mockReset();
  mockIsAvailable.mockReset().mockResolvedValue(true);
  mockShare.mockReset().mockResolvedValue(undefined);
});

describe('capturar', () => {
  it('en el teléfono pide un PNG a archivo, a 1080 × 1920, con el nombre sin la extensión', async () => {
    const e = entornoDeLaPlataforma(false);
    const uri = await e.capturar(VISTA, { nombreDelArchivo: 'podio-general-2026-10-19.png', formato: 'archivo' });
    expect(mockCaptureRef).toHaveBeenCalledWith(VISTA, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: 1080,
      height: 1920,
      fileName: 'podio-general-2026-10-19',
    });
    expect(uri.startsWith('file://')).toBe(true);
  });

  it('una ruta sin el esquema `file://` (lo que ya devolvió una versión de la librería) se lo recibe', async () => {
    mockCaptureRef.mockResolvedValue('/data/user/0/app/cache/podio.png');
    const uri = await entornoDeLaPlataforma(false).capturar(VISTA, { nombreDelArchivo: 'podio.png', formato: 'archivo' });
    expect(uri).toBe('file:///data/user/0/app/cache/podio.png');
  });

  it('en la web pide un data URI (no un archivo temporal, que la web no implementa)', async () => {
    mockCaptureRef.mockResolvedValue('data:image/png;base64,AAAA');
    const uri = await entornoDeLaPlataforma(true).capturar(VISTA, { nombreDelArchivo: 'podio.png', formato: 'data-uri' });
    expect(uri).toBe('data:image/png;base64,AAAA');
    expect(mockCaptureRef).toHaveBeenCalledWith(VISTA, expect.objectContaining({ result: 'data-uri', width: 1080, height: 1920 }));
    expect(mockReleaseCapture).not.toHaveBeenCalled();
  });

  it('el archivo de la captura anterior se suelta al sacar la siguiente, no al terminar de compartir', async () => {
    const e = entornoDeLaPlataforma(false);
    mockCaptureRef.mockResolvedValueOnce('file:///cache/primera.png').mockResolvedValueOnce('file:///cache/segunda.png');
    await e.capturar(VISTA, { nombreDelArchivo: 'a.png', formato: 'archivo' });
    const antes = mockReleaseCapture.mock.calls.length;
    await e.capturar(VISTA, { nombreDelArchivo: 'b.png', formato: 'archivo' });
    expect(mockReleaseCapture.mock.calls.length).toBe(antes + 1);
    expect(mockReleaseCapture).toHaveBeenLastCalledWith('file:///cache/primera.png');
  });

  it('que no se pueda borrar el archivo viejo no rompe la captura nueva', async () => {
    const e = entornoDeLaPlataforma(false);
    mockReleaseCapture.mockImplementation(() => {
      throw new Error('EACCES');
    });
    await e.capturar(VISTA, { nombreDelArchivo: 'a.png', formato: 'archivo' });
    await expect(e.capturar(VISTA, { nombreDelArchivo: 'b.png', formato: 'archivo' })).resolves.toMatch(/^file:\/\//);
  });
});

describe('compartir', () => {
  it('abre la hoja del sistema con un PNG y el título', async () => {
    const hecho = await entornoDeLaPlataforma(false).compartir('file:///cache/podio.png', { titulo: 'Compartir el podio' });
    expect(hecho).toBe(true);
    expect(mockShare).toHaveBeenCalledWith('file:///cache/podio.png', {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: 'Compartir el podio',
    });
  });

  it('si el teléfono no puede compartir, devuelve `false` y no abre nada', async () => {
    mockIsAvailable.mockResolvedValue(false);
    expect(await entornoDeLaPlataforma(false).compartir('file:///x.png', { titulo: 't' })).toBe(false);
    expect(mockShare).not.toHaveBeenCalled();
  });
});
