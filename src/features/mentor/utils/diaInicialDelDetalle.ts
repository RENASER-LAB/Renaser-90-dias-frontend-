/**
 * Qué día abre el «Detalle del día» de la semana de un aprendiz, en la ficha del mentor y en la de
 * administración: el MÁS RECIENTE que tiene hábitos registrados.
 *
 * > **Corregido 2026-09-29 (E-439).** Abría el PRIMERO de la semana (el lunes). El dueño publicó
 * > en el Muro un martes, el aprendiz vio el «Post diario en comunidad» cumplido y la ficha del
 * > administrador lo mostraba sin marcar: estaba mirando el detalle del lunes sin saberlo. Los
 * > registros de un día nacen ese mismo día, así que el último día con hábitos es HOY cuando se
 * > mira la semana en curso, y el domingo cuando se mira una semana pasada. No hace falta saber la
 * > zona del aprendiz ni la del teléfono de quien mira.
 *
 * `null` = ningún día de la semana tiene hábitos, y no hay detalle que abrir.
 */
export function diaInicialDelDetalle(dias: ReadonlyArray<{ fecha: string; obligaciones: ReadonlyArray<unknown> }>): string | null {
  const conHabitos = dias.filter(d => d.obligaciones.length > 0).map(d => d.fecha).sort();
  return conHabitos.length > 0 ? conHabitos[conHabitos.length - 1] : null;
}
