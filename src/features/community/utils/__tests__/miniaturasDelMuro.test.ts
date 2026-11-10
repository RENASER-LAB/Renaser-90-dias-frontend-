/** Spec 049: el Muro usa la miniatura que arma la Lambda y, si todavía no existe, la foto completa; adelanta las primeras. */
import { describe, expect, it } from '@jest/globals';

import { mapearPublicacion } from '../../api/wallMappers';
import { fotosParaAdelantar } from '../adelantarMiniaturas';
import { vistaDeLaFilaCompacta } from '../filaCompactaDelMuro';
import type { WallPost } from '../../types/community.types';

const foto = (n: number, miniatura = true) => ({
  url: `https://s3.test/muro/fotos/u/${n}?firma=a`,
  mimeType: 'image/jpeg',
  ...(miniatura ? { thumbnailUrl: `https://s3.test/muro/miniaturas/u/${n}.webp?firma=b` } : {}),
});
const publicacion = (media: WallPost['media']) => ({ media }) as Pick<WallPost, 'media'>;

describe('miniaturas del Muro (spec 049)', () => {
  it('la fila dibuja la miniatura y guarda la completa de respaldo', () => { // spec 049 FR-001
    const post = mapearPublicacion({ id: 'p', authorId: 'a', authorName: 'Ana', text: 't', media: [foto(1)], createdAt: new Date().toISOString(),
      reactionCounts: {}, myReactions: [], commentCount: 0 } as unknown as WallPost);
    const vista = vistaDeLaFilaCompacta(post);
    expect(vista.miniatura?.url).toBe('https://s3.test/muro/miniaturas/u/1.webp?firma=b');
    expect(vista.miniatura?.respaldo).toBe('https://s3.test/muro/fotos/u/1?firma=a');
  });

  it('una foto vieja, sin miniatura, se dibuja con la completa como antes', () => { // spec 049 FR-002
    const post = mapearPublicacion({ id: 'p', authorId: 'a', authorName: 'Ana', text: 't', media: [foto(1, false)], createdAt: new Date().toISOString(),
      reactionCounts: {}, myReactions: [], commentCount: 0 } as unknown as WallPost);
    expect(vistaDeLaFilaCompacta(post).miniatura?.url).toBe('https://s3.test/muro/fotos/u/1?firma=a');
  });

  it('adelanta la primera foto de cada publicación (miniatura si la hay), sin videos ni repetidas, con tope', () => { // spec 049 FR-003
    const urls = fotosParaAdelantar([
      publicacion([foto(1)]),
      publicacion([{ url: 'https://s3.test/muro/videos/u/v', mimeType: 'video/mp4' }]),
      publicacion([foto(2, false)]),
      publicacion([foto(1)]),
      publicacion([foto(3)]),
    ], 2);
    expect(urls).toEqual(['https://s3.test/muro/miniaturas/u/1.webp?firma=b', 'https://s3.test/muro/fotos/u/2?firma=a']);
  });
});
