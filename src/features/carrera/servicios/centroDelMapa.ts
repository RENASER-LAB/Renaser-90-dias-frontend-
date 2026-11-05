import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';

import type { Coordenada } from '../utils/geo';

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
 */

export type FuenteDelCentro = 'ultima-conocida' | 'aproximada' | 'gps';

const RANGO: Record<FuenteDelCentro, number> = { 'ultima-conocida': 1, aproximada: 2, gps: 3 };

export interface CentroDelMapa {
  pos: Coordenada;
  fuente: FuenteDelCentro;
}

let actual: CentroDelMapa | null = null;
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
  avisar();
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
 * Prepara el centro del mapa al tocar «Correr» (con el permiso ya dado): la última conocida, esperada como mucho
 * `ESPERA_DE_LA_ULTIMA_CONOCIDA_MS`, y la aproximada en segundo plano (no se espera). Nunca lanza.
 */
export async function prepararCentroDelMapa(): Promise<void> {
  olvidarCentroDelMapa();
  const mia = vuelta;
  const L = cargarUbicacion();
  if (!L) return;
  void L.getCurrentPositionAsync({ accuracy: L.Accuracy.Balanced })
    .then(p => {
      if (mia === vuelta) ponerCentroDelMapa({ lat: p.coords.latitude, lng: p.coords.longitude }, 'aproximada');
    })
    .catch(() => undefined);
  try {
    const ultima = await Promise.race([
      L.getLastKnownPositionAsync(),
      new Promise<null>(resolver => setTimeout(() => resolver(null), ESPERA_DE_LA_ULTIMA_CONOCIDA_MS)),
    ]);
    if (ultima && mia === vuelta) ponerCentroDelMapa({ lat: ultima.coords.latitude, lng: ultima.coords.longitude }, 'ultima-conocida');
  } catch {
    // Sin última conocida: el mapa espera a la aproximada o al GPS.
  }
}
