import { apiFetch } from '../../../services/http/apiClient';
import type {
  WallCategory,
  WallComment,
  WallCommentsPage,
  WallFeedPage,
  WallPost,
  WallReactionsPage,
  WallReactionToggleResult,
  WallReactionType,
  WallUrlSubida,
} from '../types/community.types';
import {
  conteoMisPublicacionesSchema,
  urlSubidaMuroSchema,
  wallCategoriesResponseSchema,
  wallCommentCreadoSchema,
  wallCommentsPageSchema,
  wallFeedPageSchema,
  wallPostSchema,
  wallReactionsPageSchema,
  wallReactionToggleSchema,
  validarRespuesta,
} from './wallSchemas';

/**
 * Endpoints del Muro (`WallController`, `WallCommentController`, `WallCategoryController` en el
 * backend Java). Acá solo vive el "cómo se llama": qué hacer con la respuesta es del hook
 * `useWallFeed` o de la pantalla, no de esta capa — mismo criterio que
 * `features/auth/api/authApi.ts`.
 *
 * Lo que NO está acá, a propósito:
 * - `PATCH`/`DELETE /api/v1/wall/{id}` (editar/ocultar post) y lo mismo para comentarios: el
 *   diseño actual de la pestaña "muro" no tiene ningún botón de editar/borrar sobre una
 *   publicación o comentario propio, así que no hay desde dónde dispararlos sin inventar UI.
 */

export async function obtenerFeedMuro(cursor?: string, category?: string): Promise<WallFeedPage> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (category) params.set('category', category);
  const query = params.toString();
  const r = await apiFetch<unknown>(`/api/v1/wall${query ? `?${query}` : ''}`);
  return validarRespuesta<WallFeedPage>(wallFeedPageSchema, r, 'GET /api/v1/wall');
}

/**
 * `GET /api/v1/wall/mine` → cuántas publicaciones propias tiene el actor, de toda su historia
 * (`WallController.mine` → `PublicacionPersistenceAdapter.contarMisPublicaciones` →
 * `countByAutorId`). No pagina ni filtra por `oculta`.
 *
 * Existe para el arranque guiado (`features/sparkie`): "¿este aprendiz ya publicó su primer post?"
 * es un hecho del PARTICIPANTE, no del teléfono — tiene que sobrevivir a cerrar la app y a cambiar
 * de dispositivo. Por eso se pregunta al servidor en vez de guardar un flag local, y por eso no
 * hizo falta ninguna migración: el endpoint y el índice (`muro_autor_idx`, V1) ya estaban.
 */
export async function contarMisPublicaciones(): Promise<number> {
  const r = await apiFetch<unknown>('/api/v1/wall/mine');
  return validarRespuesta<{ count: number }>(conteoMisPublicacionesSchema, r, 'GET /api/v1/wall/mine').count;
}

export async function reaccionarPublicacion(
  postId: string,
  type: WallReactionType
): Promise<WallReactionToggleResult> {
  const r = await apiFetch<unknown>(`/api/v1/wall/${postId}/react`, {
    method: 'POST',
    body: { type },
  });
  return validarRespuesta<WallReactionToggleResult>(wallReactionToggleSchema, r,
    'POST /api/v1/wall/{id}/react');
}

/**
 * Quién reaccionó a una publicación (modal "Reacciones del post"). Sin paginación: el diseño
 * no pagina esta lista (`ScrollView` de altura fija), y el backend tampoco la pagina
 * (`WallReactionsResponse`, ver el informe de esta integración).
 */
export async function obtenerReacciones(postId: string): Promise<WallReactionsPage> {
  const r = await apiFetch<unknown>(`/api/v1/wall/${postId}/reactions`);
  return validarRespuesta<WallReactionsPage>(wallReactionsPageSchema, r, 'GET /api/v1/wall/{id}/reactions');
}

export async function obtenerComentarios(postId: string, cursor?: string): Promise<WallCommentsPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const r = await apiFetch<unknown>(`/api/v1/wall/${postId}/comments${query}`);
  return validarRespuesta<WallCommentsPage>(wallCommentsPageSchema, r,
    'GET /api/v1/wall/{postId}/comments');
}

export async function crearComentario(
  postId: string,
  text: string
): Promise<{ comment: WallComment; commentCount: number }> {
  const r = await apiFetch<unknown>(`/api/v1/wall/${postId}/comments`, {
    method: 'POST',
    body: { text },
  });
  return validarRespuesta(wallCommentCreadoSchema, r, 'POST /api/v1/wall/{postId}/comments');
}

