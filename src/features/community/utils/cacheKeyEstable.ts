/**
 * El backend firma la URL de lectura de cada foto EN CADA RESPUESTA del feed
 * (`PublicacionMuroService.firmarLectura`, ver `almacenamientoPort.firmarLectura` — misma familia
 * de problema que la bitácora del backend registra como E-57 para los avatares). Como la firma
 * SigV4 cambia la query string en cada pedido, usar la URL completa como clave de caché nunca
 * acierta: el celular volvería a bajar todas las fotos en cada refresco del Muro.
 *
 * La regla, calcada de la misma solución que ya usó E-57 (`split_part(avatar_url, '?', 1)` en el
 * backend): en SigV4 todo lo que caduca vive DESPUÉS del `?`. La parte de antes del `?` identifica
 * siempre al mismo objeto de S3, así que es la clave de caché estable. No la reinventes con otra
 * heurística — es la misma regla, aplicada del lado del cliente.
 */
export function cacheKeyEstable(url: string): string {
  return url.split('?')[0];
}
