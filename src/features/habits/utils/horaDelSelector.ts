/**
 * Las cuentas del selector de hora (`HoraPickerModal`), sin React: qué horas y minutos se ofrecen, cómo se
 * reparten en renglones y de qué hora se parte al abrirlo. Están acá para poder fijarlas con pruebas: el selector
 * se ve en cuatro pantallas y lo que devuelve (`HH:mm`, minutos de 5 en 5) no puede cambiar sin que se note.
 */

/** Las 24 horas del día, de `00` a `23`: se ven todas a la vez, sin desplazar de lado. */
export const HORAS: readonly number[] = Array.from({ length: 24 }, (_, i) => i);

/** Los minutos van de 5 en 5 (12 opciones): con un dedo grande, 60 botones no dan más precisión, dan más errores. */
export const MINUTOS: readonly number[] = Array.from({ length: 12 }, (_, i) => i * 5);

/**
 * Cuántos botones caben por renglón. Con 6, en un teléfono de 320 dp de ancho cada botón mide ~48 dp (el área táctil
 * mínima del proyecto); en uno de 411 dp, ~57. Las horas quedan en 4 renglones y los minutos en 2.
 */
export const POR_RENGLON = 6;

/** Parte una lista en renglones de `porRenglon`: la grilla es una pila de filas, sin `flexWrap` ni scroll. */
export function enRenglones<T>(valores: readonly T[], porRenglon: number = POR_RENGLON): T[][] {
  const renglones: T[][] = [];
  for (let i = 0; i < valores.length; i += porRenglon) renglones.push(valores.slice(i, i + porRenglon));
  return renglones;
}

export function aDosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

/** `{ hora: 9, minuto: 0 }` → `"09:00"`: lo que se le entrega a quien abrió el selector. */
export function armarHora(hora: number, minuto: number): string {
  return `${aDosDigitos(hora)}:${aDosDigitos(minuto)}`;
}

/** Donde dice «de la mañana», «de la tarde» o «de la noche» bajo la hora grande. */
export function momentoDelDia(hora: number): string {
  return hora < 12 ? 'de la mañana' : hora < 18 ? 'de la tarde' : 'de la noche';
}

/** La hora a la que arranca un selector que se abre sin hora legible. */
export const HORA_POR_DEFECTO = 6;

/**
 * De qué hora y minuto parte el selector al abrirse: la que ya tenía quien lo abre (`HH:mm`).
 *
 * - Sin hora legible (`NaN`), la hora arranca en {@link HORA_POR_DEFECTO} y el minuto en `00`.
 * - Una hora fuera de `0–23` se acota (no hay un botón que la marque).
 * - El minuto se lleva al múltiplo de 5 más cercano: los pasos del selector son de a 5 (`58` → `00`, `07` → `05`).
 */
export function partirHora(horaInicial: string): { hora: number; minuto: number } {
  const [h, m] = horaInicial.split(':').map(Number);
  const hora = Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : HORA_POR_DEFECTO;
  const minuto = Number.isFinite(m) ? (Math.round(m / 5) * 5) % 60 : 0;
  return { hora, minuto };
}
