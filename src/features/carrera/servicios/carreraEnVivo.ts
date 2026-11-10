import type { EstadoDeLaCarrera, PreferenciasDeLaCarrera, PuntoGps } from '../types/carrera.types';
import { PREFERENCIAS_POR_DEFECTO } from '../types/carrera.types';
import {
  activoMs,
  alLatido,
  alPasos,
  alPunto,
  crearCarrera,
  pausar,
  retomarTrasReabrir,
  ritmoActualSegPorKm,
  seguir,
} from '../utils/motorDeCarrera';
import { borrarCarreraEnCurso, guardarCarreraEnCurso, leerCarreraEnCurso, tocaGuardar } from './almacenCarrera';

/**
 * La carrera en curso, UNA para toda la app (spec 042): la usan igual la pantalla y la tarea del GPS en segundo plano, que corren
 * en el mismo proceso de JavaScript mientras el servicio en primer plano está vivo. Aplica cada hecho con el motor (puro), avisa a
 * quien escucha y guarda en el teléfono como mucho cada 5 s o cada 10 puntos (FR-005).
 *
 * Nada de aquí habla con el servidor (FR-004): el único pedido sale al terminar, desde la cola.
 *
 * Los efectos (la voz, la notificación fija) se enchufan desde afuera (`ponerEfectos`), así este módulo no carga nada nativo y las
 * pruebas lo usan tal cual.
 */

export interface Efectos {
  /** Después de cada cambio, con el estado antes y después (la voz decide si toca un aviso). */
  alCambiar?: (antes: EstadoDeLaCarrera | null, despues: EstadoDeLaCarrera | null, ahora: number) => void;
}

let estado: EstadoDeLaCarrera | null = null;
let preferencias: PreferenciasDeLaCarrera = PREFERENCIAS_POR_DEFECTO;
let efectos: Efectos = {};
let puntosSinGuardar = 0;
let ultimoGuardadoMs = 0;
let cargaHecha = false;
const oyentes = new Set<() => void>();

export function ponerEfectos(nuevos: Efectos): void {
  efectos = nuevos;
}

export function carreraActual(): EstadoDeLaCarrera | null {
  return estado;
}

export function preferenciasActuales(): PreferenciasDeLaCarrera {
  return preferencias;
}

export function ponerPreferencias(p: PreferenciasDeLaCarrera): void {
  preferencias = p;
  if (estado && estado.pausaAutomaticaActiva !== p.pausaAutomatica) {
    cambiar({ ...estado, pausaAutomaticaActiva: p.pausaAutomatica }, Date.now(), true);
  } else {
    oyentes.forEach(o => o());
  }
}

