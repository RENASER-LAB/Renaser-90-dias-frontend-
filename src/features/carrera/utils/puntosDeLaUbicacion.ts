import type { PuntoGps } from '../types/carrera.types';

/** Una lectura de `expo-location`, reducida a lo que usan el motor y el mapa. */
export interface LecturaDeExpo {
  timestamp: number;
  coords: { latitude: number; longitude: number; accuracy: number | null; altitude?: number | null; speed?: number | null };
}

/** Lo que llega de `expo-location` (a la tarea del GPS o a una lectura suelta), reducido a lo que usa el motor. */
export function puntosDeLaUbicacion(locations: ReadonlyArray<LecturaDeExpo>): PuntoGps[] {
  return locations
    .filter(l => Number.isFinite(l.coords.latitude) && Number.isFinite(l.coords.longitude))
    .map(l => ({
      lat: l.coords.latitude,
      lng: l.coords.longitude,
      t: l.timestamp,
      precision: l.coords.accuracy ?? null,
      altitud: l.coords.altitude ?? null,
      velocidad: l.coords.speed ?? null,
    }));
}
