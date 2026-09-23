/**
 * Qué dice en voz alta el orbe del acompañante (Hoy), separado del hook para probarlo sin
 * sintetizador. La respuesta del modelo viene con markdown básico pensado para leerse, no para
 * escucharse: un "asterisco asterisco" en voz alta es peor que nada.
 */

/** Más que esto se vuelve un monólogo: se corta en una frase y el resto queda en el chat. */
export const MAXIMO_CARACTERES_HABLADOS = 450;

const AVISO_DE_CORTE = ' El resto te lo dejé escrito en el chat.';

/** Saca el markdown y deja texto que suena natural. */
export function textoParaHablar(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [texto](url) → texto
    .replace(/https?:\/\/\S+/g, '') // una URL leída en voz alta no sirve
    .replace(/[*_`#>]+/g, '') // negritas, cursivas, código, títulos, citas
    .replace(/^\s*[-•]\s+/gm, '') // viñetas
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Corta en el último punto antes del máximo. Si no hay ninguno, corta en la última palabra entera.
 * Siempre avisa que el resto está escrito, para que nadie crea que eso fue todo.
 */
export function recortarParaHablar(texto: string): string {
  if (texto.length <= MAXIMO_CARACTERES_HABLADOS) return texto;
  const tramo = texto.slice(0, MAXIMO_CARACTERES_HABLADOS);
  const ultimoPunto = Math.max(tramo.lastIndexOf('. '), tramo.lastIndexOf('? '), tramo.lastIndexOf('! '));
  const corte = ultimoPunto > 0 ? ultimoPunto + 1 : tramo.lastIndexOf(' ');
  return tramo.slice(0, corte > 0 ? corte : MAXIMO_CARACTERES_HABLADOS).trim() + AVISO_DE_CORTE;
}
