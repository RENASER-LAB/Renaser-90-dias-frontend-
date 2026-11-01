import { z } from 'zod';

/**
 * Los términos y condiciones editables (spec 027, backend D-304). Esquemas TOLERANTES: un campo de más no rompe nada y un campo roto pierde la
 * lectura de esa pieza, no la pantalla. Un servidor anterior no tiene estas rutas: la app usa entonces el texto que lleva dentro.
 */

export const versionDeTerminosSchema = z
  .object({
    id: z.string(),
    formation: z.string(),
    state: z.string(),
    number: z.number().nullish(),
    title: z.string(),
    introduction: z.string().nullish().catch(''),
    clauses: z.array(z.string()),
    checkboxText: z.string(),
    note: z.string().nullish(),
    asksNewAcceptance: z.boolean().catch(false),
    baseNumber: z.number().nullish(),
    publishedAt: z.string().nullish(),
    updatedAt: z.string().nullish(),
  })
  .passthrough();

export const terminosDeMiFormacionSchema = z
  .object({
    formation: z.object({ code: z.string(), name: z.string() }).passthrough(),
    version: versionDeTerminosSchema.nullish().catch(null),
    pending: z.string().catch('NONE'),
    blocks: z.boolean().catch(false),
    lastAcceptedNumber: z.number().nullish(),
    changeNote: z.string().nullish(),
  })
  .passthrough();

/** `signatureUrl`: la firma que dibujó al aceptar (enlace de lectura de 15 minutos); ausente si no quedó firma o es un backend anterior. */
export const terminosAceptadosSchema = z
  .object({ version: versionDeTerminosSchema, acceptedAt: z.string(), signatureUrl: z.string().nullish().catch(null) })
  .passthrough();

export const resumenDeTerminosSchema = z
  .object({
    formation: z.string(),
    name: z.string(),
    current: versionDeTerminosSchema.nullish().catch(null),
    hasDraft: z.boolean().catch(false),
    acceptedCount: z.number().catch(0),
    needsReview: z.boolean().catch(false),
  })
  .passthrough();

export const historialDeTerminosSchema = z
  .object({ version: versionDeTerminosSchema, acceptedCount: z.number().catch(0), publishedByName: z.string().nullish() })
  .passthrough();

export const detalleDeTerminosSchema = z
  .object({
    formation: z.string(),
    name: z.string(),
    current: versionDeTerminosSchema.nullish().catch(null),
    draft: versionDeTerminosSchema.nullish().catch(null),
    versions: z.array(historialDeTerminosSchema).catch([]),
  })
  .passthrough();

const personaSchema = z.object({ id: z.string(), name: z.string().nullish() }).passthrough();

export const quienesAceptaronSchema = z
  .object({ number: z.number(), accepted: z.array(personaSchema).catch([]), missing: z.array(personaSchema).catch([]) })
  .passthrough();

export const constanciaSchema = z
  .object({ formation: z.string(), number: z.number(), acceptedAt: z.string(), signatureUrl: z.string().nullish() })
  .passthrough();

export type VersionDeTerminosApi = z.infer<typeof versionDeTerminosSchema>;
export type TerminosDeMiFormacionApi = z.infer<typeof terminosDeMiFormacionSchema>;
export type TerminosAceptadosApi = z.infer<typeof terminosAceptadosSchema>;
export type ResumenDeTerminosApi = z.infer<typeof resumenDeTerminosSchema>;
export type DetalleDeTerminosApi = z.infer<typeof detalleDeTerminosSchema>;
export type QuienesAceptaronApi = z.infer<typeof quienesAceptaronSchema>;
export type ConstanciaApi = z.infer<typeof constanciaSchema>;
