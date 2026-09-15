/**
 * `yyyy-MM-dd` → texto para leer, construido con UTC a mano.
 *
 * Nada de `toLocaleDateString`: las fechas llegan como `yyyy-MM-dd` —una fecha de calendario,
 * sin hora ni zona— y dejar que el teléfono las interprete en su propio huso corre el día una
 * casilla para un mentor que viaja. Es el mismo criterio que ya aplica `AlumnoScreen`.
 *
 * Sólo lo usan las secciones nuevas del detalle del aprendiz ("Sus hábitos" y "Código Renaser").
 * `AlumnoScreen` y `RejillaSemanal` tienen cada uno su propia copia de estas tablas desde antes;
 * unificarlas es un cambio que toca pantallas que hoy funcionan, así que queda fuera de acá.
 */

const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** `2026-09-15` → `Martes 15 de septiembre`. La cadena original si no se puede leer. */
export function diaLargo(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${DIAS_LARGOS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

/** `2026-09-15` → `15 de septiembre`. La cadena original si no se puede leer. */
export function diaYMes(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}
