import { almacen } from './almacen';

import { esperaTrasIntentos } from '../carrera/utils/colaDeEnvio';
import type { OrigenDeLaHora } from './horaReal';

/**
 * Spec 048 (FR-007, FR-009, D8, D15): UNA cola por cuenta con lo hecho sin señal, en el orden en que se hizo.
 *
 * - Cada envío lleva su `idCliente`: el servidor registra una sola vez un reintento (FR-008).
 * - Se procesa en orden. Si uno espera red, los siguientes esperan con él (el orden importa: una foto antes de cerrar el hábito).
 * - Sin red, 5xx, 408, 429 o 404: se reintenta con la misma espera creciente de la cola de carreras. 401: la sesión venció; la
 *   cola espera a que vuelva a entrar LA MISMA cuenta (D15). Otro 4xx no debería pasar (el servidor no rechaza lo hecho sin red,
 *   D14); si pasa, queda marcado con su motivo y la cola sigue.
 * - Va guardada por cuenta: lo de una cuenta nunca sale con la sesión de otra.
 */
export type TipoDeEnvio = 'completarHabito' | 'subirEvidencia' | 'confirmarTexto' | 'publicarMuro';

export interface EnvioSinRed {
  idCliente: string;
  cuentaId: string;
  tipo: TipoDeEnvio;
  datos: Record<string, unknown>;
  hechoEn: string;
  origenDeLaHora: OrigenDeLaHora;
  intentos: number;
  proximoIntentoMs: number;
  bloqueado: string | null;
  creadoMs: number;
}

export type Manejador = (envio: EnvioSinRed) => Promise<void>;

const PREFIJO = 'renaser.sinRed.cola.';
const manejadores = new Map<TipoDeEnvio, Manejador>();
const oyentes = new Set<() => void>();
const procesando = new Set<string>();
let cuentaActual: string | null = null;

export function ponerCuentaActual(cuentaId: string | null): void {
  cuentaActual = cuentaId;
}

export function cuentaDeLaSesion(): string | null {
  return cuentaActual;
}

export function registrarManejador(tipo: TipoDeEnvio, manejador: Manejador): void {
  manejadores.set(tipo, manejador);
}

export function suscribirCola(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

function avisar() {
  oyentes.forEach(o => {
    try {
      o();
    } catch {
      /* nada */
    }
  });
}

export async function leerCola(cuentaId: string): Promise<EnvioSinRed[]> {
  try {
    const crudo = await almacen().getItem(PREFIJO + cuentaId);
    const lista = crudo ? (JSON.parse(crudo) as EnvioSinRed[]) : [];
    return Array.isArray(lista) ? lista.filter(e => e && e.cuentaId === cuentaId && typeof e.idCliente === 'string') : [];
  } catch {
    return [];
  }
}

async function guardarCola(cuentaId: string, cola: EnvioSinRed[]): Promise<void> {
  try {
    if (cola.length === 0) await almacen().removeItem(PREFIJO + cuentaId);
    else await almacen().setItem(PREFIJO + cuentaId, JSON.stringify(cola));
  } catch {
    /* se reintenta la próxima vez */
  }
}

export function nuevoIdCliente(): string {
  // UUID v4 sin dependencias: alcanza para que el servidor reconozca un reintento.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function agregarEnvio(
  cuentaId: string,
  tipo: TipoDeEnvio,
  datos: Record<string, unknown>,
  hora: { instante: Date; origen: OrigenDeLaHora },
  ahora: number = Date.now(),
): Promise<EnvioSinRed> {
  const envio: EnvioSinRed = {
    idCliente: nuevoIdCliente(),
    cuentaId,
    tipo,
    datos,
    hechoEn: hora.instante.toISOString(),
    origenDeLaHora: hora.origen,
    intentos: 0,
    proximoIntentoMs: ahora,
    bloqueado: null,
    creadoMs: ahora,
  };
  await guardarCola(cuentaId, [...(await leerCola(cuentaId)), envio]);
  avisar();
  return envio;
}

/**
 * Saca un envío de la cola antes de que salga (spec 048 fase 2, D19: la publicación en espera se puede borrar). Si la cola
 * de esa cuenta se está enviando justo ahora, no se toca y devuelve `false`: puede estar a mitad de camino.
 */
export async function quitarEnvio(cuentaId: string, idCliente: string): Promise<boolean> {
  if (procesando.has(cuentaId)) return false;
  const cola = await leerCola(cuentaId);
  const queda = cola.filter(e => e.idCliente !== idCliente);
  if (queda.length === cola.length) return false;
  await guardarCola(cuentaId, queda);
  avisar();
  return true;
}

type Desenlace = 'listo' | 'reintentar' | 'sin-sesion' | { bloqueado: string };

function desenlaceDe(error: unknown): Desenlace {
  const status = (error as { status?: number })?.status;
  if (typeof status !== 'number' || status === 0 || status >= 500 || status === 408 || status === 429 || status === 404) {
    return 'reintentar';
  }
  if (status === 401) return 'sin-sesion';
  return { bloqueado: (error as Error).message || 'El servidor no aceptó este envío.' };
}

/** Manda lo que toca, en orden. Un solo proceso por cuenta a la vez. Devuelve cuántos quedan. */
export async function procesarCola(cuentaId: string, ahora: number = Date.now(), opciones: { adelantar?: boolean } = {}): Promise<number> {
  if (procesando.has(cuentaId) || cuentaActual !== cuentaId) return (await leerCola(cuentaId)).length;
  procesando.add(cuentaId);
  try {
    let cola = await leerCola(cuentaId);
    // Volvió la señal o la app volvió al frente: lo que esperaba se intenta ya. Va DENTRO del candado (E2E 09/11): hecho
    // aparte, leía la cola, la cola mandaba y borraba un envío, y al guardar su copia vieja lo devolvía: salía dos veces.
    if (opciones.adelantar) cola = cola.map(e => ({ ...e, proximoIntentoMs: Math.min(e.proximoIntentoMs, ahora) }));
    for (const envio of [...cola]) {
      if (envio.bloqueado) continue;
      if (ahora < envio.proximoIntentoMs) break;
      const manejador = manejadores.get(envio.tipo);
      if (!manejador) break;
      let desenlace: Desenlace;
      try {
        await manejador(envio);
        desenlace = 'listo';
      } catch (error) {
        desenlace = desenlaceDe(error);
      }
      if (desenlace === 'listo') {
        cola = cola.filter(e => e.idCliente !== envio.idCliente);
      } else if (desenlace === 'reintentar') {
        cola = cola.map(e => (e.idCliente === envio.idCliente
          ? { ...e, intentos: e.intentos + 1, proximoIntentoMs: ahora + esperaTrasIntentos(e.intentos + 1) } : e));
        // Se guarda ANTES de cortar: si no, el reintento nunca quedaba anotado y la espera no crecía.
        await guardarCola(cuentaId, cola);
        avisar();
        break;
      } else if (desenlace === 'sin-sesion') {
        break;
      } else {
        const motivo = desenlace.bloqueado;
        cola = cola.map(e => (e.idCliente === envio.idCliente ? { ...e, bloqueado: motivo } : e));
      }
      await guardarCola(cuentaId, cola);
      avisar();
    }
    return cola.length;
  } finally {
    procesando.delete(cuentaId);
  }
}


export async function borrarCola(cuentaId: string): Promise<void> {
  await guardarCola(cuentaId, []);
  avisar();
}

/** Solo para las pruebas. */
export function _reiniciarCola(): void {
  manejadores.clear();
  oyentes.clear();
  procesando.clear();
  cuentaActual = null;
}
