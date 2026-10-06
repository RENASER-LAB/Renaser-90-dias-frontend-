/**
 * La fecha de nacimiento de la Ficha Inicial, sin React (selector en ruedas, 2026-10-05).
 *
 * **El contrato no cambia:** el campo sigue guardando `"DD/MM/AAAA"` (lo convierte a ISO
 * `mapaPreguntas.fechaDdMmAaaaAIso` antes de mandarlo), la fecha por defecto sigue siendo el 15 de
 * junio de 1995 y la rueda de años sigue ofreciendo 80 años.
 *
 * **Solo mayores de 18 (decisión del dueño, 2026-10-06).** La Política de Privacidad publicada dice
 * que el programa es solo para mayores de edad (D-80), pero las ruedas dejaban elegir desde los 14.
 * Ahora la fecha más reciente que se puede elegir es la de alguien que cumple 18 HOY, con el «hoy» de
 * Lima (no el del teléfono ni el de UTC): el que cumple 18 mañana todavía no entra. El servidor
 * aplica el mismo criterio al guardar `birth_date`.
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

/**
 * Edad mínima para entrar al programa. Hasta 2026-10-06 era 14 (`currentYear - 14 - i`), en
 * contradicción con la Política de Privacidad publicada (D-80); el dueño eligió 18.
 */
export const EDAD_MINIMA = 18;
const CANTIDAD_DE_ANIOS = 80;

/** La zona del padrón: «hoy» es el día de Lima, el mismo con el que valida el servidor. */
const ZONA_DEL_PROGRAMA = 'America/Lima';

/** La fecha de hoy en Lima. A las 02:00 UTC del 7 de octubre, en Lima todavía es 6 de octubre. */
export function hoyEnLima(ahoraMs: number = Date.now()): FechaPartida {
  try {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: ZONA_DEL_PROGRAMA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(ahoraMs));
    const valor = (tipo: string) => Number(partes.find(p => p.type === tipo)?.value);
    const hoy = { dia: valor('day'), mes: valor('month'), anio: valor('year') };
    if ([hoy.dia, hoy.mes, hoy.anio].every(Number.isFinite)) return hoy;
  } catch {
    // Sin la zona en el motor: Lima es UTC−5 todo el año (no tiene horario de verano).
  }
  const lima = new Date(ahoraMs - 5 * 60 * 60 * 1000);
  return { dia: lima.getUTCDate(), mes: lima.getUTCMonth() + 1, anio: lima.getUTCFullYear() };
}

/** Los años cumplidos en `hoy`. Quien nació un 29 de febrero cumple el 1 de marzo en años no bisiestos. */
export function edadCumplida(nacimiento: FechaPartida, hoy: FechaPartida): number {
  const yaCumplioEsteAnio = hoy.mes > nacimiento.mes || (hoy.mes === nacimiento.mes && hoy.dia >= nacimiento.dia);
  return hoy.anio - nacimiento.anio - (yaCumplioEsteAnio ? 0 : 1);
}

export function esMayorDeEdad(nacimiento: FechaPartida, hoy: FechaPartida): boolean {
  return edadCumplida(nacimiento, hoy) >= EDAD_MINIMA;
}

/**
 * La fecha de nacimiento más reciente que se puede elegir: la de quien cumple 18 hoy. Si hoy es 29
 * de febrero y ese año no fue bisiesto, el 28 (quien nació el 28 ya cumplió).
 */
export function fechaMaximaDeNacimiento(hoy: FechaPartida): FechaPartida {
  return ajustarDia({ dia: hoy.dia, mes: hoy.mes, anio: hoy.anio - EDAD_MINIMA });
}

function esPosterior(a: FechaPartida, b: FechaPartida): boolean {
  if (a.anio !== b.anio) return a.anio > b.anio;
  if (a.mes !== b.mes) return a.mes > b.mes;
  return a.dia > b.dia;
}

/** La fecha de las ruedas, sin pasar de la máxima: si la persona gira hacia un día prohibido, vuelve al tope. */
export function acotarAFechaMaxima(fecha: FechaPartida, maxima: FechaPartida): FechaPartida {
  return esPosterior(fecha, maxima) ? maxima : fecha;
}

/** Los meses que ofrece la rueda para un año: en el año tope, sólo hasta el mes tope. */
export function mesesElegibles(anio: number, maxima: FechaPartida): number {
  return anio === maxima.anio ? maxima.mes : 12;
}

/** Los días que ofrece la rueda para un mes: en el mes tope, sólo hasta el día tope. */
export function diasElegibles(mes: number, anio: number, maxima: FechaPartida): number {
  const delMes = diasDelMes(mes, anio);
  return anio === maxima.anio && mes === maxima.mes ? Math.min(delMes, maxima.dia) : delMes;
}

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
