/**
 * Las iniciales de un nombre: "Ana López" → "AL", "Kelin" → "KE", vacío → "·". Solo cuentan las
 * palabras que empiezan con letra: "María Torres (PRUEBA)" → "MT" y no "M(" (e2e del 26/09).
 *
 * Vive fuera de `components/ui.tsx` para poder probarla sin cargar los módulos nativos que ese
 * archivo arrastra.
 */
export function inicialesDe(nombre?: string | null): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(p => /^\p{L}/u.test(p));
  if (partes.length === 0) return '·';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
