import { z } from 'zod';

/**
 * Lo que responde la consola Soporte TI (spec 002, contrato `contracts/funcionalidades.md` §6). Tolerante a propósito
 * (`passthrough`, `nullish`, enums como `string`): el backend lo construye otro agente en paralelo y un campo nuevo o
 * un valor nuevo no puede romper la consola, que es justo la herramienta para cuando algo se rompe.
 */

export const desbloqueoSchema = z.object({ token: z.string(), venceEn: z.string().nullish() }).passthrough();
export type DesbloqueoApi = z.infer<typeof desbloqueoSchema>;

/** Para qué se pide la contraseña: abrir la consola o confirmar un cambio crítico (token de un solo uso). */
export type ParaQueSeDesbloquea = 'CONSOLA' | 'CAMBIO_CRITICO';

const personaSchema = z.object({ id: z.string().nullish(), nombre: z.string().nullish() }).passthrough();

export const funcionalidadConsolaSchema = z
  .object({
    clave: z.string(),
    madre: z.string().nullish(),
    area: z.string().nullish(),
    nombre: z.string().nullish(),
    descripcion: z.string().nullish(),
    rolesQueLaUsan: z.array(z.string()).nullish(),
    critica: z.boolean().nullish(),
    porDefecto: z.string().nullish(),
    prendidaGlobal: z.boolean(),
    porRol: z.record(z.string(), z.boolean()).nullish(),
    aviso: z.string().nullish(),
    version: z.number(),
    actualizadoPor: personaSchema.nullish(),
    actualizadoEn: z.string().nullish(),
    circuito: z.object({ estado: z.string(), proximaPrueba: z.string().nullish() }).passthrough().nullish(),
  })
  .passthrough();
export type FuncionalidadConsola = z.infer<typeof funcionalidadConsolaSchema>;
export const listaDeFuncionalidadesSchema = z.array(funcionalidadConsolaSchema);

/** Lo que manda «Guardar» (`PUT /soporte-ti/funcionalidades/{clave}`). `version` es la que se leyó: 409 si cambió. */
export interface CambioDeFuncionalidad {
  prendidaGlobal: boolean;
  porRol: Record<string, boolean>;
  aviso: string | null;
  motivo: string;
  version: number;
}

/** Una fila de la auditoría (tabla `cambios_auditados`). El actor puede llegar como objeto o como campos sueltos. */
export const cambioAuditadoSchema = z
  .object({
    id: z.string().nullish(),
    tipo: z.string().nullish(),
    actor: personaSchema.nullish(),
    actorId: z.string().nullish(),
    actorNombre: z.string().nullish(),
    clave: z.string().nullish(),
    antes: z.unknown().optional(),
    despues: z.unknown().optional(),
    motivo: z.string().nullish(),
    dispositivo: z.string().nullish(),
    creadoEn: z.string().nullish(),
  })
  .passthrough();
export type CambioAuditado = z.infer<typeof cambioAuditadoSchema>;

export const paginaDeAuditoriaSchema = z
  .object({
    contenido: z.array(cambioAuditadoSchema),
    pagina: z.number().nullish(),
    total: z.number().nullish(),
  })
  .passthrough();
export type PaginaDeAuditoria = z.infer<typeof paginaDeAuditoriaSchema>;

export const parteDelCircuitoSchema = z
  .object({
    parte: z.string(),
    estado: z.string(),
    fallasEnVentana: z.number().nullish(),
    abiertoDesde: z.string().nullish(),
    proximaPrueba: z.string().nullish(),
  })
  .passthrough();
export type ParteDelCircuito = z.infer<typeof parteDelCircuitoSchema>;
export const circuitoSchema = z.array(parteDelCircuitoSchema);
