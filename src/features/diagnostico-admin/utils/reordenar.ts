import type { SeccionAdmin } from '../types/diagnosticoAdmin.types';

/**
 * Subir y bajar preguntas y secciones con botones (sin arrastre: un botón de 48 se acierta con una mano). Solo cuentas, sin pantalla.
 *
 * - Una pregunta sube y baja dentro de su sección; al llegar al borde pasa a la sección de al lado (`/mover` acepta otra sección):
 *   arriba del todo cae AL FINAL de la sección anterior, y abajo del todo, AL PRINCIPIO de la siguiente.
 * - La portada no es un paso y no recibe preguntas: se salta. Tampoco se mueve: siempre es la primera.
 * - `posicion` es el lugar FINAL de la pregunta en su sección (0 = la primera).
 */

export type Direccion = 'arriba' | 'abajo';

export interface DestinoDelMovimiento {
  seccionId: number;
  posicion: number;
}

/** Las secciones que reciben preguntas, en su orden. */
function conPasos(secciones: readonly SeccionAdmin[]): SeccionAdmin[] {
  return secciones.filter(s => !s.esPortada);
}

/** A dónde iría la pregunta al subirla o bajarla, o `null` si ya está en el borde de la ficha. */
export function destinoAlMover(
  secciones: readonly SeccionAdmin[],
  preguntaId: number,
  direccion: Direccion,
): DestinoDelMovimiento | null {
  const pasos = conPasos(secciones);
  const s = pasos.findIndex(x => x.preguntas.some(p => p.id === preguntaId));
  if (s === -1) return null;
  const seccion = pasos[s];
  const i = seccion.preguntas.findIndex(p => p.id === preguntaId);
  if (direccion === 'arriba') {
    if (i > 0) return { seccionId: seccion.id, posicion: i - 1 };
    if (s === 0) return null;
    const anterior = pasos[s - 1];
    return { seccionId: anterior.id, posicion: anterior.preguntas.length };
  }
  if (i < seccion.preguntas.length - 1) return { seccionId: seccion.id, posicion: i + 1 };
  if (s === pasos.length - 1) return null;
  return { seccionId: pasos[s + 1].id, posicion: 0 };
}

export function puedeMoverPregunta(secciones: readonly SeccionAdmin[], preguntaId: number, direccion: Direccion): boolean {
  return destinoAlMover(secciones, preguntaId, direccion) !== null;
}

/**
 * Los ids de TODAS las secciones en el orden nuevo (`PUT /secciones/orden`), o `null` si no se puede mover: es la portada o ya está en el
 * borde. La portada queda primera.
 */
export function ordenNuevoDeSecciones(secciones: readonly SeccionAdmin[], seccionId: number, direccion: Direccion): number[] | null {
  const portadas = secciones.filter(s => s.esPortada);
  const pasos = conPasos(secciones);
  const i = pasos.findIndex(s => s.id === seccionId);
  if (i === -1) return null;
  const j = direccion === 'arriba' ? i - 1 : i + 1;
  if (j < 0 || j >= pasos.length) return null;
  const nuevo = [...pasos];
  [nuevo[i], nuevo[j]] = [nuevo[j], nuevo[i]];
  return [...portadas, ...nuevo].map(s => s.id);
}

export function puedeMoverSeccion(secciones: readonly SeccionAdmin[], seccionId: number, direccion: Direccion): boolean {
  return ordenNuevoDeSecciones(secciones, seccionId, direccion) !== null;
}

/** Mover un elemento de una lista de textos (las opciones de una pregunta); devuelve la lista nueva o la misma si no se puede. */
export function moverEnLista<T>(lista: readonly T[], indice: number, direccion: Direccion): T[] {
  const j = direccion === 'arriba' ? indice - 1 : indice + 1;
  if (indice < 0 || indice >= lista.length || j < 0 || j >= lista.length) return [...lista];
  const nueva = [...lista];
  [nueva[indice], nueva[j]] = [nueva[j], nueva[indice]];
  return nueva;
}
