import { Platform } from 'react-native';

import { useSyncExternalStore } from 'react';

import type { PuntoGps } from '../types/carrera.types';
import type { Coordenada } from '../utils/geo';
import {
  ESPERA_DE_LA_LECTURA_FRESCA_MS,
  LECTURAS_PARA_PROMEDIAR,
  lecturaBuena,
  lecturaFresca,
  promedioDeLecturas,
  sumarLectura,
} from '../utils/lecturaDelMapa';
import { laCarreraCorreEn } from '../utils/plataformaDeLaCarrera';
import { puntosDeLaUbicacion } from '../utils/puntosDeLaUbicacion';
import { almacen } from './almacenamiento';

/**
 * Dónde mira el mapa de la carrera ANTES de que el motor acepte el primer punto (spec 042, 2026-11-05: el mapa tardaba de 5 a 30 s
 * en aparecer porque esperaba ese punto).
 *
 * **Es solo para mirar.** Nada de esto entra a la ruta, a la distancia, al tiempo ni al cuerpo de la carrera: el motor
 * (`carreraEnVivo`, `motorDeCarrera`) no lo lee nunca. Se llena, de peor a mejor:
 * 1. `ultima-conocida`: `getLastKnownPositionAsync` (instantánea, puede ser vieja);
 * 2. `aproximada`: `getCurrentPositionAsync` con precisión equilibrada, sin esperarla;
 * 3. `fresca` y `gps`: lecturas nuevas del GPS. `fresca` es la búsqueda de antes de arrancar (`buscarLecturaBuena`: hasta 10 s
 *    esperando una de 15 m o menos, spec 042 FR-053); `gps` es lo que entrega la tarea del GPS, aunque la carrera esté en la cuenta
 *    3, 2, 1 (el motor lo descarta por estar en pausa; el mapa lo usa para centrarse).
 * Una fuente peor nunca pisa a una mejor. Se olvida al empezar y al cerrar cada carrera.
 *
 * **Las lecturas frescas se promedian** (`utils/lecturaDelMapa`, FR-054): con la persona quieta, el centro es el promedio de las
 * últimas lecturas ponderado por 1 / precisión², y no la última, que bajo techo salta hasta 30 m. Junto al centro viaja su precisión
 * (`detalleDelCentro`), para el círculo del mapa (FR-055).
 *
 * **Antes de todas, `guardada`** (2026-11-06: en frío la primera lectura de la ubicación tarda más que los 600 ms que se le esperan, y
 * el mapa salía recién después del «1»): el último centro que mostró el mapa en este teléfono, guardado en el teléfono. Está al
 * instante, así el mapa se monta ya en la cuenta; cuando llega algo mejor, la cámara va hasta ahí. Y la última conocida se pide
 * **antes de tocar «Correr»** (`adelantarCentroDelMapa`, al verse la fila de «Kilómetros diarios», solo si el permiso ya está dado:
 * nunca lo pide), lo que además deja lista la conexión con el servicio de ubicación del teléfono.
 */

export type FuenteDelCentro = 'guardada' | 'ultima-conocida' | 'aproximada' | 'fresca' | 'gps';
/** Las fuentes que son una lectura nueva del GPS (con hora y precisión), y que por eso se promedian. */
export type FuenteDeUnaLectura = 'aproximada' | 'fresca' | 'gps';

const RANGO: Record<FuenteDelCentro, number> = { guardada: 0, 'ultima-conocida': 1, aproximada: 2, fresca: 3, gps: 3 };

/** Dónde se guarda el último centro mostrado (del teléfono, no de la cuenta: es dónde estuvo el teléfono). */
export const CLAVE_DEL_CENTRO_GUARDADO = 'renaser.carrera.ultimoCentroDelMapa';

export interface CentroDelMapa {
  pos: Coordenada;
  fuente: FuenteDelCentro;
}

/** Lo que acompaña al centro cuando sale de lecturas frescas: la precisión (para el círculo) y si ya es un promedio. */
export interface DetalleDelCentro {
  /** La mejor precisión de las lecturas (radio, en metros), o `null` si el centro no sale de una lectura fresca. */
  precisionM: number | null;
  promediado: boolean;
}

