import type { PuntoGps } from '../types/carrera.types';
import { distanciaM, type Coordenada } from './geo';
import { VELOCIDAD_CAMINANDO_MS } from './motorDeCarrera';

/**
 * Dónde se DIBUJA a la persona cuando el GPS es malo (spec 042 FR-053 a FR-055, #236: «estoy en mi casa y me pone al frente o en otra
 * casa»). Bajo techo el GPS tiene de 10 a 30 m de error y salta de casa en casa. Puras: sin React, sin sensores.
 *
 * **Es solo para mirar.** Nada de esto entra a la ruta, a la distancia, al tiempo ni al cuerpo de la carrera: el motor
 * (`motorDeCarrera`, con sus 20 m de `PRECISION_MAXIMA_M`) no lo lee nunca.
 *
 * - **Lectura buena** (FR-053): antes de arrancar se busca una lectura fresca de hasta `PRECISION_BUENA_M`, y se espera hasta
 *   `ESPERA_DE_LA_LECTURA_FRESCA_MS`. Una lectura que el teléfono entrega vieja (iPhone da la última guardada al empezar) no cuenta.
 * - **Promedio quieto** (FR-054): con la persona quieta, el punto es el promedio de las últimas lecturas, ponderado por
 *   1 / precisión² (el mismo peso del motor). Al moverse, el promedio se reinicia y el punto sigue a la lectura real.
 * - **Círculo de precisión** (FR-055): su radio es la mejor precisión de esas lecturas. No es la del promedio (√(1 / Σ 1/p²)):
 *   bajo techo los errores del GPS se repiten de una lectura a otra, y prometer más de lo que hay sería mentir.
 */

/** Hasta qué precisión (radio, en metros) una lectura ya es «buena» y se deja de buscar. */
export const PRECISION_BUENA_M = 15;
/** Lo más que se busca una lectura buena antes de quedarse con las que llegaron. */
export const ESPERA_DE_LA_LECTURA_FRESCA_MS = 10_000;
/** Una lectura más vieja que esto, al llegar, no es fresca: es la última guardada que algunos teléfonos entregan primero. */
export const EDAD_MAXIMA_DE_LA_LECTURA_MS = 5_000;
/** Cuánto se aleja una lectura del promedio (más su propio error) para decir que la persona se movió. */
export const RADIO_DEL_PROMEDIO_M = 25;
/** Qué tan atrás llegan las lecturas que entran al promedio. */
export const VENTANA_DEL_PROMEDIO_MS = 15_000;
/** Desde cuántas lecturas juntas el punto ya es un promedio y no una sola lectura. */
export const LECTURAS_PARA_PROMEDIAR = 3;
/** Sin precisión (o 0), la lectura pesa como una de 100 m: casi nada, pero sirve si es la única. */
export const PRECISION_DESCONOCIDA_M = 100;
/** El círculo no se dibuja con más radio que esto: con 500 m taparía el mapa entero. La precisión dicha sí es la real. */
export const RADIO_MAXIMO_DEL_CIRCULO_M = 150;
const MAXIMO_DE_LECTURAS = 30;

/** Una lectura del GPS tal como la entrega el teléfono: el mismo tipo que usa el motor. */
export type LecturaDelGps = PuntoGps;

export interface PromedioDeLecturas {
  pos: Coordenada;
  /** La mejor precisión entre las lecturas (radio, en metros), o `null` si ninguna la trajo. */
  precisionM: number | null;
}

function precisionConocida(l: LecturaDelGps): number | null {
  const p = l.precision;
  return p != null && Number.isFinite(p) && p > 0 ? p : null;
}

/** ¿La lectura llegó fresca? Sin hora no se sabe, y se acepta. */
export function lecturaFresca(l: LecturaDelGps, ahora: number): boolean {
  return !Number.isFinite(l.t) || ahora - l.t <= EDAD_MAXIMA_DE_LA_LECTURA_MS;
}

/** ¿Ya es una lectura buena (precisión conocida y de `PRECISION_BUENA_M` o menos)? */
export function lecturaBuena(l: LecturaDelGps): boolean {
  const p = precisionConocida(l);
  return p != null && p <= PRECISION_BUENA_M;
}

