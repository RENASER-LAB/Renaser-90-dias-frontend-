import type { EstadoDeLaCarrera, MuestraDeRitmo, PuntoDeRuta, PuntoGps, Tramo } from '../types/carrera.types';
import { distanciaM, type Coordenada } from './geo';
import { caloriasDelTramo, ritmoSegPorKm, velocidadKmh } from './ritmoYCalorias';

/**
 * El motor de la carrera con GPS (spec 042): todo lo que la carrera calcula, en funciones puras que reciben el estado y un
 * hecho (un punto GPS, unos pasos, una pausa, un latido del reloj) y devuelven el estado nuevo. No lee sensores, no guarda nada
 * y no habla con el servidor: lo usan igual la pantalla, la tarea en segundo plano y las pruebas.
 *
 * Reglas (FR-030 a FR-036, FR-010, FR-006):
 * - **Filtro:** se descarta un punto con precisión peor que 20 m, y todo salto que implique más de 25 km/h desde el último
 *   aceptado. La posición se suaviza con el promedio de los últimos 4 aceptados, ponderado por 1/precisión².
 * - **Quieto no suma:** sin pasos recientes y sin desplazarse más allá del ruido del GPS en los últimos 10 s, no se suman metros
 *   aunque el GPS «tiemble» (FR-033). Sin sensor de pasos, decide solo el GPS (FR-036).
 * - **Huecos sin señal:** de menos de 60 s, con pasos, se suma lo mayor entre la línea recta y pasos × zancada, y la diferencia
 *   queda como `metrosSinGps`; de 60 s o más, ese tramo no suma (FR-035).
 * - **Pausa automática:** quieto 10 s seguidos pausa; al moverse, sigue. El tiempo quieto no cuenta como activo.
 * - **App muerta:** al reabrir, el tiempo sin latidos se trata como pausa (FR-006).
 */

export const PRECISION_MAXIMA_M = 20;
export const VELOCIDAD_MAXIMA_MS = 25 / 3.6;
export const PASOS_RECIENTES_MS = 3_000;
export const VENTANA_QUIETO_MS = 10_000;
export const PAUSA_AUTOMATICA_MS = 10_000;
export const HUECO_LARGO_MS = 60_000;
/** Un silencio del GPS más largo que esto ya es un hueco (no la cadencia normal de ~1 s). */
export const HUECO_MINIMO_MS = 8_000;
export const SEPARACION_MINIMA_M = 3;
export const RUIDO_MINIMO_M = 10;
export const APP_MUERTA_MS = 15_000;
export const ZANCADA_CAMINANDO_M = 0.75;
export const ZANCADA_CORRIENDO_M = 1.0;
const TAMANO_VENTANA = 4;
const MUESTRAS_MS = 60_000;

export function crearCarrera(datos: {
  carreraId: string;
  cuentaId: string;
  ahora: number;
  pesoKg: number;
  conPasos: boolean;
  pausaAutomatica: boolean;
}): EstadoDeLaCarrera {
  return {
    version: 1,
    carreraId: datos.carreraId,
    cuentaId: datos.cuentaId,
    iniciadaEnMs: datos.ahora,
    fase: 'corriendo',
    pausaAutomatica: false,
    activoAcumuladoMs: 0,
    desdeMs: datos.ahora,
    ultimoLatidoMs: datos.ahora,
    distanciaM: 0,
    metrosSinGps: 0,
    ruta: [],
    ventana: [],
    ultimoCrudo: null,
    recientes: [],
    ultimoGpsBuenoMs: null,
    pasos: 0,
    conPasos: datos.conPasos,
    pasosEnHueco: 0,
    ultimoPasoMs: null,
    pasosCalibracion: 0,
    metrosCalibracion: 0,
    marcasKm: [],
    altitudSuavizada: null,
    altitudBase: null,
    subidaM: 0,
    caloriasKcal: 0,
    ultimoCalculoCaloriasMs: 0,
    muestras: [],
    quietoDesdeMs: null,
    pesoKg: datos.pesoKg,
    pausaAutomaticaActiva: datos.pausaAutomatica,
  };
}

