import { apiFetch } from '../../../services/http/apiClient';
import type { ChatUrlSubida, WireConversacion, WireConversacionResumen, WireMensaje, WireMensajesPage, WireMiembrosPage } from '../types/chat.types';
import {
  urlSubidaChatSchema,
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
 *
 * Fotos y audios SÍ están, desde que el backend expone `POST /conversations/{id}/media/upload-url`
 * (antes `chat` era el único módulo sin endpoint de subida, y por eso acá decía que solo se podía
 * mandar `type: 'TEXT'`). El patrón es el mismo de tres pasos que usa el Muro: pedir la URL
 * firmada, `PUT` de los bytes directo a S3, y recién entonces crear el mensaje con `mediaBucket`
 * y `mediaPath`. Los bytes nunca pasan por el backend.
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

/** Mensaje de solo texto. Para foto o audio va `enviarMensajeConMedia`, después de subir. */
export async function enviarMensajeTexto(conversationId: string, text: string): Promise<WireMensaje> {
  const r = await apiFetch<unknown>(`/api/v1/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { type: 'TEXT', text },
  });
  return validarRespuesta<WireMensaje>(wireMensajeSchema, r,
    'POST /api/v1/chat/conversations/{id}/messages');
}

/**
 * Paso 1 de 3 — `POST /conversations/{id}/media/upload-url`. Devuelve `{uploadUrl, bucket, ruta}`.
 * `tipoContenido` es el MIME real del archivo y tiene que ser EXACTAMENTE el mismo que después se
 * manda en el `PUT`: S3 firma incluyendo el `Content-Type`, y si no coincide responde 403.
 *
 * El backend solo acepta `image/*`, `audio/*` y `video/*`; cualquier otro MIME lo rechaza ahí
 * mismo para no dejar un archivo huérfano en el bucket que ningún mensaje podría referenciar.
 */
export async function solicitarUrlSubidaChat(conversationId: string,
                                              tipoContenido: string): Promise<ChatUrlSubida> {
  const r = await apiFetch<unknown>(`/api/v1/chat/conversations/${conversationId}/media/upload-url`, {
    method: 'POST',
    body: { tipoContenido },
  });
  return validarRespuesta<ChatUrlSubida>(urlSubidaChatSchema, r,
    'POST /api/v1/chat/conversations/{id}/media/upload-url');
}

/**
 * Mientras el backend no tenga `STORAGE_PROVEEDOR=s3` configurado (D-34), el adaptador NoOp
 * devuelve `about:blank#pendiente-s3/<ruta>` como `uploadUrl`. Un `PUT` ahí no sube nada y falla
 * con un error de red críptico, así que se detecta ANTES de intentarlo para poder avisar claro.
 */
export function almacenamientoSinConfigurar(uploadUrl: string): boolean {
  return !uploadUrl.startsWith('http://') && !uploadUrl.startsWith('https://');
}

/**
 * Paso 2 de 3 — `PUT` directo a S3, nunca a este backend (CLAUDE.MD "STORAGE": "el backend nunca
 * toca los bytes"). Por eso NO usa `apiFetch`: aquél antepone la `BASE_URL` del backend Java y
 * agrega el header de sesión, y ninguna de las dos cosas corresponde acá — mandarle el token de
 * sesión a S3 no tiene sentido, y el `Content-Type` tiene que ser EXACTAMENTE el que se firmó del
 * lado del servidor o S3 rechaza la firma.
 *
 * Es gemelo de `wallApi.subirImagenAS3` y está duplicado a propósito, con el mismo criterio con
 * el que `habits/utils/capturarEvidencia.ts` replicó al del Muro en vez de importarlo: `chat` no
 * debe depender de `community`. Son doce líneas; la dependencia entre features costaría más.
 */
export async function subirMediaChatAS3(uploadUrl: string, uri: string,
                                          mimeType: string): Promise<void> {
  // D-104: `.arrayBuffer()` y no `.blob()` — con un Blob de RN el `Content-Type` real puede no
  // coincidir con el firmado y S3 devuelve 403. Mismo arreglo que el Muro y las evidencias.
  const bytes = await (await fetch(uri)).arrayBuffer();
  const respuesta = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: bytes,
  });
  if (!respuesta.ok) {
    throw new Error(`No se pudo subir el archivo al almacenamiento (S3 respondió ${respuesta.status}).`);
  }
}

/**
 * Paso 3 de 3 — crea el mensaje ya con la referencia al objeto subido.
 *
 * `mediaPath` lleva la RUTA que devolvió el paso 1, no una URL: la URL firmada vence, así que
 * guardarla dejaría la foto en 403 para siempre. El backend vuelve a firmar en cada lectura y
 * devuelve `mediaUrl` lista para mostrar (mismo criterio y mismo defecto ya cometido en el Muro,
 * E-79).
 *
 * `durationSeconds` solo se manda para audio; el backend exige que sea positivo si viene.
 */
export async function enviarMensajeConMedia(conversationId: string, params: {
  tipo: 'IMAGE' | 'AUDIO' | 'VIDEO';
  bucket: string;
  ruta: string;
  mime: string;
  durationSeconds?: number;
  text?: string;
}): Promise<WireMensaje> {
  const r = await apiFetch<unknown>(`/api/v1/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: {
      type: params.tipo,
      text: params.text ?? null,
      mediaBucket: params.bucket,
      mediaPath: params.ruta,
      mediaMime: params.mime,
      mediaDurationSeconds: params.durationSeconds ?? null,
    },
  });
  return validarRespuesta<WireMensaje>(wireMensajeSchema, r,
    'POST /api/v1/chat/conversations/{id}/messages (media)');
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
