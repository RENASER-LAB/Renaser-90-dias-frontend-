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
  /**
   * D-158: `VOZ` cuando la pregunta llega por el orbe de Hoy; el acompañante responde corto y como
   * se habla, sin listas. Ausente = `TEXTO` (el chat de siempre).
   */
  canal?: 'TEXTO' | 'VOZ';
};

export type RenasiaRoleApi = 'USER' | 'ASSISTANT';

/** Una fila de `GET /api/v1/renasia/mensajes`. */
export type MensajeRenasiaApi = {
  id: string;
  role: RenasiaRoleApi;
  content: string;
  /**
   * Ids de lecciones citadas. `null` (o vacío) en mensajes de la persona y en los que no citaron
   * ninguna.
   *
   * SE RECIBE PERO NO SE MUESTRA (2026-09-06, E-141). El campo se deja declarado porque el backend
   * lo sigue mandando y este archivo es el espejo del contrato: borrarlo del tipo no lo haría
   * desaparecer del wire, solo escondería que llega. Lo que se quitó es su renderizado — ver
   * `MensajeBurbuja`.
   */
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
/**
 * A lo sumo un evento de este tipo por respuesta.
 *
 * SE RECIBE PERO NO SE MUESTRA (2026-09-06, E-141): el tipo describe el evento que el backend
 * sigue emitiendo; el cliente ya no lo consume. Ver `renasiaStream.ts`.
 */
export type RenasiaEventoFuentes = { tipo: 'fuentes'; lecciones: string[] };
/** Siempre el último evento del stream. */
export type RenasiaEventoFin = { tipo: 'fin' };
/** `{"tipo":"error","valor":"..."}` — D-100: el modelo no pudo responder; `valor` es apto para mostrar. */
export type RenasiaEventoError = { tipo: 'error'; valor: string };

/**
 * `{"tipo":"propuesta","id":"…","resumen":"…","venceEn":"ISO-8601"}` — D-153 del backend: el
 * acompañante NO ejecuta escrituras; las propone y la persona las confirma con un botón. Llega
 * después de un `texto` "\n\nPropuesta: <resumen>" que es el respaldo para versiones viejas de la
 * app (que ignoran este tipo); esta versión quita ese texto y dibuja la tarjeta.
 */
export type RenasiaEventoPropuesta = { tipo: 'propuesta'; id: string; resumen: string; venceEn: string };

/**
 * `{"tipo":"evidencia","registroId":"<uuid>","titulo":"…","venceEn":"ISO-8601"}` (2026-09-26): el
 * acompañante le pide a la persona la foto de un hábito que exige evidencia. A diferencia de la
 * propuesta, no hay nada que confirmar en el servidor: la tarjeta abre la cámara y el registro con
 * foto (`useRegistroConFoto`) usa `registroId` como el id del registro del día. Mismo evento en el
 * stream del chat y en la voz en vivo.
 */
export type RenasiaEventoEvidencia = { tipo: 'evidencia'; registroId: string; titulo: string; venceEn: string };

/** Respuesta de `POST /api/v1/renasia/propuestas/{id}/confirmar`. */
export type ResultadoPropuestaApi = { estado: 'CONFIRMADA' | 'FALLIDA'; mensaje: string };

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
  | RenasiaEventoPropuesta
  | RenasiaEventoEvidencia
  | RenasiaEventoDesconocido;

/**
 * Cómo se ve una propuesta en pantalla. `vencida` no la manda el servidor: se deriva de `venceEn`
 * contra el reloj del teléfono solo para esconder los botones; si el reloj miente, el backend igual
 * responde 409 y la tarjeta pasa a `vencida` con el mensaje del servidor.
 */
export type EstadoPropuestaUI =
  | 'pendiente'
  | 'confirmando'
  | 'cancelando'
  | 'confirmada'
  | 'fallida'
  | 'cancelada'
  | 'vencida';

export type PropuestaUI = {
  id: string;
  resumen: string;
  venceEn: string;
  estado: EstadoPropuestaUI;
  /** Lo que respondió el servidor al confirmar, o por qué no se pudo. Apto para mostrar. */
  mensaje?: string | null;
  /** Cuándo dejó de estar pendiente (D-163): la hoja de acción del orbe la muestra unos segundos y se va. */
  resueltaEnMs?: number;
};

/**
 * Cómo se ve un pedido de foto en pantalla. `vencido` se deriva también de `venceEn` contra el
 * reloj del teléfono (solo para deshabilitar el botón); si el reloj miente, la consulta del
 * registro antes de abrir la cámara es la que decide.
 */
export type EstadoPedidoDeFotoUI = 'pendiente' | 'abriendo' | 'registrado' | 'vencido';

export type PedidoDeFotoUI = {
  registroId: string;
  titulo: string;
  venceEn: string;
  estado: EstadoPedidoDeFotoUI;
  /** Qué pasó, apto para mostrar ("Listo, quedó registrado"). */
  mensaje?: string | null;
  /** Cuándo dejó de estar pendiente: la hoja del orbe lo muestra unos segundos y se va. */
  resueltoEnMs?: number;
};

/**
 * Un mensaje listo para dibujar en el panel, venga del historial o se esté armando en vivo.
 *
 * Ya NO tiene campo `lecciones` (2026-09-06, E-141). A diferencia de `sourceLessonIds` y
 * `RenasiaEventoFuentes` —que son el contrato del backend y se dejan declarados— este tipo es el
 * modelo de PANTALLA, y existía solo para alimentar los chips de "LECCIONES CITADAS". Sin ese
 * bloque nadie lo lee: dejarlo sería estado muerto arrastrado por el hook y las dos burbujas
 * optimistas.
 */
export type RenasiaMensajeUI = {
  id: string;
  autor: 'persona' | 'asistente';
  texto: string;
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
  /**
   * D-153: acciones que el acompañante propuso en esta respuesta, con sus botones. Solo existen en
   * vivo: el historial no las trae (en el historial queda el texto "Propuesta: …").
   */
  propuestas?: PropuestaUI[];
  /** Pedidos de foto de un hábito (evento `evidencia`). Igual que las propuestas: solo en vivo. */
  pedidosDeFoto?: PedidoDeFotoUI[];
};

/**
 * `GET /api/v1/renasia/memoria` — D-167: lo que el acompañante aprendió de la persona. `categoria`
 * es el nombre estable para agrupar (hoy CONTEXTO_DE_VIDA, METAS_Y_LO_QUE_FUNCIONA,
 * PREFERENCIAS_DE_TRATO); `titulo`, lo que se muestra. El `id` sirve solo para borrar: nunca se
 * dibuja en pantalla.
 */
export type RecuerdoRenasiaApi = { id: string; categoria: string; titulo: string; texto: string };

/**
 * `activa`: si la memoria está encendida en el servidor. Apagada y sin nada guardado, la sección no
 * se muestra; apagada con algo de antes, sí, para poder borrarlo.
 */
export type MemoriaRenasiaApi = { activa: boolean; recuerdos: RecuerdoRenasiaApi[]; resumen: string | null };
