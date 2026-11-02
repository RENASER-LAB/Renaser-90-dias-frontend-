import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));

import {
  confirmarImagenDeLaFormacion,
  imagenDeLaFormacionSchema,
  leerImagenDeLaFormacion,
  rutaDeLaVistaDeLaImagen,
  solicitarSubidaDeImagen,
  volverALaImagenOriginal,
} from '../api/imagenDeLaFormacionApi';

/** El contrato de `/api/v1/admin/formaciones/{codigo}/imagen` (backend spec 035, D-308): rutas, verbos, cuerpos y un esquema tolerante. */

const IMAGEN = {
  formation: 'DIPLOMADO',
  hayImagen: true,
  cambiada: true,
  heredada: false,
  sePuedeCambiar: true,
  ultimoCambio: { por: 'Kelin Rojas', en: '2026-11-02T15:04:05Z', volvioAlOriginal: false },
  otroCampoDeMañana: 1,
};

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockResolvedValue(IMAGEN);
});

describe('la imagen de la formación: rutas, verbos y esquema', () => {
  it('leer, pedir dónde subir, confirmar y volver', async () => {
    await expect(leerImagenDeLaFormacion('DIPLOMADO')).resolves.toMatchObject({ formation: 'DIPLOMADO', hayImagen: true });
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/formaciones/DIPLOMADO/imagen', { timeoutMs: 15_000 });

    mockApiFetch.mockResolvedValueOnce({ url: 'https://s3/firmada', ruta: 'formaciones/imagenes/i-1' });
    await expect(solicitarSubidaDeImagen('DIPLOMADO', 'image/png')).resolves.toMatchObject({ ruta: 'formaciones/imagenes/i-1' });
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/formaciones/DIPLOMADO/imagen/upload-url', {
      method: 'POST',
      body: { contentType: 'image/png' },
      timeoutMs: 15_000,
    });

    await confirmarImagenDeLaFormacion('CERTIFICACION', 'formaciones/imagenes/i-1');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/formaciones/CERTIFICACION/imagen/confirm', {
      method: 'POST',
      body: { ruta: 'formaciones/imagenes/i-1' },
      timeoutMs: 30_000,
    });

    await volverALaImagenOriginal('ESCUELA');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/formaciones/ESCUELA/imagen', { method: 'DELETE', timeoutMs: 15_000 });
  });

  it('la vista previa: la vigente, o la candidata recién subida (codificada)', () => {
    expect(rutaDeLaVistaDeLaImagen('DIPLOMADO')).toBe('/api/v1/admin/formaciones/DIPLOMADO/imagen/vista');
    expect(rutaDeLaVistaDeLaImagen('DIPLOMADO', 'formaciones/imagenes/i 1')).toBe(
      '/api/v1/admin/formaciones/DIPLOMADO/imagen/vista?ruta=formaciones%2Fimagenes%2Fi%201',
    );
  });

  it('el esquema aguanta campos de más y heredada ausente; sin lo indispensable es un error de contrato', async () => {
    expect(imagenDeLaFormacionSchema.safeParse(IMAGEN).success).toBe(true);
    expect(imagenDeLaFormacionSchema.safeParse({ ...IMAGEN, heredada: undefined, ultimoCambio: undefined }).success).toBe(true);
    expect(imagenDeLaFormacionSchema.safeParse({ ...IMAGEN, hayImagen: undefined }).success).toBe(false);
    mockApiFetch.mockResolvedValueOnce({ algo: 'raro' });
    await expect(leerImagenDeLaFormacion('DIPLOMADO')).rejects.toThrow('El backend respondió algo inesperado');
  });
});
