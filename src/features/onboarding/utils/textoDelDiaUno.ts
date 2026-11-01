import { plazoDelObjetivo } from '../../objetivos/utils/nombreDelObjetivo';

/**
 * Lo que dice «Elige tu Día 1» sobre el programa de ESTA persona: «de 90 días», «de 3 meses», «de 1 año». Antes decía siempre «90 días»,
 * también a quien cursa un programa de 1 año (E2E de las formaciones, 01/11/2026, J2-1: Hoy y Plan ya hablaban de «1 año»). Sin duración conocida
 * (el servidor aún no la dijo) vale la de siempre, 90 días.
 */
export function introduccionDelDiaUno(duracionDias?: number | null, formacion?: string | null): string {
  const plazo = plazoDelObjetivo(duracionDias, formacion);
  return `Tu programa de ${plazo} arranca el día que elijas. No puede ser hoy, para que puedas planificarte y dejar listos tus hábitos antes de que empiece a correr la cuenta.`;
}
