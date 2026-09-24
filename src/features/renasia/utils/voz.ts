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

/**
 * Del texto que va llegando por el stream, separa las oraciones YA completas (terminadas en . ? ! o
 * salto de línea) de lo que todavía se está escribiendo. Así el orbe empieza a hablar con la primera
 * oración mientras el modelo sigue generando el resto, en vez de esperar la respuesta entera.
 */
export function separarOraciones(texto: string): { completas: string[]; resto: string } {
  const completas: string[] = [];
  let inicio = 0;
  const fin = /[.!?…]+["”»)]?\s+|\n+/g;
  let m: RegExpExecArray | null;
  while ((m = fin.exec(texto)) !== null) {
    const oracion = texto.slice(inicio, m.index + m[0].length).trim();
    if (oracion) completas.push(oracion);
    inicio = m.index + m[0].length;
  }
  return { completas, resto: texto.slice(inicio) };
}

/** Preferencia de idioma para la voz: primero español latinoamericano, después cualquier español. */
const PREFERENCIA_DE_VOZ = ['es-419', 'es-US', 'es-MX', 'es-PE', 'es-CO', 'es-AR', 'es-CL'];

/**
 * Elige el idioma de la voz entre las que el teléfono tiene instaladas. Pedir uno que no existe
 * (p. ej. `es-419` en un emulador que solo trae "Spanish (United States)" y "Spanish (Spain)") hace
 * que el motor falle en silencio y el orbe no diga nada (visto el 2026-09-23). `null` = no hay
 * ninguna voz en español: la respuesta queda solo escrita.
 */
export function elegirIdiomaDeVoz(idiomasInstalados: readonly string[]): string | null {
  const normalizados = idiomasInstalados.map(idioma => idioma.replace('_', '-'));
  const exacto = PREFERENCIA_DE_VOZ.find(preferido =>
    normalizados.some(idioma => idioma.toLowerCase() === preferido.toLowerCase())
  );
  if (exacto) return exacto;
  const latino = normalizados.find(idioma => /^es-(?!ES)/i.test(idioma));
  if (latino) return latino;
  return normalizados.find(idioma => /^es\b/i.test(idioma)) ?? null;
}

/** A partir de este largo, lo agrupado se manda a la voz sin esperar el final de la respuesta. */
export const MAXIMO_AGRUPADO = 220;

/**
 * Decide qué se manda a la voz y cuándo (E-232, 2026-09-24): la PRIMERA oración sola, apenas llega,
 * para que empiece a hablar rápido; el resto junto en un solo audio.
 *
 * Una oración por audio metía una pausa en cada punto: el silencio del final de un clip, el del
 * principio del siguiente y el cambio de clip en el reproductor. Juntas, además, la voz entona el
 * párrafo entero en vez de frases sueltas. El respaldo "Propuesta: …" nunca se lee.
 */
export function crearAgrupador(decir: (texto: string) => void, maximo = MAXIMO_AGRUPADO) {
  let dijoLaPrimera = false;
  let juntas = '';
  return {
    oracion(oracion: string) {
      const limpia = oracion.trim();
      if (!limpia || /^Propuesta:/i.test(limpia)) return;
      if (!dijoLaPrimera) {
        dijoLaPrimera = true;
        decir(limpia);
        return;
      }
      juntas = juntas ? `${juntas} ${limpia}` : limpia;
      if (juntas.length >= maximo) {
        decir(juntas);
        juntas = '';
      }
    },
    /** Lo que quedaba, más lo que haya que agregar al final (el aviso de la propuesta). */
    terminar(...alFinal: string[]) {
      alFinal.forEach(texto => this.oracion(texto));
      if (juntas) decir(juntas);
      juntas = '';
    },
  };
}
