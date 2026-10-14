import { z } from 'zod';

import { apiFetchConRespuesta } from '../../../services/http/apiClient';

/**
 * Lo que está apagado para esta sesión (spec 002 del backend, contrato `contracts/funcionalidades.md` §6 y §8):
 * `GET /api/v1/funcionalidades/mias`. Lo que no figura en `apagadas` está prendido. Si una madre está apagada, el
 * servidor manda también a todas sus hijas, así la app no tiene que conocer el árbol.
 *
 * Tolerante a propósito (`passthrough`, `nullish`): un campo nuevo del servidor no rompe la lectura.
 */
export const RUTA_MIS_FUNCIONALIDADES = '/api/v1/funcionalidades/mias';

export const misFuncionalidadesSchema = z
  .object({
    version: z.number(),
    apagadas: z.array(z.object({ clave: z.string(), aviso: z.string().nullish() }).passthrough()),
    /**
     * Fase 2 (contrato `fase-2.md` §1): lo que a esta persona todavía no le toca (un despliegue en el que no entró,
     * algo que su rol personalizado no tiene). La app lo ESCONDE, no muestra el aviso. Aditivo y tolerante: un backend
     * de la fase 1 no lo manda (todo disponible) y un elemento que no es texto se descarta.
     */
    noDisponibles: z.array(z.unknown()).nullish(),
  })
  .passthrough();

export type MisFuncionalidadesApi = z.infer<typeof misFuncionalidadesSchema>;

/** Una funcionalidad apagada, ya limpia: el aviso vacío es `null` (la app muestra el genérico). */
export type FuncionalidadApagada = { clave: string; aviso: string | null };

export type LecturaDeFuncionalidades =
  /** 304: nada cambió desde la última lectura (mismo `ETag`). */
  | { tipo: 'sin_cambios' }
  | {
      tipo: 'nueva';
      version: number;
      etag: string | null;
      apagadas: FuncionalidadApagada[];
      /** Las claves que esta sesión no tiene (fase 2). Sin el campo, ninguna: todo disponible. */
      noDisponibles?: string[];
    };

/** Las claves no disponibles tal como se usan: solo texto no vacío, sin repetir. */
export function limpiarNoDisponibles(lista: readonly unknown[] | null | undefined): string[] {
  const claves = new Set<string>();
  for (const clave of lista ?? []) {
    if (typeof clave === 'string' && clave.trim()) claves.add(clave.trim());
  }
  return [...claves];
}

/** El aviso tal como se muestra: sin espacios sobrantes; vacío = sin aviso. */
export function limpiarAviso(aviso: string | null | undefined): string | null {
  const limpio = typeof aviso === 'string' ? aviso.trim() : '';
  return limpio ? limpio : null;
}

/**
 * Lee el estado de esta sesión. Con `etag` manda `If-None-Match`: si nada cambió el servidor responde 304 y no
 * viaja la lista. Un cuerpo que no cumple el contrato es un error (quien llama se queda con lo último que tenía).
 */
export async function leerMisFuncionalidades(etag: string | null): Promise<LecturaDeFuncionalidades> {
  const respuesta = await apiFetchConRespuesta<unknown>(RUTA_MIS_FUNCIONALIDADES, {
    cabeceras: etag ? { 'If-None-Match': etag } : undefined,
    timeoutMs: 15_000,
  });
  if (respuesta.status === 304) return { tipo: 'sin_cambios' };
  const resultado = misFuncionalidadesSchema.safeParse(respuesta.datos);
  if (!resultado.success) {
    throw new Error(`El backend respondió algo inesperado en GET ${RUTA_MIS_FUNCIONALIDADES}`);
  }
  return {
    tipo: 'nueva',
    version: resultado.data.version,
    etag: respuesta.cabecera('ETag'),
    apagadas: resultado.data.apagadas.map(a => ({ clave: a.clave, aviso: limpiarAviso(a.aviso) })),
    noDisponibles: limpiarNoDisponibles(resultado.data.noDisponibles),
  };
}
