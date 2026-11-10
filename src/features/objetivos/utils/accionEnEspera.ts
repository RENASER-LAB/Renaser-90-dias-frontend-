/**
 * Spec 048, fase 3 (P6): lo que se agendó o escribió sin señal todavía no tiene su `id` del servidor. Lo ve la persona como
 * «Se guardará al volver la señal» y no se puede marcar ni corregir hasta que llegue. Lógica pura (la usan las pantallas y las utilidades).
 */
export const PREFIJO_DE_ACCION_EN_ESPERA = 'pendiente:';

export function estaEnEspera(id: string): boolean {
  return id.startsWith(PREFIJO_DE_ACCION_EN_ESPERA);
}

export const TEXTO_SE_GUARDARA = 'Se guardará al volver la señal';
export const AVISO_TODAVIA_NO_LLEGO = 'Todavía no llegó a tu cuenta. Podrás hacerlo cuando vuelva la señal.';
