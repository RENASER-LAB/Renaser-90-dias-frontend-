import { fechaEnZona, horaEnZona, ZONA_POR_DEFECTO } from '../../eventos/utils/zonaHoraria';
import { diaYNumero } from '../../eventos/utils/textosDeFecha';

/** Spec 054, FR-006: lo que dice la tarjeta del panel de Administración. */
export const TITULO_SIN_SALDO = 'WhatsApp sin saldo';
export const TEXTO_SIN_SALDO =
  'Los mensajes por WhatsApp no están saliendo: la cuenta de YCloud no tiene saldo. Recárgala para que vuelvan a llegar los recordatorios y los códigos.';

const ROLES_QUE_LO_VEN: ReadonlySet<string> = new Set(['ADMIN', 'ALCHEMIST']);

/** Spec 054, FR-007: solo Administración y Alquimista piden el estado y ven la tarjeta; los demás roles ni lo piden. */
export function veElAvisoDeSaldo(rol: string | null | undefined): boolean {
  return !!rol && ROLES_QUE_LO_VEN.has(rol.trim().toUpperCase());
}

/** «12 sin enviar desde el sábado 14 a las 10:20» (hora de Lima). Sin fecha legible, solo la cuenta. */
export function lineaDeLosEnviosFallidos(fallaron: number, desde: string | null): string {
  const cuenta = `${fallaron} sin enviar`;
  if (!desde || Number.isNaN(Date.parse(desde))) return cuenta;
  const dia = diaYNumero(fechaEnZona(desde, ZONA_POR_DEFECTO));
  return `${cuenta} desde el ${dia} a las ${horaEnZona(desde, ZONA_POR_DEFECTO)}`;
}
