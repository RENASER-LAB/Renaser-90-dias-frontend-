import { distanciaM, interpolar, type Coordenada } from './geo';

/**
 * La ruta que viaja UNA sola vez, dentro del pedido final (FR-040 y FR-043): recortada en los primeros y últimos 200 m (zona de
 * privacidad), simplificada con Douglas-Peucker a 5 m y codificada con el algoritmo de polyline de Google (precisión 1e-5).
 * Puras.
 */

export const ZONA_DE_PRIVACIDAD_M = 200;
export const TOLERANCIA_M = 5;
export const MAXIMO_DE_PUNTOS = 3000;
export const MAXIMO_DE_BYTES = 100 * 1024;

/** Quita los primeros y los últimos `metros` de la ruta (cortando en el punto exacto). Si la ruta no los tiene, queda vacía. */
export function recortarPrivacidad(puntos: readonly Coordenada[], metros = ZONA_DE_PRIVACIDAD_M): Coordenada[] {
  if (puntos.length < 2) return [];
  const desdeInicio = cortarDesde(puntos, metros);
  if (desdeInicio.length < 2) return [];
  const alReves = cortarDesde([...desdeInicio].reverse(), metros);
  return alReves.reverse();
}

function cortarDesde(puntos: readonly Coordenada[], metros: number): Coordenada[] {
  let acumulado = 0;
  for (let i = 1; i < puntos.length; i++) {
    const tramo = distanciaM(puntos[i - 1], puntos[i]);
    if (acumulado + tramo >= metros) {
      const f = tramo > 0 ? (metros - acumulado) / tramo : 0;
      return [interpolar(puntos[i - 1], puntos[i], f), ...puntos.slice(i)];
    }
    acumulado += tramo;
  }
  return [];
}

/** Distancia (m) de `p` al segmento `a`–`b`, en una proyección plana local (exacta de sobra a escala de metros). */
function distanciaAlSegmento(p: Coordenada, a: Coordenada, b: Coordenada): number {
  const kx = 111_320 * Math.cos((a.lat * Math.PI) / 180);
  const ky = 110_540;
  const ax = 0;
  const ay = 0;
  const bx = (b.lng - a.lng) * kx;
  const by = (b.lat - a.lat) * ky;
  const px = (p.lng - a.lng) * kx;
  const py = (p.lat - a.lat) * ky;
  const l2 = bx * bx + by * by;
  if (l2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / l2));
  return Math.hypot(px - t * bx, py - t * by);
}

/** Douglas-Peucker iterativo (sin recursión: una ruta de 1 h tiene miles de puntos). */
export function simplificar(puntos: readonly Coordenada[], toleranciaM = TOLERANCIA_M): Coordenada[] {
  if (puntos.length <= 2) return [...puntos];
  const conservar = new Uint8Array(puntos.length);
  conservar[0] = 1;
  conservar[puntos.length - 1] = 1;
  const pila: Array<[number, number]> = [[0, puntos.length - 1]];
  while (pila.length > 0) {
    const [i, j] = pila.pop()!;
    let maxD = -1;
    let maxK = -1;
    for (let k = i + 1; k < j; k++) {
      const d = distanciaAlSegmento(puntos[k], puntos[i], puntos[j]);
      if (d > maxD) {
        maxD = d;
        maxK = k;
      }
    }
    if (maxK >= 0 && maxD > toleranciaM) {
      conservar[maxK] = 1;
      pila.push([i, maxK], [maxK, j]);
    }
  }
  return puntos.filter((_, k) => conservar[k] === 1);
}

function codificarNumero(valor: number): string {
  let v = valor < 0 ? ~(valor << 1) : valor << 1;
  let salida = '';
  while (v >= 0x20) {
    salida += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  return salida + String.fromCharCode(v + 63);
}

/** Polyline de Google (precisión 5). */
export function codificarPolyline(puntos: readonly Coordenada[]): string {
  let latPrevia = 0;
  let lngPrevia = 0;
  let salida = '';
  for (const p of puntos) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    salida += codificarNumero(lat - latPrevia) + codificarNumero(lng - lngPrevia);
    latPrevia = lat;
    lngPrevia = lng;
  }
  return salida;
}

/** Decodifica una polyline de Google (para la imagen del Muro y las pruebas). */
export function decodificarPolyline(texto: string): Coordenada[] {
  const puntos: Coordenada[] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  const leer = (): number => {
    let resultado = 0;
    let desplazamiento = 0;
    let b: number;
    do {
      b = texto.charCodeAt(i++) - 63;
      resultado |= (b & 0x1f) << desplazamiento;
      desplazamiento += 5;
    } while (b >= 0x20 && i < texto.length);
    return resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
  };
  while (i < texto.length) {
    lat += leer();
    lng += leer();
    puntos.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return puntos;
}

/**
 * La ruta lista para el cuerpo: recortada, simplificada y codificada, dentro de los topes (≤ 3000 puntos y ≤ 100 KB). Si no
 * entra, se sube la tolerancia hasta que entre. `null` si después del recorte no queda ruta que mandar.
 */
export function rutaParaEnviar(puntos: readonly Coordenada[]): { polyline: string; puntos: number } | null {
  const recortada = recortarPrivacidad(puntos);
  if (recortada.length < 2) return null;
  let tolerancia = TOLERANCIA_M;
  for (let intento = 0; intento < 8; intento++) {
    const simple = simplificar(recortada, tolerancia);
    const polyline = codificarPolyline(simple);
    if (simple.length <= MAXIMO_DE_PUNTOS && polyline.length <= MAXIMO_DE_BYTES) return { polyline, puntos: simple.length };
    tolerancia *= 2;
  }
  return null;
}