const SIN_DETALLE: DetalleDelCentro = { precisionM: null, promediado: false };

let actual: CentroDelMapa | null = null;
let detalle: DetalleDelCentro = SIN_DETALLE;
/** Las lecturas frescas que se promedian (`sumarLectura`); se vacían al olvidar el centro. */
let lecturas: PuntoGps[] = [];
/** Cómo parar la búsqueda de una lectura buena que sigue abierta. */
let cancelarBusqueda: (() => void) | null = null;
/** Lo adelantado antes de la carrera: el centro guardado y la última conocida leída al verse la fila. */
let guardado: Coordenada | null = null;
let adelantada: Coordenada | null = null;
/** Sube al olvidar: una lectura que llega tarde de una carrera anterior no se aplica. */
let vuelta = 0;
const oyentes = new Set<() => void>();

function avisar(): void {
  for (const o of oyentes) o();
}

/** Una coordenada que se puede mostrar: finita, en rango y que no sea el 0,0 que entregan algunos GPS sin señal (el mar). */
export function sePuedeMostrar(c: { lat: number; lng: number } | null | undefined): c is Coordenada {
  if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return false;
  if (Math.abs(c.lat) > 90 || Math.abs(c.lng) > 180) return false;
  return !(Math.abs(c.lat) < 1e-6 && Math.abs(c.lng) < 1e-6);
}

function fijarDetalle(nuevo: DetalleDelCentro): void {
  if (nuevo.precisionM !== detalle.precisionM || nuevo.promediado !== detalle.promediado) detalle = nuevo;
}

export function ponerCentroDelMapa(pos: Coordenada | null | undefined, fuente: FuenteDelCentro): void {
  if (!sePuedeMostrar(pos)) return;
  if (actual && RANGO[actual.fuente] > RANGO[fuente]) return;
  actual = { pos: { lat: pos.lat, lng: pos.lng }, fuente };
  fijarDetalle(SIN_DETALLE);
  if (fuente !== 'guardada') guardarCentro(actual.pos);
  avisar();
}

/**
 * Una lectura fresca del GPS (spec 042 FR-053 y FR-054): entra al promedio de las últimas lecturas y el centro pasa a ser ese
 * promedio, con la mejor de sus precisiones. Si la persona se movió, el promedio arranca de nuevo con esta lectura sola.
 */
export function ponerLecturaDelMapa(lectura: PuntoGps, fuente: FuenteDeUnaLectura): void {
  if (!sePuedeMostrar(lectura)) return;
  if (actual && RANGO[actual.fuente] > RANGO[fuente]) return;
  lecturas = sumarLectura(lecturas, { ...lectura, t: Number.isFinite(lectura.t) ? lectura.t : Date.now() });
  const promedio = promedioDeLecturas(lecturas);
  if (!promedio) return;
  actual = { pos: promedio.pos, fuente };
  fijarDetalle({ precisionM: promedio.precisionM, promediado: lecturas.length >= LECTURAS_PARA_PROMEDIAR });
  guardarCentro(actual.pos);
  avisar();
}

function guardarCentro(pos: Coordenada): void {
  guardado = pos;
  try {
    void almacen()
      .setItem(CLAVE_DEL_CENTRO_GUARDADO, JSON.stringify({ lat: pos.lat, lng: pos.lng }))
      .catch(() => undefined);
  } catch {
    // Sin almacenamiento: la próxima carrera espera a la ubicación, como antes.
  }
}

async function leerCentroGuardado(): Promise<Coordenada | null> {
  if (guardado) return guardado;
  try {
    const crudo = await almacen().getItem(CLAVE_DEL_CENTRO_GUARDADO);
    const c = crudo ? (JSON.parse(crudo) as { lat?: unknown; lng?: unknown }) : null;
    const pos = c && typeof c.lat === 'number' && typeof c.lng === 'number' ? { lat: c.lat, lng: c.lng } : null;
    if (sePuedeMostrar(pos)) guardado = pos;
  } catch {
    // Roto o sin almacenamiento: como si no hubiera.
  }
  return guardado;
}

