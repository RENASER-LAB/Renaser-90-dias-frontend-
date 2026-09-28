import { describe, expect, it, jest } from '@jest/globals';

import { API_CONFIG } from '../../../../config/apiConfig';
import {
  SIN_PERMISO,
  SIN_RED,
  descargarConSesion,
  statusDelError,
  traerImagenConSesion,
  type EntornoDeArchivos,
  type RespuestaDeArchivo,
} from '../archivosConSesion';

/**
 * La planilla y la carta de la Caja Renaser: en web, descarga directa; en el teléfono, la hoja de
 * compartir. Las dos piden la sesión, que un `<img>` o un enlace no mandarían.
 */

function respuesta(status: number, cuerpo = ''): RespuestaDeArchivo {
  return {
    ok: status >= 200 && status < 300,
    status,
    blob: async () => ({ tamano: cuerpo.length }) as unknown as Blob,
    text: async () => cuerpo,
  };
}

function entorno(parcial: Partial<EntornoDeArchivos>): EntornoDeArchivos & {
  pedir: jest.Mock<EntornoDeArchivos['pedir']>;
  guardarEnElNavegador: jest.Mock<EntornoDeArchivos['guardarEnElNavegador']>;
  bajarAlTelefono: jest.Mock<EntornoDeArchivos['bajarAlTelefono']>;
  compartir: jest.Mock<EntornoDeArchivos['compartir']>;
} {
  return {
    esWeb: true,
    pedir: jest.fn<EntornoDeArchivos['pedir']>(async () => respuesta(200, 'a,b')),
    aUri: async () => 'blob:carta',
    liberar: () => undefined,
    guardarEnElNavegador: jest.fn<EntornoDeArchivos['guardarEnElNavegador']>(),
    bajarAlTelefono: jest.fn<EntornoDeArchivos['bajarAlTelefono']>(async () => 'file:///cache/caja-renaser.csv'),
    compartir: jest.fn<EntornoDeArchivos['compartir']>(async () => true),
    ...parcial,
  } as never;
}

const CSV = { ruta: '/api/v1/admin/caja/export.csv', nombre: 'caja-renaser.csv', tipo: 'text/csv', titulo: 'Caja Renaser' };

describe('descargar en web', () => {
  it('pide con la sesión y deja que el navegador lo guarde con su nombre', async () => {
    const e = entorno({ esWeb: true });
    const r = await descargarConSesion(CSV, 'tok-1', e);
    expect(r.ok).toBe(true);
    expect(e.pedir).toHaveBeenCalledWith(`${API_CONFIG.BASE_URL}/api/v1/admin/caja/export.csv`, {
      headers: { Accept: 'text/csv, application/json', 'X-Auth-Token': 'tok-1' },
    });
    expect(e.guardarEnElNavegador).toHaveBeenCalledWith(expect.anything(), 'caja-renaser.csv');
    expect(e.bajarAlTelefono).not.toHaveBeenCalled();
  });

  it('un 403 dice quién puede y no descarga nada', async () => {
    const e = entorno({ esWeb: true, pedir: jest.fn(async () => respuesta(403)) as never });
    expect(await descargarConSesion(CSV, 'tok', e)).toEqual({ ok: false, status: 403, mensaje: SIN_PERMISO });
    expect(e.guardarEnElNavegador).not.toHaveBeenCalled();
  });

  it('sin red lo dice', async () => {
    const e = entorno({
      esWeb: true,
      pedir: jest.fn(async () => {
        throw new TypeError('Failed to fetch');
      }) as never,
    });
    expect(await descargarConSesion(CSV, 'tok', e)).toEqual({ ok: false, status: 0, mensaje: SIN_RED });
  });
});

describe('compartir en el teléfono', () => {
  it('baja el archivo con la sesión y abre la hoja de compartir con su tipo', async () => {
    const e = entorno({ esWeb: false });
    const r = await descargarConSesion(CSV, 'tok-2', e);
    expect(r.ok).toBe(true);
    expect(e.bajarAlTelefono).toHaveBeenCalledWith(
      `${API_CONFIG.BASE_URL}/api/v1/admin/caja/export.csv`,
      'caja-renaser.csv',
      { Accept: 'text/csv, application/json', 'X-Auth-Token': 'tok-2' },
    );
    expect(e.compartir).toHaveBeenCalledWith('file:///cache/caja-renaser.csv', { mimeType: 'text/csv', titulo: 'Caja Renaser' });
    expect(e.pedir).not.toHaveBeenCalled();
  });

  it('un 403 del servidor (visto en el error de la descarga) no abre la hoja', async () => {
    const e = entorno({
      esWeb: false,
      bajarAlTelefono: jest.fn(async () => {
        throw new Error('UnableToDownloadException: HTTP 403');
      }) as never,
    });
    expect(await descargarConSesion(CSV, 'tok', e)).toEqual({ ok: false, status: 403, mensaje: SIN_PERMISO });
    expect(e.compartir).not.toHaveBeenCalled();
  });

  it('si el teléfono no deja compartir, lo dice', async () => {
    const e = entorno({ esWeb: false, compartir: jest.fn(async () => false) as never });
    const r = await descargarConSesion(CSV, 'tok', e);
    expect(r.ok).toBe(false);
  });

  it('lee el estado de los dos formatos de error de expo-file-system', () => {
    expect(statusDelError(new Error('HTTP 401'))).toBe(401);
    expect(statusDelError(new Error('response has status: 500'))).toBe(500);
    expect(statusDelError(new Error('timeout'))).toBe(0);
  });
});

describe('ver la carta', () => {
  it('pide un PNG con la sesión y la devuelve lista para un Image', async () => {
    const e = entorno({});
    const r = await traerImagenConSesion('/api/v1/admin/caja/a-1/carta', 'tok', e);
    expect(r).toEqual({ ok: true, valor: 'blob:carta' });
    expect(e.pedir.mock.calls[0][1].headers.Accept).toBe('image/png, application/json');
  });

  it('si falla, muestra el motivo del servidor', async () => {
    const e = entorno({ pedir: jest.fn(async () => respuesta(409, '{"message":"Todavía no aplica"}')) as never });
    expect(await traerImagenConSesion('/x', 'tok', e)).toEqual({ ok: false, status: 409, mensaje: 'Todavía no aplica' });
  });
});
