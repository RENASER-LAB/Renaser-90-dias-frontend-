/**
 * Las preguntas que se le hacen a la persona después de escuchar la Pastilla del día.
 *
 * ## Lo que el dueño del producto decidió (D-97, 2026-09-04)
 *
 * > "Establece 2 preguntas cortas intrapersonales, no difíciles de responder, como *qué sentiste
 * > después de escuchar* o luego otra parecida. Son fijas."
 *
 * O sea: las mismas dos preguntas para todos los audios, todos los días. Esto reemplaza al
 * diseño anterior, que esperaba un banco de preguntas escrito POR AUDIO (~86 textos que nadie
 * había escrito y que no existían en ninguna tabla) y caía a una sola pregunta de interpretación
 * mientras ese banco estuviera vacío. Ya no hay banco, ya no hay sorteo, ya no hay modo de
 * respaldo: hay dos preguntas y punto.
 *
 * Por qué son intrapersonales y fáciles: la persona acaba de escuchar un audio de 3 a 11
 * minutos; el objetivo es que registre lo que le pasó por dentro, no que rinda examen. La
 * segunda pregunta mira hacia adelante para que la escucha deje algo concreto para el día.
 *
 * **El texto exacto lo escribí siguiendo el ejemplo del dueño; la segunda necesita su visto
 * bueno.** Cambiar cualquiera de las dos es tocar este archivo y nada más: el modal las lee de
 * acá, y las respuestas viajan juntas en `summaryText` (una por línea, con su pregunta) a
 * `registros_espiritu.resumen_texto`, que es el campo que el backend ya tenía.
 *
 * Las mismas dos preguntas aplican a la Audioterapia semanal cuando tenga flujo móvil (D-97).
 */

export const PREGUNTAS_FIJAS: readonly string[] = [
  '¿Qué sentiste después de escuchar este audio?',
  '¿Qué te llevas de este audio para tu día de hoy?',
];

/** Cuántas preguntas se muestran. Lo pidió el dueño: dos. */
export const CANTIDAD_PREGUNTAS_CORTAS = PREGUNTAS_FIJAS.length;

export interface PreguntasDelDia {
  /** Se conserva el campo por compatibilidad con el borrador guardado; hoy siempre es `cortas`. */
  modo: 'interpretacion' | 'cortas';
  preguntas: string[];
}

/**
 * Las preguntas para un día de audio. Los parámetros se conservan para no tocar al modal ni al
 * borrador guardado en el teléfono (que recuerda qué preguntas le tocaron a la persona), pero
 * desde D-97 no deciden nada: las preguntas son las mismas para todos los días.
 */
export function preguntasDelDia(_diaDeAudio?: number, _sorteo?: () => number): PreguntasDelDia {
  return { modo: 'cortas', preguntas: [...PREGUNTAS_FIJAS] };
}