export function centroDelMapa(): CentroDelMapa | null {
  return actual;
}

/** La precisión del centro y si es un promedio (solo cuando sale de lecturas frescas). */
export function detalleDelCentro(): DetalleDelCentro {
  return detalle;
}

export function olvidarCentroDelMapa(): void {
  vuelta += 1;
  cancelarBusqueda?.();
  lecturas = [];
  fijarDetalle(SIN_DETALLE);
  if (!actual) return;
  actual = null;
  avisar();
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function useCentroDelMapa(): Coordenada | null {
  return useSyncExternalStore(suscribir, () => actual, () => actual)?.pos ?? null;
}

export function useDetalleDelCentro(): DetalleDelCentro {
  return useSyncExternalStore(suscribir, detalleDelCentro, detalleDelCentro);
}

type ModuloUbicacion = typeof import('expo-location');

/** Solo para las pruebas: el módulo de ubicación que se usa en vez de `require('expo-location')` (ver `usarUbicacionParaPruebas`). */
let ubicacionParaPruebas: ModuloUbicacion | null = null;

/**
 * Solo para las pruebas: da el módulo de ubicación sin pasar por `require('expo-location')`. Jest recuerda, por archivo y por proceso,
 * cómo resolvió ese `require`: si una prueba anterior lo corrió con el módulo de verdad, otra que lo simula con `jest.mock` en el mismo
 * proceso recibe igual el de verdad (visto en `centroDelMapaNoSeMide`, `carreraEnIos` y `gpsTrasMorirElProceso`, que fallan a ratos).
 * `null` lo quita.
 */
export function usarUbicacionParaPruebas(modulo: ModuloUbicacion | null): void {
  ubicacionParaPruebas = modulo;
}

function cargarUbicacion(): ModuloUbicacion | null {
  if (ubicacionParaPruebas) return ubicacionParaPruebas;
  if (!laCarreraCorreEn(Platform.OS)) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-location') as ModuloUbicacion;
  } catch {
    return null;
  }
}

/** Lo más que se espera a la última posición conocida antes de seguir con la cuenta (suele tardar decenas de ms). */
export const ESPERA_DE_LA_ULTIMA_CONOCIDA_MS = 600;

/**
 * La búsqueda de una lectura buena de antes de arrancar (spec 042 FR-053, #236: la última conocida puede ser vieja o de otra casa).
 * Pide lecturas nuevas al GPS y las muestra a medida que llegan (el mapa ya está en la cuenta 3, 2, 1: no se frena nada). Se detiene
 * en la primera de `PRECISION_BUENA_M` o menos, o a los `ESPERA_DE_LA_LECTURA_FRESCA_MS`; con las que llegaron, el centro queda en
 * su promedio ponderado, que pesa más a la mejor. Las lecturas viejas que algunos teléfonos entregan primero no cuentan. Nunca lanza.
 */
function buscarLecturaBuena(L: ModuloUbicacion, mia: number): void {
  let cerrada = false;
  let suscripcion: { remove: () => void } | null = null;
  const cerrar = (): void => {
    if (cerrada) return;
    cerrada = true;
    clearTimeout(tope);
    if (cancelarBusqueda === cerrar) cancelarBusqueda = null;
    try {
      suscripcion?.remove();
    } catch {
      // Ya estaba cerrada.
    }
  };
  const tope = setTimeout(cerrar, ESPERA_DE_LA_LECTURA_FRESCA_MS);
  cancelarBusqueda = cerrar;
  try {
    // `mayShowUserSettingsDialog: false`: el mismo motivo que la aproximada de `prepararCentroDelMapa`.
    void L.watchPositionAsync(
      { accuracy: L.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0, mayShowUserSettingsDialog: false },
      ubicacion => {
        if (cerrada) return;
        if (mia !== vuelta) return cerrar();
        const [lectura] = puntosDeLaUbicacion([ubicacion]);
        if (!lectura || !lecturaFresca(lectura, Date.now())) return;
        ponerLecturaDelMapa(lectura, 'fresca');
        if (lecturaBuena(lectura)) cerrar();
      },
    )
      .then(sub => {
        suscripcion = sub;
        // Se cerró mientras la suscripción se abría: se cierra ahora.
        if (cerrada) sub.remove();
      })
      .catch(cerrar);
  } catch {
    cerrar();
  }
}

