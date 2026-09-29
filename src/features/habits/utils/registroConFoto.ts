import { ApiError } from '../../../services/http/apiClient';
import type { ArchivoParaSubir } from '../api/evidenciaHabitoApi';
import type { TrackDelDiaApi } from '../types/habits.types';
import type { DestinoDeFoto } from './destinoDeFoto';

/**
 * Reglas puras del REGISTRO CON FOTO (pedido del dueño, 2026-09-26): los hábitos que exigen
 * evidencia se registran abriendo la cámara directo, y después se contesta "¿Qué sentiste?".
 * Lo usan Training, la tarjeta del chat y la hoja del orbe. Separadas del hook para probarlas sin
 * cámara, sin React y sin red.
 */

/** La pregunta fija de la pantalla partida. */
export const PREGUNTA_DEL_REGISTRO = '¿Qué sentiste?';

/**
 * Los tres RITUAL TIERRA - AGUA - FUEGO (clave de sistema desde V69 del backend). Son los ÚNICOS que
 * preguntan "¿Qué sentiste?" después de la foto (D-172, decisión del dueño: "solo para los rituales").
 * En los demás que exigen evidencia es foto y listo.
 */
export const CLAVES_DE_RITUAL: ReadonlySet<string> = new Set(['RITUAL_MORNING', 'RITUAL_MIDDAY', 'RITUAL_NIGHT']);

export function preguntaQueSintio(systemKey: string | null | undefined): boolean {
  return !!systemKey && CLAVES_DE_RITUAL.has(systemKey);
}

/**
 * KILÓMETROS DIARIOS (D-226 del backend, decisión del dueño 2026-09-29): igual que los rituales,
 * cámara y después la pantalla partida, pero en vez de "¿Qué sentiste?" pide los km del día y
 * muestra el total recorrido. Qué registro lo pide lo dice el SERVIDOR (`medicion` del track), no una
 * lista de claves de este lado: así lo pide igual desde Training, Yo, el chat o el orbe.
 */
export const PREGUNTA_DE_KILOMETROS = '¿Cuántos km recorriste hoy?';

/** El mismo tope del servidor (`PoliticaKilometros`, supuesto a confirmar con el dueño). */
export const TOPE_KM_POR_DIA = 100;

/** Lo que la pantalla de km necesita del registro: el total acumulado ANTES de hoy. */
export type MedicionPedida = { unidad: 'KILOMETROS'; totalPrevio: number };

/** `null` si el track no pide un número (o si el backend es anterior a D-226). */
export function medicionPedidaDe(track: Pick<TrackDelDiaApi, 'medicion'> | undefined): MedicionPedida | null {
  const medicion = track?.medicion;
  if (!medicion || medicion.unidad !== 'KILOMETROS') return null;
  return { unidad: 'KILOMETROS', totalPrevio: Number.isFinite(medicion.total) ? medicion.total : 0 };
}

/**
 * Lo que escribió la persona, como número: acepta coma o punto decimal ("3,5" y "3.5") y redondea a
 * dos decimales, como el servidor. `null` si no es un número mayor que cero y hasta el tope.
 */
export function leerKilometros(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(limpio)) return null;
  const km = Math.round(Number(limpio) * 100) / 100;
  return km > 0 && km <= TOPE_KM_POR_DIA ? km : null;
}

/** "12,5", "7", "1234,05": coma decimal y sin ceros de más. */
export function formatoKm(km: number): string {
  return (Math.round(km * 100) / 100).toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
}

/** El total que verá la persona si registra lo que escribió: lo previo más lo de hoy (si es válido). */
export function totalConHoy(medicion: MedicionPedida, texto: string): number {
  return Math.round((medicion.totalPrevio + (leerKilometros(texto) ?? 0)) * 100) / 100;
}

/** Un registro terminal ya no acepta evidencia ni cierre: el backend los rechaza. */
const ESTADOS_VENCIDOS: ReadonlySet<string> = new Set(['EXPIRADO', 'FALLIDO']);

export type EstadoParaFoto =
  /**
   * Se puede registrar. `evidenciaYaSubida`: un intento anterior ya dejó la evidencia. `medicion`
   * (D-226): el registro pide un número; ausente si no lo pide o si no se sabe (web sin consultar).
   */
  | { tipo: 'disponible'; evidenciaYaSubida: boolean; medicion?: MedicionPedida }
  | { tipo: 'completado' }
  | { tipo: 'vencido' }
  /** El registro no está entre los de hoy: la pantalla quedó abierta de un día para otro. */
  | { tipo: 'no-es-de-hoy' }
  /**
   * Solo acciones del día (D-178): el cerrojo Pareto. En cada eje primero va la verde; `primero` es
   * su título, si se conoce.
   */
  | { tipo: 'bloqueada'; primero: string | null };

/**
 * Qué hacer con un registro según la lista FRESCA de `GET /habit-tracks/today`. Se consulta
 * justo antes de abrir la cámara: sacar la foto y enterarse después de que el hábito ya venció
 * es el peor momento para enterarse.
 */
