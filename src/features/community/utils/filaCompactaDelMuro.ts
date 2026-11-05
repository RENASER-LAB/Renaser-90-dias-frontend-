// pedido del dueño 2026-11-05 muro compacto
import type { PostItem } from '../../../screens/ComunidadScreen';

/** La miniatura de la fila mide esto (cuadrada, radio 10). */
export const LADO_DE_LA_MINIATURA = 66;
/** El texto de la fila se corta en estas líneas: el resto se lee al abrir la publicación. */
export const LINEAS_DE_LA_FILA = 3;

/** Lo que dibuja una fila compacta del Muro (estilo Skool), sin React: se prueba aparte. */
export type VistaDeLaFilaCompacta = {
  /** La PRIMERA foto de la publicación (o `null` si no tiene fotos: el texto usa todo el ancho). */
  miniatura: { url: string; mimeType: string; titulo: string } | null;
  /** Cuántas fotos más hay además de la miniatura (la chapa «+N»). 0 = sin chapa. */
  fotosDeMas: number;
  /** Cuántos comentarios tiene: el conteo del servidor o los ya leídos, el mayor. */
  comentarios: number;
};

/**
 * Cuántos comentarios tiene una publicación. El feed trae el conteo (`cantidadComentarios`, de
 * `commentCount`) pero no la lista, que se lee al abrir los comentarios; tras comentar, la lista ya
 * leída puede ir por delante del conteo. Se toma el mayor de los dos.
 */
export function cantidadDeComentarios(post: Pick<PostItem, 'comments' | 'cantidadComentarios'>): number {
  return Math.max(post.comments.length, post.cantidadComentarios ?? 0);
}

export function vistaDeLaFilaCompacta(
  post: Pick<PostItem, 'media' | 'comments' | 'cantidadComentarios'>
): VistaDeLaFilaCompacta {
  const primera = post.media[0];
  return {
    miniatura: primera ? { url: primera.url, mimeType: primera.mimeType, titulo: primera.title } : null,
    fotosDeMas: Math.max(0, post.media.length - 1),
    comentarios: cantidadDeComentarios(post),
  };
}

/** Lo que oye el lector de pantalla del botón de comentarios de la fila. */
export function etiquetaDeComentarios(cantidad: number): string {
  if (cantidad === 0) return 'Sin comentarios. Abrir la publicación';
  if (cantidad === 1) return '1 comentario. Abrir la publicación';
  return `${cantidad} comentarios. Abrir la publicación`;
}

/** Lo que oye el lector de pantalla de la fila entera. */
export function etiquetaDeLaFila(post: Pick<PostItem, 'author' | 'timeAgo' | 'media'>): string {
  const fotos = post.media.length;
  const conFotos = fotos === 0 ? '' : fotos === 1 ? ', con 1 foto' : `, con ${fotos} fotos`;
  return `Publicación de ${post.author}, ${post.timeAgo}${conFotos}. Abrir la publicación`;
}
