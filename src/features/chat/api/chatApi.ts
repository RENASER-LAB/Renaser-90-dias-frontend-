import { apiFetch } from '../../../services/http/apiClient';
import type { WireConversacion, WireConversacionResumen, WireMensaje, WireMensajesPage, WireMiembrosPage } from '../types/chat.types';
import {
  validarRespuesta,
  wireConversacionesListSchema,
  wireConversacionSchema,
  wireMensajeSchema,
  wireMensajesPageSchema,
  wireMiembrosPageSchema,
} from './chatSchemas';

/**
 * Endpoints de Chat (`ConversacionController`, `MensajeController`, `MiembroController` en el
 * backend Java). Acá solo vive el "cómo se llama" — mismo criterio que `wallApi.ts`.
 *
 * Lo que NO está acá, a propósito (backend real, no inventado):
 * - `PATCH /conversations/global/name`: requiere `RENAME_GLOBAL_CHAT`, que el aprendiz no tiene.
 * - Envío de audio/imagen/video/gif: `EnviarMensajeRequest` acepta `mediaBucket`/`mediaPath`, pero
 *   no existe ningún endpoint de subida (`upload-url`) para medios de chat — a diferencia del Muro
 *   (`POST /wall/media/upload-url`), acá no hay dónde conseguir esas referencias. Solo se manda
 *   `type: 'TEXT'`.
 */

export async function obtenerConversaciones(): Promise<WireConversacionResumen[]> {
  const r = await apiFetch<unknown>('/api/v1/chat/conversations');
  return validarRespuesta<WireConversacionResumen[]>(wireConversacionesListSchema, r,
    'GET /api/v1/chat/conversations');
}

/** `POST /conversations/direct` — abre (o recupera) el 1 a 1 con `otherUserId`. */
export async function abrirConversacionDirecta(otherUserId: string): Promise<WireConversacion> {
  const r = await apiFetch<unknown>('/api/v1/chat/conversations/direct', {
    method: 'POST',
    body: { otherUserId },
  });
  return validarRespuesta<WireConversacion>(wireConversacionSchema, r, 'POST /api/v1/chat/conversations/direct');
}

export async function marcarConversacionLeida(conversationId: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/chat/conversations/${conversationId}/read`, { method: 'POST' });
}

export async function obtenerMensajes(conversationId: string, cursor?: string): Promise<WireMensajesPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const r = await apiFetch<unknown>(`/api/v1/chat/conversations/${conversationId}/messages${query}`);
  return validarRespuesta<WireMensajesPage>(wireMensajesPageSchema, r,
    'GET /api/v1/chat/conversations/{id}/messages');
}

/** Solo texto (ver nota de arriba): el resto de `EnviarMensajeRequest` queda sin usar porque no
 * hay forma real de conseguir esos valores desde la app. */
export async function enviarMensajeTexto(conversationId: string, text: string): Promise<WireMensaje> {
  const r = await apiFetch<unknown>(`/api/v1/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { type: 'TEXT', text },
  });
  return validarRespuesta<WireMensaje>(wireMensajeSchema, r,
    'POST /api/v1/chat/conversations/{id}/messages');
}

/** `GET /chat/members` — a quién se le puede escribir (#27). Directorio completo: todo usuario
 * activo está auto-unido al chat GLOBAL, así que no hace falta una consulta aparte a `users`. */
export async function obtenerDirectorioMiembros(query?: string, cursor?: string): Promise<WireMiembrosPage> {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (cursor) params.set('cursor', cursor);
  const qs = params.toString();
  const r = await apiFetch<unknown>(`/api/v1/chat/members${qs ? `?${qs}` : ''}`);
  return validarRespuesta<WireMiembrosPage>(wireMiembrosPageSchema, r, 'GET /api/v1/chat/members');
}

/** `GET /conversations/global/members` — roster del grupo GLOBAL (#28). */
export async function obtenerMiembrosGlobal(cursor?: string): Promise<WireMiembrosPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const r = await apiFetch<unknown>(`/api/v1/chat/conversations/global/members${query}`);
  return validarRespuesta<WireMiembrosPage>(wireMiembrosPageSchema, r,
    'GET /api/v1/chat/conversations/global/members');
}
