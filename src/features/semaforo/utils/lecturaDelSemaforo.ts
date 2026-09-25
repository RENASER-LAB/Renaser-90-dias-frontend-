import type {
  AprendizDelSemaforo,
  ColorSemaforo,
  ConteoDelDia,
  DetalleDelSemaforo,
  DiaDelSemaforo,
  EstadoDiaSemaforo,
  ResumenPorColor,
  SemanaCerrada,
} from '../types/semaforo.types';

/**
 * Cómo se DICE el semáforo: palabras, cifras y fechas. Funciones puras —ni React ni red— para que
 * cada texto se pueda probar sin montar una pantalla, y para que cambiar el gráfico o la tarjeta
 * no obligue a reescribir cómo se nombra cada cosa.
 *
 * Nada de esto calcula el semáforo. Los números llegan hechos del servidor; acá solo se eligen
 * las palabras (RL-30: el color nunca va solo) y se escribe el número con su denominador.
 */

/** La ventana vigente siempre son 7 días (contrato §4.1). Es el denominador de "N de 7 días". */
export const DIAS_DE_LA_VENTANA = 7;

/** Espacio duro: el `%` nunca queda solo en el renglón de abajo. */
const ESPACIO_DURO = ' ';

/** Las palabras del contrato (§1). Van SIEMPRE junto al color. */
export const PALABRA_DEL_COLOR: Record<ColorSemaforo, string> = {
  VERDE: 'Al día',
  AMARILLO: 'Requiere atención',
  ROJO: 'Con problemas',
  SIN_DATOS: 'Sin datos',
};

/**
 * La palabra que se muestra. Gana la del servidor: la app no se actualiza por aire, y así un cambio
 * de redacción del dueño llega a todos sin reinstalar. Si no vino, la del color.
 */
export function palabraDelSemaforo(color: ColorSemaforo, etiqueta?: string | null): string {
  return etiqueta?.trim() || PALABRA_DEL_COLOR[color];
}

/**
 * `78.3` → `78.3 %`, `82` → `82 %`. **Sin redondear**: el promedio llega con un decimal y el color se
 * decidió con ese decimal. Redondear 79.9 a 80 pondría «80 %» al lado de «Requiere atención».
 *
 * Punto decimal y no coma: es como la app ya escribe sus cifras (`81.6 kg` en Plan).
 */
export function formatearPorcentaje(valor: number): string {
  return `${String(valor)}${ESPACIO_DURO}%`;
}

/**
 * `71.4` → `71.4%`: la misma cifra, sin el espacio. Solo para un gráfico con columnas angostas
 * (ocho semanas en 360 px), donde «71.4 %» ya no cabe y los números se pegan entre sí.
 */
export function porcentajeCompacto(valor: number): string {
  return `${String(valor)}%`;
}

/** `6` → `6 de 7 días con datos`. El denominador va siempre (§5). */
export function textoDiasConDatos(diasConDatos: number): string {
  return `${diasConDatos} de ${DIAS_DE_LA_VENTANA} días con datos`;
}

function conteoEnPalabras(conteo: ConteoDelDia, singular: string, plural: string): string {
  return `${conteo.cumplidos} de ${conteo.programados} ${conteo.programados === 1 ? singular : plural}`;
}

/** Por qué un día no tiene porcentaje, dicho corto. `null` si el día sí se midió. */
export function estadoDelDiaEnPalabras(estado: EstadoDiaSemaforo): string | null {
  switch (estado) {
    case 'MEDIDO':
      return null;
    case 'SIN_DATOS':
      return 'Nada programado';
    case 'PAUSADO':
      return 'En pausa';
    case 'PENDIENTE':
      return 'Todavía sin calcular';
    case 'FUERA_DEL_PROGRAMA':
      return 'Fuera del programa';
    default:
      return 'Sin datos';
  }
}

