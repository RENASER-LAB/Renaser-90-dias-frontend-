import { apiFetch } from '../../../services/http/apiClient';
import type { CheckInRadarApi, HistorialRadarApi, RegistroRadarApi, UltimoRadarApi } from '../types/radar.types';
import { radarSchemas, validarRespuesta } from './radarSchemas';

/**
 * El Código Renaser contra la API propia de Spring.
 *
 * Los tres endpoints existían en el backend desde 2026-08-24 (D-41, "no quiero depender de
 * Supabase") y **ninguna pantalla los llamaba**: hasta hoy este frontend no tenía radar en
 * absoluto. Este archivo es el primer consumidor.
 *
 * `apiFetch` ya hace `JSON.stringify` del cuerpo: se le pasa el objeto crudo. Mandarlo
 * pre-serializado produce un 400 "cuerpo malformado" —el mismo error que costó el cambio de rol
 * en producción (E-181)—, así que ojo con "arreglarlo" agregando un `JSON.stringify` acá.
 */

/** `POST /api/v1/radar`. El actor sale de la sesión: no hay parámetro de persona, y es a propósito. */
export async function registrarCheckIn(checkIn: CheckInRadarApi): Promise<RegistroRadarApi> {
  const r = await apiFetch<unknown>('/api/v1/radar', { method: 'POST', body: checkIn });
  return validarRespuesta(radarSchemas.registro, r, 'POST /api/v1/radar');
}

/**
 * `GET /api/v1/radar/latest` — el instante del último check-in, o `null`.
 *
 * Es lo único que hace falta para saber si el slot de esta hora ya está respondido: si ese
 * instante cae en la hora en curso, está hecho. Una sola llamada, sin traer textos.
 */
export async function obtenerUltimoCheckIn(): Promise<string | null> {
  const r = await apiFetch<unknown>('/api/v1/radar/latest');
  const dato = validarRespuesta<UltimoRadarApi>(radarSchemas.ultimo, r, 'GET /api/v1/radar/latest');
  return dato.createdAt ?? null;
}

/** `GET /api/v1/radar/history` — páginas de 20, de la más nueva a la más vieja. */
export async function obtenerHistorial(cursor?: string | null): Promise<HistorialRadarApi> {
  const ruta = cursor ? `/api/v1/radar/history?cursor=${encodeURIComponent(cursor)}` : '/api/v1/radar/history';
  const r = await apiFetch<unknown>(ruta);
  const dato = validarRespuesta<HistorialRadarApi>(radarSchemas.historial, r, 'GET /api/v1/radar/history');
  return { entries: dato.entries, nextCursor: dato.nextCursor ?? null };
}
