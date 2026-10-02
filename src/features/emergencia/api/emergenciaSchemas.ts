import { z } from 'zod';

/**
 * Contrato del botón de emergencia (backend D-244). Tolerante como el resto (`passthrough()`,
 * `nullish()` en lo opcional): un campo que el servidor agregue mañana no rompe la pantalla.
 */

const textoOpcional = z.string().nullish();

export const pedidoDeEmergenciaSchema = z
  .object({
    id: z.string(),
    queOcurrio: z.string(),
    diaPedido: z.number(),
    diaAlPedir: z.number(),
    estado: z.string(),
    creadaEn: textoOpcional,
    resueltaEn: textoOpcional,
    diaAplicado: z.number().nullish(),
  })
  .passthrough();

/** `GET /api/v1/me/emergency-request`. `diaMaximo` 0 = todavía no empezó: no hay botón. */
export const miEmergenciaSchema = z
  .object({
    diaActual: z.number(),
    diaMaximo: z.number(),
    abierta: pedidoDeEmergenciaSchema.nullish(),
  })
  .passthrough();

/** `GET /api/v1/admin/trainees/{id}/emergency-request` (200; un 204 es «no tiene»). */
export const emergenciaParaSoporteSchema = z
  .object({
    id: z.string(),
    aprendizId: z.string(),
    nombre: textoOpcional,
    queOcurrio: z.string(),
    diaPedido: z.number(),
    diaAlPedir: z.number(),
    diaActual: z.number(),
    creadaEn: textoOpcional,
  })
  .passthrough();

export type PedidoDeEmergencia = z.infer<typeof pedidoDeEmergenciaSchema>;
export type MiEmergencia = z.infer<typeof miEmergenciaSchema>;
export type EmergenciaParaSoporte = z.infer<typeof emergenciaParaSoporteSchema>;
