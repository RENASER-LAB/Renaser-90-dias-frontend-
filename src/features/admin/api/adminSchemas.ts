import { z } from 'zod';

/**
 * Contratos de la superficie administrativa. Se validan con Zod y `passthrough()` por el mismo
 * criterio que `mentorSchemas`: un campo que el backend agregue mañana no rompe la pantalla de
 * hoy, y uno que falte se ve como error de contrato y no como `undefined` recorriendo la app.
 *
 * Los campos nuevos del SDD 003 (`status`, `type`, `capacity`, `specialty`) van con `.nullish()`
 * a propósito: durante el despliegue conviven una app nueva con un backend anterior, y que la
 * lista de grupos deje de cargar por un campo que todavía no existe sería peor que mostrarla sin
 * el estado.
 */

/** `PerfilBasicoResponse` — id, nombre y avatar. Nada más. */
export const perfilAdminSchema = z
  .object({
    id: z.string(),
    fullName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  })
  .passthrough();

/** VIGENTE | PROGRAMADO | CERRADO | SIN_PERIODO. Lo decide el servidor, en la zona del programa. */
export const estadoGrupoSchema = z.enum(['VIGENTE', 'PROGRAMADO', 'CERRADO', 'SIN_PERIODO']);

export const grupoResumenSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    cohortId: z.string(),
    videoCallUrl: z.string().nullable(),
    nextSessionAt: z.string().nullable(),
    memberCount: z.number(),
    mentor: perfilAdminSchema.nullable(),
    periodStart: z.string().nullish(),
    periodEnd: z.string().nullish(),
    status: estadoGrupoSchema.nullish(),
    type: z.string().nullish(),
    /** Ocupación real del historial: la que mide el cupo. */
    learnerCount: z.number().nullish(),
    /** `null` en recepción: no tiene tope comercial. */
    capacity: z.number().nullish(),
    /** Spec 022: la formación del grupo (código). Un backend anterior no la manda: es de la Escuela. */
    formation: z.string().nullish(),
  })
  .passthrough();

export const grupoDetalleSchema = grupoResumenSchema
  .omit({ memberCount: true })
  .extend({ members: z.array(perfilAdminSchema) })
  .passthrough();

export const cohorteAdminSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    startDate: z.string(),
    endDate: z.string().nullable(),
    status: z.string(),
    cellCount: z.number().nullish(),
  })
  .passthrough();

/**
 * Spec 002, fase 2 (contrato `fase-2.md` §4.5): el rol personalizado de una persona, si tiene. Aditivo y tolerante:
 * `role` sigue siendo el base y un backend anterior no lo manda.
 */
export const rolPersonalizadoDeLaPersonaSchema = z
  .object({ id: z.string().nullish(), nombre: z.string().nullish() })
  .passthrough()
  .nullish();
export type RolPersonalizadoDeLaPersona = { id?: string | null; nombre?: string | null } | null | undefined;

/** `GET /api/v1/admin/roles-asignables`: los seis base (`clave` = el rol) y los personalizados activos (`"rp:" + id`). */
export const rolAsignableOpcionSchema = z
  .object({
    clave: z.string(),
    nombre: z.string().nullish(),
    rolBase: z.string(),
    rolPersonalizadoId: z.string().nullish(),
  })
  .passthrough();

export const mentorCandidatoSchema = z
  .object({
    userId: z.string(),
    fullName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    cellId: z.string().nullable(),
    /**
     * TODOS los grupos que lidera (D-141): `cellId` es solo el primero. Opcional porque un backend anterior no
     * lo manda. Con esto «Asignar mentor» sabe si suma o si el traslado dejaría grupos sin mentor (E-372).
     */
    cellIds: z.array(z.string()).nullish(),
    /** NEGOCIO | MENTE | RELACIONES, o `null` si no la declaró. Nunca se rellena. */
    specialty: z.string().nullish(),
    /** MENTOR o TRAINEE_GUIDE (backend D-265). Opcional: un backend anterior no lo manda y todos son mentores. */
    role: z.string().nullish(),
    rolPersonalizado: rolPersonalizadoDeLaPersonaSchema,
  })
  .passthrough();

/** Una fila de `GET /admin/cells/dashboard`, lo justo para nombrar un grupo por su id. */
export const grupoDelTableroSchema = z.object({ id: z.string(), name: z.string() }).passthrough();

export const aprendizCandidatoSchema = z
  .object({
    userId: z.string(),
    fullName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    /**
     * El grupo al que ya pertenece, o `null` si no tiene ninguno.
     *
     * Decide QUÉ operación hace la pantalla al elegirlo, y son dos cosas distintas: a quien no
     * tiene grupo se lo da de alta; a quien ya tiene uno se lo SUMA sin sacarlo del anterior.
     * `nullish` y no `nullable` a propósito: un cliente contra un backend viejo no recibe el
     * campo, y ahí el valor correcto es "no sé", que se trata igual que "sin grupo".
     */
    cellId: z.string().nullish(),
  })
  .passthrough();

