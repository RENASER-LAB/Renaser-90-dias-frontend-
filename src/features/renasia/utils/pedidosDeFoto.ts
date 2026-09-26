import type { ResultadoDeInicio } from '../../habits/hooks/useRegistroConFoto';
import type { EstadoPedidoDeFotoUI, PedidoDeFotoUI, RenasiaEventoEvidencia } from '../types/renasia.types';

/**
 * Reglas puras de la tarjeta "Tomar foto" que deja el acompañante (evento `evidencia`,
 * 2026-09-26). La tarjeta está en el chat y en la hoja del orbe; la cámara y la subida son las del
 * registro con foto de Training (`useRegistroConFoto`).
 */

export const TEXTO_REGISTRADO = 'Listo, quedó registrado.';

export function pedidoDesdeEvento(evento: RenasiaEventoEvidencia): PedidoDeFotoUI {
  return {
    registroId: evento.registroId,
    titulo: evento.titulo,
    venceEn: evento.venceEn,
    conPregunta: evento.conPregunta === true,
    estado: 'pendiente',
  };
}

/** Agrega el pedido sin repetirlo: el mismo registro pedido dos veces es una sola tarjeta. */
export function agregarPedido(pedidos: readonly PedidoDeFotoUI[] | undefined, nuevo: PedidoDeFotoUI): PedidoDeFotoUI[] {
  const actuales = pedidos ?? [];
  return actuales.some(p => p.registroId === nuevo.registroId) ? [...actuales] : [...actuales, nuevo];
}

/** Pasado `venceEn`, el botón se deshabilita. Es cosmético: quien decide es el registro del servidor. */
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
export function cambioTrasIniciar(resultado: ResultadoDeInicio): Partial<PedidoDeFotoUI> {
  switch (resultado) {
    case 'completado':
      return { estado: 'registrado', mensaje: 'Ya estaba registrado.' };
    case 'vencido':
      return { estado: 'vencido', mensaje: 'Este hábito ya venció.' };
    case 'no-es-de-hoy':
      return { estado: 'vencido', mensaje: 'Era de otro día.' };
    default:
      return { estado: 'pendiente' };
  }
}

export function cambioAlRegistrar(): Partial<PedidoDeFotoUI> {
  return { estado: 'registrado', mensaje: TEXTO_REGISTRADO };
}

/** Si el cambio cierra la tarjeta, le anota cuándo (la hoja del orbe la retira sola después). */
export function conMarcaDeCierre(cambio: Partial<PedidoDeFotoUI>, ahoraMs: number): Partial<PedidoDeFotoUI> {
  const cierra = cambio.estado === 'registrado' || cambio.estado === 'vencido';
  return cierra ? { ...cambio, resueltoEnMs: ahoraMs } : cambio;
}