/**
 * Prepara el centro del mapa al tocar «Correr» (con el permiso ya dado): lo adelantado o guardado al instante, la última conocida
 * (esperada como mucho `ESPERA_DE_LA_ULTIMA_CONOCIDA_MS`, y solo si no había nada que mostrar), la aproximada en segundo plano
 * (no se espera) y la búsqueda de una lectura buena (`buscarLecturaBuena`, tampoco se espera). Nunca lanza.
 */
export async function prepararCentroDelMapa(): Promise<void> {
  olvidarCentroDelMapa();
  const mia = vuelta;
  const L = cargarUbicacion();
  if (!L) return;
  // Lo que ya se sabe va primero y sin esperar: la última conocida adelantada o, si no, el centro guardado.
  if (adelantada) ponerCentroDelMapa(adelantada, 'ultima-conocida');
  else {
    const g = guardado ?? (await leerCentroGuardado());
    if (mia === vuelta) ponerCentroDelMapa(g, 'guardada');
  }
  buscarLecturaBuena(L, mia);
  // `mayShowUserSettingsDialog: false`: sin esto, con «Precisión de la ubicación» de Google apagada, Android muestra su diálogo
  // encima de la cuenta y la frena (visto en el E2E del 05/11). Sin red de ubicación, la lectura simplemente no llega.
  void L.getCurrentPositionAsync({ accuracy: L.Accuracy.Balanced, mayShowUserSettingsDialog: false })
    .then(p => {
      if (mia !== vuelta) return;
      const [lectura] = puntosDeLaUbicacion([p]);
      if (lectura) ponerLecturaDelMapa(lectura, 'aproximada');
    })
    .catch(() => undefined);
  const ultimaConocida = (async () => {
    try {
      const ultima = await Promise.race([
        L.getLastKnownPositionAsync(),
        new Promise<null>(resolver => setTimeout(() => resolver(null), ESPERA_DE_LA_ULTIMA_CONOCIDA_MS)),
      ]);
      if (ultima && mia === vuelta) ponerCentroDelMapa({ lat: ultima.coords.latitude, lng: ultima.coords.longitude }, 'ultima-conocida');
    } catch {
      // Sin última conocida: el mapa espera a la aproximada o al GPS.
    }
  })();
  // Con algo ya a la vista, la cuenta no espera a la última conocida: llega sola y la cámara va hasta ella.
  if (!actual) await ultimaConocida;
}

/**
 * Al verse la fila que ofrece correr: lee el centro guardado y, si el permiso de ubicación YA está dado (no se pide), la última
 * conocida. No toca el centro de una carrera. Nunca lanza.
 */
export async function adelantarCentroDelMapa(): Promise<void> {
  const L = cargarUbicacion();
  if (!L) return;
  await leerCentroGuardado();
  try {
    if (!(await L.getForegroundPermissionsAsync()).granted) return;
    const ultima = await L.getLastKnownPositionAsync();
    const pos = ultima ? { lat: ultima.coords.latitude, lng: ultima.coords.longitude } : null;
    if (sePuedeMostrar(pos)) {
      adelantada = pos;
      guardarCentro(pos);
    }
  } catch {
    // Sin ubicación todavía: se lee al tocar «Correr», como antes.
  }
}

/**
 * Al cerrar sesión (decisión de privacidad del 2026-11-06): se borra el último centro mostrado y lo adelantado, para que en un
 * teléfono compartido la cuenta que entra después no vea la zona donde corrió la anterior. Nunca lanza.
 */
export async function borrarCentroGuardadoDelMapa(): Promise<void> {
  guardado = null;
  adelantada = null;
  olvidarCentroDelMapa();
  try {
    await almacen().removeItem(CLAVE_DEL_CENTRO_GUARDADO);
  } catch {
    // Sin almacenamiento no había nada guardado.
  }
}

export function olvidarLoAdelantadoParaPruebas(): void {
  guardado = null;
  adelantada = null;
}