/** Tiempo activo hasta `ahora`. */
export function activoMs(e: EstadoDeLaCarrera, ahora: number): number {
  const enCurso = e.fase === 'corriendo' && e.desdeMs != null ? Math.max(0, ahora - e.desdeMs) : 0;
  return e.activoAcumuladoMs + enCurso;
}

function pasosRecientes(e: EstadoDeLaCarrera, ahora: number): boolean {
  return e.ultimoPasoMs != null && ahora - e.ultimoPasoMs <= PASOS_RECIENTES_MS;
}

/** El desplazamiento neto de la posición suavizada en los últimos 10 s, y si cubre lo bastante como para juzgar. */
function desplazamientoReciente(recientes: readonly PuntoDeRuta[]): { metros: number; cubreMs: number } | null {
  if (recientes.length < 2) return null;
  const primero = recientes[0];
  const ultimo = recientes[recientes.length - 1];
  return { metros: distanciaM(primero, ultimo), cubreMs: ultimo.t - primero.t };
}

/**
 * ¿La persona está quieta según el GPS? Se mueve si en los últimos 10 s su posición suavizada se desplazó más que el ruido
 * (10 m o 1,5 × la precisión). Con menos de 5 s de datos, decide la velocidad que reporta el GPS; sin ella, quieta.
 */
function quietaSegunElGps(e: EstadoDeLaCarrera, ultimo: PuntoGps | null): boolean {
  const reciente = desplazamientoReciente(e.recientes);
  const ruido = Math.max(RUIDO_MINIMO_M, 1.5 * (ultimo?.precision ?? 0));
  if (reciente && reciente.cubreMs >= 5_000) {
    const kmh = (reciente.metros / (reciente.cubreMs / 1000)) * 3.6;
    return reciente.metros <= ruido || kmh < 1;
  }
  const v = ultimo?.velocidad;
  return !(v != null && v >= 0 && v * 3.6 >= 1);
}

export function estaQuieta(e: EstadoDeLaCarrera, ahora: number, ultimo: PuntoGps | null = e.ultimoCrudo): boolean {
  if (e.conPasos && pasosRecientes(e, ahora)) return false;
  return quietaSegunElGps(e, ultimo);
}

/** Zancada estimada: la calibrada con el GPS de esta carrera si hay datos; si no, 0,75 m caminando y 1,0 m corriendo. */
export function zancadaEstimada(e: EstadoDeLaCarrera, ahora: number): number {
  if (e.pasosCalibracion >= 100) {
    const z = e.metrosCalibracion / e.pasosCalibracion;
    if (z >= 0.3 && z <= 2.2) return z;
  }
  const ritmo = ritmoActualSegPorKm(e, ahora);
  return ritmo != null && ritmo < 7.5 * 60 ? ZANCADA_CORRIENDO_M : ZANCADA_CAMINANDO_M;
}

function suavizar(ventana: readonly PuntoGps[]): Coordenada {
  let sw = 0;
  let lat = 0;
  let lng = 0;
  for (const p of ventana) {
    const w = 1 / Math.max(1, p.precision ?? PRECISION_MAXIMA_M) ** 2;
    sw += w;
    lat += p.lat * w;
    lng += p.lng * w;
  }
  return { lat: lat / sw, lng: lng / sw };
}

function conMarcas(e: EstadoDeLaCarrera, ahora: number): EstadoDeLaCarrera {
  const marcas = [...e.marcasKm];
  const seg = activoMs(e, ahora) / 1000;
  while (e.distanciaM >= (marcas.length + 1) * 1000) marcas.push(seg);
  return marcas.length === e.marcasKm.length ? e : { ...e, marcasKm: marcas };
}

function conMuestra(e: EstadoDeLaCarrera, ahora: number): EstadoDeLaCarrera {
  const act = activoMs(e, ahora);
  const muestras: MuestraDeRitmo[] = [...e.muestras, { activoMs: act, distanciaM: e.distanciaM }].filter(m => act - m.activoMs <= MUESTRAS_MS);
  return { ...e, muestras };
}

