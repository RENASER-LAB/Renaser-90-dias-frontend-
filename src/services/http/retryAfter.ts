/**
 * La cabecera `Retry-After` de un 429 o un 503 (spec 050, FR-015 y FR-020): cuánto espera el servidor que pase antes de volver a
 * pedir. El filtro por cuenta del backend manda segundos enteros (≥ 1); el WAF y nginx también. El estándar admite además una fecha
 * HTTP, y se acepta igual.
 */

/** Más de media hora no tiene sentido esperarla dentro de la cola: es la espera final de las colas de envío. */
export const ESPERA_MAXIMA_DE_RETRY_AFTER_MS = 30 * 60_000;

/**
 * Milisegundos que hay que esperar, o `null` si la cabecera no vino, no se entiende o ya pasó. Nunca devuelve más que
 * {@link ESPERA_MAXIMA_DE_RETRY_AFTER_MS}.
 */
export function esperaDeRetryAfterMs(valor: string | null | undefined, ahora: number = Date.now()): number | null {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (!texto) return null;
  const ms = /^\d+$/.test(texto) ? Number(texto) * 1000 : Date.parse(texto) - ahora;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.min(ms, ESPERA_MAXIMA_DE_RETRY_AFTER_MS);
}
