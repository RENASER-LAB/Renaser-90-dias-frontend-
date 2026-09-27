import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '../../../../services/http/apiClient';
import { SIN_ALMACENAMIENTO, SIN_PERMISO } from '../bienvenida';
import { prepararPortadaCandidata, type PasoDeLaPortada, type PiezasDeLaPortada } from '../portadaCandidata';
import type { TarjetaDeMuestra } from '../tarjetaDeMuestra';

/**
 * Cambiar la portada de la tarjeta, hasta la vista previa (backend D-210): elegir → pedir dónde subir
 * → subir → pedir la tarjeta ya revisada. No existía: falla contra el código anterior.
 */

const FOTO = { uri: 'file:///portada.jpg', mimeType: 'image/jpeg' };
const SUBIDA = { url: 'https://s3.amazonaws.com/firmada', ruta: 'bienvenida/portadas/p-1' };

function piezas(extra: Partial<PiezasDeLaPortada> = {}) {
  const pasos: PasoDeLaPortada[] = [];
  const subir = jest.fn<PiezasDeLaPortada['subir']>(async () => {});
  const pedirSubida = jest.fn<PiezasDeLaPortada['pedirSubida']>(async () => SUBIDA);
  const traerMuestra = jest.fn<(ruta: string) => Promise<TarjetaDeMuestra>>(async () => ({
    ok: true,
    uri: 'blob:candidata',
  }));
  const todas: PiezasDeLaPortada = {
    elegir: async () => FOTO,
    pedirSubida,
    subir,
    traerMuestra,
    alAvanzar: paso => {
      pasos.push(paso);
    },
    ...extra,
  };
  return { todas, pasos, subir, pedirSubida, traerMuestra };
}

describe('prepararPortadaCandidata', () => {
  it('camino feliz: sube la imagen tal cual la eligió y muestra la tarjeta con esa portada', async () => {
    const { todas, pasos, subir, pedirSubida, traerMuestra } = piezas();

    await expect(prepararPortadaCandidata(todas)).resolves.toEqual({
      tipo: 'lista',
      ruta: 'bienvenida/portadas/p-1',
      uri: 'blob:candidata',
    });
    expect(pedirSubida).toHaveBeenCalledWith('image/jpeg');
    expect(subir).toHaveBeenCalledWith(SUBIDA.url, FOTO.uri, 'image/jpeg');
    expect(traerMuestra).toHaveBeenCalledWith('bienvenida/portadas/p-1');
    expect(pasos).toEqual(['subiendo', 'revisando']);
  });

  it('si canceló la galería no pide nada al servidor', async () => {
    const { todas, pedirSubida, pasos } = piezas({ elegir: async () => null });

    await expect(prepararPortadaCandidata(todas)).resolves.toEqual({ tipo: 'cancelada' });
    expect(pedirSubida).not.toHaveBeenCalled();
    expect(pasos).toEqual([]);
  });

  it('almacenamiento de marcador (local): avisa y NO intenta el PUT a about:blank', async () => {
    const { todas, subir, traerMuestra } = piezas({
      pedirSubida: async () => ({ url: 'about:blank#pendiente-s3/bienvenida/portadas/p-1', ruta: 'x' }),
    });

    await expect(prepararPortadaCandidata(todas)).resolves.toEqual({ tipo: 'fallo', mensaje: SIN_ALMACENAMIENTO });
    expect(subir).not.toHaveBeenCalled();
    expect(traerMuestra).not.toHaveBeenCalled();
  });

  it('el servidor revisa la imagen y no sirve (400): se muestra su motivo y se ofrece elegir otra', async () => {
    const motivo = 'El nombre no se leería: la franja donde va (abajo, al centro) es muy oscura.';
    const { todas } = piezas({ traerMuestra: async () => ({ ok: false, status: 400, mensaje: motivo }) });

    await expect(prepararPortadaCandidata(todas)).resolves.toEqual({ tipo: 'rechazada', mensaje: motivo });
  });

  it('404 (no llegó a subirse) también es elegir otra; 409 (sin almacenamiento) no depende de la imagen', async () => {
    const noEsta = piezas({ traerMuestra: async () => ({ ok: false, status: 404, mensaje: 'No está' }) });
    await expect(prepararPortadaCandidata(noEsta.todas)).resolves.toEqual({ tipo: 'rechazada', mensaje: 'No está' });

    const sinLugar = piezas({ traerMuestra: async () => ({ ok: false, status: 409, mensaje: 'Sin almacenamiento' }) });
    await expect(prepararPortadaCandidata(sinLugar.todas)).resolves.toEqual({ tipo: 'fallo', mensaje: 'Sin almacenamiento' });
  });

  it('un 403 al pedir dónde subir dice quién puede, sin subir nada', async () => {
    const { todas, subir } = piezas({
      pedirSubida: async () => {
        throw new ApiError(403, 'Solo ADMIN/ALCHEMIST');
      },
    });

    await expect(prepararPortadaCandidata(todas)).resolves.toEqual({ tipo: 'fallo', mensaje: SIN_PERMISO });
    expect(subir).not.toHaveBeenCalled();
  });

  it('si el PUT al almacenamiento falla, no pide la vista previa', async () => {
    const { todas, traerMuestra } = piezas({
      subir: async () => {
        throw new Error('S3 respondió 403');
      },
    });

    await expect(prepararPortadaCandidata(todas)).resolves.toEqual({
      tipo: 'fallo',
      mensaje: 'No se pudo subir la imagen. Revisa la conexión y vuelve a intentar.',
    });
    expect(traerMuestra).not.toHaveBeenCalled();
  });
});
