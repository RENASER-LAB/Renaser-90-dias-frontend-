/**
 * ¿La carrera con GPS corre en este sistema? (spec 042 FR-001, FR-047). Pura.
 *
 * Android desde el principio y iPhone desde el 2026-11-16 (decisión del dueño). En la web no hay GPS en segundo plano: la fila
 * sigue con la captura.
 */
export function laCarreraCorreEn(sistema: string): boolean {
  return sistema === 'android' || sistema === 'ios';
}
