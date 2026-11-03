import type { ArranquePrograma } from '../hooks/useArranqueDelPrograma';

/**
 * ¿Hay que decirle a esta persona cuándo empieza su programa? (issue #101, E2E del 2026-11-02)
 *
 * Es el caso de quien activó su programa y su Día 1 es MAÑANA (spec 036: el programa siempre empieza mañana): el contador dice día 0, pero para
 * organizar ya está «en curso» (D-103), así que `useArranqueDelPrograma` lo da por `EN_CURSO` con la fecha. Training lo dibujaba como un día
 * cualquiera —«Hoy no tienes nada planificado.» y dos tercios de pantalla en blanco— mientras Hoy y Plan decían «Tu programa empieza el martes 3
 * de noviembre». Quien empieza pasado mañana o más tarde (`ESPERANDO_INICIO`) ya tiene su propio aviso en Training.
 *
 * Pura, para probarla sin pantallas. `fechaInicio` es `YYYY-MM-DD`, o `null` si el servidor no la mandó (se dice «pronto»: no se inventa una).
 * Con el programa ya en marcha (día 1 o más), sin fila (`inscrito` falso) o mientras no se sabe, devuelve `null` y la pantalla es la de siempre.
 */
export function programaQueEmpieza({
  inscrito,
  diaPrograma,
  arranque,
}: {
  inscrito: boolean | undefined;
  diaPrograma: number | null | undefined;
  arranque: ArranquePrograma;
}): { fechaInicio: string | null } | null {
  if (inscrito !== true || diaPrograma !== 0) return null;
  if (arranque.estado !== 'EN_CURSO') return null;
  return { fechaInicio: arranque.fechaInicio ?? null };
}