export const aprendizAdminSchema = z
  .object({
    id: z.string(),
    fullName: z.string().nullable(),
    email: z.string().nullable(),
    status: z.string(),
    programDay: z.number(),
    phase: z.string().nullish(),
    cellId: z.string().nullable(),
    mentorId: z.string().nullable(),
    /**
     * D-243: si viene, la persona cerró su cuenta y sus datos se borran en esa fecha (ISO). Opcional
     * y anulable: un backend anterior no lo manda.
     */
    deletionScheduledFor: z.string().nullish(),
    rolPersonalizado: rolPersonalizadoDeLaPersonaSchema,
    /** Spec 022: su formación (código) y los días de su programa. Un backend anterior no los manda: Escuela y 90. */
    formation: z.string().nullish(),
    programDuration: z.number().nullish(),
  })
  .passthrough();

export const paginaAprendicesSchema = z
  .object({
    content: z.array(aprendizAdminSchema),
    total: z.number(),
    page: z.number(),
    size: z.number(),
  })
  .passthrough();

/**
 * Lo que se eligió al aceptar una solicitud (spec 025, backend D-302): formaciones, duración, rol y si fue con diagnóstico. Todo es
 * tolerante: un backend anterior no lo manda y un campo de más no rompe nada. Las aceptadas antes de las formaciones traen «Escuela,
 * sin diagnóstico» y sin rol ni duración.
 */
export const aceptacionDeSolicitudSchema = z
  .object({
    formations: z.array(z.string()).catch([]),
    durationDays: z.number().nullish().catch(null),
    role: z.string().nullish().catch(null),
    /** V142: el rol personalizado con el que entró y cómo se llamaba ese día. Un backend anterior no lo manda. */
    customRoleId: z.string().nullish().catch(null),
    customRoleName: z.string().nullish().catch(null),
    withDiagnosis: z.boolean().catch(false),
  })
  .passthrough();

export const solicitudSchema = z
  .object({
    id: z.string(),
    fullName: z.string().nullable(),
    email: z.string().nullable(),
    status: z.string(),
    createdAt: z.string().nullish(),
    phone: z.string().nullish(),
    reviewedAt: z.string().nullish(),
    reviewedByName: z.string().nullish(),
    rejectionReason: z.string().nullish(),
    acceptance: aceptacionDeSolicitudSchema.nullish().catch(null),
  })
  .passthrough();

/**
 * `GET /api/v1/account-requests/acceptance-options` (spec 025): las formaciones que reciben personas nuevas, con sus duraciones y cómo se
 * dicen, y si «Con diagnóstico» se puede ofrecer. Una respuesta rara se lee como «el servidor no lo ofrece» y la hoja queda sin esos bloques.
 */
export const opcionesDeAceptacionSchema = z
  .object({
    formations: z
      .array(
        z
          .object({
            code: z.string(),
            name: z.string(),
            description: z.string().nullish(),
            durationsDays: z.array(z.number()).min(1),
            durationLabels: z.array(z.string()).catch([]),
            defaultDurationDays: z.number().nullish(),
            /** Spec 027: `false` = la formación todavía no publicó sus términos y no recibe personas nuevas. Sin el campo (backend anterior) se asume que sí. */
            termsPublished: z.boolean().catch(true),
          })
          .passthrough(),
      )
      .min(1),
    diagnosisAvailable: z.boolean().catch(false),
  })
  .passthrough();

export const paginaSolicitudesSchema = z
  .object({
    content: z.array(solicitudSchema),
    total: z.number(),
    page: z.number(),
    size: z.number(),
  })
  .passthrough();

/**
 * `UserResponse` — lo que devuelve `GET /api/v1/admin/staff`.
 *
 * **Acá `role` es un dato, no una deducción.** Es el único listado del panel que lo trae: los
 * aprendices salen de `/admin/trainees` y los mentores de `/admin/cells/mentores`, y en esos dos
 * el rol se infiere de *en qué lista apareció la persona*. Mientras eso fuera lo único que había,
 * promover a alguien a líder, administrador o alquimista lo borraba de las dos listas y no se lo
 * volvía a ver.
 *
 * `role` y `status` quedan como `string` a propósito —no `z.enum`—: si mañana el backend agrega
 * un rol, la pantalla lo muestra con su nombre crudo en vez de dejar de cargar el listado entero.
 * `traineeProfile` no se declara: este endpoint lo manda siempre `null` (usa
 * `UserResponse.from(User)`), y `passthrough()` lo deja pasar sin que nadie lo lea.
 */
export const usuarioStaffSchema = z
  .object({
    id: z.string(),
    email: z.string().nullish(),
    role: z.string(),
    status: z.string(),
    fullName: z.string().nullish(),
    avatarUrl: z.string().nullish(),
    bio: z.string().nullish(),
    department: z.string().nullish(),
    rolPersonalizado: rolPersonalizadoDeLaPersonaSchema,
  })
  .passthrough();

