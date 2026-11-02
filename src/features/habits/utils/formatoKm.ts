/**
 * "12,5", "7", "1234,05": los km con coma decimal y sin ceros de más.
 *
 * Aparte de `registroConFoto.ts` (que arrastra la capa de red) para que los textos y las fichas lo usen sin traerla.
 */
export function formatoKm(km: number): string {
  return (Math.round(km * 100) / 100).toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
}