export function estadoParaFoto(
  tracks: readonly TrackDelDiaApi[],
  registroId: string,
  _ahoraMs: number,
): EstadoParaFoto {
  const track = tracks.find(t => t.id === registroId);
  if (!track) return { tipo: 'no-es-de-hoy' };
  if (track.estado === 'COMPLETADO') return { tipo: 'completado' };
  if (ESTADOS_VENCIDOS.has(track.estado)) return { tipo: 'vencido' };
  // Pasado `plazoEvidencia` el hábito sigue PENDIENTE y el backend lo acepta: paga 0 puntos y queda
  // como tarde (el 409 por vencido se quitó a propósito). Bloquearlo acá era más estricto que el
  // backend y que la app de antes (E-280): solo cortan EXPIRADO y FALLIDO.
  const medicion = medicionPedidaDe(track);
  return { tipo: 'disponible', evidenciaYaSubida: track.tieneEvidencia === true, ...(medicion ? { medicion } : {}) };
}

/** El texto que se muestra cuando no se abre la cámara. `null` = se puede seguir. */
export function avisoParaFoto(
  estado: EstadoParaFoto,
  destino: DestinoDeFoto = 'habito',
): { titulo: string; mensaje: string } | null {
  if (destino === 'roca') return avisoParaAccion(estado);
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

/** Lo mismo para una acción del día (D-178): otras palabras, y el cerrojo Pareto. */
function avisoParaAccion(estado: EstadoParaFoto): { titulo: string; mensaje: string } | null {
  switch (estado.tipo) {
    case 'completado':
      return { titulo: 'Ya está registrada', mensaje: 'Esta acción ya quedó cumplida hoy.' };
    case 'bloqueada':
      return { titulo: 'Primero tu acción verde', mensaje: mensajeDeAccionBloqueada(estado.primero) };
    case 'vencido':
    case 'no-es-de-hoy':
      return {
        titulo: 'Tu día cambió',
        mensaje: 'Esta acción era de otro día, así que ya no se registra desde acá.',
      };
    default:
      return null;
  }
}

/** Ley IV: en cada eje la verde va primero. Mismo texto en el aviso y cuando lo rechaza el servidor. */
export function mensajeDeAccionBloqueada(primero: string | null): string {
  return primero
    ? `En cada eje primero va la acción verde. Registra antes «${primero}» y después se desbloquea esta.`
    : 'En cada eje primero va la acción verde. Regístrala antes y después se desbloquea esta.';
}

/**
 * En los rituales la respuesta es obligatoria: el botón no se habilita con el campo vacío o con puros
 * espacios. En los demás no hay pregunta, así que siempre vale.
 */
export function respuestaValida(respuesta: string, conPregunta = true): boolean {
  return !conPregunta || respuesta.trim().length > 0;
}

/** Lo que el registro necesita del backend. Se inyecta para poder probar el orden y los reintentos. */
export type DependenciasDelRegistro = {
  subirEvidencia: (registroId: string, archivo: ArchivoParaSubir) => Promise<unknown>;
  completar: (
    registroId: string,
    respuesta: string | null,
    valorMedido?: number | null,
  ) => Promise<{ puntosOtorgados: number }>;
  tracksDeHoy: () => Promise<TrackDelDiaApi[]>;
};

export type EntradaDelRegistro = {
  registroId: string;
  /**
   * `tomadaEn`: cuándo se sacó (EXIF o, si falta, el instante de la captura). Los hábitos no lo usan;
   * una acción del día sí (D-178): `/rocks/{id}/evidence` lo exige para una FOTO (Ley VI, ±15 min).
   */
  archivo: (ArchivoParaSubir & { tomadaEn?: string | null }) | null;
  respuesta: string;
  /** Solo los rituales preguntan "¿Qué sentiste?" (D-172); en los demás se cierra sin respuesta. */
  conPregunta: boolean;
  /**
   * `true` si la evidencia ya quedó confirmada (en un intento anterior de esta misma pantalla, o
   * porque el servidor dice que el registro ya la tiene). Entonces NO se vuelve a subir: se
   * duplicaría la evidencia. Solo falta el cierre.
   */
  evidenciaYaSubida: boolean;
  /** D-226: el registro pide los km del día. Entonces `respuesta` es lo que escribió en ese campo. */
  medicion?: MedicionPedida | null;
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
  const respuesta = entrada.conPregunta ? entrada.respuesta.trim() : null;
  if (entrada.conPregunta && !respuesta) throw new Error('Cuéntanos qué sentiste antes de terminar.');
  // Antes de subir la foto: sin un número válido no se sube nada que después no se pueda cerrar.
  const valorMedido = entrada.medicion ? leerKilometros(entrada.respuesta) : null;
  if (entrada.medicion && valorMedido === null) {
    throw new Error(`Escribe cuántos km recorriste: más que cero y hasta ${TOPE_KM_POR_DIA}.`);
  }
  if (!entrada.evidenciaYaSubida) {
    if (!entrada.archivo) throw new Error('Falta la foto. Tómala de nuevo.');
    await deps.subirEvidencia(entrada.registroId, entrada.archivo);
    alConfirmarEvidencia();
  }
  try {
    const registro = await deps.completar(entrada.registroId, respuesta, valorMedido);
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
