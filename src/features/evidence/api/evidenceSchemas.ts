import { z } from 'zod';

/**
 * Validacion en runtime de `GET /api/v1/evidence` (`EvidenciaController.listar`).
 *
 * Mismo criterio que el resto de los esquemas del proyecto: `passthrough()` para que agregar
 * campos en el backend no rompa la app, pero fallar ruidoso si falta o cambia de tipo uno de
 * los que si se usan.
 */

/** Un item de `EvidenciaPageResponse.evidencias` (record `EvidenciaResponse` del backend). */
export const evidenciaApiSchema = z
  .object({
    id: z.string(),
    tipo: z.string(),
    contenidoTexto: z.string().nullable(),
    /** Cuando la subio el aprendiz. Puede faltar en registros viejos. */
    subidaEn: z.string().nullable(),
    /** Fecha que traia la foto en sus metadatos EXIF, si la traia. */
    timestampExif: z.string().nullable(),
    /** PENDIENTE | VALIDADA | RECHAZADA... lo decide `EstadoValidacion` en el backend. */
    estadoValidacion: z.string(),
    publicadaEnMuro: z.boolean(),
  })
  .passthrough();

export const paginaEvidenciasSchema = z
  .object({
    evidencias: z.array(evidenciaApiSchema),
    nextCursor: z.string().nullable(),
  })
  .passthrough();

export type EvidenciaApi = z.infer<typeof evidenciaApiSchema>;
export type PaginaEvidenciasApi = z.infer<typeof paginaEvidenciasSchema>;

export function validarRespuesta<T>(esquema: z.ZodType, datos: unknown, origen: string): T {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map(i => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join('; ');
    throw new Error(`El backend respondió algo inesperado en ${origen} — ${detalle}`);
  }
  return resultado.data as T;
}

/** Valores de `EstadoValidacion` (backend). Se dejan como constantes para no repetir cadenas. */
export const ESTADO_EVIDENCIA = {
  PENDIENTE: 'PENDIENTE',
  VALIDA: 'VALIDA',
  RECHAZADA: 'RECHAZADA',
  REVISION_MANUAL: 'REVISION_MANUAL',
  ANULADA_ADMIN: 'ANULADA_ADMIN',
} as const;

/** Icono del set propio para cada `TipoEvidencia` (FOTO | VIDEO | AUDIO | TEXTO | CAPTURA). */
export function iconoDeTipo(tipo: string): 'camera' | 'play' | 'volume' | 'doc' | 'image' {
  switch (tipo) {
    case 'FOTO': return 'camera';
    case 'VIDEO': return 'play';
    case 'AUDIO': return 'volume';
    case 'TEXTO': return 'doc';
    default: return 'image';
  }
}
