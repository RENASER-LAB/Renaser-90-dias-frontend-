import { TERMINOS_CLAUSULAS } from '../../data/terminosData';
import type { VersionDeTerminosApi } from '../api/terminosSchemas';

/**
 * El borrador de unos términos mientras Administración lo edita (spec 027). Lógica pura: agregar, quitar, mover y renumerar cláusulas, y decir qué
 * falta para publicar. **El servidor vuelve a comprobarlo todo** (los límites, que no haya cambios, que nadie haya publicado antes); aquí solo se evita el
 * viaje inútil y se dice qué corregir.
 */
export type BorradorDeTerminos = {
  titulo: string;
  introduccion: string;
  clausulas: string[];
  textoCasilla: string;
};

export const MAX_CLAUSULA = 2000;
export const MAX_CLAUSULAS = 100;
export const MAX_NOTA = 500;

/** Los términos que lleva la app por dentro: el texto de siempre, para un servidor que todavía no los ofrece. */
export const TERMINOS_DE_LA_APP: BorradorDeTerminos = {
  titulo: 'Términos y condiciones',
  introduccion:
    'Al inscribirme en el programa Renaser, declaro que lo hago de manera libre y voluntaria, y acepto íntegramente los siguientes términos:',
  clausulas: TERMINOS_CLAUSULAS.map(c => c.texto),
  textoCasilla: 'He leído y acepto los Términos y Condiciones',
};

export function borradorDesde(version: Pick<VersionDeTerminosApi, 'title' | 'introduction' | 'clauses' | 'checkboxText'>): BorradorDeTerminos {
  return {
    titulo: version.title,
    introduccion: version.introduction ?? '',
    clausulas: [...version.clauses],
    textoCasilla: version.checkboxText,
  };
}

export function agregarClausula(b: BorradorDeTerminos): BorradorDeTerminos {
  return b.clausulas.length >= MAX_CLAUSULAS ? b : { ...b, clausulas: [...b.clausulas, ''] };
}

export function cambiarClausula(b: BorradorDeTerminos, indice: number, texto: string): BorradorDeTerminos {
  return { ...b, clausulas: b.clausulas.map((c, i) => (i === indice ? texto : c)) };
}

/** Quita una cláusula; las que le siguen se renumeran solas (el número es su posición). */
export function quitarClausula(b: BorradorDeTerminos, indice: number): BorradorDeTerminos {
  return { ...b, clausulas: b.clausulas.filter((_, i) => i !== indice) };
}

/** Sube (`-1`) o baja (`+1`) una cláusula un lugar; en los extremos no hace nada. */
export function moverClausula(b: BorradorDeTerminos, indice: number, hacia: -1 | 1): BorradorDeTerminos {
  const destino = indice + hacia;
  if (destino < 0 || destino >= b.clausulas.length) return b;
  const clausulas = [...b.clausulas];
  [clausulas[indice], clausulas[destino]] = [clausulas[destino], clausulas[indice]];
  return { ...b, clausulas };
}

/** Inserta una cláusula vacía justo después de la de {@code indice}. */
export function insertarClausulaDespuesDe(b: BorradorDeTerminos, indice: number): BorradorDeTerminos {
  if (b.clausulas.length >= MAX_CLAUSULAS) return b;
  const clausulas = [...b.clausulas];
  clausulas.splice(indice + 1, 0, '');
  return { ...b, clausulas };
}

/** Lo que impide PUBLICAR, en frases cortas (FR-007). Vacío si se puede. */
export function loQueFaltaParaPublicar(b: BorradorDeTerminos): string[] {
  const faltas: string[] = [];
  if (b.titulo.trim() === '') faltas.push('Falta el título.');
  if (b.clausulas.length === 0) faltas.push('Agrega al menos una cláusula.');
  b.clausulas.forEach((c, i) => {
    if (c.trim() === '') faltas.push(`La cláusula ${i + 1} está vacía.`);
    else if (c.length > MAX_CLAUSULA) faltas.push(`La cláusula ${i + 1} pasa de ${MAX_CLAUSULA} caracteres.`);
  });
  if (b.textoCasilla.trim() === '') faltas.push('Falta el texto de la casilla de aceptación.');
  return faltas;
}

/** Si el borrador dice lo mismo que la versión vigente (ya sin los espacios de los bordes): publicarlo no crearía una versión nueva. */
export function dicenLoMismo(b: BorradorDeTerminos, vigente: BorradorDeTerminos | null): boolean {
  if (!vigente) return false;
  const limpio = (x: BorradorDeTerminos) => JSON.stringify([x.titulo.trim(), x.introduccion.trim(), x.clausulas.map(c => c.trim()), x.textoCasilla.trim()]);
  return limpio(b) === limpio(vigente);
}

/**
 * Las cláusulas que citan a otra por su número («según la cláusula 5»): al renumerar, la app no puede corregir el texto de otra cláusula y lo AVISA
 * (spec 027, bordes). Devuelve las posiciones (1, 2…) de las cláusulas que traen una referencia.
 */
export function clausulasQueCitanUnNumero(b: BorradorDeTerminos): number[] {
  const cita = /cl[áa]usulas?\s+(n[úu]mero\s+|n[.º°]\s*)?\d+/i;
  return b.clausulas.map((c, i) => (cita.test(c) ? i + 1 : 0)).filter(n => n > 0);
}

/** Cuántos cambios hay respecto de lo guardado (para decir «Sin guardar» y para preguntar al salir). */
export function hayCambios(b: BorradorDeTerminos, guardado: BorradorDeTerminos | null): boolean {
  return !guardado || JSON.stringify(b) !== JSON.stringify(guardado);
}
