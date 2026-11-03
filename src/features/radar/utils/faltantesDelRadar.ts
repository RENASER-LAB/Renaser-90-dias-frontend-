import { PREGUNTAS_RADAR, type CampoRadar } from '../config/configRadar';

/** Lo que puede faltar en el Código Renaser: una de las cuatro preguntas o el nivel de energía. */
export type PiezaDelRadar = CampoRadar | 'energia';

export const NOMBRE_DE_LA_ENERGIA = 'nivel de energía';

/**
 * Qué falta para poder registrar, en el orden de la pantalla (de arriba abajo).
 *
 * Existe por un fallo visto en el emulador (2026-09-28): con las cuatro preguntas escritas,
 * «Registrar» no hacía nada. Faltaba el nivel de energía, que en un teléfono de alto normal queda
 * debajo del pliegue, y el aviso «Falta 1 respuesta» salía también ahí abajo, fuera de la vista.
 * Decir QUÉ falta —y no solo cuántas— es lo que deja a la persona saber dónde mirar.
 */
export function faltantesDelRadar(
  respuestas: Record<CampoRadar, string>,
  energia: number | null,
): { pieza: PiezaDelRadar; nombre: string }[] {
  const faltan: { pieza: PiezaDelRadar; nombre: string }[] = PREGUNTAS_RADAR.filter(
    p => respuestas[p.campo].trim().length === 0,
  ).map(p => ({ pieza: p.campo, nombre: p.titulo }));
  if (energia === null) faltan.push({ pieza: 'energia', nombre: NOMBRE_DE_LA_ENERGIA });
  return faltan;
}

/**
 * «Falta: nivel de energía.» / «Faltan 2: ¿Qué estoy sintiendo?, nivel de energía.» — `null` si está completo.
 * Los nombres de las preguntas son sus enunciados tal cual se leen en el formulario; si el último ya termina en «?» no se
 * le suma el punto (sería «¿Qué estoy sintiendo?.»).
 */
export function textoDeLoQueFalta(faltan: { nombre: string }[]): string | null {
  if (faltan.length === 0) return null;
  const nombres = faltan.map(f => f.nombre).join(', ');
  const cierre = nombres.endsWith('?') ? '' : '.';
  return faltan.length === 1 ? `Falta: ${nombres}${cierre}` : `Faltan ${faltan.length}: ${nombres}${cierre}`;
}
