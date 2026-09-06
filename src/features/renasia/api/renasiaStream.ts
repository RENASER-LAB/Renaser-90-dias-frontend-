import { fetch as expoFetch } from 'expo/fetch';

import { API_CONFIG } from '../../../config/apiConfig';
import { getTokenSesion } from '../../../services/http/apiClient';
import { nombreVisible } from '../data/agentes';
import type {
  AgenteRenasia,
  PreguntarRenasiaBody,
  RenasiaEvento,
  RenasiaEventoError,
  RenasiaEventoTexto,
} from '../types/renasia.types';
import { renasiaSchemas, validarRespuesta } from './renasiaSchemas';

const HEADER_SESION = 'X-Auth-Token';
const RUTA_MENSAJES = '/api/v1/renasia/mensajes';

/**
 * 429 de `POST /api/v1/renasia/mensajes`: se acabaron las preguntas del día. Se distingue del
 * resto de los errores porque acá no tiene sentido ofrecer "reintentar" — reintentar de
 * inmediato falla exactamente igual, y la pantalla necesita saberlo para no mostrar ese botón.
 */
export class RenasiaCuotaExcedidaError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'RenasiaCuotaExcedidaError';
  }
}

/**
 * No hay `onFuentes` (2026-09-06, E-141). El backend sigue emitiendo `{"tipo":"fuentes",...}`, pero
 * la pantalla ya no dibuja las lecciones citadas, así que no hay nada que notificar. Ver
 * `procesarBloque`.
 */
export type CallbacksMensajeRenasia = {
  onTexto: (fragmento: string) => void;
  onFin: () => void;
  /** D-100: el backend avisa que el modelo no pudo responder. */
  onError?: (mensaje: string) => void;
};

/**
 * D-102: con quién se habla y, si es el tutor de cursos, sobre qué. `courseId` y `scope` solo
 * viajan con `COURSE_TUTOR` — el acompañante no tiene curso ni ámbito, y el backend los
 * descartaría igual.
 */
export type OpcionesEnvioRenasia = {
  agent: AgenteRenasia;
  courseId?: string | null;
  /** D-100: "el curso X, lección Y". Va al prompt de sistema del backend, nunca dentro de la pregunta. */
  scope?: string | null;
};

function esAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function armarCuerpo(question: string, opciones: OpcionesEnvioRenasia): PreguntarRenasiaBody {
  const body: PreguntarRenasiaBody = { question, agent: opciones.agent };
  if (opciones.agent === 'COURSE_TUTOR') {
    if (opciones.courseId) body.courseId = opciones.courseId;
    if (opciones.scope) body.scope = opciones.scope;
  }
  return body;
}

/**
 * Lee el cuerpo de un error no-2xx con el mismo criterio que
 * `apiClient.ts#leerMensajeDeError`: el backend manda `{message, timestamp}`
 * (`ApiErrorResponse`), pero si algo revienta antes de llegar ahí (un proxy, un 500 del
 * contenedor) el cuerpo puede no ser JSON, así que el texto crudo es el último recurso.
 */
async function leerMensajeDeError(respuesta: Awaited<ReturnType<typeof expoFetch>>): Promise<string> {
  const texto = await respuesta.text();
  if (!texto) return `Error ${respuesta.status}`;
  try {
    const json = JSON.parse(texto);
    return json?.message || `Error ${respuesta.status}`;
  } catch {
    return texto;
  }
}

/**
 * `POST /api/v1/renasia/mensajes` responde `text/event-stream`. El `fetch` global de React
 * Native no expone un `body` legible como stream — termina en `JSON.parse` sobre el texto
 * completo, como `apiClient.ts#apiFetch` —, pero `expo/fetch` (Expo 57, el runtime "Winter") sí,
 * vía `response.body.getReader()`. Por eso esta función vive separada de `apiClient.ts`, sin
 * tocarlo.
 *
 * Como no pasa por `apiFetch`, el header de sesión se manda a mano acá, reutilizando el mismo
 * token en memoria que `apiClient.ts` ya expone con `getTokenSesion()` (no hubo que exportar
 * nada nuevo: ya estaba público).
 *
 * Parsea SSE a mano: los eventos vienen separados por una línea en blanco (`\n\n`), y los chunks
 * que entrega el reader pueden cortar un evento — o esa línea en blanco — a la mitad. De ahí el
 * buffer, y por qué se normalizan los `\r\n` recién en el buffer acumulado (no chunk a chunk: un
 * `\r` y su `\n` pueden llegar en lecturas separadas).
 */
