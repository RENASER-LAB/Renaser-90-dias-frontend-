import { apiFetch } from '../../../services/http/apiClient';
import type {
  WallCategory,
  WallComment,
  WallCommentsPage,
  WallFeedPage,
  WallPost,
  WallReactionToggleResult,
  WallReactionType,
  WallUrlSubida,
} from '../types/community.types';
import {
  urlSubidaMuroSchema,
  wallCategoriesResponseSchema,
  wallCommentCreadoSchema,
  wallCommentsPageSchema,
  wallFeedPageSchema,
  wallPostSchema,
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
 * Sin UI que la use hoy: la pestaña "muro" no tiene selector de categorías (no hay pills en el
 * diseño actual, `git grep -ni categor` sobre `ComunidadScreen.tsx` no encuentra ninguna en esa
 * pestaña). Se deja lista para el día que se agregue esa UI, en vez de no escribirla.
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
  const bytes = await (await fetch(uri)).blob();
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
 * La URL permanente del objeto es la misma `uploadUrl` sin la firma (todo lo que sigue a `?`,
 * que es la credencial temporal de escritura — ver `PutObjectPresignRequest` en
 * `S3AlmacenamientoAdapter`). Es lo que espera `MediaItemRequest.url` en `POST /api/v1/wall`: el
 * backend documenta ahí mismo que "la app publicada manda una URL absoluta directa... no
 * bucket+ruta" (CM-06).
 */
export function urlPermanenteDesdeSubida(uploadUrl: string): string {
  return uploadUrl.split('?')[0];
}

/** `WallController.publicar` (POST /api/v1/wall). `category` es opcional del lado del backend. */
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
