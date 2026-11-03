import { sumarDiasIso } from '../../eventos/utils/zonaHoraria';
import { indiceIsoDeLaFecha } from './semanaDeTraining';

/**
 * El día con que abre Training (issue #107, E2E final del 2026-11-02).
 *
 * En el Día 0 —el programa empieza MAÑANA, spec 036— la lista de HOY está vacía («Hoy no tienes nada planificado.», media pantalla en blanco) y lo
 * que sirve es lo planificado para mañana. Entonces Training abre en **mañana**, con la vista de un día que viene que ya existe (lo planificado, sin
 * botones); arriba sigue la fila «Tu programa empieza el …» y la persona puede tocar hoy cuando quiera.
 *
 * Pura, para probarla sin pantallas. Devuelve el `YYYY-MM-DD` de mañana, o `null` («se queda en hoy», como siempre) cuando:
 *  - el programa no empieza mañana (ya corre, o no se sabe cuándo empieza: `fechaDeInicio` ausente o distinta de mañana);
 *  - hoy es domingo: Training muestra la semana que se VIVE (de lunes a domingo) y mañana ya es de otra, que no se ve.
 */
export function diaInicialDeTraining({
  hoyIso,
  fechaDeInicio,
}: {
  /** Hoy, `YYYY-MM-DD`, el de la persona. */
  hoyIso: string;
  /** El Día 1 de quien ya activó su programa y todavía no llega (`programaQueEmpieza`), o `null`/ausente. */
  fechaDeInicio: string | null | undefined;
}): string | null {
  if (!fechaDeInicio) return null;
  const manana = sumarDiasIso(hoyIso, 1);
  if (fechaDeInicio !== manana) return null;
  if (indiceIsoDeLaFecha(hoyIso) === 6) return null;
  return manana;
}