/**
 * Catálogo de categorías del Muro. Devuelve **solo las activas**, ya ordenadas por `orden`
 * (`CategoriaMuroPersistenceAdapter.listarActivas`), y sin `isActive`/`isSystem` — esos dos
 * campos son del CRUD de administración (`GET /api/v1/admin/wall-categories`), no de este.
 *
 * Lo consume el compositor del Muro vía `useCategoriasMuro`. Es lo que hace cierta la promesa del
 * panel de administración ("los cambios llegan a la app sin publicar una versión nueva"): las
 * pastillas son lo que hay en `categorias_muro` en ese momento, no una lista compilada.
 *
 * > **Corregido 2026-09-06.** Este comentario decía *"Sin UI que la use hoy: la pestaña muro no
 * > tiene selector de categorías"*. Sí lo tenía — tres pastillas escritas a mano
 * > (`🔥 VICTORIA SOMÁTICA`, `⚡ ALTO RENDIMIENTO`, `🧠 REFLEXIÓN`) que no existen en el catálogo
 * > y que además nunca se mandaban al publicar. Ver `docs/BITACORA_ERRORES.md` E-135.
 */
export async function obtenerCategoriasMuro(): Promise<WallCategory[]> {
  const r = await apiFetch<unknown>('/api/v1/wall/categories');
  return validarRespuesta<{ categories: WallCategory[] }>(wallCategoriesResponseSchema, r,
    'GET /api/v1/wall/categories').categories;
}

/**
 * Pide la URL prefirmada de S3 para subir una foto del Muro (`WallController.urlDeSubida`,
 * D-34/CLAUDE.MD "STORAGE"). Devuelve `{uploadUrl, bucket, ruta}`; el `PUT` de los bytes va
 * aparte (`subirImagenAS3`), directo a S3, nunca a este backend.
 */
export async function solicitarUrlSubidaMuro(tipoContenido: string): Promise<WallUrlSubida> {
  const r = await apiFetch<unknown>('/api/v1/wall/media/upload-url', {
    method: 'POST',
    body: { tipoContenido },
  });
  return validarRespuesta<WallUrlSubida>(urlSubidaMuroSchema, r, 'POST /api/v1/wall/media/upload-url');
}

/**
 * Mientras el backend no tenga `STORAGE_PROVEEDOR=s3` configurado (bloqueante externo, ver el
 * informe de la tarea), `NoOpAlmacenamientoAdapter` devuelve `about:blank#pendiente-s3/<ruta>`
 * como `uploadUrl` — un `PUT` a esa URL no sube nada a ningún lado y falla con un error de red
 * críptico. Se detecta ACÁ, antes de intentar subir, para poder avisar con un mensaje claro en
 * vez de dejar que `fetch` reviente con "Failed to fetch".
 */
export function almacenamientoSinConfigurar(uploadUrl: string): boolean {
  return !uploadUrl.startsWith('http://') && !uploadUrl.startsWith('https://');
}

/**
 * `PUT` directo a S3 con la URL prefirmada — nunca pasa por este backend (CLAUDE.MD "STORAGE":
 * "el backend nunca toca los bytes"). Por eso NO usa `apiFetch`: `apiFetch` antepone la
 * `BASE_URL` del backend Java y agrega el header de sesión `X-Auth-Token`, y ninguna de las dos
 * cosas corresponde acá — mandarle el token de sesión a S3 no tiene sentido, y el `Content-Type`
 * tiene que ser EXACTAMENTE el que se firmó del lado del servidor o S3 rechaza la firma
 * (ver `S3AlmacenamientoAdapter.firmarSubida`, comentario sobre el `contentType` firmado).
 */
export async function subirImagenAS3(uploadUrl: string, uri: string, mimeType: string): Promise<void> {
  // D-104: `.arrayBuffer()` y no `.blob()` — con un Blob de RN el `Content-Type` real puede no
  // coincidir con el firmado y S3 devuelve 403. Mismo arreglo que el onboarding y evidencias.
  const bytes = await (await fetch(uri)).arrayBuffer();
  const respuesta = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: bytes,
  });
  if (!respuesta.ok) {
    throw new Error(`No se pudo subir la foto al almacenamiento (S3 respondió ${respuesta.status}).`);
  }
}

/**
 * `WallController.publicar` (POST /api/v1/wall). `category` es opcional del lado del backend.
 *
 * **`media[].url` lleva la RUTA, no una URL** — la `ruta` que devolvió
 * `solicitarUrlSubidaMuro`, tal cual. El nombre del campo es histórico (la app vieja mandaba una
 * URL absoluta y el backend sigue aceptando esa forma por compatibilidad), pero lo que se guarda
 * tiene que ser la clave del objeto en S3: el feed la vuelve a firmar en cada lectura, así que
 * una URL guardada ahí queda en 404 para siempre aunque el archivo exista.
 *
 * Antes acá vivía un helper `urlPermanenteDesdeSubida(uploadUrl)` que cortaba la firma y mandaba
 * la URL absoluta. Era exactamente el defecto E-79 y por eso se eliminó en vez de dejarlo sin
 * usar: mientras exista, alguien lo vuelve a llamar.
 */
export async function publicarEnMuro(
  text: string,
  media: { url: string; mimeType: string }[],
  category?: string | null
): Promise<WallPost> {
  const r = await apiFetch<unknown>('/api/v1/wall', {
    method: 'POST',
    body: { text, media, category: category ?? null },
  });
  return validarRespuesta<WallPost>(wallPostSchema, r, 'POST /api/v1/wall');
}
