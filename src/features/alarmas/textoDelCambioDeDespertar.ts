/**
 * Lo que se le dice a la persona cuando cambia la hora de Despertar y el cambio rige desde el día
 * siguiente (D-91: el día en curso no se reacomoda).
 *
 * > **Corregido 2026-09-29 (D-230 del backend).** Decía «Desde mañana tu hora de despertar es a las
 * > 22:00». Con Despertar a cualquier hora del día —el dueño pidió no atarlo a la mañana: «hay gente
 * > que trabaja en la noche»—, «mañana» junto a «despertar» se lee como «de la mañana». Se dice
 * > «el día siguiente», que no se confunde con una franja del día.
 */
export function textoDelCambioDeDespertar(horaNueva: string, horaDeHoy: string | null): string {
  const cambio = `Desde el día siguiente, tu hora de despertar es a las ${horaNueva}.`;
  return horaDeHoy ? `${cambio} Hoy la alarma sigue a las ${horaDeHoy}.` : cambio;
}