function conCalorias(e: EstadoDeLaCarrera, ahora: number): EstadoDeLaCarrera {
  const act = activoMs(e, ahora);
  const dt = act - e.ultimoCalculoCaloriasMs;
  if (dt < 1000) return e;
  const ritmo = ritmoActualSegPorKm(e, ahora);
  const kmh = ritmo != null ? 3600 / ritmo : velocidadKmh(e.distanciaM, act / 1000) ?? 0;
  return { ...e, caloriasKcal: e.caloriasKcal + caloriasDelTramo(kmh, e.pesoKg, dt / 1000), ultimoCalculoCaloriasMs: act };
}

function conSubida(e: EstadoDeLaCarrera, altitud: number | null | undefined): EstadoDeLaCarrera {
  if (altitud == null || !Number.isFinite(altitud)) return e;
  const suave = e.altitudSuavizada == null ? altitud : e.altitudSuavizada + 0.25 * (altitud - e.altitudSuavizada);
  let base = e.altitudBase ?? suave;
  let subida = e.subidaM;
  if (suave - base > 2) {
    subida += suave - base;
    base = suave;
  } else if (suave < base) {
    base = suave;
  }
  return { ...e, altitudSuavizada: suave, altitudBase: base, subidaM: subida };
}

/** Pausa (manual o automática): cierra el tramo activo. `hasta` permite descontar el tiempo quieto de la pausa automática. */
function cerrarTramo(e: EstadoDeLaCarrera, hasta: number): EstadoDeLaCarrera {
  if (e.fase !== 'corriendo' || e.desdeMs == null) return e;
  return { ...e, fase: 'pausa', activoAcumuladoMs: e.activoAcumuladoMs + Math.max(0, hasta - e.desdeMs), desdeMs: null };
}

export function pausar(e: EstadoDeLaCarrera, ahora: number): EstadoDeLaCarrera {
  if (e.fase === 'pausa') return { ...e, pausaAutomatica: false, ultimoLatidoMs: ahora };
  return { ...cerrarTramo(e, ahora), pausaAutomatica: false, ultimoLatidoMs: ahora };
}

/** Sigue después de una pausa. El siguiente punto empieza un segmento nuevo: lo caminado en pausa no se suma. */
export function seguir(e: EstadoDeLaCarrera, ahora: number): EstadoDeLaCarrera {
  if (e.fase === 'corriendo') return e;
  return {
    ...e,
    fase: 'corriendo',
    pausaAutomatica: false,
    desdeMs: ahora,
    ultimoLatidoMs: ahora,
    quietoDesdeMs: null,
    ventana: [],
    ultimoCrudo: null,
    recientes: [],
    ultimoGpsBuenoMs: null,
    pasosEnHueco: 0,
    ultimoCalculoCaloriasMs: activoMs(e, ahora),
  };
}

/** Sigue desde la pausa automática: conserva la referencia del GPS (la persona no se fue lejos sin que se viera). */
function seguirDesdePausaAutomatica(e: EstadoDeLaCarrera, ahora: number): EstadoDeLaCarrera {
  return { ...e, fase: 'corriendo', pausaAutomatica: false, desdeMs: ahora, quietoDesdeMs: null, ultimoCalculoCaloriasMs: e.activoAcumuladoMs };
}

/** Evalúa la pausa automática con el reloj. */
function conPausaAutomatica(e: EstadoDeLaCarrera, ahora: number): EstadoDeLaCarrera {
  if (e.fase !== 'corriendo') return e;
  const quieta = estaQuieta(e, ahora);
  if (!quieta) return e.quietoDesdeMs == null ? e : { ...e, quietoDesdeMs: null };
  const desde = e.quietoDesdeMs ?? ahora;
  const marcado = e.quietoDesdeMs == null ? { ...e, quietoDesdeMs: desde } : e;
  if (e.pausaAutomaticaActiva && ahora - desde >= PAUSA_AUTOMATICA_MS) {
    return { ...cerrarTramo(marcado, Math.max(desde, marcado.desdeMs ?? desde)), pausaAutomatica: true };
  }
  return marcado;
}

/** Un latido del reloj (cada segundo con la pantalla abierta, o con cada punto en segundo plano). */
export function alLatido(e: EstadoDeLaCarrera, ahora: number): EstadoDeLaCarrera {
  const conLatido = { ...e, ultimoLatidoMs: Math.max(e.ultimoLatidoMs, ahora) };
  return conCalorias(conPausaAutomatica(conLatido, ahora), ahora);
}

