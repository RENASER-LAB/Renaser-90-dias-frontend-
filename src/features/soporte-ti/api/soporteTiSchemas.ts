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
    /** Fase 2 (contrato `fase-2.md` §3.4): `null` o ausente = no está en despliegue (la tienen todos). */
    despliegue: z
      .object({ porcentaje: z.number(), probadores: z.number().nullish() })
      .passthrough()
      .nullish(),
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

// ---------------------------------------------------------------------------------------------------------------------
// Fase 2 — despliegue progresivo (contrato `fase-2.md` §3.4)
// ---------------------------------------------------------------------------------------------------------------------

const conteoSchema = z.object({ pedidos: z.number().nullish(), errores: z.number().nullish() }).passthrough();

export const metricaDeHoraSchema = z
  .object({
    hora: z.string(),
    dentro: conteoSchema.nullish(),
    fuera: conteoSchema.nullish(),
  })
  .passthrough();
export type MetricaDeHora = z.infer<typeof metricaDeHoraSchema>;

export const probadorSchema = z
  .object({ id: z.string(), nombre: z.string().nullish(), email: z.string().nullish() })
  .passthrough();
export type Probador = z.infer<typeof probadorSchema>;

export const despliegueSchema = z
  .object({
    clave: z.string().nullish(),
    enDespliegue: z.boolean().nullish(),
    porcentaje: z.number().nullish(),
    version: z.number().nullish(),
    iniciadoEn: z.string().nullish(),
    actualizadoPor: personaSchema.nullish(),
    actualizadoEn: z.string().nullish(),
    probadores: z.array(probadorSchema).nullish(),
    metricas: z.array(metricaDeHoraSchema).nullish(),
    /**
     * Aditivo (contrato §3.4, 2026-10-14): `false` en lo que se usa sin cuenta (`rolesQueLaUsan` vacío; hoy solo
     * `registro`): sin persona no hay cubeta y un despliegue no tendría efecto. Sin el campo (backend anterior), `true`.
     */
    desplegable: z.boolean().nullish(),
  })
  .passthrough();
export type DespliegueApi = z.infer<typeof despliegueSchema>;

/** Lo que manda un escalón (`PUT …/despliegue`). `100` termina el despliegue: la tienen todos. */
export interface CambioDeDespliegue {
  porcentaje: number;
  motivo: string;
  version?: number;
}

export const personaBuscadaSchema = z
  .object({ id: z.string(), nombre: z.string().nullish(), email: z.string().nullish(), rol: z.string().nullish() })
  .passthrough();
export type PersonaBuscada = z.infer<typeof personaBuscadaSchema>;
export const listaDePersonasSchema = z.array(personaBuscadaSchema);

// ---------------------------------------------------------------------------------------------------------------------
// Fase 2 — roles personalizados (contrato `fase-2.md` §4.5)
// ---------------------------------------------------------------------------------------------------------------------

export const rolPersonalizadoConsolaSchema = z
  .object({
    id: z.string(),
    clave: z.string().nullish(),
    nombre: z.string(),
    descripcion: z.string().nullish(),
    rolBase: z.string(),
    activo: z.boolean().nullish(),
    funcionalidades: z.array(z.string()).nullish(),
    personas: z.number().nullish(),
    version: z.number().nullish(),
    actualizadoPor: personaSchema.nullish(),
    actualizadoEn: z.string().nullish(),
  })
  .passthrough();
export type RolPersonalizadoConsola = z.infer<typeof rolPersonalizadoConsolaSchema>;
export const listaDeRolesSchema = z.array(rolPersonalizadoConsolaSchema);

/** `POST /soporte-ti/roles`. La base no se cambia después: el `PUT` no la lleva. */
export interface RolNuevo {
  nombre: string;
  descripcion: string | null;
  rolBase: string;
  funcionalidades: string[];
  motivo: string;
}

/** `PUT /soporte-ti/roles/{id}`. `version` es la que se leyó: 409 si cambió. */
export interface CambioDeRol {
  nombre: string;
  descripcion: string | null;
  funcionalidades: string[];
  activo: boolean;
  motivo: string;
  version: number | undefined;
  /** Solo si cambió: sin personas cambia la base; con personas el servidor responde 409. */
  rolBase?: string;
}

export const reemplazoSchema = z.object({ personasMovidas: z.number().nullish() }).passthrough();
