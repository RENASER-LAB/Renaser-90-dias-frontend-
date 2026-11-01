import { FORMACION_POR_DEFECTO } from '../../formaciones/types/formaciones.types';

/**
 * ¿La formación de la persona todavía no tiene hábitos para ella? (spec 023, FR-014). Entonces Hoy no dibuja «Hábitos de hoy»: una
 * tarjeta con «0/0» y sin título no dice nada.
 *
 * Solo se afirma cuando hay con qué: el servidor dijo la formación (`delServidor`) y NO es la Escuela (que arranca con todo y tiene que
 * verse como siempre), la persona ya está en su Día 1 o después (el Día 0 no genera registros, y ahí «0 de hoy» es lo normal), los
 * registros de hoy se leyeron de verdad y no hay ninguno, y `/home` también cuenta cero. Cualquier duda: se dibuja la tarjeta.
 */
export function sinHabitosEnLaFormacion(entrada: {
  formacion: string | null;
  delServidor: boolean;
  diaPrograma: number | null | undefined;
  registrosLeidos: boolean;
  registrosDeHoy: number;
  habitosHoyTotal: number | null | undefined;
}): boolean {
  if (!entrada.delServidor || !entrada.formacion || entrada.formacion === FORMACION_POR_DEFECTO) return false;
  if (entrada.diaPrograma == null || entrada.diaPrograma < 1) return false;
  return entrada.registrosLeidos && entrada.registrosDeHoy === 0 && entrada.habitosHoyTotal === 0;
}
