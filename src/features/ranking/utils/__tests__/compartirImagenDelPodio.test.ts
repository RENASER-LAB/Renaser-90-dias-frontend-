/**
 * Sacar la imagen del podio y entregarla (spec 006 del backend, T039): hoja de compartir en el teléfono,
 * archivo en la web, y cancelar NO es un error. Todo lo de afuera (captura, hoja, navegador) entra por el
 * `entorno`, así que se prueba cada salida sin teléfono.
 */
import { describe, expect, it, jest } from '@jest/globals';

import {
  compartirImagenDelPodio,
  fueCancelado,
  medidasDeLaCaptura,
  TITULO_DE_LA_HOJA,
  type EntornoDeLaImagen,
} from '../compartirImagenDelPodio';
import { SALIDA_PX } from '../medidasDelPodio';

const VISTA = { vista: 'la-tarjeta' };
const PEDIDO = { vista: VISTA, nombreDelArchivo: 'podio-general-2026-10-19.png' };

function entorno(parcial: Partial<EntornoDeLaImagen> = {}) {
  const e = {
    esWeb: false,
    capturar: jest.fn<EntornoDeLaImagen['capturar']>().mockResolvedValue('file:///cache/podio.png'),
    compartir: jest.fn<EntornoDeLaImagen['compartir']>().mockResolvedValue(true),
    bajarEnElNavegador: jest.fn<EntornoDeLaImagen['bajarEnElNavegador']>(),
    ...parcial,
  };
  return e;
}

describe('en el teléfono', () => {
  it('captura la tarjeta a un archivo y abre la hoja de compartir con ese archivo', async () => {
    const e = entorno();
    const r = await compartirImagenDelPodio(PEDIDO, e);
    expect(r).toEqual({ ok: true, via: 'hoja' });
    expect(e.capturar).toHaveBeenCalledWith(VISTA, { nombreDelArchivo: PEDIDO.nombreDelArchivo, formato: 'archivo' });
    expect(e.compartir).toHaveBeenCalledWith('file:///cache/podio.png', { titulo: TITULO_DE_LA_HOJA });
    expect(e.bajarEnElNavegador).not.toHaveBeenCalled();
  });

  it('un teléfono que no puede compartir lo dice, sin tratarlo como un fallo raro', async () => {
    const e = entorno({ compartir: jest.fn<EntornoDeLaImagen['compartir']>().mockResolvedValue(false) });
    expect(await compartirImagenDelPodio(PEDIDO, e)).toEqual({ ok: false, motivo: 'sin-compartir' });
  });

  it.each([
    ['AbortError', Object.assign(new Error('Share canceled'), { name: 'AbortError' })],
    ['un mensaje de cancelación', new Error('User cancelled the share sheet')],
    ['la hoja cerrada', new Error('Sharing request was aborted')],
  ])('cancelar la hoja (%s) no es un error', async (_caso, error) => {
    const e = entorno({ compartir: jest.fn<EntornoDeLaImagen['compartir']>().mockRejectedValue(error) });
    expect(await compartirImagenDelPodio(PEDIDO, e)).toEqual({ ok: false, motivo: 'cancelado' });
  });

  it('si la captura falla, devuelve el motivo y no lanza; la hoja no se abre', async () => {
    const e = entorno({ capturar: jest.fn<EntornoDeLaImagen['capturar']>().mockRejectedValue(new Error('ref.current is null')) });
    expect(await compartirImagenDelPodio(PEDIDO, e)).toEqual({ ok: false, motivo: 'fallo', detalle: 'ref.current is null' });
    expect(e.compartir).not.toHaveBeenCalled();
  });

  it('un fallo de la hoja que no es cancelar sí se reporta', async () => {
    const e = entorno({ compartir: jest.fn<EntornoDeLaImagen['compartir']>().mockRejectedValue(new Error('ERR_SHARING_FAILED')) });
    expect(await compartirImagenDelPodio(PEDIDO, e)).toMatchObject({ ok: false, motivo: 'fallo' });
  });

  it('un valor que ni siquiera es un Error también se contiene', async () => {
    const e = entorno({ capturar: jest.fn<EntornoDeLaImagen['capturar']>().mockRejectedValue('boom') });
    expect(await compartirImagenDelPodio(PEDIDO, e)).toEqual({ ok: false, motivo: 'fallo', detalle: 'boom' });
  });
});

describe('en la web', () => {
  it('captura a un data URI y baja el archivo con su nombre; no abre ninguna hoja', async () => {
    const e = entorno({
      esWeb: true,
      capturar: jest.fn<EntornoDeLaImagen['capturar']>().mockResolvedValue('data:image/png;base64,AAAA'),
    });
    const r = await compartirImagenDelPodio(PEDIDO, e);
    expect(r).toEqual({ ok: true, via: 'archivo' });
    expect(e.capturar).toHaveBeenCalledWith(VISTA, { nombreDelArchivo: PEDIDO.nombreDelArchivo, formato: 'data-uri' });
    expect(e.bajarEnElNavegador).toHaveBeenCalledWith('data:image/png;base64,AAAA', 'podio-general-2026-10-19.png');
    expect(e.compartir).not.toHaveBeenCalled();
  });

  it('si html2canvas falla, lo cuenta como fallo sin romper la pantalla', async () => {
    const e = entorno({ esWeb: true, capturar: jest.fn<EntornoDeLaImagen['capturar']>().mockRejectedValue(new Error('taint')) });
    expect(await compartirImagenDelPodio(PEDIDO, e)).toMatchObject({ ok: false, motivo: 'fallo' });
    expect(e.bajarEnElNavegador).not.toHaveBeenCalled();
  });
});

describe('el tamaño de la imagen', () => {
  it('en Android y en la web se pide 1080 × 1920 px, sin importar la densidad', () => {
    for (const densidad of [1.5, 2, 2.75, 3.5]) {
      expect(medidasDeLaCaptura('android', densidad)).toEqual({ ancho: 1080, alto: 1920 });
      expect(medidasDeLaCaptura('web', densidad)).toEqual({ ancho: 1080, alto: 1920 });
    }
  });

  it('en iOS se piden puntos: dividido por la densidad, para que igual salgan 1080 × 1920 px', () => {
    for (const densidad of [2, 3]) {
      const { ancho, alto } = medidasDeLaCaptura('ios', densidad);
      expect(ancho * densidad).toBe(SALIDA_PX.ancho);
      expect(alto * densidad).toBe(SALIDA_PX.alto);
    }
  });
});

describe('fueCancelado', () => {
  it('reconoce cancelar y abortar, y no confunde otros errores', () => {
    expect(fueCancelado(Object.assign(new Error('x'), { name: 'AbortError' }))).toBe(true);
    expect(fueCancelado(new Error('The user canceled'))).toBe(true);
    expect(fueCancelado(new Error('ERR_SHARING_FAILED'))).toBe(false);
    expect(fueCancelado(null)).toBe(false);
    expect(fueCancelado('Network request failed')).toBe(false);
  });
});
