/**
 * Los hitos que celebra el fénix (2026-10-06), SOLO con datos que ya manda el servidor en `GET /api/v1/home`:
 *
 * - `racha30` / `racha7`: `rachaActual` (backend `points.RachaMostrada`: días seguidos con al menos un hábito
 *   cumplido, terminando hoy o ayer) llega a 30 o a 7. Como la racha sigue valiendo 7 hasta el día siguiente, se
 *   guarda la última celebrada: la misma racha no se festeja dos veces, y si se corta y vuelve a 7, sí.
 * - `todosLosHabitos`: `habitosHoy.completados === habitosHoy.total` con al menos uno.
 *
 * **Fuera, a propósito:**
 * - Graduación: `/home` no dice que alguien se graduó. `diaPrograma` está acotado a [0, 90] (backend `dia_programa`),
 *   así que 90 no distingue el último día de los que vienen después; celebrarlo sería inventar la regla.
 * - Fase nueva: ya tiene su momento en Yo («¡Entraste en la Fase N!», con el animal de la fase). El fénix no se le
 *   suma encima; ese momento cuenta como la celebración del día (`celebracionDelDia.registrarFuera`).
 * - Cumplir UN hábito: pasa varias veces al día. No es un hito; el fénix del botón de SER solo asiente.
 *
 * Si coinciden varios el mismo día, gana el más raro (30 > 7 > todos los hábitos): hay una sola celebración por día.
 */
export type HitoDelFenix = 'racha30' | 'racha7' | 'todosLosHabitos';

export const RACHAS_QUE_SE_CELEBRAN = [30, 7] as const;

export type DatosDelDia = {
  rachaActual: number | null;
  habitosHoy: { completados: number; total: number } | null;
};

export function hitoDelDia(datos: DatosDelDia, rachaYaCelebrada: number | null): HitoDelFenix | null {
  const { rachaActual, habitosHoy } = datos;
  for (const n of RACHAS_QUE_SE_CELEBRAN) {
    if (rachaActual === n && rachaYaCelebrada !== n) return n === 30 ? 'racha30' : 'racha7';
  }
  if (habitosHoy && habitosHoy.total > 0 && habitosHoy.completados >= habitosHoy.total) return 'todosLosHabitos';
  return null;
}

/**
 * La racha celebrada que queda guardada después de mirar el día: si la racha se cortó (bajó de lo celebrado), se
 * olvida, para que la próxima vez que llegue a 7 vuelva a festejarse.
 */
export function rachaCelebradaTrasMirar(rachaActual: number | null, guardada: number | null, hito: HitoDelFenix | null): number | null {
  if (hito === 'racha30') return 30;
  if (hito === 'racha7') return 7;
  if (guardada !== null && rachaActual !== null && rachaActual < guardada) return null;
  return guardada;
}

/** `yyyy-MM-dd` del día del teléfono: «una por día» es el día de quien mira la app. */
export function claveDelDia(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}
