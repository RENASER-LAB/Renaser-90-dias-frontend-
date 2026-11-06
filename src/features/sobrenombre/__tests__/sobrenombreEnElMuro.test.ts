/** Spec 046 FR-002, FR-003: el Muro dibuja el nombre que manda el servidor (el sobrenombre) y, solo si llega, el nombre real. */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import { mapearComentario, mapearPublicacion, mapearReaccion } from '../../community/api/wallMappers';
import { wallCommentSchema, wallPostSchema, wallReactionItemSchema } from '../../community/api/wallSchemas';

const post = {
  id: 'p1', authorId: 'u1', authorName: 'Fénix de Arequipa', authorAvatarUrl: null, type: 'MANUAL', category: null, text: 'Hola',
  media: [], createdAt: '2026-11-06T15:00:00Z', reactionCounts: { LIKE: 1 }, myReactions: [], commentCount: 0, programDay: 7,
};

describe('el sobrenombre en el Muro', () => {
  it('spec 046 FR-002: el autor es el sobrenombre que manda el servidor; sin nombre real para los demás', () => {
    const p = mapearPublicacion(wallPostSchema.parse(post) as never);
    expect(p.author).toBe('Fénix de Arequipa');
    expect(p.nombreReal).toBeUndefined();
  });

  it('spec 046 FR-003: al equipo le llega también el nombre real, en publicaciones, comentarios y reacciones', () => {
    expect(mapearPublicacion(wallPostSchema.parse({ ...post, authorRealName: 'Ana Pérez' }) as never).nombreReal).toBe('Ana Pérez');
    const comentario = wallCommentSchema.parse({ id: 'c1', postId: 'p1', authorId: 'u1', authorName: 'Fénix', authorAvatarUrl: null, text: 'Hola', createdAt: '2026-11-06T15:00:00Z', authorRealName: 'Ana Pérez' });
    expect(mapearComentario(comentario as never).nombreReal).toBe('Ana Pérez');
    const reaccion = wallReactionItemSchema.parse({ userId: 'u1', name: 'Fénix', avatarUrl: null, role: 'TRAINEE', type: 'LIKE', realName: 'Ana Pérez' });
    expect(mapearReaccion(reaccion as never).nombreReal).toBe('Ana Pérez');
  });

  it('spec 046 FR-003: un nombre real roto no tumba el Muro (servidor anterior o valor raro)', () => {
    expect(() => wallPostSchema.parse({ ...post, authorRealName: 42 })).not.toThrow();
    expect(mapearPublicacion(wallPostSchema.parse({ ...post, authorRealName: 42 }) as never).nombreReal).toBeUndefined();
  });

  it('spec 046 FR-003: la tarjeta, la fila compacta, los comentarios y «quién reaccionó» dibujan el nombre real si llega', () => {
    const leer = (r: string) => fs.readFileSync(path.join(__dirname, '../../community/components', r), 'utf8');
    expect(leer('TarjetaPublicacionMuro.tsx')).toMatch(/post\.nombreReal \?/);
    expect(leer('TarjetaPublicacionMuro.tsx')).toMatch(/cItem\.nombreReal/);
    expect(leer('FilaCompactaDelMuro.tsx')).toMatch(/post\.nombreReal \?/);
    expect(leer('HojaDeReacciones.tsx')).toMatch(/persona\.nombreReal/);
  });
});
