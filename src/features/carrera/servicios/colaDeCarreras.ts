import { almacen } from './almacenamiento';

import { ApiError } from '../../../services/http/apiClient';
import { avisarHabitoCumplido } from '../../habits/eventos/habitoCumplido';
import { enviarCarrera } from '../api/carrerasApi';
import type { CuerpoDeLaCarrera } from '../types/carrera.types';
import {
  agregarALaCola,
  aplicarDesenlace,
  desenlaceDelError,
  tocaIntentar,
  type DesenlaceDelEnvio,
  type EntradaDeLaCola,
} from '../utils/colaDeEnvio';
import type { EstadoDelEnvio } from '../utils/textosDeLaCarrera';

/**
 * La cola de carreras por enviar, guardada en el teléfono POR CUENTA (FR-017): la de una cuenta nunca sale con la sesión de otra.
 * Se procesa al terminar, al volver la app al frente y con un reloj mientras está abierta (`AnfitrionDeLaCarrera`).
 *
 * Un solo proceso a la vez: dos disparos juntos (terminar y volver al frente) no mandan la misma carrera dos veces. Aun así, el
 * servidor es idempotente por `carreraId` (FR-019): un reintento devuelve `repetida: true`, que acá es éxito.
 */

const PREFIJO = 'renaser.carreras.cola.';

async function leerCola(cuentaId: string): Promise<EntradaDeLaCola[]> {
  try {
    const crudo = await almacen().getItem(PREFIJO + cuentaId);
    const lista = crudo ? (JSON.parse(crudo) as EntradaDeLaCola[]) : [];
    return Array.isArray(lista) ? lista.filter(e => e && typeof e.carreraId === 'string' && e.cuentaId === cuentaId) : [];
  } catch {
    return [];
  }
}

async function guardarCola(cuentaId: string, cola: EntradaDeLaCola[]): Promise<void> {
  try {
    if (cola.length === 0) await almacen().removeItem(PREFIJO + cuentaId);
    else await almacen().setItem(PREFIJO + cuentaId, JSON.stringify(cola));
  } catch {
    // Se reintenta la próxima vez.
  }
}

/* El estado del envío de cada carrera, para la pantalla «Terminaste» y la fila de Training. Solo en memoria. */
const estados = new Map<string, EstadoDelEnvio>();
const oyentes = new Set<() => void>();
let version = 0;

function avisar(): void {
  version++;
  oyentes.forEach(o => o());
}

export function suscribirEnvios(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function versionDeLosEnvios(): number {
  return version;
}

export function estadoDelEnvio(carreraId: string): EstadoDelEnvio | null {
  return estados.get(carreraId) ?? null;
}

function kmDelCuerpo(cuerpo: CuerpoDeLaCarrera): string {
  return (cuerpo.distanciaMetros / 1000).toFixed(2).replace('.', ',');
}

/** Pone la carrera en la cola (una sola vez por `carreraId`). Queda en el teléfono antes de que se borre de «en curso». */
export async function encolar(cuentaId: string, cuerpo: CuerpoDeLaCarrera): Promise<void> {
  const cola = agregarALaCola(await leerCola(cuentaId), cuerpo, cuentaId, Date.now());
  await guardarCola(cuentaId, cola);
  estados.set(cuerpo.carreraId, { tipo: 'enviando', km: kmDelCuerpo(cuerpo) });
  avisar();
}

/** Pone la carrera en la cola y la intenta enviar ya. */
export async function encolarYEnviar(cuentaId: string, cuerpo: CuerpoDeLaCarrera): Promise<void> {
  await encolar(cuentaId, cuerpo);
  await procesarCola(cuentaId, true);
}

let procesando: Promise<void> | null = null;

/** Intenta lo que toca de la cola. Nunca lanza. */
export function procesarCola(cuentaId: string, enPrimerPlano: boolean): Promise<void> {
  if (procesando) return procesando;
  procesando = (async () => {
    try {
      let cola = await leerCola(cuentaId);
      for (const entrada of cola) {
        if (!tocaIntentar(entrada, Date.now(), enPrimerPlano)) {
          if (!estados.has(entrada.carreraId)) {
            estados.set(
              entrada.carreraId,
              entrada.bloqueada ? { tipo: 'bloqueada', motivo: entrada.bloqueada } : { tipo: 'en-cola', km: kmDelCuerpo(entrada.cuerpo) },
            );
          }
          continue;
        }
        const desenlace = await intentar(entrada.cuerpo);
        cola = aplicarDesenlace(cola, entrada.carreraId, desenlace, Date.now());
        await guardarCola(cuentaId, cola);
        estados.set(entrada.carreraId, estadoDe(desenlace, entrada));
        avisar();
      }
    } finally {
      procesando = null;
    }
  })();
  return procesando;
}

async function intentar(cuerpo: CuerpoDeLaCarrera): Promise<DesenlaceDelEnvio> {
  try {
    const respuesta = await enviarCarrera(cuerpo);
    // Solo la primera vez que una carrera cierra el hábito se avisa el cumplido (alarmas, celebración, semáforo: FR-027).
    if (!respuesta.repetida && respuesta.habito?.resultado === 'CERRADO' && respuesta.habito.registroId) {
      avisarHabitoCumplido({
        registroId: respuesta.habito.registroId,
        puntosOtorgados: respuesta.habito.puntosOtorgados,
        ...(respuesta.fecha ? { fecha: respuesta.fecha } : {}),
      });
    }
    return { tipo: 'exito', respuesta };
  } catch (error) {
    if (error instanceof ApiError) return desenlaceDelError(error.status, error.codigo, error.message);
    return { tipo: 'reintentar' };
  }
}

function estadoDe(desenlace: DesenlaceDelEnvio, entrada: EntradaDeLaCola): EstadoDelEnvio {
  switch (desenlace.tipo) {
    case 'exito':
      return { tipo: 'respondida', respuesta: desenlace.respuesta };
    case 'ya-registrada':
      return { tipo: 'ya-registrada' };
    case 'bloqueada':
      return { tipo: 'bloqueada', motivo: desenlace.motivo };
    default:
      return { tipo: 'en-cola', km: kmDelCuerpo(entrada.cuerpo) };
  }
}

/** ¿Quedan carreras sin enviar de esta cuenta? (para avisar antes de cerrar sesión). */
export async function hayCarrerasSinEnviar(cuentaId: string): Promise<boolean> {
  return (await leerCola(cuentaId)).length > 0;
}

/** Al cerrar sesión: la cola de esa cuenta se borra (casos de borde de la spec). */
export async function borrarColaDeLaCuenta(cuentaId: string): Promise<void> {
  await guardarCola(cuentaId, []);
}
