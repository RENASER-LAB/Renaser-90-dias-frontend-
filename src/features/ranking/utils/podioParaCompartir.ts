import type { EntradaRankingDto } from '../api/rankingApi';
import { textoDelPuntaje, type ClaveDeTabla } from './tablasDeRanking';

/**
 * Lo que dice la imagen del podio que se descarga o se comparte desde Comunidad → Ranking (spec 006 del
 * backend, pedido del dueño: «que haya opción para descargar en los podios»). Todo puro: la pantalla y la
 * tarjeta que se dibuja fuera de pantalla no calculan nada, solo pintan esto.
 *
 * **Las mismas filas que la tabla en pantalla** (FR-013): se toman en el orden en que llegan —el mismo que
 * usa el podio de la app— y no se reordenan ni se filtran; quien llama pasa `entradasDeLaTabla` de la pestaña
 * que se está mirando. Los tres primeros van al podio y del cuarto al décimo a la lista; menos personas,
 * menos filas, y un lugar del podio sin nadie queda en `null` (la tarjeta lo dibuja libre, como la app).
 *
 * **Nombre completo, recortado solo si no cabe.** La imagen se comparte afuera de la app: se usa el nombre
 * que manda el servidor, nunca el «TÚ (…)» de la pantalla. Un nombre más largo que su lugar se corta con «…»
 * (`recortarNombre`) en una palabra entera cuando se puede; la tarjeta además lo limita en alto, de modo que
 * nunca se sale de su caja.
 */

/** Cuántos puestos entran en la imagen: el podio y del 4.º al 10.º. */
export const PUESTOS_EN_LA_IMAGEN = 10;

/**
 * Cuántos caracteres caben, como máximo, en un lugar del podio (la columna del medio, a dos renglones) y en
 * una fila de la lista (a uno). Los números salen de `TarjetaDelPodioParaCompartir`: ahí se miden con la
 * letra más ancha del nombre real y se dejan con margen.
 */
export const MAX_CARACTERES_PODIO = 26;
export const MAX_CARACTERES_FILA = 26;

export interface PuestoParaCompartir {
  /** Tal cual lo manda el servidor: en la lista es el «#N» de la fila. */
  posicion: number;
  /** Nombre completo, ya recortado si era largo. */
  nombre: string;
  /** La cifra con su unidad: «91,5 pts», «12,5 km», «3 días». */
  puntaje: string;
}

export interface PodioParaCompartir {
  tabla: ClaveDeTabla;
  /** «Ranking general», «Ranking de kilómetros»… */
  titulo: string;
  /** Qué mide la tabla, en una línea, sin hablar «de ti»: la imagen la ve gente que no está en la app. */
  detalle: string;
  /** «19 de octubre de 2026». */
  fecha: string;
  /** `AAAA-MM-DD`, para el nombre del archivo. */
  fechaDeArchivo: string;
  /** Oro, plata y bronce, en ese orden. `null` = lugar libre. */
  podio: readonly [PuestoParaCompartir | null, PuestoParaCompartir | null, PuestoParaCompartir | null];
  /** Del 4.º al 10.º, los que haya. */
  lista: readonly PuestoParaCompartir[];
  /** Cuántos puestos entraron en total (para quien quiera avisar «solo hay N»). */
  total: number;
  /** El nombre del archivo que se descarga, sin carpeta. */
  nombreDelArchivo: string;
  /**
   * Spec 024: el nombre de la formación del podio («Diplomado Renaser»), que la imagen escribe en su cabecera. `null` si no se sabe
   * (un backend anterior a las formaciones): la imagen conserva su cabecera de siempre.
   */
  formacion: string | null;
}

const TITULOS: Record<ClaveDeTabla, { titulo: string; detalle: string }> = {
  general: { titulo: 'Ranking general', detalle: 'Hábitos, acciones y lecciones, todo junto' },
  coherencia: { titulo: 'Ranking de coherencia', detalle: 'Acciones diarias cumplidas de la semana' },
  kilometros: { titulo: 'Ranking de kilómetros', detalle: 'Kilómetros recorridos desde el Día 1' },
  gimnasio: { titulo: 'Ranking de gimnasio', detalle: 'Días de gimnasio desde el Día 1' },
};

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

const NOMBRE_SIN_DATO = 'Participante';

