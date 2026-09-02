import { z } from 'zod';

/**
 * Validación en runtime de lo que responde el backend para Academia (cursos/lecciones).
 *
 * Mismo criterio que `features/auth/api/authSchemas.ts` y `features/community/api/wallSchemas.ts`:
 * los tipos de TypeScript se borran al compilar, así que sin esto un cambio de nombre de campo en
 * el backend (ya pasó una vez en este proyecto: `{disponible}` vs `{available}`) se manifiesta
 * como un `undefined` silencioso muy lejos de la causa, en vez de un error claro en la primera
 * llamada. `validarRespuesta` se duplica acá a propósito — cada feature es dueña de su propia
 * validación (AGENTS.md, estructura modular por feature).
 *
 * `passthrough()` en todos los objetos a propósito: que el backend agregue campos nuevos no debe
 * romper la app.
 *
 * TODO camelCase: estos esquemas esperaban snake_case (`portada_url`, `total_lecciones`, ...)
 * porque los DTOs de Java declaraban `@JsonNaming(SnakeCaseStrategy)` de Jackson 2, pero Spring
 * Boot 4 serializa con Jackson 3 y esa anotación se ignora en silencio — el cable SIEMPRE fue
 * camelCase. El backend ya quitó las anotaciones muertas (2026-09-01, ver E-65 en
 * `docs/BITACORA_ERRORES.md` del backend); acá se corrige el lado que asumía mal la forma. No
 * "corregir" esto de vuelta a snake_case leyendo un DTO o comentario viejo.
 */

const cursoSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    titulo: z.string(),
    descripcion: z.string().nullable(),
    portadaUrl: z.string().nullable(),
    orden: z.number(),
    publicado: z.boolean(),
    acceso: z.enum(['abierto', 'restringido']),
    origen: z.string(),
    diaDesbloqueo: z.number().nullable(),
    rolesPermitidos: z.array(z.string()),
    creadoEn: z.string(),
    actualizadoEn: z.string(),
  })
  .passthrough();

const progresoCursoSchema = z
  .object({
    cursoId: z.string(),
    totalLecciones: z.number(),
    completadas: z.number(),
    ultimaLeccionId: z.string().nullable(),
  })
  .passthrough();

/** `MiCursoResponse`: los campos de `cursoSchema` van desanidados (`@JsonUnwrapped`) + `progreso` + `portadaFirmada`. */
const miCursoSchema = cursoSchema.extend({
  progreso: progresoCursoSchema,
  portadaFirmada: z.string().nullable(),
});

const cursoBloqueadoSchema = z
  .object({
    id: z.string(),
    titulo: z.string(),
    portadaUrl: z.string().nullable(),
    portadaFirmada: z.string().nullable(),
    orden: z.number(),
    diaDesbloqueo: z.number(),
    programDayActual: z.number(),
  })
  .passthrough();

/** `MotivoBloqueoResponse` — `@JsonInclude(NON_NULL)` del lado del backend: los campos ausentes ni viajan. */
const motivoBloqueoSchema = z
  .object({
    locked: z.boolean(),
    reason: z.string().optional(),
    cursoTitulo: z.string().optional(),
    diaDesbloqueo: z.number().optional(),
    programDayActual: z.number().optional(),
  })
  .passthrough();

const leccionLiteSchema = z
  .object({
    id: z.string(),
    cursoId: z.string(),
    seccionId: z.string().nullable(),
    titulo: z.string(),
    orden: z.number(),
    videoTipo: z.enum(['youtube', 'storage']).nullable(),
    videoDuracionMs: z.number().nullable(),
    tieneCuerpo: z.boolean(),
    recursosCount: z.number(),
    diaDesbloqueo: z.number().nullable(),
    bloqueadaPorDia: z.boolean(),
    programDayActual: z.number().nullable(),
    diasFaltantes: z.number(),
  })
  .passthrough();

const seccionConLeccionesSchema = z
  .object({
    id: z.string(),
    cursoId: z.string(),
    titulo: z.string(),
    orden: z.number(),
    diaDesbloqueo: z.number().nullable(),
    bloqueadaPorDia: z.boolean(),
    programDayActual: z.number().nullable(),
    diasFaltantes: z.number(),
    lecciones: z.array(leccionLiteSchema),
  })
  .passthrough();

const contenidoCursoSchema = z
  .object({
    sueltas: z.array(leccionLiteSchema),
    secciones: z.array(seccionConLeccionesSchema),
  })
  .passthrough();

const cursoDetalleSchema = z
  .object({
    curso: cursoSchema,
    contenido: contenidoCursoSchema,
    portadaFirmada: z.string().nullable(),
  })
  .passthrough();

const leccionSchema = z
  .object({
    id: z.string(),
    cursoId: z.string(),
    seccionId: z.string().nullable(),
    titulo: z.string(),
    orden: z.number(),
    cuerpoHtml: z.string().nullable(),
    cuerpoMd: z.string().nullable(),
    videoTipo: z.enum(['youtube', 'storage']).nullable(),
    videoUrl: z.string().nullable(),
    videoMiniaturaUrl: z.string().nullable(),
    videoDuracionMs: z.number().nullable(),
    creadoEn: z.string(),
    actualizadoEn: z.string(),
  })
  .passthrough();

const recursoLeccionSchema = z
  .object({
    id: z.number(),
    leccionId: z.string(),
    nombre: z.string().nullable(),
    url: z.string(),
    orden: z.number(),
  })
  .passthrough();

const leccionDetalleSchema = z
  .object({
    leccion: leccionSchema,
    recursos: z.array(recursoLeccionSchema),
  })
  .passthrough();

const completarLeccionSchema = z
  .object({
    leccionId: z.string(),
    completadaEn: z.string(),
  })
  .passthrough();

export const academySchemas = {
  misCursos: z.array(miCursoSchema),
  cursosBloqueados: z.array(cursoBloqueadoSchema),
  motivoBloqueo: motivoBloqueoSchema,
  secciones: z.array(seccionConLeccionesSchema),
  cursoDetalle: cursoDetalleSchema,
  leccionDetalle: leccionDetalleSchema,
  completarLeccion: completarLeccionSchema,
};

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
