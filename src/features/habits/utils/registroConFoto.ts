import { ApiError } from '../../../services/http/apiClient';
import type { ArchivoParaSubir } from '../api/evidenciaHabitoApi';
import type { TrackDelDiaApi } from '../types/habits.types';

/**
 * Reglas puras del REGISTRO CON FOTO (pedido del dueño, 2026-09-26): los hábitos que exigen
 * evidencia se registran abriendo la cámara directo, y después se contesta "¿Qué sentiste?".
 * Lo usan Training, la tarjeta del chat y la hoja del orbe. Separadas del hook para probarlas sin
 * cámara, sin React y sin red.
 */

/** La pregunta fija de la pantalla partida. */
export const PREGUNTA_DEL_REGISTRO = '¿Qué sentiste?';

/** Un registro terminal ya no acepta evidencia ni cierre: el backend los rechaza. */
const ESTADOS_VENCIDOS: ReadonlySet<string> = new Set(['EXPIRADO', 'FALLIDO']);

export type EstadoParaFoto =
  /** Se puede registrar. `evidenciaYaSubida`: un intento anterior ya dejó la evidencia. */
  | { tipo: 'disponible'; evidenciaYaSubida: boolean }
  | { tipo: 'completado' }
  | { tipo: 'vencido' }
  /** El registro no está entre los de hoy: la pantalla quedó abierta de un día para otro. */
  | { tipo: 'no-es-de-hoy' };

/**
 * Qué hacer con un registro según la lista FRESCA de `GET /habit-tracks/today`. Se consulta
 * justo antes de abrir la cámara: sacar la foto y enterarse después de que el hábito ya venció
 * es el peor momento para enterarse.
 */
export function estadoParaFoto(
  tracks: readonly TrackDelDiaApi[],
  registroId: string,
  ahoraMs: number,
): EstadoParaFoto {
  const track = tracks.find(t => t.id === registroId);
  if (!track) return { tipo: 'no-es-de-hoy' };
  if (track.estado === 'COMPLETADO') return { tipo: 'completado' };
  if (ESTADOS_VENCIDOS.has(track.estado)) return { tipo: 'vencido' };
  const plazo = track.plazoEvidencia ? Date.parse(track.plazoEvidencia) : NaN;
  if (Number.isFinite(plazo) && plazo <= ahoraMs) return { tipo: 'vencido' };
  return { tipo: 'disponible', evidenciaYaSubida: track.tieneEvidencia === true };
}

/** El texto que se muestra cuando no se abre la cámara. `null` = se puede seguir. */
export function avisoParaFoto(estado: EstadoParaFoto): { titulo: string; mensaje: string } | null {
  switch (estado.tipo) {
    case 'completado':
      return { titulo: 'Ya está registrado', mensaje: 'Este hábito ya quedó cumplido hoy.' };
    case 'vencido':
      return {
        titulo: 'Este hábito ya venció',
        mensaje: 'Pasó el plazo para registrarlo hoy, así que ya no acepta evidencia.',
      };
    case 'no-es-de-hoy':
      return {
        titulo: 'Tu día cambió',
        mensaje: 'Este registro era de otro día. Actualizamos tus hábitos: vuelve a tocar el de hoy.',
      };
    default:
      return null;
  }
}

/** La respuesta es obligatoria: el botón no se habilita con el campo vacío o con puros espacios. */
export function respuestaValida(respuesta: string): boolean {
  return respuesta.trim().length > 0;
}

/** Lo que el registro necesita del backend. Se inyecta para poder probar el orden y los reintentos. */
export type DependenciasDelRegistro = {
  subirEvidencia: (registroId: string, archivo: ArchivoParaSubir) => Promise<unknown>;
  completar: (registroId: string, respuesta: string) => Promise<{ puntosOtorgados: number }>;
  tracksDeHoy: () => Promise<TrackDelDiaApi[]>;
};

export type EntradaDelRegistro = {
  registroId: string;
  archivo: ArchivoParaSubir | null;
  respuesta: string;
  /**
   * `true` si la evidencia ya quedó confirmada (en un intento anterior de esta misma pantalla, o
   * porque el servidor dice que el registro ya la tiene). Entonces NO se vuelve a subir: se
   * duplicaría la evidencia. Solo falta el cierre.
   */
  evidenciaYaSubida: boolean;
};

export type ResultadoDelRegistro = { puntosOtorgados: number; yaEstabaCompletado: boolean };

/**
 * Subir la foto (pasos 1-3) y cerrar el registro con la respuesta (paso 4).
 *
 * `alConfirmarEvidencia` se llama apenas el backend confirmó la evidencia, ANTES del cierre: si el
 * cierre falla, quien reintenta ya sabe que no hay que subir de nuevo.
 *
 * Si el cierre lo rechaza el servidor (4xx), se mira el registro: si ya figura completado —otro
 * toque, otro teléfono, un reintento cuya respuesta se perdió—, el objetivo ya está cumplido y se
 * da por bueno en vez de mostrar un error que no se puede arreglar.
 */
export async function registrarConFoto(
  entrada: EntradaDelRegistro,
  alConfirmarEvidencia: () => void,
  deps: DependenciasDelRegistro,
): Promise<ResultadoDelRegistro> {
  const respuesta = entrada.respuesta.trim();
  if (!respuesta) throw new Error('Cuéntanos qué sentiste antes de terminar.');
  if (!entrada.evidenciaYaSubida) {
    if (!entrada.archivo) throw new Error('Falta la foto. Tómala de nuevo.');
    await deps.subirEvidencia(entrada.registroId, entrada.archivo);
    alConfirmarEvidencia();
  }
  try {
    const registro = await deps.completar(entrada.registroId, respuesta);
    return { puntosOtorgados: registro.puntosOtorgados, yaEstabaCompletado: false };
  } catch (error) {
    const yaCompletado = esRechazoDelServidor(error) && (await figuraCompletado(entrada.registroId, deps));
    if (yaCompletado) return { puntosOtorgados: yaCompletado.puntosOtorgados, yaEstabaCompletado: true };
    throw error;
  }
}

function esRechazoDelServidor(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500 && !error.esNoAutenticado;
}

async function figuraCompletado(
  registroId: string,
  deps: DependenciasDelRegistro,
): Promise<TrackDelDiaApi | null> {
  try {
    const track = (await deps.tracksDeHoy()).find(t => t.id === registroId);
    return track?.estado === 'COMPLETADO' ? track : null;
  } catch {
    return null;
  }
}
