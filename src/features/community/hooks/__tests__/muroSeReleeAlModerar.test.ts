/**
 * Después de moderar, el Muro se pone al día SIN vaciarse ni volver arriba (pedido del dueño, 2026-10-31: «al terminar, la
 * publicación sale de la lista en el acto, y se relee el Muro»), y una publicación devuelta desde Administración aparece
 * en un Muro que ya estaba abierto.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../services/http/apiClient', () => ({ mensajeDeError: (_e: unknown, porDefecto: string) => porDefecto }));
const mockFeed = jest.fn<(cursor?: string) => Promise<{ posts: unknown[]; nextCursor: string | null }>>();
jest.mock('../../api/wallApi', () => ({
  obtenerFeedMuro: (cursor?: string) => mockFeed(cursor),
}));

import { avisarMuroModerado } from '../../events/muroModerado';
import { useWallFeed } from '../useWallFeed';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const post = (id: string, cambios: Record<string, unknown> = {}) => ({
  id,
  authorId: 'u1',
  authorName: 'Ana',
  authorAvatarUrl: null,
  type: 'MANUAL',
  category: null,
  text: `texto ${id}`,
  media: [],
  createdAt: '2026-10-30T18:00:00Z',
  reactionCounts: { LIKE: 0 },
  myReactions: [],
  commentCount: 0,
  ...cambios,
});

let raiz: ReactTestRenderer | null = null;
let feed!: ReturnType<typeof useWallFeed>;
const ids = () => feed.posts.map(p => p.id);

async function montar() {
  function Sonda() {
    feed = useWallFeed();
    return null;
  }
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
}

beforeEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockFeed.mockReset();
});

describe('releer el Muro después de moderar', () => {
  it('quitarPublicacion saca la publicación en el acto, sin pedir nada', async () => {
    mockFeed.mockResolvedValue({ posts: [post('a'), post('b')], nextCursor: null });
    await montar();
    act(() => feed.quitarPublicacion('a'));
    expect(ids()).toEqual(['b']);
    expect(mockFeed).toHaveBeenCalledTimes(1);
  });

  it('el aviso de «se moderó» relee la primera página en silencio: sin `loading`, y una devuelta aparece arriba', async () => {
    mockFeed.mockResolvedValue({ posts: [post('a'), post('b')], nextCursor: null });
    await montar();
    mockFeed.mockResolvedValue({ posts: [post('devuelta'), post('a'), post('b')], nextCursor: null });
    let cargandoDurante: boolean | null = null;
    mockFeed.mockImplementationOnce(async () => {
      cargandoDurante = feed.loading;
      return { posts: [post('devuelta'), post('a'), post('b')], nextCursor: null };
    });
    await act(async () => avisarMuroModerado());
    expect(cargandoDurante).toBe(false);
    expect(ids()).toEqual(['devuelta', 'a', 'b']);
  });

  it('no pierde lo que ya se había traído más abajo ni su cursor', async () => {
    mockFeed.mockResolvedValueOnce({ posts: [post('a'), post('b')], nextCursor: 'c1' });
    await montar();
    mockFeed.mockResolvedValueOnce({ posts: [post('c'), post('d')], nextCursor: 'c2' });
    await act(async () => feed.cargarMas());
    expect(ids()).toEqual(['a', 'b', 'c', 'd']);
    // Se oculta «a»: la primera página ahora llega con «b» y «c».
    act(() => feed.quitarPublicacion('a'));
    mockFeed.mockResolvedValueOnce({ posts: [post('b'), post('c')], nextCursor: 'c1b' });
    await act(async () => avisarMuroModerado());
    expect(ids()).toEqual(['b', 'c', 'd']);
    expect(feed.hayMas).toBe(true);
    mockFeed.mockResolvedValueOnce({ posts: [post('e')], nextCursor: null });
    await act(async () => feed.cargarMas());
    expect(mockFeed).toHaveBeenLastCalledWith('c2'); // siguió el cursor de antes, no el de la primera página
    expect(ids()).toEqual(['b', 'c', 'd', 'e']);
  });

  it('si la lista era justo la primera página, toma el cursor nuevo (la que estaba al final ya no se salta)', async () => {
    mockFeed.mockResolvedValueOnce({ posts: [post('a'), post('b')], nextCursor: 'c1' });
    await montar();
    act(() => feed.quitarPublicacion('a'));
    mockFeed.mockResolvedValueOnce({ posts: [post('b'), post('c')], nextCursor: 'c9' });
    await act(async () => avisarMuroModerado());
    expect(ids()).toEqual(['b', 'c']);
    mockFeed.mockResolvedValueOnce({ posts: [], nextCursor: null });
    await act(async () => feed.cargarMas());
    expect(mockFeed).toHaveBeenLastCalledWith('c9');
  });

  it('si la relectura falla, la lista local se queda como estaba (sin error a la vista)', async () => {
    mockFeed.mockResolvedValueOnce({ posts: [post('a'), post('b')], nextCursor: null });
    await montar();
    act(() => feed.quitarPublicacion('a'));
    mockFeed.mockRejectedValueOnce(new Error('sin red'));
    await act(async () => avisarMuroModerado());
    expect(ids()).toEqual(['b']);
    expect(feed.error).toBeNull();
  });
});
