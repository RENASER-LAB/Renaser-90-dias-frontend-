import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import type {
  EstadoPropuestaUI,
  PropuestaUI,
  RenasiaEventoPropuesta,
  ResultadoPropuestaApi,
} from '../types/renasia.types';

/**
 * Reglas puras de las propuestas del acompañante (D-153 del backend), separadas del hook para
 * poder probarlas sin React ni red.
 */

/** El prefijo exacto con que el backend manda el texto de respaldo (`ConversacionRenasiaService`). */
const ENCABEZADO_DE_RESPALDO = '\n\nPropuesta: ';

export function propuestaDesdeEvento(evento: RenasiaEventoPropuesta): PropuestaUI {
  return { id: evento.id, resumen: evento.resumen, venceEn: evento.venceEn, estado: 'pendiente' };
}

/**
 * El backend manda cada propuesta dos veces: primero como texto ("Propuesta: …", para versiones
 * viejas de la app que no conocen el evento) y enseguida como evento. Esta versión dibuja la
 * tarjeta, así que saca el texto para que el resumen no aparezca repetido. Solo lo saca si está al
 * FINAL del mensaje, que es donde queda en el instante en que llega el evento: si no coincide,
 * no toca nada (mejor repetido que borrar algo que dijo el asistente).
 */
export function quitarTextoDeRespaldo(texto: string, resumen: string): string {
  const respaldo = `${ENCABEZADO_DE_RESPALDO}${resumen}`;
  return texto.endsWith(respaldo) ? texto.slice(0, texto.length - respaldo.length) : texto;
}

/**
 * Igual que la propuesta, el pedido de foto llega antes como texto para la app vieja (D-171 del
 * backend: "Foto para registrar '<titulo>': ..."). Esta versión dibuja la tarjeta, así que lo saca
 * si está al final del mensaje; si no coincide exacto, no toca nada.
 */
export function quitarRespaldoDeFoto(texto: string, titulo: string): string {
  const respaldo = `\n\nFoto para registrar '${titulo}': si no ves el boton de la camara, subela desde Hoy.`;
  return texto.endsWith(respaldo) ? texto.slice(0, texto.length - respaldo.length) : texto;
}

/**
 * Una pendiente cuyo `venceEn` ya pasó se muestra vencida, sin botones. Es solo cosmético: si el
 * reloj del teléfono está adelantado o atrasado, el servidor es quien decide (responde 409).
 */
export function estadoVisible(propuesta: PropuestaUI, ahoraMs: number): EstadoPropuestaUI {
  if (propuesta.estado !== 'pendiente') return propuesta.estado;
  const vence = Date.parse(propuesta.venceEn);
  return Number.isFinite(vence) && vence <= ahoraMs ? 'vencida' : 'pendiente';
}

export function estadoTrasConfirmar(resultado: ResultadoPropuestaApi): EstadoPropuestaUI {
  return resultado.estado === 'CONFIRMADA' ? 'confirmada' : 'fallida';
}

/** Mientras se confirma o se cancela, ningún botón responde: evita el doble toque del lado del cliente. */
export function admiteAcciones(estado: EstadoPropuestaUI): boolean {
  return estado === 'pendiente';
}

/**
 * Qué mostrar si confirmar o cancelar falla. 409 = venció o ya se canceló: la tarjeta queda
 * cerrada con el motivo del servidor. Sin red: vuelve a `pendiente` para poder reintentar. Otro
 * error (403, 404): se cierra como fallida con el mensaje.
 */
export function cambioPorError(error: unknown): Partial<PropuestaUI> {
  const mensaje = mensajeDeError(error, 'No pudimos completar esa acción. Inténtalo de nuevo.');
  if (error instanceof ApiError && error.esConflicto) return { estado: 'vencida', mensaje };
  if (error instanceof ApiError && !error.esDeRed) return { estado: 'fallida', mensaje };
  return { estado: 'pendiente', mensaje };
}
