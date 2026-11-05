/**
 * Cuentas de geografía de la carrera con GPS (spec 042). Puras: sin React, sin sensores, sin red.
 *
 * La distancia oficial es la suma haversine entre los puntos aceptados (FR-030). El radio es el medio de la Tierra (WGS-84
 * redondeado), el mismo que usa el algoritmo de polyline de Google: a escala de una carrera el error es menor a 0,5 %.
 */

export interface Coordenada {
  lat: number;
  lng: number;
}

export const RADIO_TIERRA_M = 6_371_008.8;

const RAD = Math.PI / 180;

/** Distancia en metros entre dos coordenadas (haversine). */
export function distanciaM(a: Coordenada, b: Coordenada): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLng = (b.lng - a.lng) * RAD;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Rumbo de `a` hacia `b`, en grados de 0 a 360 (0 = norte, 90 = este). */
export function rumboEntre(a: Coordenada, b: Coordenada): number {
  const lat1 = a.lat * RAD;
  const lat2 = b.lat * RAD;
  const dLng = (b.lng - a.lng) * RAD;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

/** El punto que queda a `metros` de `origen` en la dirección `rumbo` (grados). */
export function puntoDestino(origen: Coordenada, rumbo: number, metros: number): Coordenada {
  const d = metros / RADIO_TIERRA_M;
  const th = rumbo * RAD;
  const lat1 = origen.lat * RAD;
  const lng1 = origen.lng * RAD;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(th));
  const lng2 = lng1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: lat2 / RAD, lng: ((lng2 / RAD + 540) % 360) - 180 };
}

/** Interpola entre dos coordenadas (fracción 0..1). A distancias de pocos metros la línea recta basta. */
export function interpolar(a: Coordenada, b: Coordenada, f: number): Coordenada {
  const t = Math.max(0, Math.min(1, f));
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

/** Longitud total de una lista de coordenadas. */
export function longitudM(puntos: readonly Coordenada[]): number {
  let total = 0;
  for (let i = 1; i < puntos.length; i++) total += distanciaM(puntos[i - 1], puntos[i]);
  return total;
}
