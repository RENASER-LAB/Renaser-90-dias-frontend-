import type { WallPost } from '../types/community.types';
import { cacheKeyEstable } from './cacheKeyEstable';

/** Cuántas fotos se adelantan por página: las primeras filas, las que la persona ve enseguida (spec 049). */
export const FOTOS_A_ADELANTAR = 8;

/**
 * Las fotos que conviene bajar apenas llega una página del Muro, antes de que su fila aparezca (spec 049, como las redes
 * sociales): la miniatura si la hay, si no la completa. Solo imágenes, en el orden del Muro, sin repetir.
 */
export function fotosParaAdelantar(posts: readonly Pick<WallPost, 'media'>[], tope: number = FOTOS_A_ADELANTAR): string[] {
  const urls: string[] = [];
  for (const post of posts) {
    const primera = post.media.find(m => m.mimeType.startsWith('image/'));
    const url = primera ? primera.thumbnailUrl || primera.url : null;
    if (url && !urls.includes(url)) urls.push(url);
    if (urls.length >= tope) break;
  }
  return urls;
}

/**
 * Las baja en segundo plano por el MISMO camino de caché que usa `FotoMuro` (misma `cacheKey`), así que al dibujarse la fila sale
 * del disco al instante. `Image.prefetch` no sirve: solo acepta URLs y guardaría con otra clave. Nunca lanza.
 */
export function adelantarMiniaturas(posts: readonly Pick<WallPost, 'media'>[]): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Image } = require('expo-image') as typeof import('expo-image');
    for (const url of fotosParaAdelantar(posts)) {
      void Image.loadAsync({ uri: url, cacheKey: cacheKeyEstable(url) }).catch(() => undefined);
    }
  } catch {
    /* sin expo-image (web antigua, pruebas): la foto se baja al dibujarse, como antes */
  }
}
