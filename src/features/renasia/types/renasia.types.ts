/**
 * Espejo del contrato de los asistentes conversacionales del programa, endpoints bajo
 * `/api/v1/renasia`.
 *
 * D-102: son DOS asistentes sobre el mismo endpoint, separados por `agent`:
 * - `COMPANION`: el acompañante de los 90 días (botón flotante, saludo de arranque).
 * - `COURSE_TUTOR`: Sparkie, el tutor de cursos (al pie del curso y de la lección).
 * Cada uno tiene su historial (`GET ...?agent=`) y su prompt de sistema en el backend; nunca se
 * mezclan. Los nombres visibles viven en `data/agentes.ts`.
 *
 * Dos formas de mensaje conviven a propósito:
 * - `MensajeRenasiaApi`: la fila tal cual la devuelve `GET /api/v1/renasia/mensajes` (historial).
 * - `RenasiaMensajeUI`: el modelo que arma `useRenasiaChat` para la pantalla — une el historial
 *   cargado con los mensajes que se van completando en vivo desde el stream de
 *   `POST /api/v1/renasia/mensajes`, que llegan de a fragmentos y no tienen un `id` de servidor
 *   hasta que el backend los persiste.
 */

/** Con cuál de los dos asistentes se habla. Mismos valores que `agent` en el wire. */
export type AgenteRenasia = 'COMPANION' | 'COURSE_TUTOR';

/** Cuerpo de `POST /api/v1/renasia/mensajes` (`PreguntarRenasiaRequest`). */
export type PreguntarRenasiaBody = {
  question: string;
  agent: AgenteRenasia;
  /** Solo `COURSE_TUTOR`: acota el contexto recuperado a las lecciones visibles de ese curso. */
  courseId?: string;
  /** Solo `COURSE_TUTOR` (D-100): "el curso X, lección Y". Va al prompt de sistema, nunca dentro de la pregunta. */
  scope?: string;
};

export type RenasiaRoleApi = 'USER' | 'ASSISTANT';

/** Una fila de `GET /api/v1/renasia/mensajes`. */
export type MensajeRenasiaApi = {
  id: string;
  role: RenasiaRoleApi;
  content: string;
  /** Ids de lecciones citadas. `null` (o vacío) en mensajes de la persona y en los que no citaron ninguna. */
  sourceLessonIds: string[] | null;
  /** ISO-8601. */
  createdAt: string;
};

export type HistorialRenasiaApi = {
  messages: MensajeRenasiaApi[];
  nextCursor: string | null;
  hasMore: boolean;
};

/** Eventos de `POST /api/v1/renasia/mensajes` (`text/event-stream`), uno por línea `data:`. */
export type RenasiaEventoTexto = { tipo: 'texto'; valor: string };
/** A lo sumo un evento de este tipo por respuesta. */
export type RenasiaEventoFuentes = { tipo: 'fuentes'; lecciones: string[] };
/** Siempre el último evento del stream. */
export type RenasiaEventoFin = { tipo: 'fin' };
/** `{"tipo":"error","valor":"..."}` — D-100: el modelo no pudo responder; `valor` es apto para mostrar. */
export type RenasiaEventoError = { tipo: 'error'; valor: string };

/**
 * Cualquier evento que esta versión de la app todavía no conoce.
 *
 * Existe a propósito y es la razón por la que el backend manda eventos con `tipo` en vez de
 * texto plano: cuando el agente incorpore herramientas va a emitir un tipo nuevo, y una app
 * vieja instalada en el celular de alguien tiene que ignorarlo y seguir mostrando la respuesta,
 * no romperse. Sin esta variante, agregar un tipo obligaría a que todo el mundo actualice.
 */
export type RenasiaEventoDesconocido = { tipo: string };

export type RenasiaEvento =
  | RenasiaEventoTexto
  | RenasiaEventoFuentes
  | RenasiaEventoFin
  | RenasiaEventoError
  | RenasiaEventoDesconocido;

/** Un mensaje listo para dibujar en el panel, venga del historial o se esté armando en vivo. */
export type RenasiaMensajeUI = {
  id: string;
  autor: 'persona' | 'asistente';
  texto: string;
  /** `null` mientras no llegó (o no hubo) evento de fuentes para este mensaje. */
  lecciones: string[] | null;
  creadoEn: string;
  /** `true` mientras el asistente todavía está emitiendo texto para este mensaje. */
  enProgreso?: boolean;
  /** Texto de error si esta respuesta puntual falló — la burbuja ofrece reintentar con esto. */
  error?: string | null;
  /** El error de arriba es por cuota diaria agotada: la burbuja no ofrece reintentar en ese caso. */
  cuotaAgotada?: boolean;
  /**
   * Solo en mensajes del asistente en curso o fallidos: la pregunta que los originó, para poder
   * reintentar sin pedirle a la persona que la escriba de nuevo. No se dibuja en pantalla.
   */
  preguntaOriginal?: string;
};
