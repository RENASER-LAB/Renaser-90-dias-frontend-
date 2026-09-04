import { z } from 'zod';

/**
 * Validación en runtime de lo que responde el backend para Onboarding (`GET/PUT /onboarding/state`,
 * `POST /onboarding/complete`). Mismo criterio que `features/auth/api/authSchemas.ts` y
 * `features/academy/api/academySchemas.ts`: los tipos de TypeScript se borran al compilar, así que
 * sin esto un cambio de forma en el backend se manifiesta como un `undefined` silencioso muy lejos
 * de la causa. `passthrough()` a propósito: que el backend agregue campos nuevos no debe romper la
 * app.
 */

export const estadoOnboardingSchema = z
  .object({
    userId: z.string(),
    currentFlow: z.string().nullable(),
    currentSection: z.string().nullable(),
    currentStep: z.number().nullable(),
    flowProgress: z.string().nullable(),
    termsAcceptedAt: z.string().nullable(),
    pactAcceptedAt: z.string().nullable(),
    pactSignedAt: z.string().nullable(),
    rocksSyncAcceptedAt: z.string().nullable(),
    startedAt: z.string().nullable(),
    lastActivityAt: z.string().nullable(),
    // El único campo que de verdad usa hoy el cliente para decidir navegación (AuthContext): si
    // el aprendiz ya completó el flujo o todavía tiene que verlo.
    completed: z.boolean(),
    completedAt: z.string().nullable(),
  })
  .passthrough();

/** `POST /api/v1/onboarding/answers` — espejo de `RespuestaResponse` (backend). */
export const respuestaSchema = z
  .object({
    id: z.number(),
    questionId: z.number(),
    textValue: z.string().nullable(),
    numberValue: z.number().nullable(),
    booleanValue: z.boolean().nullable(),
    scaleValue: z.number().nullable(),
    jsonValue: z.string().nullable(),
    mediaId: z.number().nullable(),
    acceptedAt: z.string().nullable(),
    answeredAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
  })
  .passthrough();

const respuestaAgrupadaSchema = z
  .object({
    questionId: z.number(),
    questionKey: z.string(),
    type: z.string(),
    textValue: z.string().nullable(),
    numberValue: z.number().nullable(),
    booleanValue: z.boolean().nullable(),
    scaleValue: z.number().nullable(),
    jsonValue: z.string().nullable(),
    mediaId: z.number().nullable(),
    acceptedAt: z.string().nullable(),
    answeredAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
  })
  .passthrough();

/** `GET /api/v1/onboarding/answers` — espejo de `RespuestasAgrupadasResponse` (backend). */
export const respuestasAgrupadasSchema = z
  .object({
    flow: z.string(),
    sections: z.array(
      z
        .object({
          sectionKey: z.string(),
          title: z.string(),
          answers: z.array(respuestaAgrupadaSchema),
        })
        .passthrough()
    ),
  })
  .passthrough();

/** `UrlSubidaMediaResponse` (backend, `POST /onboarding/media/upload-url`). */
export const urlSubidaMediaOnboardingSchema = z
  .object({ uploadUrl: z.string(), bucket: z.string(), path: z.string() })
  .passthrough();

/** `MediaResponse` (backend, `POST /onboarding/media`) — el `id` es el `mediaId`. */
export const mediaOnboardingSchema = z
  .object({
    id: z.number(),
    flow: z.string().nullable(),
    questionKey: z.string().nullable(),
    kind: z.string(),
    bucket: z.string(),
    path: z.string(),
    mime: z.string().nullable(),
    sizeBytes: z.number().nullable(),
    durationSeconds: z.number().nullable(),
    metadata: z.string().nullable(),
    createdAt: z.string(),
  })
  .passthrough();

/** `GET /api/v1/onboarding/activate-program` — espejo de `EstadoActivacionProgramaResponse` (backend). */
export const estadoActivacionProgramaSchema = z
  .object({
    activated: z.boolean(),
    // Formato `yyyy-MM-dd` (LocalDate del backend, ver ActivarProgramaRequest). Vacío cuando
    // `activated` es `true` — no queda nada por elegir.
    validStartDates: z.array(z.string()),
    // D-84: el Día 1 ya elegido, `yyyy-MM-dd`. Ausente/null mientras no eligió. Lo necesita
    // Plan para poder decir "arrancás el 5 de septiembre" en vez de mostrar un plan vacío sin
    // explicación. `.nullish()` y no `.string()` a secas: los clientes viejos que hablan con un
    // backend nuevo no deben romperse, y al revés tampoco.
    startDate: z.string().nullish(),
  })
  .passthrough();

/** `POST /api/v1/onboarding/activate-program` — espejo de `ActivarProgramaResponse` (backend). */
export const activarProgramaSchema = z
  .object({
    traineeProfileId: z.string(),
    programDay: z.number(),
    programActivatedAt: z.string(),
    startDate: z.string(),
    expectedGraduationDate: z.string(),
  })
  .passthrough();

/**
 * Valida y devuelve el dato con el tipo que el resto del código ya espera. Si la forma no coincide
 * se lanza un error que dice QUÉ campo falló y en qué endpoint.
 */
export function validarRespuesta<T>(schema: z.ZodType, dato: unknown, endpoint: string): T {
  const resultado = schema.safeParse(dato);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map(i => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join('; ');
    throw new Error(`El backend respondió algo inesperado en ${endpoint} — ${detalle}`);
  }
  return resultado.data as T;
}
