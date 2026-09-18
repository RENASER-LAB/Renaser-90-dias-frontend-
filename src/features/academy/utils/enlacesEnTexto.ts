/** Un trozo de texto: o se lee, o se toca. */
export type SegmentoDeTexto =
  | { tipo: 'texto'; valor: string }
  | { tipo: 'enlace'; valor: string; url: string };

/**
 * Solo `http://` y `https://`, y esa restricción es de seguridad, no de comodidad.
 *
 * El texto de una lección viaja desde el servidor y termina en `Linking.openURL`, que abre lo que
 * le den: `tel:` marca un número, `mailto:` abre el correo, y en Android un `intent://` puede
 * disparar otra app con parámetros. Reconocer solo los dos esquemas de web deja fuera esa familia
 * entera sin tener que enumerarla — lo que no se reconoce se muestra como texto, que es el
 * comportamiento de siempre y nunca hizo daño.
 */
const ENLACE = /\bhttps?:\/\/[^\s<>"')\]]+/gi;

/**
 * Los signos que suelen quedar pegados al final de una URL dentro de una frase y no son parte de
 * ella: "mira https://ejemplo.com." o "(https://ejemplo.com)". Se recortan del final, de a uno,
 * porque pueden venir varios juntos.
 */
const PUNTUACION_FINAL = /[.,;:!?)\]}"']+$/;

/**
 * Parte un texto en trozos de lectura y enlaces tocables.
 *
 * **Por qué hace falta.** El cuerpo de una lección se pintaba con un `<Text>` a secas, así que un
 * `https://forms.gle/...` se veía pero no se podía tocar: había que copiarlo a mano, y en un
 * teléfono eso es seleccionar texto dentro de un párrafo. El dueño lo reportó el 2026-09-18 sobre
 * una lección que pide llenar un formulario de Google.
 *
 * Devuelve siempre al menos un segmento —el texto entero, si no hay enlaces— para que quien lo
 * pinte no tenga que distinguir el caso vacío.
 */
export function partirEnEnlaces(texto: string): SegmentoDeTexto[] {
  const segmentos: SegmentoDeTexto[] = [];
  let desde = 0;
  for (const encontrado of texto.matchAll(ENLACE)) {
    const crudo = encontrado[0];
    const indice = encontrado.index ?? 0;
    const url = crudo.replace(PUNTUACION_FINAL, '');
    // La puntuación recortada vuelve al texto: si no, "termina acá." perdería el punto.
    const sobrante = crudo.slice(url.length);
    if (indice > desde) {
      segmentos.push({ tipo: 'texto', valor: texto.slice(desde, indice) });
    }
    segmentos.push({ tipo: 'enlace', valor: url, url });
    if (sobrante) {
      segmentos.push({ tipo: 'texto', valor: sobrante });
    }
    desde = indice + crudo.length;
  }
  if (desde < texto.length) {
    segmentos.push({ tipo: 'texto', valor: texto.slice(desde) });
  }
  return segmentos.length > 0 ? segmentos : [{ tipo: 'texto', valor: texto }];
}
