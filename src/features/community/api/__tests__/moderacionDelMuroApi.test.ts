import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));

import {
  eliminarPublicacionParaSiempre,
  obtenerPublicacionesOcultas,
  ocultarPublicacion,
  restaurarPublicacion,
} from '../wallApi';

/**
 * El contrato de la moderación del Muro (`WallController` del backend): rutas, verbos y una lista de ocultas que aguanta
 * una fila rota. Pedido del dueño, 2026-10-31.
 */
const FILA = {
  id: 'p1',
  authorId: 'u1',
  authorName: 'Ana',
  authorAvatarUrl: null,
  type: 'MANUAL',
  category: null,
  text: '',
  media: [],
  createdAt: '2026-10-30T18:00:00Z',
  reactionCounts: { LIKE: 0, DISLIKE: 0 },
  myReactions: [],
  commentCount: 0,
  programDay: 3,
};

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('las tres escrituras', () => {
  it('ocultar es DELETE /wall/{id}', async () => {
    mockApiFetch.mockResolvedValue({ id: 'p1' });
    await ocultarPublicacion('p1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/wall/p1', { method: 'DELETE' });
  });

  it('devolver es POST /wall/{id}/restore', async () => {
    mockApiFetch.mockResolvedValue({ id: 'p1' });
    await restaurarPublicacion('p1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/wall/p1/restore', { method: 'POST' });
  });

  it('eliminar para siempre es DELETE /wall/{id}/permanent', async () => {
    mockApiFetch.mockResolvedValue({ id: 'p1' });
    await eliminarPublicacionParaSiempre('p1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/wall/p1/permanent', { method: 'DELETE' });
  });

  it('un error del servidor sale tal cual (la pantalla decide qué decir)', async () => {
    const e = Object.assign(new Error('Solo ADMIN/ALCHEMIST moderan el Muro'), { status: 403 });
    mockApiFetch.mockRejectedValue(e);
    await expect(ocultarPublicacion('p1')).rejects.toBe(e);
  });
});

describe('GET /wall/hidden', () => {
  it('pide la primera página sin cursor y las siguientes con el cursor codificado', async () => {
    mockApiFetch.mockResolvedValue({ posts: [FILA], nextCursor: '2026-10-30T18:00:00Z' });
    const primera = await obtenerPublicacionesOcultas();
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/wall/hidden', undefined);
    expect(primera.posts).toHaveLength(1);
    expect(primera.nextCursor).toBe('2026-10-30T18:00:00Z');
    await obtenerPublicacionesOcultas('2026-10-30T18:00:00.123456Z');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/wall/hidden?cursor=2026-10-30T18%3A00%3A00.123456Z', undefined);
  });

  it('una fila rota se pierde ella sola, no la página', async () => {
    mockApiFetch.mockResolvedValue({
      posts: [FILA, { id: 'sin-autor' }, null, 'basura', { ...FILA, id: 'p2', text: 'otra' }],
      nextCursor: null,
    });
    const pagina = await obtenerPublicacionesOcultas();
    expect(pagina.posts.map(p => p.id)).toEqual(['p1', 'p2']);
    expect(pagina.nextCursor).toBeNull();
  });

  it('una publicación en blanco (texto vacío, sin fotos) es una fila válida', async () => {
    mockApiFetch.mockResolvedValue({ posts: [FILA], nextCursor: null });
    const pagina = await obtenerPublicacionesOcultas();
    expect(pagina.posts[0].text).toBe('');
    expect(pagina.posts[0].media).toEqual([]);
  });

  it('un cursor que no es texto no tumba la página: simplemente no hay más', async () => {
    mockApiFetch.mockResolvedValue({ posts: [FILA], nextCursor: 123 });
    const pagina = await obtenerPublicacionesOcultas();
    expect(pagina.posts).toHaveLength(1);
    expect(pagina.nextCursor).toBeNull();
  });

  it('sin `nextCursor` (campo ausente) tampoco hay más', async () => {
    mockApiFetch.mockResolvedValue({ posts: [FILA] });
    expect((await obtenerPublicacionesOcultas()).nextCursor).toBeNull();
  });

  it('una respuesta que no es una lista de publicaciones sí es un error', async () => {
    mockApiFetch.mockResolvedValue({ posts: 'no es una lista' });
    await expect(obtenerPublicacionesOcultas()).rejects.toThrow(/GET \/api\/v1\/wall\/hidden/);
    mockApiFetch.mockResolvedValue(null);
    await expect(obtenerPublicacionesOcultas()).rejects.toThrow();
  });
});
