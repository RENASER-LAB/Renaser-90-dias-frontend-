/**
 * «Ver más» en Solicitudes (26/09, A-4). La pantalla cargaba solo la página 0 (20 solicitudes) y la
 * número 21 no se podía aprobar desde la app: no aparecía en ningún lado.
 *
 * Funciones puras para que la regla se pruebe sin pantalla.
 */

/**
 * Suma una página a lo que ya se ve, sin repetir. Entre una página y la siguiente alguien pudo
 * aprobar una solicitud (desde otro teléfono): el servidor corre la lista y la página nueva puede
 * traer una que ya estaba. Se conserva el orden de llegada.
 */
export function sumarPagina<T extends { id: string }>(actuales: T[], nuevas: T[]): T[] {
  const vistas = new Set(actuales.map(s => s.id));
  return [...actuales, ...nuevas.filter(s => !vistas.has(s.id))];
}

/** Si quedan solicitudes por traer según el total que dijo el servidor. */
export function quedanPorTraer(cargadas: number, total: number | null): boolean {
  return total !== null && cargadas < total;
}

/** Saca una solicitud ya decidida de la lista y descuenta el total, sin volver a pedir todo. */
export function sinLaDecidida<T extends { id: string }>(
  lista: T[],
  total: number | null,
  id: string,
): { lista: T[]; total: number | null } {
  const restante = lista.filter(s => s.id !== id);
  const quitadas = lista.length - restante.length;
  return { lista: restante, total: total === null ? null : Math.max(0, total - quitadas) };
}

/** El texto del botón: `Ver 12 más`. */
export function textoVerMas(cargadas: number, total: number): string {
  const faltan = Math.max(0, total - cargadas);
  return faltan === 1 ? 'Ver 1 más' : `Ver ${faltan} más`;
}