/**
 * Recorta un nombre a `max` caracteres con «…» (que cuenta dentro del máximo). Cortes:
 * - Un nombre que cabe queda igual (con los espacios de más ya limpios).
 * - Si se puede, se corta en el último espacio, para no dejar media palabra («María Fernanda Quispe…»,
 *   no «María Fernanda Quispe Hua…»); si la primera palabra ya es más larga que el máximo, se corta dura.
 * - Se cuenta por caracteres reales (no por unidades UTF-16): un emoji en el nombre no se parte por la
 *   mitad.
 */
export function recortarNombre(nombre: string | null | undefined, max: number): string {
  const limpio = (nombre ?? '').replace(/\s+/g, ' ').trim();
  if (!limpio) return NOMBRE_SIN_DATO;
  const letras = Array.from(limpio);
  if (letras.length <= max) return limpio;
  const corte = letras.slice(0, Math.max(1, max - 1));
  const hayCorteEnPalabra = letras[corte.length] !== ' ';
  const ultimoEspacio = corte.lastIndexOf(' ');
  const hastaAhi = hayCorteEnPalabra && ultimoEspacio > 0 ? corte.slice(0, ultimoEspacio) : corte;
  return `${hastaAhi.join('').trimEnd()}…`;
}

/** `AAAA-MM-DD` (o un ISO con hora) → partes. `null` si no es una fecha real. */
function partesDeLaFecha(iso: string | null | undefined): { anio: number; mes: number; dia: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const real = new Date(Date.UTC(anio, mes - 1, dia));
  const coincide = real.getUTCFullYear() === anio && real.getUTCMonth() === mes - 1 && real.getUTCDate() === dia;
  return coincide ? { anio, mes, dia } : null;
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/**
 * La fecha de la imagen, en español de Perú. Es la del corte del ranking (`RankingAgregadoDto.fecha`,
 * `AAAA-MM-DD`: se lee tal cual, sin pasarla por `Date` para que la zona del teléfono no la mueva un día);
 * si el servidor no la manda o no es una fecha, la de hoy en el teléfono.
 */
export function fechaDeLaImagen(
  fechaDelCorte: string | null | undefined,
  hoy: Date = new Date(),
): { texto: string; archivo: string } {
  const partes =
    partesDeLaFecha(fechaDelCorte) ?? { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1, dia: hoy.getDate() };
  return {
    texto: `${partes.dia} de ${MESES[partes.mes - 1]} de ${partes.anio}`,
    archivo: `${partes.anio}-${dosDigitos(partes.mes)}-${dosDigitos(partes.dia)}`,
  };
}

function puesto(entrada: EntradaRankingDto, tabla: ClaveDeTabla, maxCaracteres: number): PuestoParaCompartir {
  return {
    posicion: entrada.posicion,
    nombre: recortarNombre(entrada.fullName, maxCaracteres),
    puntaje: textoDelPuntaje(tabla, entrada.puntaje),
  };
}

/** «Diplomado Renaser» → `diplomado-renaser`: para el nombre del archivo. Sin tildes ni símbolos. */
function paraElArchivo(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Arma lo que dice la imagen a partir de las filas de la tabla que se está mirando. `formacion` (spec 024) es el nombre de la
 * formación de esas filas: va en la cabecera de la imagen y en el nombre del archivo.
 */
export function podioParaCompartir(
  entradas: readonly EntradaRankingDto[],
  tabla: ClaveDeTabla,
  fechaDelCorte?: string | null,
  hoy: Date = new Date(),
  formacion?: string | null,
): PodioParaCompartir {
  const primeras = entradas.slice(0, PUESTOS_EN_LA_IMAGEN);
  const [primero, segundo, tercero] = primeras;
  const fecha = fechaDeLaImagen(fechaDelCorte, hoy);
  const nombreDeLaFormacion = formacion?.trim() || null;
  const deLaFormacion = nombreDeLaFormacion ? paraElArchivo(nombreDeLaFormacion) : '';
  return {
    tabla,
    ...TITULOS[tabla],
    fecha: fecha.texto,
    fechaDeArchivo: fecha.archivo,
    podio: [
      primero ? puesto(primero, tabla, MAX_CARACTERES_PODIO) : null,
      segundo ? puesto(segundo, tabla, MAX_CARACTERES_PODIO) : null,
      tercero ? puesto(tercero, tabla, MAX_CARACTERES_PODIO) : null,
    ],
    lista: primeras.slice(3).map(entrada => puesto(entrada, tabla, MAX_CARACTERES_FILA)),
    total: primeras.length,
    nombreDelArchivo: `podio-${tabla}-${deLaFormacion ? `${deLaFormacion}-` : ''}${fecha.archivo}.png`,
    formacion: nombreDeLaFormacion,
  };
}
