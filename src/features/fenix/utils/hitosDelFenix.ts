/**
 * Los hitos que se celebran a pantalla completa (2026-10-07, pedido del dueño), SOLO con datos que ya manda el
 * servidor en `GET /api/v1/home`:
 *
 * - `fase`: la fase de `/home` (`fase`) es mayor que la última vista en este teléfono (`yo.faseVista.<id>`). La primera
 *   vez que se mira no se celebra: quien ya venía de antes no «entró» hoy (`hayQueCelebrar` de Yo).
 * - `racha30` / `racha7`: `rachaActual` (backend `points.RachaMostrada`: días seguidos con al menos un hábito
 *   cumplido, terminando hoy o ayer) llega a 30 o a 7. Como la racha sigue valiendo 7 hasta el día siguiente, se
 *   guarda la última celebrada: la misma racha no se festeja dos veces, y si se corta y vuelve a 7, sí.
 * - `todosLosHabitos` («¡Día completo!»): `habitosHoy.completados === habitosHoy.total` con al menos uno.
 *
 * **Fuera, a propósito:**
 * - Graduación: `/home` no dice que alguien se graduó. `diaPrograma` está acotado a [0, 90] (backend `dia_programa`),
 *   así que 90 no distingue el último día de los que vienen después; celebrarlo sería inventar la regla.
 * - Cumplir UN hábito: pasa varias veces al día. No es un hito: tiene su momento chico en la tarjeta
 *   (`habits/celebracion`), nunca la pantalla completa.
 *
 * Hay UNA pantalla por día. Si coinciden varios, manda el de mayor jerarquía (`JERARQUIA`) y los demás van como línea
 * dentro de la misma pantalla.
 *
 * > **Corregido 2026-10-07.** Decía que la fase nueva quedaba fuera porque «ya tiene su momento en Yo» y que el fénix
 * > no se le sumaba. El dueño pidió que la fase nueva sea una de las pantallas completas, que reemplace el momento
 * > chico de Yo y que, si coinciden, gane a todo.
 */
export type HitoDelFenix = 'fase' | 'racha30' | 'racha7' | 'todosLosHabitos';

/** De mayor a menor: la primera que se cumple es la pantalla; las otras, líneas dentro de ella. */
export const JERARQUIA: readonly HitoDelFenix[] = ['fase', 'racha30', 'racha7', 'todosLosHabitos'];

export const RACHAS_QUE_SE_CELEBRAN = [30, 7] as const;

export type DatosDelDia = {
  rachaActual: number | null;
  habitosHoy: { completados: number; total: number } | null;
  /** La fase de `/home` es nueva para este teléfono (lo decide `celebracionDelDia` con lo guardado). */
  faseNueva?: boolean;
};

/** Todos los hitos que se cumplen hoy, en orden de jerarquía. Vacío si no hay ninguno. */
export function hitosDelDia(datos: DatosDelDia, rachaYaCelebrada: number | null): HitoDelFenix[] {
  const cumplidos = new Set<HitoDelFenix>();
  if (datos.faseNueva) cumplidos.add('fase');
  for (const n of RACHAS_QUE_SE_CELEBRAN) {
    if (datos.rachaActual === n && rachaYaCelebrada !== n) cumplidos.add(n === 30 ? 'racha30' : 'racha7');
  }
  if (diaCompleto(datos.habitosHoy)) cumplidos.add('todosLosHabitos');
  return JERARQUIA.filter(h => cumplidos.has(h));
}

/** El hito que manda hoy, o `null`. */
export function hitoDelDia(datos: DatosDelDia, rachaYaCelebrada: number | null): HitoDelFenix | null {
  return hitosDelDia(datos, rachaYaCelebrada)[0] ?? null;
}

function diaCompleto(habitosHoy: DatosDelDia['habitosHoy']): boolean {
  return Boolean(habitosHoy && habitosHoy.total > 0 && habitosHoy.completados >= habitosHoy.total);
}

/**
 * La racha celebrada que queda guardada después de mirar el día: la de la pantalla (principal o línea); si la racha
 * se cortó (bajó de lo celebrado), se olvida, para que la próxima vez que llegue a 7 vuelva a festejarse.
 */
export function rachaCelebradaTrasMirar(
  rachaActual: number | null,
  guardada: number | null,
  celebrados: readonly HitoDelFenix[],
): number | null {
  if (celebrados.includes('racha30')) return 30;
  if (celebrados.includes('racha7')) return 7;
  if (guardada !== null && rachaActual !== null && rachaActual < guardada) return null;
  return guardada;
}

/** `yyyy-MM-dd` del día del teléfono: «una por día» es el día de quien mira la app. */
export function claveDelDia(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}
