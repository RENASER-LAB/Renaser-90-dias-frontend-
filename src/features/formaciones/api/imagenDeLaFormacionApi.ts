import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import { subidaDePortadaSchema, ultimoCambioSchema, type SubidaDePortadaApi } from '../../admin/api/bienvenidaSchemas';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';

/**
 * La imagen de cada formación en el chat (backend spec 035, D-308): la de la comunidad general y la de los grupos sin foto propia. Solo
 * Administración y Alquimista; cualquier otro recibe 403 del servidor, que es quien autoriza.
 *
 * Tolerante como el resto de Administración: un campo que el servidor agregue mañana no rompe la pantalla de hoy. Contra un backend anterior
 * (404) la sección no se dibuja.
 */
export const imagenDeLaFormacionSchema = z
  .object({
    formation: z.string(),
    /** Hay una imagen subida en efecto: la propia o, si no tiene, la de la Escuela. Sin ella los chats usan la de la app. */
    hayImagen: z.boolean(),
    /** La formación tiene una propia. */
    cambiada: z.boolean(),
    /** Usa la de la Escuela (siempre `false` en la Escuela). */
    heredada: z.boolean().nullish(),
    /** `false` si el servidor no guarda imágenes (almacenamiento de marcador, en local). */
    sePuedeCambiar: z.boolean(),
    ultimoCambio: ultimoCambioSchema.nullish(),
  })
  .passthrough();

export type ImagenDeLaFormacionApi = z.infer<typeof imagenDeLaFormacionSchema>;

const base = (codigo: string) => `/api/v1/admin/formaciones/${encodeURIComponent(codigo)}/imagen`;

export async function leerImagenDeLaFormacion(codigo: string): Promise<ImagenDeLaFormacionApi> {
  return validarRespuesta<ImagenDeLaFormacionApi>(
    imagenDeLaFormacionSchema,
    await apiFetch<unknown>(base(codigo), { timeoutMs: 15_000 }),
    `GET ${base('{codigo}')}`,
  );
}

/** Paso 1: dónde subir la imagen. Con el almacenamiento de marcador (local) `url` sale `about:blank#pendiente-s3/...`. */
export async function solicitarSubidaDeImagen(codigo: string, tipoContenido: string): Promise<SubidaDePortadaApi> {
  return validarRespuesta<SubidaDePortadaApi>(
    subidaDePortadaSchema,
    await apiFetch<unknown>(`${base(codigo)}/upload-url`, { method: 'POST', body: { contentType: tipoContenido }, timeoutMs: 15_000 }),
    `POST ${base('{codigo}')}/upload-url`,
  );
}

/** Paso 3: deja vigente la imagen ya subida y revisada. Lleva la RUTA del paso 1, no una URL. */
export async function confirmarImagenDeLaFormacion(codigo: string, ruta: string): Promise<ImagenDeLaFormacionApi> {
  return validarRespuesta<ImagenDeLaFormacionApi>(
    imagenDeLaFormacionSchema,
    await apiFetch<unknown>(`${base(codigo)}/confirm`, { method: 'POST', body: { ruta }, timeoutMs: 30_000 }),
    `POST ${base('{codigo}')}/confirm`,
  );
}

/** La Escuela vuelve a la imagen de la app; las otras dos, a la de la Escuela. */
export async function volverALaImagenOriginal(codigo: string): Promise<ImagenDeLaFormacionApi> {
  return validarRespuesta<ImagenDeLaFormacionApi>(
    imagenDeLaFormacionSchema,
    await apiFetch<unknown>(base(codigo), { method: 'DELETE', timeoutMs: 15_000 }),
    `DELETE ${base('{codigo}')}`,
  );
}

/**
 * La ruta de la vista previa (`GET …/imagen/vista`), relativa al backend. Sin `ruta`, la vigente (404 si no hay ninguna: se muestra la
 * de la app); con `ruta`, la candidata recién subida. Es una imagen: no pasa por `apiFetch`, la trae `traerTarjetaDeMuestra`.
 */
export function rutaDeLaVistaDeLaImagen(codigo: string, ruta?: string | null): string {
  return ruta ? `${base(codigo)}/vista?ruta=${encodeURIComponent(ruta)}` : `${base(codigo)}/vista`;
}
