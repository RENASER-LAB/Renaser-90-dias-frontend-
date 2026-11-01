import type {
  AdvertenciaDeImportacion,
  ErrorDeImportacion,
  ModoDeImportacion,
  ResultadoDeImportacion,
  VistaPreviaDeImportacion,
} from '../types/diagnosticoAdmin.types';
import { cantidad, conGenero } from './textos';

/**
 * Importar preguntas pegando una tabla (spec 026): la persona copia las celdas de su hoja de cálculo (salen con tabuladores; también
 * vale CSV con coma o punto y coma) y el servidor las revisa y las lee. Acá solo se dicen sus resultados.
 */

export const AYUDA_DE_PEGAR = 'Copia las celdas de tu hoja de cálculo y pégalas aquí.';

/** «6 secciones · 29 preguntas». */
export function resumenDeLaVistaPrevia(v: Pick<VistaPreviaDeImportacion, 'secciones' | 'preguntas'>): string {
  return `${cantidad(v.secciones, 'sección', 'secciones')} · ${cantidad(v.preguntas, 'pregunta', 'preguntas')}`;
}

/** «Fila 14: …». Con columna, «Fila 14, columna «Tipo»: …». La cabecera es la fila 1, como en la hoja. */
export function textoDelError(e: ErrorDeImportacion): string {
  const donde = e.fila > 0 ? `Fila ${e.fila}` : 'Archivo';
  return e.columna ? `${donde}, columna «${e.columna}»: ${e.mensaje}` : `${donde}: ${e.mensaje}`;
}

export function textoDeLaAdvertencia(a: AdvertenciaDeImportacion): string {
  return a.fila > 0 ? `Fila ${a.fila}: ${a.mensaje}` : a.mensaje;
}

/** Con errores no se puede confirmar, y sin preguntas tampoco: no habría nada que importar. */
export function sePuedeConfirmar(v: VistaPreviaDeImportacion | null): boolean {
  return !!v && v.errores.length === 0 && v.preguntas > 0;
}

/** Lo que se dice en lugar del botón cuando no se puede confirmar. */
export function motivoParaNoConfirmar(v: VistaPreviaDeImportacion): string | null {
  if (v.errores.length > 0) {
    return v.errores.length === 1 ? 'Corrige el error de la tabla y vuelve a revisarla.' : `Corrige los ${v.errores.length} errores de la tabla y vuelve a revisarla.`;
  }
  if (v.preguntas === 0) return 'La tabla no trae ninguna pregunta.';
  return null;
}

export const OPCIONES_DE_IMPORTAR: ReadonlyArray<{ modo: ModoDeImportacion; etiqueta: string; detalle: string }> = [
  { modo: 'ANADIR', etiqueta: 'Añadir al final', detalle: 'Las preguntas nuevas van después de las que ya tienes.' },
  { modo: 'REEMPLAZAR', etiqueta: 'Reemplazar la ficha', detalle: 'La ficha pasa a ser solo lo que pegaste.' },
];

/** Lo que pierde la ficha actual con «Reemplazar»: dicho en palabras antes de confirmar. */
export function textoDelReemplazo(v: Pick<VistaPreviaDeImportacion, 'preguntasQueSeRetirarian' | 'conRespuestas'>): string {
  if (v.preguntasQueSeRetirarian === 0) return 'La ficha actual no tiene preguntas que se vayan a quitar.';
  const base = `${cantidad(v.preguntasQueSeRetirarian, 'pregunta de la ficha actual se quitará', 'preguntas de la ficha actual se quitarán')}.`;
  return v.conRespuestas > 0
    ? `${base} ${cantidad(v.conRespuestas, 'tiene respuestas y se retira', 'tienen respuestas y se retiran')} sin borrarlas; las demás se eliminan o se retiran según si ya se publicaron.`
    : base;
}

/** «Importadas 6 secciones · 29 preguntas» y, si el reemplazo quitó algo, «2 eliminadas · 1 retirada». */
export function textoDelResultado(r: ResultadoDeImportacion): string {
  const base = `Importadas ${resumenDeLaVistaPrevia(r)}`;
  const partes: string[] = [];
  if (r.eliminadas > 0) partes.push(`${r.eliminadas} ${conGenero(r.eliminadas, 'eliminada', 'eliminadas')}`);
  if (r.retiradas > 0) partes.push(`${r.retiradas} ${conGenero(r.retiradas, 'retirada', 'retiradas')}`);
  return partes.length > 0 ? `${base} · ${partes.join(' · ')}` : base;
}

/** Quita la marca de orden de bytes y los saltos de línea de Windows de lo que se pegó; el resto lo lee el servidor. */
export function limpiarLoPegado(texto: string): string {
  return texto.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

export function hayTablaPegada(texto: string): boolean {
  const filas = limpiarLoPegado(texto)
    .split('\n')
    .filter(f => f.trim() !== '');
  // La cabecera y al menos una fila de datos.
  return filas.length >= 2;
}
