/**
 * #51: en el registro con foto, «Reintentar» no subía la foto cuando volvía la conexión, y el mensaje era el mismo
 * para todo (leer el archivo, el PUT a S3, cualquier excepción local), sin dejar nada en el registro de la app. Se
 * prueba la subida con el `fetch` reemplazado (el archivo local y S3) y el servidor reemplazado (firmar y confirmar).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { subirArchivoAS3, subirEvidenciaDeArchivo } from '../evidenciaHabitoApi';

const mockApiFetch = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient'),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));
const mockTracks = jest.fn<() => Promise<unknown[]>>();
jest.mock('../habitsApi', () => ({ obtenerTracksDeHoy: () => mockTracks() }));

const mockFetch = jest.fn<(url: string, init?: { method?: string; body?: unknown }) => Promise<unknown>>();
let avisos: jest.SpiedFunction<typeof console.warn>;

const SIN_ESPERAS: readonly number[] = [0, 0];
const FOTO = { uri: 'file:///cache/ImageManipulator/foto.jpg', mimeType: 'image/jpeg', tipo: 'FOTO' as const };
const BYTES = new Uint8Array([1, 2, 3, 4]).buffer;

const leida = (extra: Record<string, unknown> = {}) => ({ ok: true, status: 200, arrayBuffer: async () => BYTES, ...extra });
const respuestaDeS3 = (status: number) => ({ ok: status >= 200 && status < 300, status });
const caidaDeRed = () => new TypeError('Network request failed');

function lasLlamadasAS3() {
  return mockFetch.mock.calls.filter(([, init]) => init?.method === 'PUT');
}

beforeEach(() => {
  (globalThis as { fetch?: unknown }).fetch = mockFetch;
  mockFetch.mockReset();
  mockApiFetch.mockReset();
  mockTracks.mockReset().mockResolvedValue([{ id: 'reg-1', estado: 'PENDIENTE', habitoId: 'h-1', fechaEjecucion: '2026-10-31' }]);
  avisos = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  avisos.mockRestore();
});

describe('el PUT a S3 aguanta una caída pasajera de la red dentro del mismo envío', () => {
  it('si el primer PUT cae por la red y el segundo sale, la subida termina sin que la persona toque nada', async () => {
    mockFetch
      .mockResolvedValueOnce(leida())
      .mockRejectedValueOnce(caidaDeRed())
      .mockResolvedValueOnce(respuestaDeS3(200));
    await expect(subirArchivoAS3('https://s3.local/foto', FOTO.uri, FOTO.mimeType, SIN_ESPERAS)).resolves.toBeUndefined();
    expect(lasLlamadasAS3()).toHaveLength(2);
    // El mismo cuerpo y el mismo Content-Type firmado en cada intento.
    for (const [, init] of lasLlamadasAS3()) {
      expect(init).toMatchObject({ method: 'PUT', headers: { 'Content-Type': 'image/jpeg' } });
      expect(init?.body).toBe(BYTES);
    }
  });

  it('un 5xx de S3 también se repite', async () => {
    mockFetch
      .mockResolvedValueOnce(leida())
      .mockResolvedValueOnce(respuestaDeS3(503))
      .mockResolvedValueOnce(respuestaDeS3(200));
    await subirArchivoAS3('https://s3.local/foto', FOTO.uri, FOTO.mimeType, SIN_ESPERAS);
    expect(lasLlamadasAS3()).toHaveLength(2);
  });

  it('un 4xx (firma vencida, otro Content-Type) NO se repite: no mejora repitiéndolo', async () => {
    mockFetch.mockResolvedValueOnce(leida()).mockResolvedValue(respuestaDeS3(403));
    await expect(subirArchivoAS3('https://s3.local/foto', FOTO.uri, FOTO.mimeType, SIN_ESPERAS)).rejects.toThrow(
      'S3 respondió 403',
    );
    expect(lasLlamadasAS3()).toHaveLength(1);
  });

  it('sin red durante todos los intentos, falla con el error de la red (no se queda colgado ni lo inventa)', async () => {
    const error = caidaDeRed();
    mockFetch.mockResolvedValueOnce(leida()).mockRejectedValue(error);
    await expect(subirArchivoAS3('https://s3.local/foto', FOTO.uri, FOTO.mimeType, SIN_ESPERAS)).rejects.toBe(error);
    expect(lasLlamadasAS3()).toHaveLength(SIN_ESPERAS.length + 1);
  });

  it('las pausas entre intentos son las de siempre (0,5 s y 1,5 s): la persona no espera más de ~2 s de más', async () => {
    jest.useFakeTimers();
    try {
      mockFetch.mockResolvedValueOnce(leida()).mockRejectedValue(caidaDeRed());
      const subida = subirArchivoAS3('https://s3.local/foto', FOTO.uri, FOTO.mimeType);
      const resultado = subida.catch(e => e);
      await jest.advanceTimersByTimeAsync(0);
      expect(lasLlamadasAS3()).toHaveLength(1);
      await jest.advanceTimersByTimeAsync(500);
      expect(lasLlamadasAS3()).toHaveLength(2);
      await jest.advanceTimersByTimeAsync(1500);
      expect(lasLlamadasAS3()).toHaveLength(3);
      expect(await resultado).toBeInstanceOf(TypeError);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('leer el archivo local', () => {
  it('un archivo que ya no está (el fetch de Expo responde 404 «File not found») NO se sube como si fuera la foto', async () => {
    mockFetch.mockResolvedValueOnce(leida({ ok: false, status: 404 }));
    await expect(subirArchivoAS3('https://s3.local/foto', FOTO.uri, FOTO.mimeType, SIN_ESPERAS)).rejects.toThrow(
      'No se pudo leer el archivo de la evidencia en el dispositivo.',
    );
    expect(lasLlamadasAS3()).toHaveLength(0);
  });

  it('el motivo real queda como `cause` del error', async () => {
    const motivo = new Error('boom');
    mockFetch.mockRejectedValueOnce(motivo);
    const error = await subirArchivoAS3('https://s3.local/foto', FOTO.uri, FOTO.mimeType, SIN_ESPERAS).catch(e => e);
    expect(error.cause).toBe(motivo);
  });
});

describe('el registro de la app dice en qué paso falló y por qué', () => {
  it('leer el archivo', async () => {
    const motivo = new Error('boom');
    mockFetch.mockRejectedValueOnce(motivo);
    await subirArchivoAS3('https://s3.local/foto', FOTO.uri, FOTO.mimeType, SIN_ESPERAS).catch(() => undefined);
    expect(avisos).toHaveBeenCalledWith(expect.stringContaining('leer el archivo'), expect.anything());
  });

  it('el PUT a S3: cada intento fallido y el paso final', async () => {
    mockFetch.mockResolvedValueOnce(leida()).mockRejectedValue(caidaDeRed());
    await subirArchivoAS3('https://s3.local/foto', FOTO.uri, FOTO.mimeType, SIN_ESPERAS).catch(() => undefined);
    const textos = avisos.mock.calls.map(c => String(c[0]));
    expect(textos.filter(t => t.includes('el PUT a S3 falló'))).toHaveLength(SIN_ESPERAS.length);
    expect(textos.some(t => t.includes('subir a S3'))).toBe(true);
  });

  it('pedir la dirección de subida y confirmar la evidencia, con el error original sin envolver', async () => {
    const caida = new Error('sin servidor');
    mockApiFetch.mockRejectedValueOnce(caida);
    await expect(subirEvidenciaDeArchivo('reg-1', FOTO)).rejects.toBe(caida);
    expect(avisos).toHaveBeenCalledWith(expect.stringContaining('pedir la dirección de subida'), caida);
  });
});

describe('«Reintentar» después de un fallo de red sube la foto (el caso del #51, con el envío entero)', () => {
  const URL_FIRMADA = { uploadUrl: 'https://s3.local/foto', bucket: 'renaser', ruta: 'evidencias/foto.jpg' };

  function servidor() {
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const ruta = String(args[0]);
      if (ruta.endsWith('/evidence/upload-url')) return URL_FIRMADA;
      if (ruta.endsWith('/evidence')) return { id: 'ev-1', estadoValidacion: 'PENDIENTE' };
      throw new Error(`ruta inesperada ${ruta}`);
    });
  }

  it('cada toque vuelve a pedir la dirección firmada, lee el archivo otra vez y sube', async () => {
    servidor();
    // Primer toque: la red se cae en los tres intentos del PUT.
    mockFetch.mockImplementation(async (url: string, init?: { method?: string }) => {
      if (init?.method === 'PUT') throw caidaDeRed();
      return leida();
    });
    await expect(subirEvidenciaDeArchivo('reg-1', FOTO)).rejects.toBeInstanceOf(TypeError);
    expect(lasLlamadasAS3().length).toBeGreaterThanOrEqual(1);
    const confirmadasAntes = mockApiFetch.mock.calls.filter(c => String(c[0]).endsWith('/evidence')).length;
    expect(confirmadasAntes).toBe(0); // la evidencia NO se confirmó: nada quedó a medias en el servidor

    // Vuelve la conexión y se toca «Reintentar».
    mockFetch.mockReset().mockImplementation(async (url: string, init?: { method?: string }) =>
      init?.method === 'PUT' ? respuestaDeS3(200) : leida(),
    );
    await expect(subirEvidenciaDeArchivo('reg-1', FOTO)).resolves.toMatchObject({ id: 'ev-1' });
    expect(lasLlamadasAS3()).toHaveLength(1);
    const firmas = mockApiFetch.mock.calls.filter(c => String(c[0]).endsWith('/evidence/upload-url')).length;
    expect(firmas).toBe(2); // una dirección firmada nueva por toque, no la vieja
    expect(mockApiFetch.mock.calls.filter(c => String(c[0]).endsWith('/evidence')).length).toBe(1);
  }, 15_000);
});
