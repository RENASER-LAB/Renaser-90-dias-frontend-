import { ApiError } from '../../../services/http/apiClient';
import { obtenerTracksDeHoy } from './habitsApi';
import type { TrackDelDiaApi } from '../types/habits.types';
import { avisarDiaDeHabitosCambiado } from '../eventos/diaDeHabitosCambiado';

export class DiaDeHabitosCambiadoError extends Error {
  constructor() {
    super('Tu día cambió. Este registro era de otro día. Actualiza tus hábitos y elige el de hoy.');
    this.name = 'DiaDeHabitosCambiadoError';
  }
}

function rechazarDiaAnterior(): never {
  avisarDiaDeHabitosCambiado();
  throw new DiaDeHabitosCambiadoError();
}

export function esRechazoPorDiaCerrado(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409 && (
    /ese día ya cerró/i.test(error.message) || /no puede completarse:\s*EXPIRADO\s*$/i.test(error.message)
  );
}

/**
 * Comparar el ID, nunca buscar un reemplazo por habitoId. El backend decide la carrera final.
 *
 * `escribir` recibe el registro vigente ya leído (spec 009): quien necesite saber de qué hábito es no tiene que
 * volver a pedirlo. Quien no lo necesita sigue pasando una función sin parámetros.
 */
export async function ejecutarEnRegistroVigente<T>(
  registroId: string,
  escribir: (track: TrackDelDiaApi) => Promise<T>,
): Promise<T> {
  let tracks;
  try {
    tracks = await obtenerTracksDeHoy();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) throw error;
    throw new Error('Necesitamos actualizar tus hábitos antes de registrar. Revisa tu conexión e inténtalo de nuevo.');
  }
  const track = tracks.find(actual => actual.id === registroId);
  if (!track || track.estado === 'EXPIRADO') rechazarDiaAnterior();
  try {
    return await escribir(track);
  } catch (error) {
    if (esRechazoPorDiaCerrado(error)) rechazarDiaAnterior();
    throw error;
  }
}
