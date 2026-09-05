/**
 * Formas EXACTAS que devuelve el backend Java para Academia (`academy/infrastructure/adapter/
 * in/rest/curso` y `.../leccion` en el repo Spring — SOLO LECTURA, no se modifica).
 *
 * TODO el wire es camelCase. Los DTOs de curso/lección declaraban
 * `@JsonNaming(SnakeCaseStrategy)` importado de Jackson 2, pero Spring Boot 4 serializa con
 * Jackson 3 (`tools.jackson.*`), que ignora esa anotación en silencio: no falla, no avisa,
 * simplemente no la aplica. Resultado real medido en producción: los DTOs declaraban snake_case
 * y mandaban camelCase, así que ningún curso cargaba. El backend ya se corrigió (2026-09-01): se
 * quitaron las anotaciones muertas en vez de arreglar el import, para que academy deje de ser la
 * única excepción del wire (el resto de la API — `auth`, `wall`, `rocks`, `support` — ya era
 * camelCase). Ver E-65 en `docs/BITACORA_ERRORES.md` del backend.
 *
 * NO volver a poner esto en snake_case leyendo un DTO viejo o un comentario desactualizado: el
 * campo Java tal cual (`portadaUrl`, `diaDesbloqueo`, etc.) es la forma real, verificada leyendo
 * los records `CursoResponse`/`MiCursoResponse`/`LeccionResponse`/... del backend.
 */

export type AccesoCurso = 'abierto' | 'restringido';
export type VideoTipo = 'youtube' | 'storage';

/** `CursoResponse` (camelCase). */
export interface CursoApi {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string | null;
  portadaUrl: string | null;
  orden: number;
  publicado: boolean;
  acceso: AccesoCurso;
  origen: string;
  diaDesbloqueo: number | null;
  rolesPermitidos: string[];
  creadoEn: string;
  actualizadoEn: string;
}

/** `ProgresoCursoResponse` (camelCase). */
export interface ProgresoCursoApi {
  cursoId: string;
  totalLecciones: number;
  completadas: number;
  ultimaLeccionId: string | null;
}

/**
 * `MiCursoResponse` — item de GET /api/v1/cursos. Los 13 campos de `CursoApi` viajan MEZCLADOS
 * (no anidados) por `@JsonUnwrapped` en el backend — espejo del spread `{...c, progreso,
 * portadaFirmada}` del repo viejo (ver javadoc de `MiCursoResponse`).
 */
export type MiCursoApi = CursoApi & {
  progreso: ProgresoCursoApi;
  portadaFirmada: string | null;
};

/** `CursoBloqueadoResponse` (camelCase) — item de GET /api/v1/cursos/bloqueados. */
export interface CursoBloqueadoApi {
  id: string;
  titulo: string;
  /** Ruta cruda del objeto en un bucket privado: NO sirve para pintar. Usar `portadaFirmada`. */
  portadaUrl: string | null;
  /** URL de lectura ya firmada. `null` si el curso no tiene portada cargada en la base. */
  portadaFirmada: string | null;
  orden: number;
  diaDesbloqueo: number;
  programDayActual: number;
}

/**
 * `MotivoBloqueoResponse` — GET /cursos/{id}/preview y GET /lecciones/{id}/preview. CamelCase,
 * `@JsonInclude(NON_NULL)` del lado del backend: los campos ausentes ni siquiera viajan cuando
 * `locked: false` (por eso son opcionales acá, no `| null`).
 */
export interface MotivoBloqueoApi {
  locked: boolean;
  reason?: string;
  cursoTitulo?: string;
  diaDesbloqueo?: number;
  programDayActual?: number;
}

/** `LeccionLiteResponse` (camelCase) — nodo del árbol del curso, SIN cuerpo ni videoUrl. */
export interface LeccionLiteApi {
  id: string;
  cursoId: string;
  seccionId: string | null;
  titulo: string;
  orden: number;
  videoTipo: VideoTipo | null;
  videoDuracionMs: number | null;
  tieneCuerpo: boolean;
  recursosCount: number;
  diaDesbloqueo: number | null;
  bloqueadaPorDia: boolean;
  programDayActual: number | null;
  diasFaltantes: number;
}

