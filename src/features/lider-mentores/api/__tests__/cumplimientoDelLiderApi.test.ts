import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient'),
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));

import { ApiError } from '../../../../services/http/apiClient';
import {
  EvidenciaNoSeAbrio,
  leerEvidencia,
  obtenerPublicacion,
  obtenerSemanaDePersona,
  obtenerTablaDelLider,
  rutaDeLaPublicacion,
  rutaDeLaSemanaDePersona,
  rutaDeLaTablaDelLider,
} from '../cumplimientoDelLiderApi';

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('las rutas del líder (contrato)', () => {
  it('la lista del grupo y la semana de una persona, con o sin semana', () => {
    expect(rutaDeLaTablaDelLider('g1')).toBe('/api/v1/leadership/groups/g1/semaforo');
    expect(rutaDeLaTablaDelLider('g1', '2026-10-16')).toBe('/api/v1/leadership/groups/g1/semaforo?semanaHasta=2026-10-16');
    expect(rutaDeLaSemanaDePersona('g1', 'p1')).toBe('/api/v1/leadership/groups/g1/people/p1/week');
    expect(rutaDeLaSemanaDePersona('g1', 'p1', '2026-10-16')).toBe(
      '/api/v1/leadership/groups/g1/people/p1/week?semanaHasta=2026-10-16',
    );
    expect(rutaDeLaPublicacion('pub1')).toBe('/api/v1/leadership/publications/pub1');
  });

  it('un id con `/` o `%` no cambia a qué ruta se llama', () => {
    expect(rutaDeLaSemanaDePersona('a/b', 'c%d')).toBe('/api/v1/leadership/groups/a%2Fb/people/c%25d/week');
  });
});

describe('las lecturas', () => {
  it('la lista del grupo se lee con «no se mide» y en el orden del servidor', async () => {
    mockApiFetch.mockResolvedValueOnce({
      desde: '2026-10-12',
      hasta: '2026-10-18',
      aprendices: [
        { aprendizId: 'u1', nombre: 'Ana', color: 'ROJO', porcentaje: 30 },
        { aprendizId: 'm1', nombre: 'Luisa', color: 'NO_SE_MIDE', porcentaje: 90, rol: 'MENTOR' },
      ],
    });
    const tabla = await obtenerTablaDelLider('g1', null);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/leadership/groups/g1/semaforo', undefined);
    expect(tabla.aprendices.map(a => [a.aprendizId, a.noSeMide ?? false])).toEqual([
      ['u1', false],
      ['m1', true],
    ]);
  });

  it('la semana de una persona dice quién es aunque el servidor no lo repita', async () => {
    mockApiFetch.mockResolvedValueOnce({ desde: '2026-10-17', hasta: '2026-10-23', dias: [] });
    const semana = await obtenerSemanaDePersona('g1', 'p1', '2026-10-23');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/leadership/groups/g1/people/p1/week?semanaHasta=2026-10-23', undefined);
    expect(semana.personaId).toBe('p1');
  });

  it('una respuesta sin fechas no se dibuja a medias', async () => {
    mockApiFetch.mockResolvedValueOnce({ dias: [] });
    await expect(obtenerSemanaDePersona('g1', 'p1')).rejects.toThrow(/Respuesta inesperada/);
  });

  it('la publicación del Muro', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'pub1', text: 'Hola', authorName: 'Ana' });
    expect(await obtenerPublicacion('pub1')).toMatchObject({ texto: 'Hola', autor: 'Ana' });
  });
});

describe('abrir una evidencia', () => {
  it('una foto se abre con el enlace pedido AL ABRIR (sin pedir el detalle)', async () => {
    mockApiFetch.mockResolvedValueOnce({ url: 'https://s3/foto.jpg?firma=1' });
    expect(await leerEvidencia('e1', 'FOTO')).toEqual({ tipo: 'FOTO', url: 'https://s3/foto.jpg?firma=1' });
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(mockApiFetch.mock.calls[0][0]).toBe('/api/v1/evidence/e1/url');
  });

  it('un audio y un video también salen del enlace', async () => {
    mockApiFetch.mockResolvedValueOnce({ url: 'https://s3/a.m4a' });
    expect(await leerEvidencia('e2', 'AUDIO')).toEqual({ tipo: 'AUDIO', url: 'https://s3/a.m4a' });
    mockApiFetch.mockResolvedValueOnce({ url: 'https://s3/v.mp4' });
    expect(await leerEvidencia('e3', 'VIDEO')).toEqual({ tipo: 'VIDEO', url: 'https://s3/v.mp4' });
  });

  it('un texto (la Audioterapia) se lee del detalle, sin pedir enlace', async () => {
    mockApiFetch.mockResolvedValueOnce({ tipo: 'TEXTO', contenidoTexto: 'Lo que escuché me hizo pensar…' });
    expect(await leerEvidencia('e4', 'TEXTO')).toEqual({ tipo: 'TEXTO', texto: 'Lo que escuché me hizo pensar…' });
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(mockApiFetch.mock.calls[0][0]).toBe('/api/v1/evidence/e4');
  });

  it('si no se sabe el tipo (la foto de una acción del día), primero se averigua y después se pide el enlace', async () => {
    mockApiFetch.mockResolvedValueOnce({ tipo: 'foto', contenidoTexto: null });
    mockApiFetch.mockResolvedValueOnce({ url: 'https://s3/roca.jpg' });
    expect(await leerEvidencia('e5', null)).toEqual({ tipo: 'FOTO', url: 'https://s3/roca.jpg' });
    expect(mockApiFetch.mock.calls.map(c => c[0])).toEqual(['/api/v1/evidence/e5', '/api/v1/evidence/e5/url']);
  });

  it('si el archivo ya no existe, lo dice: «ya no está disponible»', async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError(404, 'No existe'));
    await expect(leerEvidencia('e6', 'FOTO')).rejects.toMatchObject({ motivo: 'no_disponible' });
    mockApiFetch.mockResolvedValueOnce({});
    await expect(leerEvidencia('e7', 'FOTO')).rejects.toBeInstanceOf(EvidenciaNoSeAbrio);
  });

  it('distingue sin red, sin permiso y error', async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError(0, 'Sin red'));
    await expect(leerEvidencia('a', 'FOTO')).rejects.toMatchObject({ motivo: 'sin_red' });
    mockApiFetch.mockRejectedValueOnce(new ApiError(403, 'No'));
    await expect(leerEvidencia('b', 'FOTO')).rejects.toMatchObject({ motivo: 'sin_permiso' });
    mockApiFetch.mockRejectedValueOnce(new ApiError(500, 'Boom'));
    await expect(leerEvidencia('c', 'FOTO')).rejects.toMatchObject({ motivo: 'error' });
  });
});
