import { ApiError } from '../../../services/http/apiClient';
import { RechazoParaMostrar, type ReglasDelDestino } from '../../habits/utils/destinoDeFoto';
import {
  mensajeDeAccionBloqueada,
  type EntradaDelRegistro,
  type EstadoParaFoto,
  type ResultadoDelRegistro,
} from '../../habits/utils/registroConFoto';
import { obtenerRocasDeHoy } from '../api/objetivosApi';
import type { RocaDiariaApi } from '../types/objetivos.types';
import { sellarRocaDiaria } from './sellarRocaDiaria';

/**
 * El REGISTRO CON FOTO de una ACCIÓN DEL DÍA (roca diaria), pedido por el acompañante (D-178 del
 * backend, decisión del dueño 2026-09-26): "funciona exactamente como un hábito que exige evidencia".
 * La cámara, la pantalla y los reintentos son los de `useRegistroConFoto`; acá solo está lo que
 * cambia: el estado se lee de `GET /rocks/today` y la foto se sube con `sellarRocaDiaria` (el mismo
 * camino de Training → VIDA Y NEGOCIO), que completa la roca y paga sus puntos en UNA llamada.
 */

export type DependenciasDeLaAccion = {
  sellar: typeof sellarRocaDiaria;
  rocasDeHoy: () => Promise<RocaDiariaApi[]>;
};

const DEPENDENCIAS: DependenciasDeLaAccion = { sellar: sellarRocaDiaria, rocasDeHoy: obtenerRocasDeHoy };

/**
 * Qué hacer con una acción según la lista FRESCA de hoy. No hay "vencido": una roca de hoy se puede
 * completar todo el día. Pareto: la bloqueada se avisa antes de abrir la cámara, con el título de
 * la verde de su eje.
 */
export function estadoDeAccionParaFoto(rocas: readonly RocaDiariaApi[], rocaId: string): EstadoParaFoto {
  const roca = rocas.find(r => r.id === rocaId);
  if (!roca) return { tipo: 'no-es-de-hoy' };
  if (roca.completada) return { tipo: 'completado' };
  if (roca.bloqueada) return { tipo: 'bloqueada', primero: verdeDelEje(rocas, roca)?.titulo ?? null };
  // Una roca no tiene "evidencia sin cerrar": se sube y se cierra en la misma llamada.
  return { tipo: 'disponible', evidenciaYaSubida: false };
}

function verdeDelEje(rocas: readonly RocaDiariaApi[], roca: RocaDiariaApi): RocaDiariaApi | undefined {
  return rocas.find(r => r.eje === roca.eje && r.color === 'VERDE' && !r.completada);
}

/**
 * Sube la foto y completa la acción. Los rechazos del servidor se traducen a algo que se pueda leer:
 * - **409** (ya tenía evidencia: otro toque, otro teléfono, un reintento cuya respuesta se perdió):
 *   si la lista dice que está completada, se da por bueno con los puntos que tiene.
 * - **403 `GREEN_NOT_EVIDENCED`**: el cerrojo Pareto, con el título de la verde si se conoce.
 * - **400 `EXIF_MISMATCH`**: la foto no es de ahora (p. ej. recuperada tras un cierre de Android).
 */
export async function registrarAccionConFoto(
  entrada: EntradaDelRegistro,
  deps: DependenciasDeLaAccion = DEPENDENCIAS,
): Promise<ResultadoDelRegistro> {
  if (!entrada.archivo) throw new RechazoParaMostrar('Falta la foto. Tómala de nuevo.');
  const archivo = { ...entrada.archivo, tomadaEn: entrada.archivo.tomadaEn ?? null };
  try {
    const puntos = await deps.sellar(entrada.registroId, { archivo, texto: '' });
    return { puntosOtorgados: puntos, yaEstabaCompletado: false };
  } catch (error) {
    if (!(error instanceof ApiError)) {
      // `sellarRocaDiaria` corta antes con textos ya escritos para la persona (sin fecha de toma,
      // almacenamiento sin configurar).
      throw error instanceof Error ? new RechazoParaMostrar(error.message) : error;
    }
    const rocas = error.status === 409 || error.status === 403 ? await deps.rocasDeHoy().catch(() => null) : null;
    const roca = rocas?.find(r => r.id === entrada.registroId);
    if (error.status === 409 && roca?.completada) {
      return { puntosOtorgados: roca.puntosOtorgados, yaEstabaCompletado: true };
    }
    throw rechazoLegible(error, rocas && roca ? verdeDelEje(rocas, roca)?.titulo ?? null : null);
  }
}

function rechazoLegible(error: ApiError, verde: string | null): Error {
  if (error.status === 403 && error.message.includes('GREEN_NOT_EVIDENCED')) {
    return new RechazoParaMostrar(mensajeDeAccionBloqueada(verde));
  }
  if (error.status === 400 && error.message.includes('EXIF_MISMATCH')) {
    return new RechazoParaMostrar('La foto tiene que ser de este momento. Toca «Tomar otra» y sácala de nuevo.');
  }
  return error;
}

/** Las reglas que `useRegistroConFoto` usa para `destino: 'roca'`. */
export function reglasDeAccion(deps: DependenciasDeLaAccion = DEPENDENCIAS): ReglasDelDestino {
  return {
    estadoFresco: async rocaId => estadoDeAccionParaFoto(await deps.rocasDeHoy(), rocaId),
    registrar: entrada => registrarAccionConFoto(entrada, deps),
  };
}

/** Para montar el hook: `useRegistroConFoto({ ..., destinos: { roca: REGLAS_DE_ACCION } })`. */
export const REGLAS_DE_ACCION: ReglasDelDestino = reglasDeAccion();
