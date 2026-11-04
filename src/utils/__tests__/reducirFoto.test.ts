import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

const mockCargar = jest.fn<(uri: string, opciones: unknown) => Promise<unknown>>();
const mockManipular = jest.fn<(fuente: unknown) => void>();
const mockAchicar = jest.fn<(medidas: unknown) => void>();
const mockRenderizar = jest.fn<() => Promise<unknown>>();
const mockGuardar = jest.fn<(opciones: unknown) => Promise<{ uri: string; width: number; height: number }>>();

jest.mock('expo-image', () => ({
  Image: { loadAsync: (uri: string, opciones: unknown) => mockCargar(uri, opciones) },
}));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: (fuente: unknown) => {
      mockManipular(fuente);
      return {
        resize: (medidas: unknown) => {
          mockAchicar(medidas);
          return { renderAsync: () => mockRenderizar() };
        },
      };
    },
  },
}));

import { FACTORES_DE_REINTENTO, reducirFoto } from '../reducirFoto';

/**
 * Issue #120: en Android el manipulador decodificaba la foto ENTERA (una de 108 MP son ~430 MB) antes de achicarla y, con poca
 * memoria, fallaba con `Context.renderAsync has been rejected … JobCancellationException`: la persona veía «No se pudo procesar la
 * foto» con una foto buena. Ahora la foto se carga ya achicada (`Image.loadAsync` con `maxWidth`) y recién entonces pasa al
 * manipulador.
 */

const FOTO_CARGADA = () => ({ release: jest.fn() });
const ERROR_DEL_MANIPULADOR = new Error(
  "Call to function 'Context.renderAsync' has been rejected.\n→ Caused by: kotlinx.coroutines.JobCancellationException",
);

let avisos: jest.SpiedFunction<typeof console.warn>;

beforeEach(() => {
  mockCargar.mockReset().mockImplementation(async () => FOTO_CARGADA());
  mockManipular.mockReset();
  mockAchicar.mockReset();
  mockRenderizar.mockReset().mockResolvedValue({ saveAsync: (o: unknown) => mockGuardar(o) });
  mockGuardar.mockReset().mockResolvedValue({ uri: 'file:///reducida.jpg', width: 1440, height: 1080 });
  avisos = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  avisos.mockRestore();
});

