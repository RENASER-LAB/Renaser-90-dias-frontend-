/**
 * La fecha de nacimiento de la Ficha Inicial, sin React (selector en ruedas, 2026-10-05).
 *
 * **El contrato no cambia:** el campo sigue guardando `"DD/MM/AAAA"` (lo convierte a ISO
 * `mapaPreguntas.fechaDdMmAaaaAIso` antes de mandarlo), la fecha por defecto sigue siendo el 15 de
 * junio de 1995 y los años son los mismos 80 de antes (de 14 a 93 años).
 *
 * **Lo único nuevo es que la fecha existe.** El selector anterior ofrecía 31 días para cualquier
 * mes: se podía confirmar el 31/02, que se mandaba como `1995-02-31`, una fecha que no existe. Ahora
 * la rueda de días tiene los días de ESE mes (29 en febrero bisiesto) y, si al cambiar de mes el día
 * ya no entra, queda en el último del mes — lo mismo que hace el selector de fecha del teléfono.
 */

export interface FechaPartida {
  dia: number;
  /** 1 a 12. */
  mes: number;
  anio: number;
}

export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export const FECHA_POR_DEFECTO: FechaPartida = { dia: 15, mes: 6, anio: 1995 };

/** La edad mínima y máxima que ofrecía el selector de antes (`currentYear - 14 - i`, 80 años). */
const EDAD_MINIMA = 14;
const CANTIDAD_DE_ANIOS = 80;

/**
 * Los años elegibles, de menor a mayor (la rueda baja hacia los más recientes, como la del sistema).
 * Si la fecha ya guardada cae fuera del rango (una ficha vieja, otra regla), su año se agrega: abrir
 * el selector nunca puede cambiar en silencio un dato que la persona no tocó.
 */
export function aniosElegibles(anioActual: number, incluir?: number): number[] {
  const ultimo = anioActual - EDAD_MINIMA;
  const primero = ultimo - CANTIDAD_DE_ANIOS + 1;
  const anios = Array.from({ length: CANTIDAD_DE_ANIOS }, (_, i) => primero + i);
  if (incluir !== undefined && Number.isInteger(incluir) && (incluir < primero || incluir > ultimo)) {
    return [...anios, incluir].sort((a, b) => a - b);
  }
  return anios;
}

export function diasDelMes(mes: number, anio: number): number {
  // El día 0 del mes siguiente es el último de este.
  return new Date(anio, mes, 0).getDate();
}

/** `"DD/MM/AAAA"` → sus partes, o `null` si no tiene esa forma. */
export function partirFecha(valor: string): FechaPartida | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((valor ?? '').trim());
  if (!m) return null;
  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  const anio = parseInt(m[3], 10);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return { dia, mes, anio };
}

/** Sus partes → `"DD/MM/AAAA"`, la forma que guarda el campo desde siempre. */
export function armarFecha({ dia, mes, anio }: FechaPartida): string {
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`;
}

/** El mismo día si entra en el mes; si no (31 → febrero), el último día del mes. */
export function ajustarDia(fecha: FechaPartida): FechaPartida {
  const tope = diasDelMes(fecha.mes, fecha.anio);
  return fecha.dia > tope ? { ...fecha, dia: tope } : fecha;
}

/** `{15, 6, 1995}` → «15 de junio de 1995». */
export function fechaEnPalabras({ dia, mes, anio }: FechaPartida): string {
  return `${dia} de ${MESES[mes - 1] ?? ''} de ${anio}`;
}
