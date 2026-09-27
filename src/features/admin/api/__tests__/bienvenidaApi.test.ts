import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));

import {
  confirmarPortadaDeBienvenida,
  guardarTextoDeBienvenida,
  leerBienvenida,
  rutaDeLaTarjetaDeMuestra,
  solicitarSubidaDePortada,
  volverALaPortadaOriginal,
  volverAlTextoOriginal,
} from '../bienvenidaApi';
import { bienvenidaSchema } from '../bienvenidaSchemas';

/**
 * El contrato de `/api/v1/admin/bienvenida` (backend D-210, 27/09): rutas, verbos y cuerpos, y un
 * esquema que aguanta campos nuevos. No existía: falla contra el código anterior.
 */

const BIENVENIDA = {
  activa: false,
  largoMaximo: 1000,
  textos: [
    {
      clave: 'SOPORTE_CON_LA_TARJETA',
      texto: '{nombre}, esta tarjeta es para ti 🌿',
      original: '{nombre}, esta tarjeta es para ti 🌿',
      cambiado: false,
      marcadores: ['{nombre}'],
      ultimoCambio: null,
    },
    {
      clave: 'SOPORTE_FORMAL',
      texto: 'Hola, {nombre}.',
      original: 'Hola, {nombre}.',
      cambiado: false,
      marcadores: ['{nombre}'],
      // Sin `ultimoCambio`: un servidor que no lo manda no rompe la lista.
    },
    {
      clave: 'GRUPO',
      texto: '¡Hola, {nombre}! Te acompaña {mentor}.',
      original: '¡Hola, {nombre}! 🌿 Qué alegría… {mentor}…',
      cambiado: true,
      marcadores: ['{nombre}', '{mentor}'],
      ultimoCambio: { por: 'Kelin Rojas', en: '2026-09-27T15:04:05Z', volvioAlOriginal: false, porId: 'u-1' },
      campoNuevo: 'lo ignora',
    },
  ],
  portada: { cambiada: false, sePuedeCambiar: true, ultimoCambio: null, version: 'original' },
  otroCampoDeMañana: 42,
};

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockResolvedValue(BIENVENIDA);
});

describe('esquema tolerante', () => {
  it('lee el cuerpo del contrato con campos de más y ultimoCambio null o ausente', () => {
    const r = bienvenidaSchema.safeParse(BIENVENIDA);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.textos.map(t => t.clave)).toEqual(['SOPORTE_CON_LA_TARJETA', 'SOPORTE_FORMAL', 'GRUPO']);
    expect(r.data.textos[1].ultimoCambio).toBeUndefined();
    expect(r.data.textos[2].ultimoCambio?.por).toBe('Kelin Rojas');
  });

  it('sin lo que la pantalla necesita (los textos, la portada) es un error de contrato', () => {
    expect(bienvenidaSchema.safeParse({ ...BIENVENIDA, textos: undefined }).success).toBe(false);
    expect(bienvenidaSchema.safeParse({ ...BIENVENIDA, portada: undefined }).success).toBe(false);
    expect(
      bienvenidaSchema.safeParse({ ...BIENVENIDA, textos: [{ clave: 'GRUPO', texto: 'x', cambiado: false }] }).success,
    ).toBe(false);
  });
});

describe('rutas, verbos y cuerpos', () => {
  it('leer', async () => {
    await expect(leerBienvenida()).resolves.toMatchObject({ largoMaximo: 1000 });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/bienvenida', undefined);
  });

  it('guardar un texto: PUT con { texto }', async () => {
    await guardarTextoDeBienvenida('GRUPO', 'Hola {nombre}, te acompaña {mentor}.');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/bienvenida/textos/GRUPO', {
      method: 'PUT',
      body: { texto: 'Hola {nombre}, te acompaña {mentor}.' },
    });
  });

  it('volver al texto original: DELETE', async () => {
    await volverAlTextoOriginal('SOPORTE_FORMAL');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/bienvenida/textos/SOPORTE_FORMAL', { method: 'DELETE' });
  });

  it('pedir dónde subir la portada: POST con { contentType }, devuelve url y ruta', async () => {
    mockApiFetch.mockResolvedValueOnce({ url: 'https://s3/firmada', ruta: 'bienvenida/portadas/p-1' });
    await expect(solicitarSubidaDePortada('image/jpeg')).resolves.toMatchObject({
      url: 'https://s3/firmada',
      ruta: 'bienvenida/portadas/p-1',
    });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/bienvenida/portada/upload-url', {
      method: 'POST',
      body: { contentType: 'image/jpeg' },
    });
  });

  it('usar la portada: POST confirm con { ruta }; volver a la original: DELETE', async () => {
    await confirmarPortadaDeBienvenida('bienvenida/portadas/p-1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/bienvenida/portada/confirm', {
      method: 'POST',
      body: { ruta: 'bienvenida/portadas/p-1' },
    });
    await volverALaPortadaOriginal();
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/bienvenida/portada', { method: 'DELETE' });
  });

  it('una respuesta que no es la bienvenida se nota como error de contrato', async () => {
    mockApiFetch.mockResolvedValueOnce({ algo: 'raro' });
    await expect(leerBienvenida()).rejects.toThrow('El backend respondió algo inesperado en GET /api/v1/admin/bienvenida');
  });

  it('la vista previa de la tarjeta: nombre y, si hay, la portada candidata, codificados', () => {
    expect(rutaDeLaTarjetaDeMuestra('María José')).toBe('/api/v1/admin/bienvenida/tarjeta?nombre=Mar%C3%ADa%20Jos%C3%A9');
    expect(rutaDeLaTarjetaDeMuestra('Ana', 'bienvenida/portadas/p-1')).toBe(
      '/api/v1/admin/bienvenida/tarjeta?nombre=Ana&portada=bienvenida%2Fportadas%2Fp-1',
    );
  });
});