export function suscribirCarrera(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

function cambiar(nuevo: EstadoDeLaCarrera | null, ahora: number, guardarYa = false): void {
  const antes = estado;
  estado = nuevo;
  if (nuevo) {
    if (guardarYa || tocaGuardar(puntosSinGuardar, ahora - ultimoGuardadoMs)) {
      puntosSinGuardar = 0;
      ultimoGuardadoMs = ahora;
      void guardarCarreraEnCurso(nuevo);
    }
  }
  try {
    efectos.alCambiar?.(antes, nuevo, ahora);
  } catch {
    // Un efecto que falla (sin voz, sin notificación) no corta la carrera.
  }
  oyentes.forEach(o => o());
}

/**
 * Lee del teléfono la carrera sin terminar de esta cuenta (FR-006). Si el proceso estuvo muerto, queda en pausa sin contar ese
 * tiempo. La carrera de otra cuenta no se toca ni se muestra.
 */
export async function cargarCarrera(
  cuentaId: string,
  ahora = Date.now(),
  opciones: { desdeLaTareaDelGps?: boolean } = {},
): Promise<EstadoDeLaCarrera | null> {
  if (estado && estado.cuentaId === cuentaId) return estado;
  const guardada = await leerCarreraEnCurso();
  cargaHecha = true;
  if (!guardada || guardada.cuentaId !== cuentaId) return null;
  // #172: si la levanta la tarea del GPS (el sistema mató el proceso pero el GPS siguió), la carrera nunca se detuvo: el rato sin
  // latidos es un hueco de GPS (lo resuelve el motor con el punto siguiente), no una pausa. Antes quedaba en pausa y se descartaba
  // todo lo que venía hasta abrir la app y tocar «Seguir».
  if (opciones.desdeLaTareaDelGps) {
    cambiar(guardada, ahora, true);
    return guardada;
  }
  const { estado: retomada } = retomarTrasReabrir(guardada, ahora);
  cambiar(retomada, ahora, true);
  return retomada;
}

export function cargaDelTelefonoHecha(): boolean {
  return cargaHecha;
}

export function empezarCarrera(datos: { carreraId: string; cuentaId: string; pesoKg: number; conPasos: boolean }, ahora = Date.now()): EstadoDeLaCarrera {
  const nueva = crearCarrera({ ...datos, ahora, pausaAutomatica: preferencias.pausaAutomatica });
  cambiar(nueva, ahora, true);
  return nueva;
}

/** Puntos del GPS (la tarea los entrega en tandas). */
export function recibirPuntos(puntos: readonly PuntoGps[]): void {
  if (!estado || puntos.length === 0) return;
  let s = estado;
  for (const p of [...puntos].sort((a, b) => a.t - b.t)) s = alPunto(s, p).estado;
  puntosSinGuardar += puntos.length;
  cambiar(s, puntos[puntos.length - 1].t);
}

export function recibirPasos(delta: number, ahora = Date.now()): void {
  if (!estado || !(delta > 0)) return;
  cambiar(alPasos(estado, delta, ahora), ahora);
}

export function latido(ahora = Date.now()): void {
  if (!estado) return;
  cambiar(alLatido(estado, ahora), ahora);
}

export function pausarCarrera(ahora = Date.now()): void {
  if (!estado) return;
  cambiar(pausar(estado, ahora), ahora, true);
}

export function seguirCarrera(ahora = Date.now()): void {
  if (!estado) return;
  cambiar(seguir(estado, ahora), ahora, true);
}

/** Sin pasos (sin permiso o sin sensor): la carrera decide todo con el GPS (FR-036). */
export function marcarSinPasos(): void {
  if (!estado || !estado.conPasos) return;
  cambiar({ ...estado, conPasos: false }, Date.now(), true);
}

/** Borra la carrera del teléfono sin enviar nada (FR-013). */
export async function descartarCarrera(): Promise<void> {
  cambiar(null, Date.now());
  await borrarCarreraEnCurso();
}

/**
 * Cierra la carrera: devuelve el estado final (para armar el cuerpo) y la quita de «en curso». Quien llama la pone en la cola
 * ANTES de esto, para que nunca quede en ningún lado.
 */
export async function cerrarCarrera(ahora = Date.now()): Promise<EstadoDeLaCarrera | null> {
  if (!estado) return null;
  const final = estado.fase === 'corriendo' ? pausar(estado, ahora) : estado;
  cambiar(null, ahora);
  await borrarCarreraEnCurso();
  return final;
}

/** Números para la notificación fija y la voz, sin React. */
export function resumenParaLaNotificacion(ahora = Date.now()): { metros: number; activoMs: number; ritmo: number | null } | null {
  if (!estado) return null;
  return { metros: estado.distanciaM, activoMs: activoMs(estado, ahora), ritmo: ritmoActualSegPorKm(estado, ahora) };
}

/** Solo para pruebas. */
export function reiniciarParaPruebas(): void {
  estado = null;
  preferencias = PREFERENCIAS_POR_DEFECTO;
  efectos = {};
  puntosSinGuardar = 0;
  ultimoGuardadoMs = 0;
  cargaHecha = false;
  oyentes.clear();
}
