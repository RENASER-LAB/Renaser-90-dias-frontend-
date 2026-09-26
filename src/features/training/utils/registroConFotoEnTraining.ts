/**
 * Qué hábitos de Training se registran con la cámara directa (pedido del dueño, 2026-09-26).
 *
 * Solo los que EXIGEN evidencia y no tienen flujo propio. Los de evidencia opcional siguen con el
 * modal de las cuatro formas (foto, texto, audio, video) tal cual estaba: "que se mantengan los 4
 * cuadros". Se decide por `systemKey` (la `clave_sistema` del catálogo) y nunca por título.
 */

/** Hábitos con flujo propio: la cámara directa nunca los toma, aunque exijan evidencia. */
export const CLAVES_CON_FLUJO_PROPIO: ReadonlySet<string> = new Set([
  'DAILY_CLASS',
  'AUDIO_THERAPY_WEEKLY',
  'PASTILLA_RENACER',
  'COMMUNITY_POST',
  'WAKE_UP',
  'SLEEP',
]);

export type HabitoParaRegistro = {
  evidenceRequirement?: string;
  systemKey?: string | null;
  dimension: string;
};

/**
 * `esWeb`: en el build web la cámara no es confiable, así que ahí sigue el modal de siempre.
 * VIDA Y NEGOCIO son rocas: viven en otros endpoints (`/rocks/...`) y no pasan por acá.
 */
export function seRegistraConFoto(habito: HabitoParaRegistro, esWeb: boolean): boolean {
  if (esWeb || habito.dimension === 'VIDA Y NEGOCIO') return false;
  if (habito.systemKey && CLAVES_CON_FLUJO_PROPIO.has(habito.systemKey)) return false;
  return habito.evidenceRequirement === 'REQUIRED';
}

/** Un registro que ya no se puede cerrar: la cámara no se abre para estos. */
export function estaVencido(estado: string | undefined): boolean {
  return estado === 'EXPIRADO' || estado === 'FALLIDO';
}