/** El promedio ponderado por 1 / precisión² de las lecturas, o `null` sin lecturas. */
export function promedioDeLecturas(lecturas: readonly LecturaDelGps[]): PromedioDeLecturas | null {
  if (lecturas.length === 0) return null;
  let sw = 0;
  let lat = 0;
  let lng = 0;
  let mejor: number | null = null;
  for (const l of lecturas) {
    const p = precisionConocida(l);
    const w = 1 / Math.max(1, p ?? PRECISION_DESCONOCIDA_M) ** 2;
    sw += w;
    lat += l.lat * w;
    lng += l.lng * w;
    if (p != null && (mejor == null || p < mejor)) mejor = p;
  }
  return { pos: { lat: lat / sw, lng: lng / sw }, precisionM: mejor };
}

function iba(l: LecturaDelGps | undefined): boolean {
  return l?.velocidad != null && l.velocidad >= VELOCIDAD_CAMINANDO_MS;
}

/**
 * ¿La persona se movió? Sí si el GPS mide velocidad de caminata en dos lecturas seguidas (una suelta puede ser ruido), o si la lectura
 * cae más lejos del promedio que `RADIO_DEL_PROMEDIO_M` más su propio error: una lectura de 25 m de precisión a 40 m del promedio
 * cabe dentro de su error y no mueve nada, pero una de 5 m a 40 m sí.
 */
function seMovio(previas: readonly LecturaDelGps[], promedio: Coordenada, nueva: LecturaDelGps): boolean {
  if (iba(nueva)) {
    const anterior = [...previas].reverse().find(l => l.velocidad != null && l.velocidad >= 0);
    if (!anterior || iba(anterior)) return true;
  }
  return distanciaM(promedio, nueva) > RADIO_DEL_PROMEDIO_M + (precisionConocida(nueva) ?? PRECISION_DESCONOCIDA_M);
}

/**
 * Suma una lectura a las del promedio: las de los últimos `VENTANA_DEL_PROMEDIO_MS` y ella. Si la persona se movió, el promedio se
 * reinicia con ella sola (el punto sigue a la lectura real).
 */
export function sumarLectura(previas: readonly LecturaDelGps[], nueva: LecturaDelGps): LecturaDelGps[] {
  const vigentes = previas.filter(l => nueva.t - l.t <= VENTANA_DEL_PROMEDIO_MS);
  const promedio = promedioDeLecturas(vigentes);
  if (!promedio || seMovio(vigentes, promedio.pos, nueva)) return [nueva];
  return [...vigentes, nueva].slice(-MAXIMO_DE_LECTURAS);
}

export interface EntradaDelPunto {
  /** El punto del motor (ruta y pasos), o `null` mientras no haya ninguno. */
  posicion: Coordenada | null;
  /** El centro de vista: el promedio de las lecturas, o el centro guardado / la última conocida mientras no hay lecturas. */
  centroDeVista: Coordenada | null;
  /** La precisión de esas lecturas, o `null` si el centro de vista no sale de una lectura fresca. */
  precisionM: number | null;
  /** Si el centro de vista ya promedia `LECTURAS_PARA_PROMEDIAR` lecturas o más. */
  promediado: boolean;
  /** Si el motor dice que la persona está quieta (sin pasos recientes y sin avance del GPS). */
  quieta: boolean;
}

/**
 * El punto donde se dibuja a la persona y su círculo de precisión. Sin punto del motor, el centro de vista. Con él, el punto del
 * motor, salvo que la persona esté quieta y las lecturas ya se promedien: entonces el promedio, que es más estable que el primer
 * punto suelto que aceptó el motor (hasta 20 m de error). Al moverse (con pasos o con avance del GPS), el punto real.
 */
export function puntoDelMapa(e: EntradaDelPunto): { centro: Coordenada | null; precisionM: number | null } {
  const usaElPromedio = e.centroDeVista != null && (e.posicion == null || (e.quieta && e.promediado));
  return { centro: usaElPromedio ? e.centroDeVista : e.posicion, precisionM: e.precisionM };
}

/** El radio con que se dibuja el círculo: la precisión, con un tope para que no tape el mapa. */
export function radioDelCirculoM(precisionM: number): number {
  return Math.min(Math.max(1, precisionM), RADIO_MAXIMO_DEL_CIRCULO_M);
}
