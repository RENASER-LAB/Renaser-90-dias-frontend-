/**
 * La cifra de la tarjeta «Hábitos de hoy» (E-257, S-9 de la retroalimentación del 26/09).
 *
 * Sin datos (`habitosHoy` null) NO se escribe nada. Antes decía «Al día», que afirma un
 * cumplimiento que nadie midió: contradice CL-07 del SDD 002 (nunca «al día» ni verde por falta de
 * datos) y además usa la palabra del verde del semáforo (D-168).
 */
export function cifrasDeHabitos(habitosHoy: { completados: number; total: number } | null | undefined): string | null {
  if (!habitosHoy) return null;
  return `${habitosHoy.completados}/${habitosHoy.total}`;
}
