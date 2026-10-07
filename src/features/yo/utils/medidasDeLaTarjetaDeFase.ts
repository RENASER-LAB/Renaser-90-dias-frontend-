/**
 * Cuánto mide el animal de la tarjeta de fase y cuánto ancho le reserva a la izquierda al texto, según el ancho
 * de la tarjeta y la letra del sistema (pedido del coordinador, 2026-10-06, tras ver a 360 px el gorila encima de
 * «de esta fase» y «en total»).
 *
 * **El texto manda y el animal se adapta.** La columna de texto termina siempre `SEPARACION` px antes de donde
 * empieza la caja del animal, en cualquier ancho y con cualquier `fontScale`: se garantiza por cuenta, no por la
 * transparencia de la imagen (una imagen configurada en Administración puede no tener margen). En un teléfono
 * ancho el animal queda casi como en el diseño B (hasta 240 px); en uno angosto o con letra grande se achica,
 * hasta `LADO_MINIMO`, y sigue saliendo por el borde derecho.
 */
export const PADDING_DE_LA_TARJETA = 20;
/** Lo que el animal sale por el borde derecho (la tarjeta lo recorta). */
export const SALIDA_POR_LA_DERECHA = 26;
const SEPARACION = 8;
const LADO_MAXIMO = 240;
const LADO_MINIMO = 112;
/** El ancho que la columna de texto pide con letra normal; crece con `fontScale`. */
const COLUMNA_DE_TEXTO = 156;

export interface MedidasDeLaTarjeta {
  ladoDelAnimal: number;
  /** El `paddingRight` de la columna de texto. */
  reservaDerecha: number;
}

export function medidasDeLaTarjetaDeFase(anchoDeLaTarjeta: number, fontScale = 1): MedidasDeLaTarjeta {
  const escala = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  const libre = anchoDeLaTarjeta - PADDING_DE_LA_TARJETA - COLUMNA_DE_TEXTO * escala + SALIDA_POR_LA_DERECHA - SEPARACION;
  const ladoDelAnimal = Math.round(Math.min(LADO_MAXIMO, Math.max(LADO_MINIMO, libre)));
  return { ladoDelAnimal, reservaDerecha: ladoDelAnimal - SALIDA_POR_LA_DERECHA + SEPARACION };
}