describe('reducirFoto', () => {
  it('carga la foto ya achicada al ancho pedido, no la entera, y la guarda en JPEG', async () => {
    const cargada = FOTO_CARGADA();
    mockCargar.mockResolvedValue(cargada);

    await expect(reducirFoto('file:///camara.jpg', { width: 1440 }, 0.8)).resolves.toEqual({
      uri: 'file:///reducida.jpg',
      width: 1440,
      height: 1080,
    });

    expect(mockCargar).toHaveBeenCalledTimes(1);
    expect(mockCargar).toHaveBeenCalledWith('file:///camara.jpg', { maxWidth: 1440 });
    // Al manipulador le llega la foto ya cargada y achicada, no la dirección del archivo grande.
    expect(mockManipular).toHaveBeenCalledWith(cargada);
    expect(mockAchicar).toHaveBeenCalledWith({ width: 1440 });
    expect(mockGuardar).toHaveBeenCalledWith({ compress: 0.8, format: 'jpeg' });
    expect(cargada.release).toHaveBeenCalledTimes(1);
    expect(avisos).not.toHaveBeenCalled();
  });

  it('el avatar cuadrado pide las dos medidas, al cargar y al achicar', async () => {
    await reducirFoto('file:///perfil.jpg', { width: 512, height: 512 }, 0.85);

    expect(mockCargar).toHaveBeenCalledWith('file:///perfil.jpg', { maxWidth: 512, maxHeight: 512 });
    expect(mockAchicar).toHaveBeenCalledWith({ width: 512, height: 512 });
    expect(mockGuardar).toHaveBeenCalledWith({ compress: 0.85, format: 'jpeg' });
  });

  it('si el manipulador falla, reintenta con la foto más chica y la deja registrada con su causa real', async () => {
    mockRenderizar.mockRejectedValueOnce(ERROR_DEL_MANIPULADOR);

    await expect(reducirFoto('file:///camara.jpg', { width: 1440 }, 0.8)).resolves.toMatchObject({ uri: 'file:///reducida.jpg' });

    expect(mockCargar).toHaveBeenNthCalledWith(1, 'file:///camara.jpg', { maxWidth: 1440 });
    expect(mockCargar).toHaveBeenNthCalledWith(2, 'file:///camara.jpg', { maxWidth: Math.round(1440 * FACTORES_DE_REINTENTO[1]) });
    expect(avisos).toHaveBeenCalledTimes(1);
    expect(String(avisos.mock.calls[0][0])).toContain('JobCancellationException');
  });

  it('si no se puede cargar la foto, también reintenta', async () => {
    mockCargar.mockRejectedValueOnce(new Error('Failed to load the image'));

    await expect(reducirFoto('file:///camara.jpg', { width: 1000 }, 0.8)).resolves.toMatchObject({ uri: 'file:///reducida.jpg' });

    expect(mockCargar).toHaveBeenCalledTimes(2);
    expect(mockCargar).toHaveBeenNthCalledWith(2, 'file:///camara.jpg', { maxWidth: 600 });
  });

  it('si ningún intento funciona, lanza el último error para que quien llama avise a la persona', async () => {
    mockRenderizar.mockRejectedValue(ERROR_DEL_MANIPULADOR);

    await expect(reducirFoto('file:///camara.jpg', { width: 1440 }, 0.8)).rejects.toBe(ERROR_DEL_MANIPULADOR);

    expect(mockCargar).toHaveBeenCalledTimes(FACTORES_DE_REINTENTO.length);
    expect(avisos).toHaveBeenCalledTimes(FACTORES_DE_REINTENTO.length);
  });

  it('suelta la foto cargada aunque el manipulador falle, y un `release` que revienta no tapa el resultado', async () => {
    const cargada = { release: jest.fn(() => { throw new Error('ya estaba suelta'); }) };
    mockCargar.mockResolvedValue(cargada);

    await expect(reducirFoto('file:///camara.jpg', { width: 1440 }, 0.8)).resolves.toMatchObject({ uri: 'file:///reducida.jpg' });
    expect(cargada.release).toHaveBeenCalledTimes(1);

    cargada.release.mockClear();
    mockRenderizar.mockRejectedValue(ERROR_DEL_MANIPULADOR);
    await expect(reducirFoto('file:///camara.jpg', { width: 1440 }, 0.8)).rejects.toBe(ERROR_DEL_MANIPULADOR);
    expect(cargada.release).toHaveBeenCalledTimes(FACTORES_DE_REINTENTO.length);
  });

  it('no achica de más ni agranda: cada reintento baja de tamaño y nunca pide menos de 1 px', () => {
    expect(FACTORES_DE_REINTENTO[0]).toBe(1);
    for (let i = 1; i < FACTORES_DE_REINTENTO.length; i += 1) {
      expect(FACTORES_DE_REINTENTO[i]).toBeLessThan(FACTORES_DE_REINTENTO[i - 1]);
      expect(FACTORES_DE_REINTENTO[i]).toBeGreaterThan(0);
    }
  });

  describe('en la web', () => {
    let original: typeof Platform.OS;
    beforeEach(() => {
      original = Platform.OS;
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
    });
    afterEach(() => {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
    });

    it('el navegador decodifica sin el problema de memoria: se le pasa la dirección tal cual, como antes', async () => {
      await reducirFoto('blob:http://localhost/foto', { width: 1440 }, 0.8);

      expect(mockCargar).not.toHaveBeenCalled();
      expect(mockManipular).toHaveBeenCalledWith('blob:http://localhost/foto');
      expect(mockAchicar).toHaveBeenCalledWith({ width: 1440 });
    });
  });
});
