/**
 * Los papeles de una cuenta en Hoy (spec 018): «Mi programa», «Mi grupo» y «Mis mentores».
 *
 * Quien lidera mentores ve en Hoy su propio programa, su grupo (si además acompaña uno) y a sus mentores. Bajar por una
 * decena de tarjetas para cambiar de papel era demasiado («tiene mucho para ingresar»): un control de arriba elige cuál
 * se ve. Las reglas viven acá, puras, para probarse sin montar Hoy.
 *
 * **Solo lo ve quien lidera mentores.** El aprendiz, el mentor y la guía conservan Hoy exactamente como estaba: el
 * mentor ya tiene «Mi grupo» como una tarjeta y su día propio, y cambiarle la pantalla no se pidió. Con un solo papel
 * disponible tampoco hay control (un selector de una opción es ruido).
 */

export type PapelDeHoy = 'programa' | 'grupo' | 'mentores';

/** En este orden se ofrecen. */
export const PAPELES_EN_ORDEN: readonly PapelDeHoy[] = ['programa', 'grupo', 'mentores'];

export const ROTULO_DEL_PAPEL: Record<PapelDeHoy, string> = {
  programa: 'Mi programa',
  grupo: 'Mi grupo',
  mentores: 'Mis mentores',
};

/** Lo que tiene la cuenta, ya resuelto por quien monta Hoy (la entrada está disponible y el servidor la dejó ver). */
export interface LoQueTieneLaCuenta {
  esLider: boolean;
  /** Hace su propio programa de 90 días (la tarjeta de siempre del participante). */
  tienePrograma: boolean;
  /** Acompaña un grupo: la lista de sus aprendices. */
  tieneGrupo: boolean;
  /** Algo que mostrar de sus mentores: el resultado por grupo, las consultas o el padrón. */
  tieneMentores: boolean;
}

/**
 * Los papeles que se ofrecen, en orden. Vacío = sin control: Hoy es el de siempre (quien no lidera, o quien solo
 * tiene un papel disponible).
 */
export function papelesDeHoy(cuenta: LoQueTieneLaCuenta): PapelDeHoy[] {
  if (!cuenta.esLider) return [];
  const tiene: Record<PapelDeHoy, boolean> = {
    programa: cuenta.tienePrograma,
    grupo: cuenta.tieneGrupo,
    mentores: cuenta.tieneMentores,
  };
  const papeles = PAPELES_EN_ORDEN.filter(papel => tiene[papel]);
  return papeles.length >= 2 ? papeles : [];
}

/** Lo guardado, interpretado: cualquier cosa rara (o nada) es `null`. */
export function aPapel(crudo: string | null | undefined): PapelDeHoy | null {
  return (PAPELES_EN_ORDEN as readonly string[]).includes(crudo ?? '') ? (crudo as PapelDeHoy) : null;
}

/**
 * El papel que se ve: el último que la persona eligió si todavía lo tiene; si no (nunca eligió, o ya no le
 * corresponde, por ejemplo dejó de acompañar un grupo), el primero de la lista, que es «Mi programa»: Hoy sigue siendo
 * su día. `null` si no hay control.
 */
export function papelQueSeVe(papeles: readonly PapelDeHoy[], elegido: PapelDeHoy | null): PapelDeHoy | null {
  if (papeles.length === 0) return null;
  return elegido !== null && papeles.includes(elegido) ? elegido : papeles[0];
}
