/**
 * Las semanas por las que se mueve la sección de huecos: de lunes a domingo, de 7 en 7 días.
 *
 * Todo en UTC y con la fecha de calendario `yyyy-MM-dd` tal cual (nada de `new Date()` en la zona del teléfono, que
 * corre el día para quien viaja). **Cuál es la semana en curso no se calcula acá**: es la que el servidor devuelve al
 * pedir sin `semana`, en la zona de la persona. Los topes también son del servidor: ‹ llega hasta `primeraSemana` y ›
 * hasta la semana en curso; más allá, el servidor responde 400.
 */

const DIA_EN_MS = 86_400_000;

/** `2026-10-26` + 7 → `2026-11-02`. */
export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Date(d.getTime() + dias * DIA_EN_MS).toISOString().slice(0, 10);
}

export function semanaAnterior(lunes: string): string {
  return sumarDias(lunes, -7);
}

export function semanaSiguiente(lunes: string): string {
  return sumarDias(lunes, 7);
}

/**
 * ¿Se puede ir a la semana anterior? Solo si se sabe cuál fue la primera de su programa y esta es posterior. Sin ese
 * dato (todavía no eligió su Día 1) no hay nada antes que ver, y la app no inventa un tope.
 */
export function puedeIrALaAnterior(lunes: string | null, primeraSemana: string | null): boolean {
  return lunes !== null && primeraSemana !== null && lunes > primeraSemana;
}

/** ¿Se puede ir a la siguiente? Solo mientras no sea la semana en curso (nunca al futuro). */
export function puedeIrALaSiguiente(lunes: string | null, semanaEnCurso: string | null): boolean {
  return lunes !== null && semanaEnCurso !== null && lunes < semanaEnCurso;
}
