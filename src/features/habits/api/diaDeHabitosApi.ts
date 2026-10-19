import { z } from 'zod';
import { apiFetch, ApiError } from '../../../services/http/apiClient';
import { habitsSchemas, validarRespuesta } from './habitsSchemas';
import { obtenerTracksDeHoy } from './habitsApi';
import type { TrackDelDiaApi } from '../types/habits.types';

const instante = z.string().refine(valor => Number.isFinite(Date.parse(valor)), 'Instante inválido');
const snapshotSchema = z.object({
  fechaLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  zonaHoraria: z.string().min(1), cierraEn: instante, ahoraServidor: instante,
  tracks: habitsSchemas.tracksDeHoy,
}).passthrough().refine(dia => dia.tracks.every(track => track.fechaEjecucion === dia.fechaLocal),
  'Los registros no corresponden a la fecha consultada');

export type ContextoDelDia = {
  fechaLocal: string;
  zonaHoraria: string;
  cierraEn: string;
  ahoraServidor: string;
  recibidoEn: number;
  recibidoMonotono: number;
};
export type DiaDeHabitos = { tracks: TrackDelDiaApi[]; contexto: ContextoDelDia | null };

/** El reloj monotónico evita que cambiar manualmente la hora prolongue un día abierto. */
export function milisegundosDelDia(contexto: ContextoDelDia): number {
  const transcurrido = Math.max(0, performance.now() - contexto.recibidoMonotono);
  return Date.parse(contexto.cierraEn) - Date.parse(contexto.ahoraServidor) - transcurrido;
}

export async function obtenerDiaDeHabitos(): Promise<DiaDeHabitos> {
  // Anclado al inicio del pedido: el tiempo de viaje nunca prolonga un snapshot que ya venció.
  const recibidoEn = Date.now();
  const recibidoMonotono = performance.now();
  let respuesta: unknown;
  try {
    respuesta = await apiFetch<unknown>('/api/v1/habit-tracks/today/snapshot', { timeoutMs: 15_000 });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { tracks: await obtenerTracksDeHoy(), contexto: null };
    }
    throw error;
  }
  const { tracks, ...contexto } = validarRespuesta(snapshotSchema, respuesta, 'GET /habit-tracks/today/snapshot');
  return { tracks, contexto: { ...contexto, recibidoEn, recibidoMonotono } };
}
