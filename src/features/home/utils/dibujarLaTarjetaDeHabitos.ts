/**
 * ¿Hoy dibuja «Hábitos de hoy»? (E2E de las formaciones, 01/11/2026, issue #86). La regla de la app es «mientras no se sabe, no se dibuja» —la misma
 * de la mitad del Radar y de la tarjeta de la acción de hoy—: la tarjeta necesita un día de programa y, sin él, decía «0/0» y «Lidera tu energía
 * diaria.», un dato inventado.
 *
 *  - `/home` ya llegó con `diaPrograma >= 1`: se dibuja (también mientras se vuelve a leer: no parpadea al volver a Hoy ni al cumplir un hábito).
 *  - `/home` ya llegó sin día de programa (personal sin programa, sin Día 1 o en el día 0): no se dibuja.
 *  - `/home` todavía no llegó (primera lectura): no se dibuja; a quien tiene programa le aparece al llegar, dentro de la entrada escalonada de Hoy.
 *  - `/home` falló y nunca llegó: no se sabe, así que queda como antes (se dibuja) y Hoy ofrece reintentar.
 */
export function dibujarLaTarjetaDeHabitos({
  resumen,
  error,
}: {
  /** Lo último que dijo `/home`; `null` mientras no llegó. */
  resumen: { diaPrograma?: number | null } | null | undefined;
  /** El fallo de la lectura, si lo hubo (`null` mientras carga o si salió bien). */
  error: string | null | undefined;
}): boolean {
  if (resumen) return (resumen.diaPrograma ?? 0) >= 1;
  return Boolean(error);
}
