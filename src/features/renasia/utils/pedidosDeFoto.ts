import type { ResultadoDeInicio, SolicitudDeFoto } from '../../habits/hooks/useRegistroConFoto';
import { destinoDeEvidencia, type DestinoDeFoto } from '../../habits/utils/destinoDeFoto';
import type { EstadoPedidoDeFotoUI, PedidoDeFotoUI, RenasiaEventoEvidencia } from '../types/renasia.types';

/**
 * Reglas puras de la tarjeta "Tomar foto" que deja el acompañante (evento `evidencia`,
 * 2026-09-26). La tarjeta está en el chat y en la hoja del orbe; la cámara y la subida son las del
 * registro con foto de Training (`useRegistroConFoto`).
 */

export const TEXTO_REGISTRADO = 'Listo, quedó registrado.';
/** D-178: lo que dice la tarjeta de una acción del día al registrarse. */
export const TEXTO_ACCION_REGISTRADA = 'Listo, quedó registrada tu acción.';

/**
 * Solo se llama con un evento ya validado (el stream y la voz descartan un `destino` desconocido).
 * Sin `destino` es un hábito: un backend anterior a D-178.
 */
export function pedidoDesdeEvento(evento: RenasiaEventoEvidencia): PedidoDeFotoUI {
  return {
    registroId: evento.registroId,
    titulo: evento.titulo,
    venceEn: evento.venceEn,
    conPregunta: evento.conPregunta === true,
    destino: destinoDeEvidencia(evento.destino) ?? 'habito',
    estado: 'pendiente',
  };
}

/** Lo que se le pasa a `useRegistroConFoto.iniciar` desde una tarjeta del acompañante. */
export function solicitudDelPedido(pedido: PedidoDeFotoUI): SolicitudDeFoto {
  return {
    registroId: pedido.registroId,
    titulo: pedido.titulo,
    conPregunta: pedido.conPregunta,
    destino: pedido.destino,
  };
}

/** Agrega el pedido sin repetirlo: el mismo registro pedido dos veces es una sola tarjeta. */
export function agregarPedido(pedidos: readonly PedidoDeFotoUI[] | undefined, nuevo: PedidoDeFotoUI): PedidoDeFotoUI[] {
  const actuales = pedidos ?? [];
  return actuales.some(p => p.registroId === nuevo.registroId) ? [...actuales] : [...actuales, nuevo];
}

/**
 * Pasado `venceEn`, el botón se deshabilita. Es cosmético: quien decide es el registro del servidor. `venceEn` es el
 * fin del día local del participante (no la hora del hábito): pasada la hora todavía se puede registrar.
 */
export function estadoVisibleDelPedido(pedido: PedidoDeFotoUI, ahoraMs: number): EstadoPedidoDeFotoUI {
  if (pedido.estado !== 'pendiente') return pedido.estado;
  const vence = Date.parse(pedido.venceEn);
  return Number.isFinite(vence) && vence <= ahoraMs ? 'vencido' : 'pendiente';
}

/**
 * Cómo queda la tarjeta después del toque. Cancelar la cámara (o un toque que no hizo nada) la
 * deja disponible; `abierto` también: el registro recién se cierra cuando la persona termina, y
 * eso lo avisa {@link cambioAlRegistrar}.
 */
export function cambioTrasIniciar(resultado: ResultadoDeInicio, destino: DestinoDeFoto = 'habito'): Partial<PedidoDeFotoUI> {
  const esAccion = destino === 'roca';
  switch (resultado) {
    case 'completado':
      return { estado: 'registrado', mensaje: esAccion ? 'Ya estaba registrada.' : 'Ya estaba registrado.' };
    case 'vencido':
      return { estado: 'vencido', mensaje: esAccion ? 'Era de otro día.' : 'Ese día ya cerró: solo se registran los hábitos del día.' };
    case 'no-es-de-hoy':
      return { estado: 'vencido', mensaje: 'Era de otro día.' };
    default:
      // `bloqueada` (Pareto, D-178) también: el aviso ya dijo cuál va primero, y hecha la verde se
      // puede volver a tocar.
      return { estado: 'pendiente' };
  }
}

export function cambioAlRegistrar(destino: DestinoDeFoto = 'habito'): Partial<PedidoDeFotoUI> {
  return { estado: 'registrado', mensaje: destino === 'roca' ? TEXTO_ACCION_REGISTRADA : TEXTO_REGISTRADO };
}

/** Si el cambio cierra la tarjeta, le anota cuándo (la hoja del orbe la retira sola después). */
export function conMarcaDeCierre(cambio: Partial<PedidoDeFotoUI>, ahoraMs: number): Partial<PedidoDeFotoUI> {
  const cierra = cambio.estado === 'registrado' || cambio.estado === 'vencido';
  return cierra ? { ...cambio, resueltoEnMs: ahoraMs } : cambio;
}
