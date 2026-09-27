/**
 * Contador de pedidos al backend, SOLO para medir en desarrollo (V-1..V-4, 26/09/2026).
 *
 * `apiFetch` anota cada pedido acá cuando `__DEV__` es verdadero; en el build de producción no se
 * llama nunca. Sirve para que `useMedicionDePantalla` diga cuántos pedidos disparó una pantalla
 * al montarse, que es la cifra con la que se comparan el antes y el después.
 *
 * Guarda solo las últimas `MAXIMO` rutas: es un contador de desarrollo, no un registro.
 */
const MAXIMO = 500;

let total = 0;
let rutas: string[] = [];

/** Lo llama `apiFetch`. `ruta` va con el método adelante: `GET /api/v1/wall`. */
export function registrarPedido(ruta: string): void {
  total += 1;
  rutas.push(ruta);
  if (rutas.length > MAXIMO) {
    rutas = rutas.slice(rutas.length - MAXIMO);
  }
}

/** Cuántos pedidos se hicieron desde que arrancó la app. Se usa como marca de inicio. */
export function pedidosHastaAhora(): number {
  return total;
}

/** Las rutas pedidas desde la marca `desde` (lo que devolvió `pedidosHastaAhora`). */
export function rutasDesde(desde: number): string[] {
  const cuantas = Math.min(total - desde, rutas.length);
  return cuantas > 0 ? rutas.slice(rutas.length - cuantas) : [];
}
