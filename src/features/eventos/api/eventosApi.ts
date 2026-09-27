import { apiFetch } from '../../../services/http/apiClient';
import type { Asistencia, Evento, Ocurrencia } from '../types/eventos.types';
import { leerEvento, leerOcurrencias, leerUrlDePortada, type UrlDePortada } from './eventosSchemas';

/**
 * `/api/v1/calendar/events` (backend `calendar`, `EventoController`). Cero endpoints nuevos: todos
 * existen desde la migración del calendario; lo que faltaba era una pantalla que los usara.
 *
 * Quién puede qué lo decide el servidor en cada llamada: listar y responder «Voy» es de todos (la
 * lista ya viene filtrada por la audiencia de cada evento); crear, editar y cancelar, solo ADMIN y
 * ALCHEMIST (D-186).
 */

const BASE = '/api/v1/calendar/events';
const tramo = encodeURIComponent;

/** Los próximos días que muestra la sección (spec E-5: «próximos 30 días»). */
export const DIAS_A_LA_VISTA = 30;

/** Las ocurrencias entre `desde` y `hasta`, ordenadas por hora. */
export async function listarEventos(desde: Date, hasta: Date): Promise<Ocurrencia[]> {
  const ruta = `${BASE}?from=${tramo(desde.toISOString())}&to=${tramo(hasta.toISOString())}`;
  return leerOcurrencias(await apiFetch<unknown>(ruta));
}

/**
 * Los días que muestra la sección Eventos (vista «Tarjetas», «Mi agenda» y el detalle): el mes en
 * curso y el siguiente (pedido del dueño del 2026-09-26). Las alarmas y los demás lectores siguen con
 * {@link DIAS_A_LA_VISTA}; la sincronización de alarmas no quita lo que queda fuera de su ventana.
 */
export const DIAS_EN_LA_SECCION = 60;

/** Las ocurrencias de los próximos `dias` días, desde ahora. */
export function listarProximos(ahoraMs: number, dias: number = DIAS_A_LA_VISTA): Promise<Ocurrencia[]> {
  // Desde una hora atrás: un evento que empezó hace un rato sigue siendo «al que me uno».
  return listarEventos(new Date(ahoraMs - 60 * 60 * 1000), new Date(ahoraMs + dias * 24 * 60 * 60 * 1000));
}

export async function obtenerEvento(id: string): Promise<Evento> {
  return leerEvento(await apiFetch<unknown>(`${BASE}/${tramo(id)}`));
}

/** «Voy» / «No voy». `occurrenceStart` identifica la fecha, aunque el evento no se repita. */
export async function responderAsistencia(
  eventoId: string,
  inicioOcurrencia: string,
  respuesta: Exclude<Asistencia, null>,
): Promise<void> {
  await apiFetch<unknown>(`${BASE}/${tramo(eventoId)}/rsvp`, {
    method: 'PUT',
    body: { occurrenceStart: inicioOcurrencia, status: respuesta },
  });
}

export async function crearEvento(cuerpo: Record<string, unknown>): Promise<Evento> {
  return leerEvento(await apiFetch<unknown>(BASE, { method: 'POST', body: cuerpo }));
}

export async function editarEvento(id: string, cuerpo: Record<string, unknown>): Promise<Evento> {
  return leerEvento(await apiFetch<unknown>(`${BASE}/${tramo(id)}`, { method: 'PUT', body: cuerpo }));
}

/**
 * Cancela el evento entero. El backend lo **borra** (`DELETE`, con sus respuestas y avisos
 * pendientes en cascada); no existe un estado «cancelado» que se pueda poner desde la API.
 */
export async function cancelarEvento(id: string): Promise<void> {
  await apiFetch<unknown>(`${BASE}/${tramo(id)}`, { method: 'DELETE' });
}

/** Cancela solo una fecha de un evento que se repite. */
export async function cancelarUnaFecha(id: string, inicioOcurrencia: string): Promise<void> {
  await apiFetch<unknown>(`${BASE}/${tramo(id)}/cancel-occurrence`, {
    method: 'POST',
    body: { occurrenceStart: inicioOcurrencia },
  });
}

/**
 * Paso 1 de la portada (solo ADMIN y ALCHEMIST): una URL prefirmada para subir la imagen directo al
 * almacenamiento (`EventoController.solicitarUrlPortada`). Los bytes nunca pasan por el backend.
 */
export async function solicitarUrlDePortada(id: string, tipoContenido: string): Promise<UrlDePortada> {
  return leerUrlDePortada(
    await apiFetch<unknown>(`${BASE}/${tramo(id)}/portada/upload-url`, {
      method: 'POST',
      body: { contentType: tipoContenido },
    }),
  );
}

/** Paso 3: fija la portada subida. Lleva la RUTA que devolvió el paso 1, no una URL. */
export async function confirmarPortada(id: string, ruta: string): Promise<Evento> {
  return leerEvento(
    await apiFetch<unknown>(`${BASE}/${tramo(id)}/portada/confirm`, { method: 'POST', body: { ruta } }),
  );
}
