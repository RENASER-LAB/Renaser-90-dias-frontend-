/**
 * El subtítulo de la fila «Registro de Evidencias» en el Centro de Perfil y Ajustes de Yo.
 *
 * Antes decía «37 fotos subidas y verificadas por tu mentor», fijo, a cualquiera. Las dos mitades
 * eran falsas: el número no era el de la persona, y ningún mentor verifica nada —la evidencia se
 * acepta al subirla—.
 *
 * `GET /api/v1/evidence` devuelve una página (las más recientes primero) y un `nextCursor`, pero
 * no un total. Si hay más páginas, el número de esta página no es cuántas subió la persona, así
 * que no se muestra: se dice algo cierto sin cifra. Lo mismo mientras carga o si falló.
 */
export function resumenDeEvidencias(estado: {
  cargando: boolean;
  error: string | null;
  cantidad: number;
  hayMas: boolean;
}): string {
  const { cargando, error, cantidad, hayMas } = estado;
  if (cargando || error || hayMas) return 'Tus fotos y registros';
  if (cantidad === 0) return 'Todavía no subiste ninguna';
  return cantidad === 1 ? '1 evidencia subida' : `${cantidad} evidencias subidas`;
}
