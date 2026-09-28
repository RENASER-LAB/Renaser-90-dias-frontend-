import { describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: () => undefined } }));

import { ApiError } from '../../../../services/http/apiClient';
import { SIN_ALMACENAMIENTO, subirImagen, type PiezasDeLaSubida } from '../subirImagen';

/**
 * La foto de la caja, el comprobante y el fondo de la carta suben en tres pasos: pedir dónde, subir
 * directo al almacenamiento y confirmar con la RUTA (nunca con la URL firmada, que vence).
 */

const FOTO = { uri: 'file:///foto.jpg', mimeType: 'image/jpeg' };

function piezas(parcial: Partial<PiezasDeLaSubida<string>> = {}) {
  return {
    elegir: jest.fn(async () => FOTO),
    pedirSubida: jest.fn(async (_tipo: string) => ({ url: 'https://s3.example/put?firma=1', ruta: 'onboarding/a-1/caja/x' })),
    subir: jest.fn(async (_url: string, _uri: string, _tipo: string) => undefined),
    confirmar: jest.fn(async (ruta: string) => `detalle con ${ruta}`),
    ...parcial,
  };
}

describe('subir una imagen de la caja', () => {
  it('confirma con la ruta, no con la URL firmada', async () => {
    const p = piezas();
    expect(await subirImagen(p)).toEqual({ tipo: 'lista', valor: 'detalle con onboarding/a-1/caja/x' });
    expect(p.pedirSubida).toHaveBeenCalledWith('image/jpeg');
    expect(p.subir).toHaveBeenCalledWith('https://s3.example/put?firma=1', 'file:///foto.jpg', 'image/jpeg');
    expect(p.confirmar).toHaveBeenCalledWith('onboarding/a-1/caja/x');
  });

  it('si cancela, no pide nada', async () => {
    const p = piezas({ elegir: jest.fn(async () => null) });
    expect(await subirImagen(p)).toEqual({ tipo: 'cancelada' });
    expect(p.pedirSubida).not.toHaveBeenCalled();
  });

  it('con el almacenamiento de marcador (local) avisa en vez de subir a about:blank', async () => {
    const p = piezas({ pedirSubida: jest.fn(async () => ({ url: 'about:blank#pendiente-s3/x', ruta: 'x' })) });
    expect(await subirImagen(p)).toEqual({ tipo: 'fallo', mensaje: SIN_ALMACENAMIENTO });
    expect(p.subir).not.toHaveBeenCalled();
  });

  it('si la subida falla, no confirma', async () => {
    const p = piezas({
      subir: jest.fn(async () => {
        throw new Error('S3 respondió 403');
      }),
    });
    expect(await subirImagen(p)).toEqual({ tipo: 'fallo', mensaje: 'No se pudo subir la imagen.' });
    expect(p.confirmar).not.toHaveBeenCalled();
  });

  it('un 409 al confirmar muestra el motivo corto del servidor', async () => {
    const p = piezas({
      confirmar: jest.fn(async () => {
        throw new ApiError(409, 'La caja ya fue enviada.');
      }),
    });
    expect(await subirImagen(p)).toEqual({ tipo: 'fallo', mensaje: 'La caja ya fue enviada.' });
  });
});
