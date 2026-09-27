import { z } from 'zod';

/**
 * Contrato de `/api/v1/admin/bienvenida` (backend D-210, 27/09): los tres textos de la bienvenida y
 * la portada de la tarjeta, que Administración y Alquimista cambian desde la app.
 *
 * Tolerante como el resto de Administración (`passthrough()`, `nullish()` en lo opcional): un campo
 * que el servidor agregue mañana no rompe la pantalla de hoy. Lo que sí se exige es lo que la
 * pantalla necesita para no mentir: el texto que sale hoy, el original, si está cambiado y qué
 * marcadores lleva cada uno.
 */

/** Quién hizo el último cambio de una pieza y cuándo. `por` es `null` si esa cuenta ya no existe. */
export const ultimoCambioSchema = z
  .object({
    por: z.string().nullish(),
    en: z.string(),
    volvioAlOriginal: z.boolean().nullish(),
  })
  .passthrough();

export const textoDeBienvenidaSchema = z
  .object({
    /** SOPORTE_CON_LA_TARJETA | SOPORTE_FORMAL | GRUPO. `string` y no enum: uno nuevo no rompe la lista. */
    clave: z.string(),
    /** El que sale hoy. */
    texto: z.string(),
    /** El del archivo del repo (`bienvenida/mensajes.yaml`). */
    original: z.string(),
    /** `true` si hoy sale uno guardado por Administración. */
    cambiado: z.boolean(),
    /** Los que el texto tiene que llevar, y los únicos que puede llevar: `{nombre}`, `{mentor}`. */
    marcadores: z.array(z.string()),
    ultimoCambio: ultimoCambioSchema.nullish(),
  })
  .passthrough();

export const portadaDeBienvenidaSchema = z
  .object({
    cambiada: z.boolean(),
    /** `false` si el servidor no guarda imágenes (almacenamiento de marcador, en local). */
    sePuedeCambiar: z.boolean(),
    ultimoCambio: ultimoCambioSchema.nullish(),
  })
  .passthrough();

export const bienvenidaSchema = z
  .object({
    /** Si las bienvenidas automáticas están prendidas (`BIENVENIDA_ACTIVA`). */
    activa: z.boolean(),
    largoMaximo: z.number(),
    textos: z.array(textoDeBienvenidaSchema),
    portada: portadaDeBienvenidaSchema,
  })
  .passthrough();

/** `POST /api/v1/admin/bienvenida/portada/upload-url` → a dónde subir y con qué ruta confirmar. */
export const subidaDePortadaSchema = z
  .object({
    url: z.string(),
    ruta: z.string(),
  })
  .passthrough();

export type UltimoCambioApi = z.infer<typeof ultimoCambioSchema>;
export type TextoDeBienvenidaApi = z.infer<typeof textoDeBienvenidaSchema>;
export type PortadaDeBienvenidaApi = z.infer<typeof portadaDeBienvenidaSchema>;
export type BienvenidaApi = z.infer<typeof bienvenidaSchema>;
export type SubidaDePortadaApi = z.infer<typeof subidaDePortadaSchema>;