/** `SeccionConLeccionesResponse` (camelCase). */
export interface SeccionConLeccionesApi {
  id: string;
  cursoId: string;
  titulo: string;
  orden: number;
  diaDesbloqueo: number | null;
  bloqueadaPorDia: boolean;
  programDayActual: number | null;
  diasFaltantes: number;
  lecciones: LeccionLiteApi[];
}

/** `ContenidoCursoResponse` — sus 2 claves ya son válidas tal cual. */
export interface ContenidoCursoApi {
  sueltas: LeccionLiteApi[];
  secciones: SeccionConLeccionesApi[];
}

/** `CursoDetalleResponse` — GET /cursos/{id}. CamelCase para `portadaFirmada` (ver el tipo arriba). */
export interface CursoDetalleApi {
  curso: CursoApi;
  contenido: ContenidoCursoApi;
  portadaFirmada: string | null;
}

/** `LeccionResponse` (camelCase) — lección completa, CON cuerpo y videoUrl (a diferencia de `LeccionLiteApi`). */
export interface LeccionApi {
  id: string;
  cursoId: string;
  seccionId: string | null;
  titulo: string;
  orden: number;
  cuerpoHtml: string | null;
  cuerpoMd: string | null;
  videoTipo: VideoTipo | null;
  videoUrl: string | null;
  videoMiniaturaUrl: string | null;
  videoDuracionMs: number | null;
  creadoEn: string;
  actualizadoEn: string;
}

/** `RecursoLeccionResponse` (camelCase). */
export interface RecursoLeccionApi {
  id: number;
  leccionId: string;
  nombre: string | null;
  url: string;
  orden: number;
}

/** `LeccionDetalleResponse` — GET /lecciones/{id}. */
export interface LeccionDetalleApi {
  leccion: LeccionApi;
  recursos: RecursoLeccionApi[];
}

/** `CompletarLeccionResponse` — POST /lecciones/{id}/complete. */
export interface CompletarLeccionApi {
  leccionId: string;
  completadaEn: string;
}

/**
 * `ClaseDiariaResponse` — GET /api/v1/classroom/clase-diaria. camelCase (nunca fue una fila de
 * tabla, siempre fue un estado calculado: ver `docs/api/CONTRATO_CONTENIDO_IA.md` §1.11).
 *
 * `status` decide qué campos vienen; con `@JsonInclude(NON_NULL)` el backend los OMITE en las
 * ramas que no aplican, por eso son opcionales acá y no `| null`:
 *   - `available`   → trae curso y lección de hoy.
 *   - `not_started` → `programDay: 0`, el aprendiz todavía no arrancó el reloj de 90 días.
 *   - `coming_soon` → día con programa activo pero sin clase resuelta para ese día.
 */
export interface ClaseDiariaApi {
  status: 'available' | 'not_started' | 'coming_soon';
  programDay: number;
  cursoId?: string;
  cursoTitulo?: string;
  leccionId?: string;
  leccionTitulo?: string;
  /**
   * ¿El aprendiz YA vio la clase de hoy?
   *
   * Viene solo con `status: 'available'` — en las otras ramas no hay lección de la cual preguntar,
   * y el backend omite el campo en vez de mentir un `false` (`@JsonInclude(NON_NULL)`). Por eso es
   * opcional: `undefined` significa "no aplica", no "no la vio".
   *
   * Decide el flujo del hábito de Clase Diaria: sin ver, se lleva a la lección; ya vista, se pide
   * el resumen.
   */
  leccionCompletada?: boolean;
}

/** `CompletarClaseDiariaResponse` — POST /api/v1/classroom/clase-diaria. */
export interface CompletarClaseDiariaApi {
  leccionId: string;
  registroHabitoId: string;
  puntosOtorgados: number;
}