/**
 * El desglose de un día medido, con denominadores: `7 de 9 hábitos · 2 de 3 objetivos · 75 %`.
 *
 * Un conteo con cero programados se omite: «0 de 0 objetivos» no dice nada y alarga la línea.
 * Un día que no se midió no tiene desglose: se dice por qué (`estadoDelDiaEnPalabras`).
 */
export function desgloseDelDia(dia: DiaDelSemaforo): string {
  if (dia.estado !== 'MEDIDO' || dia.porcentaje === null) {
    return estadoDelDiaEnPalabras(dia.estado) ?? 'Sin datos';
  }
  const partes: string[] = [];
  if (dia.habitos && dia.habitos.programados > 0) partes.push(conteoEnPalabras(dia.habitos, 'hábito', 'hábitos'));
  if (dia.objetivos && dia.objetivos.programados > 0) {
    partes.push(conteoEnPalabras(dia.objetivos, 'objetivo', 'objetivos'));
  }
  partes.push(formatearPorcentaje(dia.porcentaje));
  return partes.join(' · ');
}

// ------------------------------------------------------------------------------------------
// Fechas
// ------------------------------------------------------------------------------------------
//
// Las fechas llegan como `yyyy-MM-dd` —un día de calendario en la zona de la persona, sin hora— y
// se leen con UTC a mano, como en `mentor/utils/fechasLegibles.ts`. Dejar que el teléfono las
// interprete en su huso corre el día una casilla en cuanto el teléfono no está en Lima.

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function leerFecha(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function aIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** `2026-09-18` → `jueves 18 de septiembre`. La cadena original si no se puede leer. */
export function fechaLarga(iso: string): string {
  const d = leerFecha(iso);
  if (!d) return iso;
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

/** `2026-09-18` → `{ dia: 'Jue', numero: '18' }`, para rotular una barra en dos renglones cortos. */
export function fechaDeBarra(iso: string): { dia: string; numero: string } {
  const d = leerFecha(iso);
  if (!d) return { dia: '', numero: iso };
  return { dia: DIAS_CORTOS[d.getUTCDay()], numero: String(d.getUTCDate()) };
}

/**
 * El rango de una ventana, sin repetir el mes cuando es el mismo:
 * `del jueves 18 al miércoles 24 de septiembre` · `del sábado 27 de septiembre al viernes 3 de octubre`.
 */
export function rangoDeFechas(desde: string, hasta: string): string {
  const a = leerFecha(desde);
  const b = leerFecha(hasta);
  if (!a || !b) return `del ${desde} al ${hasta}`;
  const inicio = a.getUTCMonth() === b.getUTCMonth()
    ? `${DIAS[a.getUTCDay()]} ${a.getUTCDate()}`
    : fechaLarga(desde);
  return `del ${inicio} al ${fechaLarga(hasta)}`;
}

/**
 * Rótulo de una semana cerrada bajo su barra, en dos renglones cortos: `['12–18', 'sep']`, o
 * `['29 ago', '4 sep']` cuando cruza de mes — así cada número queda pegado a su mes y no se lee
 * «29 al 4 de septiembre». Ocho semanas tienen que entrar en 360 px: con un guion al final
 * («29 ago–») el renglón ya no cabía y se cortaba.
 */
export function rotuloDeSemana(desde: string, hasta: string): [string, string] {
  const a = leerFecha(desde);
  const b = leerFecha(hasta);
  if (!a || !b) return [desde, hasta];
  if (a.getUTCMonth() === b.getUTCMonth()) {
    return [`${a.getUTCDate()}–${b.getUTCDate()}`, MESES_CORTOS[b.getUTCMonth()]];
  }
  return [`${a.getUTCDate()} ${MESES_CORTOS[a.getUTCMonth()]}`, `${b.getUTCDate()} ${MESES_CORTOS[b.getUTCMonth()]}`];
}

/** Suma (o resta) días a una fecha de calendario. La cadena original si no se puede leer. */
export function sumarDias(iso: string, dias: number): string {
  const d = leerFecha(iso);
  if (!d) return iso;
  d.setUTCDate(d.getUTCDate() + dias);
  return aIso(d);
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Qué día es HOY para esta persona, sacado de lo que dijo el servidor y no del reloj del teléfono:
 * la ventana vigente termina AYER en su zona (contrato §1), así que hoy es el día siguiente.
 *
 * Solo si no hay ventana se usa el reloj del dispositivo (`ahora`), que para el padrón —todo en
 * Lima— da lo mismo. El servidor igual vuelve a validar: una pausa que empiece antes de hoy es un 400.
 */
export function hoyDeLaPersona(detalle: Pick<DetalleDelSemaforo, 'vigente'>, ahora: Date): string {
  if (detalle.vigente && leerFecha(detalle.vigente.hasta)) {
    return sumarDias(detalle.vigente.hasta, 1);
  }
  return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`;
}

/**
 * `2026-09-25T05:25:03Z` → `jueves 25 de septiembre a las 00:25`, en la hora del teléfono.
 *
 * Es la hora del dispositivo, no la de `zona`: convertir a otra zona exige `Intl` con `timeZone`,
 * que esta app no usa (Hermes en Android no trae ICU completo). Todo el padrón vive en Lima, igual
 * que el criterio de `mentor/utils/agruparRegistrosRadar.ts`. `null` si no se puede leer.
 */
export function momentoDeCalculo(instante: string | null): string | null {
  if (!instante) return null;
  const d = new Date(instante);
  if (Number.isNaN(d.getTime())) return null;
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} a las ${dosDigitos(d.getHours())}:${dosDigitos(
    d.getMinutes(),
  )}`;
}

// ------------------------------------------------------------------------------------------
// Lo que oye quien no ve el gráfico
// ------------------------------------------------------------------------------------------

/** `jueves 18…` → `Jueves 18…`, para empezar un renglón. */
export function primeraEnMayuscula(texto: string): string {
  return texto ? texto[0].toUpperCase() + texto.slice(1) : texto;
}

/** `Jueves 18 de septiembre: Requiere atención, 7 de 9 hábitos · 2 de 3 objetivos · 75 %`. */
export function dichoDelDia(dia: DiaDelSemaforo): string {
  const fecha = primeraEnMayuscula(fechaLarga(dia.fecha));
  if (dia.estado !== 'MEDIDO' || dia.porcentaje === null) return `${fecha}: ${desgloseDelDia(dia)}`;
  return `${fecha}: ${PALABRA_DEL_COLOR[dia.color]}, ${desgloseDelDia(dia)}`;
}

/** `Semana del sábado 12 al viernes 18 de septiembre: Al día, 82 %, 7 de 7 días con datos`. */
export function dichoDeLaSemana(semana: SemanaCerrada): string {
  const partes = [palabraDelSemaforo(semana.color, semana.etiqueta)];
  if (semana.porcentaje !== null) partes.push(formatearPorcentaje(semana.porcentaje));
  if (semana.diasConDatos !== null) partes.push(textoDiasConDatos(semana.diasConDatos));
  return `Semana ${rangoDeFechas(semana.desde, semana.hasta)}: ${partes.join(', ')}`;
}

// ------------------------------------------------------------------------------------------
// Las vistas de quien acompaña o supervisa: cantidades, grupos y semanas
// ------------------------------------------------------------------------------------------

/** El orden en que se dicen las cantidades: el mismo del contrato (§1) y del aviso del sábado. */
export const COLORES_EN_ORDEN: readonly ColorSemaforo[] = ['VERDE', 'AMARILLO', 'ROJO', 'SIN_DATOS'];

/**
 * Una cantidad con la palabra de su color, concordada: `5 al día` · `1 requiere atención` ·
 * `2 requieren atención` · `1 con problemas` · `0 sin datos`. Son las palabras del contrato
 * (§1 y el aviso del sábado de §1.2) en minúscula, porque van dentro de una frase.
 */
export function cantidadEnPalabras(color: ColorSemaforo, cantidad: number): string {
  switch (color) {
    case 'VERDE':
      return `${cantidad} al día`;
    case 'AMARILLO':
      return `${cantidad} ${cantidad === 1 ? 'requiere' : 'requieren'} atención`;
    case 'ROJO':
      return `${cantidad} con problemas`;
    default:
      return `${cantidad} sin datos`;
  }
}

/** La cantidad de un color dentro de un resumen del servidor. */
export function cantidadDelColor(resumen: ResumenPorColor, color: ColorSemaforo): number {
  switch (color) {
    case 'VERDE':
      return resumen.verde;
    case 'AMARILLO':
      return resumen.amarillo;
    case 'ROJO':
      return resumen.rojo;
    default:
      return resumen.sinDatos;
  }
}

/** `1 aprendiz` · `8 aprendices`. */
export function aprendicesEnPalabras(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? 'aprendiz' : 'aprendices'}`;
}

/**
 * La línea entera, para leerla de corrido (y para quien no ve los puntos de color):
 * `8 aprendices: 5 al día, 2 requieren atención, 1 con problemas, 0 sin datos`.
 * Van las cuatro aunque alguna sea 0: que el orden no cambie de un grupo a otro ayuda a comparar.
 */
export function resumenEnPalabras(resumen: ResumenPorColor): string {
  const cantidades = COLORES_EN_ORDEN.map(color => cantidadEnPalabras(color, cantidadDelColor(resumen, color)));
  return `${aprendicesEnPalabras(resumen.total)}: ${cantidades.join(', ')}`;
}

/**
 * El promedio de un grupo (§4.4), con la palabra de su color si el servidor la mandó: la app no
 * aplica umbrales por su cuenta. Sin número, «sin datos»: nunca un 0 %.
 */
export function promedioEnPalabras(promedio: number | null, color?: ColorSemaforo | null, etiqueta?: string | null): string {
  if (promedio === null) return 'Promedio del grupo: sin datos';
  const palabra = color ? `${palabraDelSemaforo(color, etiqueta)}, ` : '';
  return `Promedio del grupo: ${palabra}${formatearPorcentaje(promedio)}`;
}

/**
 * Cómo se rotula lo que se está mirando.
 *
 * - La ventana vigente: `Últimos 7 días` + `Del jueves 18 al miércoles 24 de septiembre`.
 * - Una semana: `Semana cerrada` (o `Semana todavía sin cerrar`, si el servidor aún no la cerró) +
 *   `Del sábado 12 al viernes 18 de septiembre`. Mientras carga, `Semana` a secas: todavía no se
 *   sabe si está cerrada.
 *
 * El rango es la fecha de corte que pide el contrato (§5): siempre a la vista.
 */
export function rotuloDeVentana(
  modo: 'vigente' | 'semana',
  rango: { desde: string; hasta: string } | null,
  cerrada: boolean | null,
): { titulo: string; rango: string | null } {
  const titulo =
    modo === 'vigente'
      ? `Últimos ${DIAS_DE_LA_VENTANA} días`
      : cerrada === null
        ? 'Semana'
        : cerrada
          ? 'Semana cerrada'
          : 'Semana todavía sin cerrar';
  return { titulo, rango: rango ? primeraEnMayuscula(rangoDeFechas(rango.desde, rango.hasta)) : null };
}

/**
 * Lo que se oye al llegar a la fila de una persona:
 * `Ana Pérez. Requiere atención, 78.3 %. 6 de 7 días con datos.`
 */
export function dichoDelAprendiz(aprendiz: AprendizDelSemaforo): string {
  const nombre = aprendiz.nombre?.trim() || 'Aprendiz sin nombre';
  const palabra = palabraDelSemaforo(aprendiz.color, aprendiz.etiqueta);
  const cifra = aprendiz.porcentaje !== null ? `, ${formatearPorcentaje(aprendiz.porcentaje)}` : '';
  const dias = aprendiz.diasConDatos !== null ? ` ${textoDiasConDatos(aprendiz.diasConDatos)}.` : '';
  return `${nombre}. ${palabra}${cifra}.${dias}`;
}
