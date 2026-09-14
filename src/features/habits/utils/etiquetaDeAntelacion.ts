/**
 * Cómo se lee una antelación de recordatorio en pantalla: `10` → `"10 min antes"`, `90` → `"1 h 30
 * antes"`, `0` → `"A la hora"`.
 *
 * ── Por qué existe ──
 *
 * Hasta el 2026-09-14 las antelaciones eran tres fijas con su etiqueta escrita al lado, así que
 * formatear no hacía falta. Desde que la persona puede escribir la suya —7 minutos, 45, dos
 * horas— hay que saber nombrar cualquier número, y eso es una regla con casos de borde (el cero,
 * las horas exactas, el día entero) que merece estar en un sitio y probada.
 *
 * El conjunto de antelaciones ya viajaba como `number[]` hasta el programador de alarmas, que
 * calcula `(hora - minutos) mod 1440` y por lo tanto **ya aceptaba cualquier valor**: esto no
 * cambia nada aguas abajo, solo deja de esconder lo que el motor siempre supo hacer.
 */

/** Tope: un día. Más que eso no es "un aviso antes", es otro recordatorio. */
export const MAXIMO_MINUTOS_ANTELACION = 1440;

export const MINIMO_MINUTOS_ANTELACION = 1;

const MINUTOS_POR_HORA = 60;

export function etiquetaDeAntelacion(minutos: number): string {
  if (!Number.isFinite(minutos) || minutos <= 0) return 'A la hora';
  const entero = Math.round(minutos);
  if (entero >= MAXIMO_MINUTOS_ANTELACION) return '1 día antes';
  if (entero < MINUTOS_POR_HORA) return `${entero} min antes`;

  const horas = Math.floor(entero / MINUTOS_POR_HORA);
  const resto = entero % MINUTOS_POR_HORA;
  // "2 h antes" y no "2 h 0 antes": el cero sobra y alarga la pastilla sin decir nada.
  return resto === 0 ? `${horas} h antes` : `${horas} h ${resto} antes`;
}

/**
 * Convierte lo que la persona escribió en una antelación válida, o `null` si no lo es.
 *
 * Acepta coma o punto por si escribe "1,5" pensando en horas — se redondea a minutos enteros, que
 * es la unidad real: el programador de alarmas trabaja en minutos y medio minuto no existe ahí.
 *
 * Rechaza el cero a propósito: "a la hora" ya es una pastilla propia, y escribir `0` en el campo
 * de minutos para decir "a la hora" es un camino que nadie encuentra solo.
 */
export function minutosDesdeTexto(crudo: string): number | null {
  const limpio = crudo.replace(',', '.').trim();
  if (!limpio) return null;
  const n = Number(limpio);
  if (!Number.isFinite(n)) return null;
  const entero = Math.round(n);
  if (entero < MINIMO_MINUTOS_ANTELACION || entero > MAXIMO_MINUTOS_ANTELACION) return null;
  return entero;
}

/**
 * Las antelaciones a mostrar: las fijas más las que la persona haya escrito, sin repetir y de la
 * más temprana a la más tardía.
 *
 * Ordenar de mayor a menor —"30 min antes" antes que "A la hora"— sigue el orden del tiempo real:
 * primero el aviso que llega antes. Es el mismo orden en que el programador las recorre.
 */
export function antelacionesAMostrar(fijas: readonly number[], elegidas: readonly number[]): number[] {
  // El cero se filtra de LAS DOS listas, no solo de las elegidas: "A la hora" se dibuja como una
  // pastilla aparte y colarlo acá lo pondría dos veces. Lo destapó su propio test.
  const positivos = (ms: readonly number[]) => ms.filter(m => Number.isFinite(m) && m > 0);
  const todas = new Set<number>([...positivos(fijas), ...positivos(elegidas)]);
  return [...todas].sort((a, b) => b - a);
}
