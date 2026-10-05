/**
 * La tarjeta del Muro pinta la foto del autor o sus iniciales (2026-10-05). Antes el mapeador tiraba
 * `authorAvatarUrl` y la tarjeta dibujaba el emoji 👤 para todos.
 */
import { describe, expect, it } from '@jest/globals';

import { mapearPublicacion } from '../wallMappers';
import type { WallPost } from '../../types/community.types';

const post = (authorAvatarUrl: string | null): WallPost => ({
  id: 'p1',
  authorId: 'u1',
  authorName: 'Lucía Paredes',
  authorAvatarUrl,
  type: 'POST',
  category: null,
  text: 'Hola',
  media: [],
  createdAt: '2026-10-05T15:00:00Z',
  reactionCounts: {},
  myReactions: [],
  commentCount: 0,
});

describe('el autor de una publicación', () => {
  it('trae su foto cuando la tiene, y null cuando no', () => {
    expect(mapearPublicacion(post('https://s3/fotos/lucia.jpg')).avatarUrl).toBe('https://s3/fotos/lucia.jpg');
    expect(mapearPublicacion(post(null)).avatarUrl).toBeNull();
  });
});