/** Pasos nuevos del podómetro (`delta` desde la última lectura). Animan al avatar; solo suman metros en un hueco (FR-035). */
export function alPasos(e: EstadoDeLaCarrera, delta: number, ahora: number): EstadoDeLaCarrera {
  if (!(delta > 0)) return e;
  if (e.fase === 'pausa' && !e.pausaAutomatica) return { ...e, ultimoLatidoMs: ahora };
  let s: EstadoDeLaCarrera = {
    ...e,
    pasos: e.pasos + delta,
    pasosEnHueco: e.pasosEnHueco + delta,
    ultimoPasoMs: ahora,
    ultimoLatidoMs: ahora,
    quietoDesdeMs: null,
  };
  if (s.pausaAutomatica) s = seguirDesdePausaAutomatica(s, ahora);
  return s;
}

export type MotivoDeDescarte = 'precision' | 'salto' | 'pausa';

/**
 * Un punto del GPS. Devuelve el estado nuevo y, si se descartó, por qué (para las pruebas y el registro de depuración).
 */
export function alPunto(e: EstadoDeLaCarrera, p: PuntoGps): { estado: EstadoDeLaCarrera; descartado: MotivoDeDescarte | null } {
  const ahora = p.t;
  if (e.fase === 'pausa' && !e.pausaAutomatica) return { estado: { ...e, ultimoLatidoMs: Math.max(e.ultimoLatidoMs, ahora) }, descartado: 'pausa' };
  if (p.precision == null || !(p.precision <= PRECISION_MAXIMA_M)) return { estado: e, descartado: 'precision' };
  if (e.ultimoCrudo) {
    const dt = (p.t - e.ultimoCrudo.t) / 1000;
    if (dt <= 0) return { estado: e, descartado: 'salto' };
    if (distanciaM(e.ultimoCrudo, p) / dt > VELOCIDAD_MAXIMA_MS) return { estado: e, descartado: 'salto' };
  }

  const hueco = e.ultimoGpsBuenoMs != null ? p.t - e.ultimoGpsBuenoMs : 0;
  const esHueco = hueco >= HUECO_MINIMO_MS;
  const ventana = esHueco ? [p] : [...e.ventana, p].slice(-TAMANO_VENTANA);
  const suave = suavizar(ventana);
  const punto: PuntoDeRuta = { lat: suave.lat, lng: suave.lng, t: p.t };
  const recientes = [...(esHueco ? [] : e.recientes), punto].filter(r => p.t - r.t <= VENTANA_QUIETO_MS);

  let s: EstadoDeLaCarrera = {
    ...e,
    ventana,
    recientes,
    ultimoCrudo: p,
    ultimoGpsBuenoMs: p.t,
    ultimoLatidoMs: Math.max(e.ultimoLatidoMs, ahora),
  };
  s = conSubida(s, p.altitud);

  const quieta = estaQuieta(s, ahora, p);
  if (s.pausaAutomatica) {
    if (quieta) return { estado: conPausaAutomatica(s, ahora), descartado: null };
    s = seguirDesdePausaAutomatica(s, ahora);
  }

  const anterior = s.ruta.length > 0 ? s.ruta[s.ruta.length - 1] : null;
  const pasosDelTramo = s.pasosEnHueco;
  if (!anterior) {
    s = { ...s, ruta: [punto], pasosEnHueco: 0 };
  } else if (e.ultimoGpsBuenoMs == null) {
    // Primer punto después de seguir una pausa manual: empieza un segmento nuevo sin sumar el trayecto en pausa.
    s = { ...s, ruta: [...s.ruta, punto], pasosEnHueco: 0 };
  } else if (esHueco) {
    if (hueco >= HUECO_LARGO_MS) {
      s = { ...s, ruta: [...s.ruta, punto], pasosEnHueco: 0 };
    } else {
      const lineal = distanciaM(anterior, punto);
      const porPasos = s.conPasos ? pasosDelTramo * zancadaEstimada(s, ahora) : 0;
      const suma = Math.max(lineal, porPasos);
      s = {
        ...s,
        ruta: [...s.ruta, punto],
        distanciaM: s.distanciaM + suma,
        metrosSinGps: s.metrosSinGps + Math.max(0, porPasos - lineal),
        pasosEnHueco: 0,
      };
    }
  } else if (!quieta) {
    const d = distanciaM(anterior, punto);
    if (d >= SEPARACION_MINIMA_M) {
      s = {
        ...s,
        ruta: [...s.ruta, punto],
        distanciaM: s.distanciaM + d,
        pasosEnHueco: 0,
        pasosCalibracion: s.pasosCalibracion + pasosDelTramo,
        metrosCalibracion: s.metrosCalibracion + (pasosDelTramo > 0 ? d : 0),
      };
    }
  }

  s = conPausaAutomatica(s, ahora);
  s = conMarcas(s, ahora);
  s = conMuestra(s, ahora);
  s = conCalorias(s, ahora);
  return { estado: s, descartado: null };
}

