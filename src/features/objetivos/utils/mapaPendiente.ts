import { ApiError } from '../../../services/http/apiClient';

/**
 * El rechazo del servidor cuando se intenta definir el objetivo de 90 días (`PUT /api/v1/rocks/master/{eje}`) sin que
 * el Mapa de Renacimiento esté activo (backend, a raíz del issue #37 / backend #20; 2026-10-27).
 *
 * El código es el que propuso el backend y **todavía no está confirmado**: puede llegar como 409 o como 403, y con
 * otro nombre. Por eso esto es tolerante a propósito: lo único que se reconoce es `codigo === 'MAPA_PENDIENTE'` en
 * cualquiera de los dos estados. Cualquier otro rechazo sigue por su camino de siempre (el mensaje del servidor tal
 * cual, que `mensajeDeError` ya muestra), y contra un backend que no lo tiene nada de esto se activa.
 *
 * La app ya no ofrece definir el objetivo sin Mapa (`puertaDeObjetivos`); esto atiende el caso de borde en que el
 * teléfono creía el Mapa activo y el servidor no.
 */
export const CODIGO_MAPA_PENDIENTE = 'MAPA_PENDIENTE';

/** `true` cuando el servidor rechazó el cambio porque la persona todavía no activó su Mapa de Renacimiento. */
export function esMapaPendiente(error: unknown): boolean {
  if (!(error instanceof ApiError) || (error.status !== 409 && error.status !== 403)) return false;
  const cuerpo = error.body as { codigo?: unknown } | null | undefined;
  return cuerpo?.codigo === CODIGO_MAPA_PENDIENTE;
}
