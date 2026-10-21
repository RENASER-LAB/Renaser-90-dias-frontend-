import type { ImageSourcePropType } from 'react-native';

/**
 * Los 15 stickers del búho que acompañan el mensaje de la tarjeta del semáforo (spec 006 del backend,
 * `specs/006-mensaje-semaforo-y-podio/`). **Este es el único lugar que los nombra**: el servidor manda el
 * NOMBRE (`semaforo.mensaje.sticker`, p. ej. `dorado-orgulloso`) y la app lo busca acá.
 *
 * - 5 dorados, para lo que se celebra (VERDE y GRADUADO) y 10 azules, para todo lo demás.
 * - WebP de 512 × 512, fondo transparente y **sin texto en la imagen**: el mensaje va escrito al lado.
 * - Un nombre que no está en el mapa devuelve `null` (`stickerDelSemaforo`) y la tarjeta muestra solo el
 *   texto: una app vieja ante un sticker nuevo del servidor nunca se rompe ni deja un hueco.
 *
 * Los `require` son literales (Metro los resuelve al empaquetar): no se pueden armar con una plantilla.
 * Agregar un sticker es una línea acá y su archivo en `assets/stickers/semaforo/`; `stickersDelSemaforo.test.ts`
 * frena que el catálogo del servidor use un nombre que falte.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
export const STICKERS_DEL_SEMAFORO = {
  'dorado-orgulloso': require('../../../../assets/stickers/semaforo/dorado-orgulloso.webp'),
  'dorado-celebrando': require('../../../../assets/stickers/semaforo/dorado-celebrando.webp'),
  'dorado-guino': require('../../../../assets/stickers/semaforo/dorado-guino.webp'),
  'dorado-sereno': require('../../../../assets/stickers/semaforo/dorado-sereno.webp'),
  'dorado-trofeo': require('../../../../assets/stickers/semaforo/dorado-trofeo.webp'),
  'azul-animando': require('../../../../assets/stickers/semaforo/azul-animando.webp'),
  'azul-pensativo': require('../../../../assets/stickers/semaforo/azul-pensativo.webp'),
  'azul-reloj': require('../../../../assets/stickers/semaforo/azul-reloj.webp'),
  'azul-firme': require('../../../../assets/stickers/semaforo/azul-firme.webp'),
  'azul-decepcionado': require('../../../../assets/stickers/semaforo/azul-decepcionado.webp'),
  'azul-ofrece-ala': require('../../../../assets/stickers/semaforo/azul-ofrece-ala.webp'),
  'azul-despertando': require('../../../../assets/stickers/semaforo/azul-despertando.webp'),
  'azul-entrenando': require('../../../../assets/stickers/semaforo/azul-entrenando.webp'),
  'azul-vs-macaco': require('../../../../assets/stickers/semaforo/azul-vs-macaco.webp'),
  'azul-sorprendido': require('../../../../assets/stickers/semaforo/azul-sorprendido.webp'),
} as const satisfies Record<string, ImageSourcePropType>;
/* eslint-enable @typescript-eslint/no-require-imports */

export type NombreDeSticker = keyof typeof STICKERS_DEL_SEMAFORO;

/** La imagen de ese sticker, o `null` si el nombre no existe (`null`, vacío o uno que esta versión no conoce). */
export function stickerDelSemaforo(nombre: string | null | undefined): ImageSourcePropType | null {
  if (!nombre) return null;
  return Object.prototype.hasOwnProperty.call(STICKERS_DEL_SEMAFORO, nombre)
    ? STICKERS_DEL_SEMAFORO[nombre as NombreDeSticker]
    : null;
}
