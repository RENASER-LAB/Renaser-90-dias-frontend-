import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../../../config/apiConfig', () => ({ API_CONFIG: { BASE_URL: 'http://localhost:8080' } }));

import { SIN_PERMISO } from '../bienvenida';
import {
  SIN_RED,
  entornoDeLaPlataforma,
  traerTarjetaDeMuestra,
  type EntornoDeLaTarjeta,
  type RespuestaDeImagen,
} from '../tarjetaDeMuestra';

/**
 * La vista previa de la tarjeta (backend D-210): un JPEG que pide la sesión y que, si la portada
 * candidata no sirve, llega como 400 con el motivo. Se prueba sin red ni navegador, con el entorno
 * inyectado. No existía: falla contra el código anterior.
 */

const RUTA = '/api/v1/admin/bienvenida/tarjeta?nombre=Mar%C3%ADa';

function respuesta(status: number, cuerpo = ''): RespuestaDeImagen {
  return {
    ok: status >= 200 && status < 300,
    status,
    blob: async () => ({ tipo: 'jpeg' }) as unknown as Blob,
    text: async () => cuerpo,
  };
}

function entorno(pedir: EntornoDeLaTarjeta['pedir'], aUri: EntornoDeLaTarjeta['aUri'] = async () => 'blob:tarjeta-1') {
  const pedidos: Array<{ url: string; headers: Record<string, string> }> = [];
  const e: EntornoDeLaTarjeta = {
    pedir: async (url, opciones) => {
      pedidos.push({ url, headers: opciones.headers });
      return pedir(url, opciones);
    },
    aUri,
    liberar: () => {},
  };
  return { e, pedidos };
}

describe('traerTarjetaDeMuestra', () => {
  it('con sesión: pide la URL completa del backend y devuelve algo que un Image puede mostrar', async () => {
    const { e, pedidos } = entorno(async () => respuesta(200));

    await expect(traerTarjetaDeMuestra(RUTA, 'sesion-1', e)).resolves.toEqual({ ok: true, uri: 'blob:tarjeta-1' });
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].url).toBe(`http://localhost:8080${RUTA}`);
    expect(pedidos[0].headers['X-Auth-Token']).toBe('sesion-1');
    // La imagen, y el JSON de un error: sin image/jpeg el servidor respondería 406.
    expect(pedidos[0].headers.Accept).toContain('image/jpeg');
  });

  it('sin sesión no manda cabecera (el servidor responde 403 y se dice quién puede)', async () => {
    const { e, pedidos } = entorno(async () => respuesta(403, '{"message":"Solo ADMIN/ALCHEMIST"}'));

    await expect(traerTarjetaDeMuestra(RUTA, null, e)).resolves.toEqual({ ok: false, status: 403, mensaje: SIN_PERMISO });
    expect(pedidos[0].headers['X-Auth-Token']).toBeUndefined();
  });

  it('400: el motivo del servidor, tal cual, para leerlo en la pantalla', async () => {
    const motivo = 'El nombre no se leería: la franja donde va (abajo, al centro) es muy oscura.';
    const { e } = entorno(async () => respuesta(400, JSON.stringify({ message: motivo, timestamp: 'x' })));

    await expect(traerTarjetaDeMuestra(RUTA, 's', e)).resolves.toEqual({ ok: false, status: 400, mensaje: motivo });
  });

  it('un error sin JSON (un proxy) no se muestra crudo', async () => {
    const { e } = entorno(async () => respuesta(502, '<html>Bad Gateway</html>'));

    await expect(traerTarjetaDeMuestra(RUTA, 's', e)).resolves.toEqual({
      ok: false,
      status: 502,
      mensaje: 'No se pudo mostrar la tarjeta.',
    });
  });

  it('sin red: lo dice, sin lanzar', async () => {
    const { e } = entorno(async () => {
      throw new Error('Network request failed');
    });

    await expect(traerTarjetaDeMuestra(RUTA, 's', e)).resolves.toEqual({ ok: false, status: 0, mensaje: SIN_RED });
  });

  it('si la imagen no se puede convertir, tampoco lanza', async () => {
    const { e } = entorno(
      async () => respuesta(200),
      async () => {
        throw new Error('FileReader falló');
      },
    );

    await expect(traerTarjetaDeMuestra(RUTA, 's', e)).resolves.toEqual({
      ok: false,
      status: 200,
      mensaje: 'No se pudo mostrar la tarjeta.',
    });
  });
});

describe('entornoDeLaPlataforma', () => {
  it('en web libera el object URL que reemplaza; en el teléfono no hay nada que liberar', () => {
    const original = URL.revokeObjectURL;
    const liberadas: string[] = [];
    URL.revokeObjectURL = (uri: string) => {
      liberadas.push(uri);
    };
    try {
      entornoDeLaPlataforma(true).liberar('blob:tarjeta-1');
      entornoDeLaPlataforma(true).liberar('data:image/jpeg;base64,AAA');
      entornoDeLaPlataforma(false).liberar('blob:tarjeta-2');
    } finally {
      URL.revokeObjectURL = original;
    }
    expect(liberadas).toEqual(['blob:tarjeta-1']);
  });
});
