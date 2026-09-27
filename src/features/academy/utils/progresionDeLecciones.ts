/**
 * La regla de progresión secuencial de Classroom: una lección se abre si la anterior del curso ya
 * está completada, o si ella misma ya lo está (volver a ver una que ya se hizo).
 *
 * Devuelve la lección anterior que falta completar, o `null` si se puede abrir. La primera lección
 * del curso, y una que no está en la lista, nunca se frenan acá: el bloqueo por día de programa
 * (`lesson.locked`) lo decide el backend y se mira aparte.
 *
 * `estaCompletada` es la lectura de la pantalla (lo marcado en el teléfono, el detalle de la lección
 * y el progreso del curso). `recienCompletadaId` es la lección que el servidor acaba de dar por
 * completada en este mismo toque: cuenta como completada aunque la pantalla todavía no se haya
 * enterado.
 *
 * > **TRB-04 (e2e web del 2026-09-27).** Al marcar una lección, la pantalla avanza a la siguiente
 * > en el mismo toque, antes de volver a dibujarse: su estado seguía diciendo que la lección recién
 * > completada estaba pendiente. Salía «Lección no disponible 🔒 … primero debes completar la
 * > lección anterior» nombrando justo esa, y la siguiente no se abría (aunque el aviso de después
 * > decía «Avanzando a: …»).
 */
export function leccionAnteriorPendiente<L extends { id: string }>(
  lecciones: readonly L[],
  leccionId: string,
  estaCompletada: (id: string, indice: number) => boolean,
  recienCompletadaId?: string | null,
): L | null {
  const indice = lecciones.findIndex(l => l.id === leccionId);
  if (indice <= 0) return null;
  const completada = (id: string, i: number) => id === recienCompletadaId || estaCompletada(id, i);
  const anterior = lecciones[indice - 1];
  if (completada(anterior.id, indice - 1) || completada(leccionId, indice)) return null;
  return anterior;
}
