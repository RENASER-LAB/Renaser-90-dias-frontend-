/**
 * Spec 045 FR-001, FR-008: reglas puras de cuándo se dibuja el recorrido y cuántos pasos tiene.
 */
export type EntradaDelRecorrido = {
  /** Lo que dijo el servidor; `null` mientras no se sabe o si no respondió (un backend anterior): nunca se muestra sobre una duda. */
  servidorDiceMostrar: boolean | null;
  /** Repetirlo a pedido desde Yo → Ajustes. */
  repetido: boolean;
  /** La pestaña que se ve. */
  pestanaActual: string | null;
  /** El Código Renaser, los términos actualizados, la elección de formación… (capas obligatorias). */
  otraCapaAbierta: boolean;
  panelDeSerAbierto: boolean;
  verComo: boolean;
};

const PESTANAS = ['Hoy', 'Plan', 'Training', 'Comunidad', 'Yo'];

/**
 * Arranca sobre cualquiera de las cinco pestañas (D9: si un aviso abrió otra pestaña al entrar, igual queda bloqueado), nunca sobre el
 * ingreso ni «Términos actualizados», sin otra capa ni el panel de SER encima, y nunca en «ver como».
 */
export function puedeArrancar(e: EntradaDelRecorrido): boolean {
  if (e.verComo) return false;
  if (!e.repetido && e.servidorDiceMostrar !== true) return false;
  return e.pestanaActual !== null && PESTANAS.includes(e.pestanaActual) && !e.otraCapaAbierta && !e.panelDeSerAbierto;
}

/** Mientras está abierto, se pausa (no se dibuja) si aparece otra capa o el panel de SER; sigue en el mismo paso al cerrarse. */
export function sePausa(e: Pick<EntradaDelRecorrido, 'otraCapaAbierta' | 'panelDeSerAbierto'>): boolean {
  return e.otraCapaAbierta || e.panelDeSerAbierto;
}

/**
 * 5 pasos; 4 si ya publicó (cuentas anteriores, o repetido después de publicar) o si el Muro o publicar no están disponibles
 * para su cuenta (Soporte TI). El paso 5 es el único que lleva al Muro.
 */
export function cantidadDePasos(o: { yaPublico: boolean; muroDisponible: boolean }): 4 | 5 {
  return o.yaPublico || !o.muroDisponible ? 4 : 5;
}

/** El paso guardado en el servidor, acotado a los que tiene hoy el recorrido. */
export function pasoParaRetomar(pasoGuardado: number, cantidad: number): number {
  if (!Number.isFinite(pasoGuardado)) return 1;
  return Math.min(Math.max(1, Math.trunc(pasoGuardado)), cantidad);
}

/**
 * El atrás del sistema: un paso atrás; en el primero pide saltar. Para una cuenta nueva (el primer post es obligatorio, D9) no se
 * salta: en el primer paso y en el del Muro el atrás no hace nada.
 */
export function alVolverAtras(
  paso: number,
  o: { obligatorio: boolean; esElDelMuro: boolean } = { obligatorio: false, esElDelMuro: false },
): { tipo: 'paso'; paso: number } | { tipo: 'preguntarSaltar' } | { tipo: 'nada' } {
  if (o.obligatorio && o.esElDelMuro) return { tipo: 'nada' };
  if (paso <= 1) return o.obligatorio ? { tipo: 'nada' } : { tipo: 'preguntarSaltar' };
  return { tipo: 'paso', paso: paso - 1 };
}
