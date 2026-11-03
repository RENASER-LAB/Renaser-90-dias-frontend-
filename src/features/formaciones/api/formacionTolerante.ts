import { z } from 'zod';

/**
 * El campo `formation` de una fila de la Comunidad (spec 024): el código de la formación (`ESCUELA`, `DIPLOMADO`, `CERTIFICACION`).
 *
 * **Tolerante a propósito.** Un servidor anterior no lo manda (la clave queda ausente) y un valor que no es un texto se lee como
 * «sin formación» (`null`) en vez de tumbar la lista: la app no se actualiza por aire, y una publicación o un evento de más sin rótulo
 * es mejor que una sección entera que no carga. Un código que esta versión no conoce SÍ se conserva (es un texto): el rótulo lo
 * escribe tal cual. Un texto vacío no dibuja rótulo (`RotuloDeFormacion` lo trata como ausente).
 */
export const formacionTolerante = z.string().nullish().catch(null);
