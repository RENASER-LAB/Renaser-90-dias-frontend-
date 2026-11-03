/**
 * Cuándo el texto de una publicación del Muro necesita «Ver más...»: cuando ocupa más líneas de las que se ven (E2E del 03/11, issue #115).
 * Todo puro: la tarjeta mide el texto con un `Text` invisible y acá se decide qué hacer con lo medido.
 */

/** Las líneas que se ven con el texto plegado. */
export const LINEAS_QUE_SE_VEN = 3;

/** La regla de antes («más de 120 caracteres»): solo sirve de punto de partida mientras todavía no se midió. */
export const CARACTERES_PARA_SUPONER_MAS = 120;

/**
 * Un texto de esta longitud o menos cabe en tres líneas en cualquier teléfono y con cualquier letra: no hace falta medirlo. (Con letra grande y
 * un teléfono angosto caben unos 15 caracteres por línea; 36 son tres líneas como mucho.)
 */
export const CARACTERES_QUE_SIEMPRE_CABEN = 36;

export interface MedidaDelTexto {
  /** El texto, el ancho de la ventana y el tamaño de letra con los que se midió. */
  clave: string;
  /** Cuántas líneas ocupa el texto entero, sin tope. */
  lineas: number;
}

/** Lo que cambia la medida: otro texto, otro ancho o otro tamaño de letra. */
export function claveDeLaMedida(texto: string, ancho: number, escalaDeLetra: number): string {
  return `${Math.round(ancho)}|${escalaDeLetra}|${texto}`;
}

/** ¿Hay que medir? Solo si no se midió con esta clave y el texto no es tan corto como para caber siempre. */
export function seMideElTexto(texto: string, medida: MedidaDelTexto | null, clave: string): boolean {
  return texto.trim().length > CARACTERES_QUE_SIEMPRE_CABEN && medida?.clave !== clave;
}

/**
 * ¿Se ofrece «Ver más...» (o «Ver menos»)? Con la medida de ESTE texto, ancho y letra: si ocupa más de tres líneas. Sin medida todavía: la regla de
 * antes, para que el botón no aparezca de golpe en los textos largos; y un texto tan corto que siempre cabe, nunca.
 */
export function hayMasQueVer(texto: string, medida: MedidaDelTexto | null, clave: string): boolean {
  if (texto.trim().length <= CARACTERES_QUE_SIEMPRE_CABEN) return false;
  if (medida && medida.clave === clave) return medida.lineas > LINEAS_QUE_SE_VEN;
  return texto.length > CARACTERES_PARA_SUPONER_MAS;
}