/**
 * Al reabrir la app con una carrera sin terminar (FR-006): si pasó más de 15 s sin latidos, el proceso estuvo muerto; ese
 * tiempo no cuenta como activo y la carrera queda en pausa para que la persona elija seguir, terminar o descartar.
 */
export function retomarTrasReabrir(e: EstadoDeLaCarrera, ahora: number): { estado: EstadoDeLaCarrera; estuvoMuerta: boolean } {
  if (ahora - e.ultimoLatidoMs <= APP_MUERTA_MS) return { estado: e, estuvoMuerta: false };
  if (e.fase === 'pausa') return { estado: { ...e, pausaAutomatica: false }, estuvoMuerta: true };
  const pausada = cerrarTramo(e, Math.max(e.desdeMs ?? e.ultimoLatidoMs, e.ultimoLatidoMs));
  return { estado: { ...pausada, pausaAutomatica: false }, estuvoMuerta: true };
}

/** Ritmo de los últimos 30 s de tiempo activo (FR-008), o `null` si en ese rato no se avanzó lo bastante. */
export function ritmoActualSegPorKm(e: EstadoDeLaCarrera, ahora: number): number | null {
  const act = activoMs(e, ahora);
  const desde = e.muestras.find(m => act - m.activoMs <= 30_000);
  if (!desde) return null;
  const metros = e.distanciaM - desde.distanciaM;
  const seg = (act - desde.activoMs) / 1000;
  if (seg < 10 || metros < 5) return null;
  return ritmoSegPorKm(Math.max(metros, 20), seg);
}

/** Los tramos por km (FR-009): uno por km completo con su tiempo, y el último parcial si quedan metros. */
export function tramosDe(e: EstadoDeLaCarrera, ahora: number): Tramo[] {
  const tramos: Tramo[] = e.marcasKm.map((seg, i) => ({
    km: i + 1,
    segundos: Math.max(1, Math.round(seg - (i > 0 ? e.marcasKm[i - 1] : 0))),
    parcial: false,
    metros: 1000,
  }));
  const resto = e.distanciaM - e.marcasKm.length * 1000;
  if (resto >= 10) {
    const desde = e.marcasKm.length > 0 ? e.marcasKm[e.marcasKm.length - 1] : 0;
    tramos.push({
      km: e.marcasKm.length + 1,
      segundos: Math.max(1, Math.round(activoMs(e, ahora) / 1000 - desde)),
      parcial: true,
      metros: resto,
    });
  }
  return tramos;
}

/** El índice del km completo más rápido (el que se pinta en verde), o `null` sin ningún km completo. */
export function indiceDelMejorKm(tramos: readonly Tramo[]): number | null {
  let mejor: number | null = null;
  tramos.forEach((t, i) => {
    if (t.parcial) return;
    if (mejor == null || t.segundos < tramos[mejor].segundos) mejor = i;
  });
  return mejor;
}

/** Pasos por minuto de tiempo activo, o `null` sin pasos. */
export function pasosPorMinuto(e: EstadoDeLaCarrera, ahora: number): number | null {
  if (!e.conPasos || e.pasos <= 0) return null;
  const min = activoMs(e, ahora) / 60_000;
  return min > 0 ? e.pasos / min : null;
}

/** Carrera mínima (supuesto 10): 100 m y 1 minuto activo. Menos no se envía. */
export function esMuyCorta(e: EstadoDeLaCarrera, ahora: number): boolean {
  return e.distanciaM < 100 || activoMs(e, ahora) < 60_000;
}
