/**
 * La foto propia de un grupo (D-212): cómo habla la app con `/api/v1/admin/cells/{id}/photo`.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string; body?: unknown }) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: { method?: string; body?: unknown }) => mockApiFetch(ruta, opciones),
}));
const apiFetch = mockApiFetch;

import { obtenerFotoDelGrupo, parteNativaDeLaFoto, subirFotoDelGrupo, volverALaFotoDeRenaser } from '../fotoDelGrupoApi';

const FOTO = { uri: 'file:///cache/foto.jpg', mimeType: 'image/jpeg' };

beforeEach(() => {
  apiFetch.mockReset();
});

describe('subir la foto del grupo', () => {
  it('va por PUT como multipart (un FormData), a la ruta del grupo', async () => {
    apiFetch.mockResolvedValue({ cellId: 'g-1', photoChangedAt: '2026-09-27T15:00:00Z' });

    const foto = await subirFotoDelGrupo('g-1', FOTO);

    expect(foto.photoChangedAt).toBe('2026-09-27T15:00:00Z');
    const [ruta, opciones] = apiFetch.mock.calls[0];
    expect(ruta).toBe('/api/v1/admin/cells/g-1/photo');
    expect(opciones?.method).toBe('PUT');
    expect(opciones?.body).toBeInstanceOf(FormData);
  });

  it('en Android/iOS la parte «foto» es el archivo de la uri, con nombre y tipo', () => {
    expect(parteNativaDeLaFoto(FOTO)).toEqual({
      uri: 'file:///cache/foto.jpg',
      name: 'foto-del-grupo.jpg',
      type: 'image/jpeg',
    });
  });

  it('una respuesta con otra forma se rechaza en vez de mostrar datos a medias', async () => {
    apiFetch.mockResolvedValue({ nada: true });

    await expect(subirFotoDelGrupo('g-1', FOTO)).rejects.toThrow('PUT /api/v1/admin/cells/{id}/photo');
  });
});

describe('volver a la de Renaser y consultar', () => {
  it('DELETE a la misma ruta', async () => {
    apiFetch.mockResolvedValue(undefined);

    await volverALaFotoDeRenaser('g 1');

    expect(apiFetch).toHaveBeenCalledWith('/api/v1/admin/cells/g%201/photo', { method: 'DELETE' });
  });

  it('GET dice si hay foto propia; photoChangedAt en null es la de Renaser', async () => {
    apiFetch.mockResolvedValue({ cellId: 'g-1', photoChangedAt: null });

    await expect(obtenerFotoDelGrupo('g-1')).resolves.toEqual({ cellId: 'g-1', photoChangedAt: null });
  });
});
