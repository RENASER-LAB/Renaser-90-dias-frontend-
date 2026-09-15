/**
 * Qué decirle a la persona mientras el asistente todavía no contestó.
 *
 * ## El problema que resuelve
 *
 * El indicador de "está escribiendo…" ya existía y se muestra desde el momento en que se manda la
 * pregunta. No alcanzaba: medido contra el backend real el 2026-09-15, una pregunta que obliga al
 * agente a consultar los hábitos tardó **38 segundos** en dar el primer carácter, y otra idéntica
 * tardó **7**. Esa variación es del proveedor, no del código.
 *
 * Treinta y ocho segundos de un spinner que no cambia se leen como una app trabada — es
 * literalmente lo que reportó el dueño: *"se demora mucho, pensé que se trabó"*. El texto tiene
 * que moverse para que se note que sigue viva.
 *
 * ## Por qué un turno con herramienta tarda tanto
 *
 * El backend manda la respuesta en streaming, pero cuando el agente necesita mirar los hábitos hay
 * **dos viajes al modelo** antes del primer fragmento: uno para decidir que va a usar la
 * herramienta, y otro para redactar con el resultado. Hasta que el segundo empieza a emitir, no
 * hay nada que mostrar.
 *
 * ## Lo que este archivo NO hace
 *
 * No inventa qué está haciendo el agente. El contrato SSE solo trae `texto`, `error` y `fin`
 * (`renasiaSchemas.ts`): el cliente **no sabe** si está consultando hábitos o redactando, así que
 * decirlo sería adivinar. Lo único que se afirma es cuánto lleva esperando, que sí es un hecho.
 */

/** Antes de esto, la espera es normal y no hace falta decir nada distinto. */
export const SEGUNDOS_PARA_PENSANDO = 8;

/** Pasado esto ya conviene avisar que puede tardar, para que nadie crea que se colgó. */
export const SEGUNDOS_PARA_TRANQUILIZAR = 25;

/**
 * El techo real: el cliente HTTP del backend corta a los 60 s
 * (`renaser.ia.google.timeout-ms`). Se nombra acá para que el texto no prometa una espera que el
 * servidor no va a sostener.
 */
export const SEGUNDOS_LIMITE_DEL_BACKEND = 60;

/**
 * El texto del indicador según cuánto lleva esperando.
 *
 * `hayTextoParcial` manda sobre todo lo demás: en cuanto llega el primer fragmento ya se ve la
 * respuesta apareciendo, y ahí nadie duda de que está viva — escalar el aviso ahí sería ruido.
 */
export function avisoDeEspera(
  segundos: number,
  nombreAsistente: string,
  hayTextoParcial: boolean
): string {
  if (hayTextoParcial || segundos < SEGUNDOS_PARA_PENSANDO) {
    return `${nombreAsistente} está escribiendo…`;
  }
  if (segundos < SEGUNDOS_PARA_TRANQUILIZAR) {
    return `${nombreAsistente} está pensando… (${segundos} s)`;
  }
  return `Sigue trabajando (${segundos} s). Cuando revisa tus hábitos puede tardar hasta un minuto.`;
}
