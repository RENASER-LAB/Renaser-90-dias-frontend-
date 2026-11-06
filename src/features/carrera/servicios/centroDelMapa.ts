import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';

import type { Coordenada } from '../utils/geo';
import { almacen } from './almacenamiento';

/**
 * Dónde mira el mapa de la carrera ANTES de que el motor acepte el primer punto (spec 042, 2026-11-05: el mapa tardaba de 5 a 30 s
 * en aparecer porque esperaba ese punto).
 *
 * **Es solo para mirar.** Nada de esto entra a la ruta, a la distancia, al tiempo ni al cuerpo de la carrera: el motor
 * (`carreraEnVivo`, `motorDeCarrera`) no lo lee nunca. Se llena, de peor a mejor:
 * 1. `ultima-conocida`: `getLastKnownPositionAsync` (instantánea, puede ser vieja);
 * 2. `aproximada`: `getCurrentPositionAsync` con precisión equilibrada, sin esperarla;
 * 3. `gps`: el primer punto crudo que entrega la tarea del GPS, aunque la carrera esté en la cuenta 3, 2, 1 (el motor lo descarta
 *    por estar en pausa; el mapa lo usa para centrarse).
 * Una fuente peor nunca pisa a una mejor. Se olvida al empezar y al cerrar cada carrera.
 *
 * **Antes de todas, `guardada`** (2026-11-06: en frío la primera lectura de la ubicación tarda más que los 600 ms que se le esperan, y
 * el mapa salía recién después del «1»): el último centro que mostró el mapa en este teléfono, guardado en el teléfono. Está al
 * instante, así el mapa se monta ya en la cuenta; cuando llega algo mejor, la cámara va hasta ahí. Y la última conocida se pide
 * **antes de tocar «Correr»** (`adelantarCentroDelMapa`, al verse la fila de «Kilómetros diarios», solo si el permiso ya está dado:
 * nunca lo pide), lo que además deja lista la conexión con el servicio de ubicación del teléfono.
 */

export type FuenteDelCentro = 'guardada' | 'ultima-conocida' | 'aproximada' | 'gps';

const RANGO: Record<FuenteDelCentro, number> = { guardada: 0, 'ultima-conocida': 1, aproximada: 2, gps: 3 };

/** Dónde se guarda el último centro mostrado (del teléfono, no de la cuenta: es dónde estuvo el teléfono). */
export const CLAVE_DEL_CENTRO_GUARDADO = 'renaser.carrera.ultimoCentroDelMapa';

export interface CentroDelMapa {
  pos: Coordenada;
  fuente: FuenteDelCentro;
}

let actual: CentroDelMapa | null = null;
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

export function ponerCentroDelMapa(pos: Coordenada | null | undefined, fuente: FuenteDelCentro): void {
  if (!sePuedeMostrar(pos)) return;
  if (actual && RANGO[actual.fuente] > RANGO[fuente]) return;
  actual = { pos: { lat: pos.lat, lng: pos.lng }, fuente };
  if (fuente !== 'guardada') guardarCentro(actual.pos);
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

export function olvidarCentroDelMapa(): void {
  vuelta += 1;
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

type ModuloUbicacion = typeof import('expo-location');

function cargarUbicacion(): ModuloUbicacion | null {
  if (Platform.OS !== 'android') return null;
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
 * Prepara el centro del mapa al tocar «Correr» (con el permiso ya dado): lo adelantado o guardado al instante, la última conocida
 * (esperada como mucho `ESPERA_DE_LA_ULTIMA_CONOCIDA_MS`, y solo si no había nada que mostrar) y la aproximada en segundo plano
 * (no se espera). Nunca lanza.
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
  // `mayShowUserSettingsDialog: false`: sin esto, con «Precisión de la ubicación» de Google apagada, Android muestra su diálogo
  // encima de la cuenta y la frena (visto en el E2E del 05/11). Sin red de ubicación, la lectura simplemente no llega.
  void L.getCurrentPositionAsync({ accuracy: L.Accuracy.Balanced, mayShowUserSettingsDialog: false })
    .then(p => {
      if (mia === vuelta) ponerCentroDelMapa({ lat: p.coords.latitude, lng: p.coords.longitude }, 'aproximada');
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

export function olvidarLoAdelantadoParaPruebas(): void {
  guardado = null;
  adelantada = null;
}
