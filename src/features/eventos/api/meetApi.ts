import { z } from 'zod';

import { ApiError, apiFetch } from '../../../services/http/apiClient';
import type { Evento } from '../types/eventos.types';
import { leerEvento } from './eventosSchemas';

/**
 * El enlace de Meet automático de los eventos (spec 040, D-321). Dos pedidos sobre `/api/v1/calendar/events`:
 *
 * - `GET …/meet/status`: si el formulario puede ofrecer «Crear enlace de Meet» (la función está prendida y hay una cuenta de Google
 *   conectada). Solo la pide quien crea o edita eventos (ADMIN y ALCHEMIST).
 * - `POST …/{id}/meet/retry`: «Reintentar» a mano lo que Google dejó sin hacer. Devuelve el evento ya al día.
 *
 * Quién puede qué lo decide el servidor en cada llamada; un 404 (función apagada, backend anterior) o un 403 se leen como «no se ofrece».
 */
const BASE = '/api/v1/calendar/events';

/** Por qué no se ofrece, tal como lo dice el servidor. Un motivo que esta versión no conoce llega como texto. */
export type MotivoSinMeet = 'APAGADA' | 'SIN_CONFIGURAR' | 'SIN_CUENTA' | 'CUENTA_REVOCADA' | string;

export interface DisponibilidadDeMeet {
  disponible: boolean;
  motivo: MotivoSinMeet | null;
}

const disponibilidadSchema = z
  .object({ disponible: z.boolean(), motivo: z.string().nullish() })
  .passthrough();

/** Nunca lanza: lo que no se entiende, o un servidor que no sabe de esto, es «no disponible». */
export async function consultarDisponibilidadDeMeet(): Promise<DisponibilidadDeMeet> {
  try {
    const r = disponibilidadSchema.safeParse(await apiFetch<unknown>(`${BASE}/meet/status`));
    if (!r.success) return { disponible: false, motivo: null };
    return { disponible: r.data.disponible, motivo: r.data.disponible ? null : r.data.motivo ?? null };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) return { disponible: false, motivo: 'APAGADA' };
    return { disponible: false, motivo: null };
  }
}

export async function reintentarLaSala(eventoId: string): Promise<Evento> {
  return leerEvento(await apiFetch<unknown>(`${BASE}/${encodeURIComponent(eventoId)}/meet/retry`, { method: 'POST' }));
}