export const paginaStaffSchema = z
  .object({
    content: z.array(usuarioStaffSchema),
    total: z.number(),
    page: z.number(),
    size: z.number(),
  })
  .passthrough();

/**
 * `GET /api/v1/admin/cohorts/{id}/reception/guides` (backend D-242): quiénes acompañan HOY el grupo
 * de bienvenida de una cohorte. `receptionCellId` en `null` = la cohorte todavía no tiene uno
 * designado. `role`/`status` pueden venir en `null` si la cuenta ya no existe.
 */
export const guiasRecepcionSchema = z
  .object({
    cohortId: z.string(),
    receptionCellId: z.string().nullable(),
    guides: z.array(
      z
        .object({
          userId: z.string(),
          fullName: z.string().nullish(),
          role: z.string().nullish(),
          status: z.string().nullish(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export type PerfilAdminApi = z.infer<typeof perfilAdminSchema>;
export type GuiasRecepcionApi = z.infer<typeof guiasRecepcionSchema>;
export type EstadoGrupoApi = z.infer<typeof estadoGrupoSchema>;
export type GrupoResumenApi = z.infer<typeof grupoResumenSchema>;
export type GrupoDetalleApi = z.infer<typeof grupoDetalleSchema>;
export type CohorteAdminApi = z.infer<typeof cohorteAdminSchema>;
export type MentorCandidatoApi = z.infer<typeof mentorCandidatoSchema>;
export type AprendizCandidatoApi = z.infer<typeof aprendizCandidatoSchema>;
export type AprendizAdminApi = z.infer<typeof aprendizAdminSchema>;
export type PaginaAprendicesApi = z.infer<typeof paginaAprendicesSchema>;
export type SolicitudApi = z.infer<typeof solicitudSchema>;
export type AceptacionDeSolicitudApi = z.infer<typeof aceptacionDeSolicitudSchema>;
export type OpcionesDeAceptacionApi = z.infer<typeof opcionesDeAceptacionSchema>;
export type PaginaSolicitudesApi = z.infer<typeof paginaSolicitudesSchema>;
export type UsuarioStaffApi = z.infer<typeof usuarioStaffSchema>;
export type PaginaStaffApi = z.infer<typeof paginaStaffSchema>;

/**
 * `UltimoAjusteDiaResponse` (D-82 del backend): el último cambio manual del día del programa.
 * `adjustedBy` es el id de quien lo hizo, no su nombre. `adjustmentDays` es el corrimiento
 * ACUMULADO del reloj, no lo que movió este ajuste solo.
 */
export const ultimoAjusteDiaSchema = z
  .object({
    previousDay: z.number(),
    newDay: z.number(),
    adjustmentDays: z.number().nullish(),
    motivo: z.string().nullish(),
    adjustedBy: z.string().nullish(),
    adjustedAt: z.string().nullish(),
    /** Spec 025: solo cuando el ajuste cambió la duración del programa (el día no se movió). */
    previousDuration: z.number().nullish(),
    newDuration: z.number().nullish(),
  })
  .passthrough();

/**
 * `TraineeDetailResponse` — `GET /api/v1/admin/trainees/{id}`.
 *
 * `lastDayAdjustment` se declara `unknown` a propósito: se lee aparte con
 * `leerUltimoAjuste` (`utils/diaDelPrograma.ts`). Un backend viejo no lo manda y uno que lo mande
 * con otra forma no puede tumbar la ficha entera: sin ajuste legible, la ficha sigue sin esa línea.
 */
export const detalleAprendizSchema = z
  .object({
    id: z.string(),
    fullName: z.string().nullish(),
    inscrito: z.boolean().nullish(),
    programDay: z.number(),
    startDate: z.string().nullish(),
    phase: z.string().nullish(),
    lastDayAdjustment: z.unknown().optional(),
    /** D-243: el correo (lo que se escribe para confirmar «Eliminar cuenta») y el rol, que decide
        si quien mira puede ofrecerlo. Opcionales por el mismo motivo que el resto. */
    email: z.string().nullish(),
    role: z.string().nullish(),
    status: z.string().nullish(),
    /** D-243: cerró su cuenta y se borra en esa fecha (ISO). Ausente o `null` = nada pendiente. */
    deletionScheduledFor: z.string().nullish(),
    rolPersonalizado: rolPersonalizadoDeLaPersonaSchema,
    /** Spec 022: su formación (código) y los días de su programa. Un backend anterior no los manda: Escuela y 90. */
    formation: z.string().nullish(),
    programDuration: z.number().nullish(),
    /** Spec 025: lo que se decidió al aceptar a la persona (la misma forma que en la lista de solicitudes), quién y cuándo. Ausente = no entró por una solicitud. */
    acceptance: aceptacionDeSolicitudSchema.nullish().catch(null),
    acceptedByName: z.string().nullish(),
    acceptedAt: z.string().nullish(),
  })
  .passthrough();

export type UltimoAjusteDiaApi = z.infer<typeof ultimoAjusteDiaSchema>;
export type DetalleAprendizApi = z.infer<typeof detalleAprendizSchema>;