export async function enviarMensajeRenasia(
  question: string,
  opciones: OpcionesEnvioRenasia,
  callbacks: CallbacksMensajeRenasia,
  signal?: AbortSignal
): Promise<void> {
  const nombre = nombreVisible(opciones.agent);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  const token = getTokenSesion();
  if (token) {
    headers[HEADER_SESION] = token;
  }

  let respuesta: Awaited<ReturnType<typeof expoFetch>>;
  try {
    respuesta = await expoFetch(`${API_CONFIG.BASE_URL}${RUTA_MENSAJES}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(armarCuerpo(question, opciones)),
      signal: signal ?? null,
    });
  } catch (error) {
    if (esAbort(error)) throw error;
    throw new Error(`No se pudo conectar con ${nombre}. Revisá tu conexión.`);
  }

  if (!respuesta.ok) {
    const mensaje = await leerMensajeDeError(respuesta);
    if (respuesta.status === 429) {
      throw new RenasiaCuotaExcedidaError(
        mensaje || `Ya usaste todas tus preguntas a ${nombre} por hoy. Volvé mañana.`
      );
    }
    throw new Error(mensaje);
  }

  const body = respuesta.body;
  if (!body) {
    throw new Error(`${nombre} no devolvió una respuesta que se pueda leer.`);
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let recibioFin = false;

  const procesarBloque = (bloqueCrudo: string) => {
    const bloque = bloqueCrudo.trim();
    if (!bloque) return;

    // SSE admite varias líneas `data:` por evento (se concatenan con `\n`); este contrato manda
    // una sola, pero soportarlo no cuesta nada y evita romper si el backend algún día multilínea
    // un JSON "lindo".
    const json = bloque
      .split('\n')
      .filter(linea => linea.startsWith('data:'))
      .map(linea => linea.slice(5).trimStart())
      .join('\n');
    if (!json) return;

    let crudo: unknown;
    try {
      crudo = JSON.parse(json);
    } catch {
      // Un bloque no-JSON no debería llegar con este contrato; se ignora antes que reventar el
      // stream entero por un evento suelto (un keep-alive, un comentario SSE, etc.).
      return;
    }

    const evento = validarRespuesta<RenasiaEvento>(
      renasiaSchemas.evento,
      crudo,
      'SSE POST /api/v1/renasia/mensajes'
    );
    // Cada tipo se compara explícitamente. Antes el `else` trataba cualquier evento como fin de
    // stream, así que un tipo nuevo (una herramienta, por ejemplo) habría cortado la respuesta a
    // la mitad sin que nadie se enterara. Lo desconocido se ignora y el stream sigue.
    if (evento.tipo === 'texto') {
      callbacks.onTexto((evento as RenasiaEventoTexto).valor);
    } else if (evento.tipo === 'fuentes') {
      // E-141: se recibe y se descarta, a propósito. La pantalla ya no muestra las lecciones
      // citadas (pedido del dueño, "no citar las referencias mejor, por seguridad"), y el backend
      // no se tocó: sigue mandando este evento. La rama existe en vez de dejar que caiga en "lo
      // desconocido se ignora" para que quede escrito que el evento SE CONOCE y la decisión de no
      // usarlo es deliberada — si no, el próximo que lea esto lo toma por un tipo sin soporte y
      // "arregla" el bug que no existe.
    } else if (evento.tipo === 'error') {
      // D-100: antes esto no existia y un fallo del modelo llegaba como un `fin` sin texto.
      callbacks.onError?.((evento as RenasiaEventoError).valor);
    } else if (evento.tipo === 'fin') {
      recibioFin = true;
      callbacks.onFin();
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');
        let indiceCorte: number;
        while ((indiceCorte = buffer.indexOf('\n\n')) !== -1) {
          procesarBloque(buffer.slice(0, indiceCorte));
          buffer = buffer.slice(indiceCorte + 2);
        }
      }
      if (done) break;
    }
  } catch (error) {
    if (esAbort(error)) throw error;
    throw new Error(`La conexión con ${nombre} se interrumpió a mitad de la respuesta.`);
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Liberar el lock es best-effort: si el stream ya se cerró solo no hay nada que hacer, y
      // esto no debe tapar el error real que se esté propagando desde el try de arriba.
    }
  }

  // Buffer final sin línea en blanco de cierre: si el backend no manda un `\n\n` después del
  // último evento, ese evento no debe perderse por quedar sin "flushear".
  buffer += decoder.decode();
  procesarBloque(buffer);

  if (!recibioFin) {
    // El contrato dice que "fin" siempre llega al final. Si el stream se cerró sin él es un corte
    // anormal (conexión perdida, backend caído a mitad de respuesta) y hay que decirlo en vez de
    // dejar la respuesta como si hubiera terminado bien.
    throw new Error(`La respuesta de ${nombre} se cortó antes de terminar. Probá de nuevo.`);
  }
}
