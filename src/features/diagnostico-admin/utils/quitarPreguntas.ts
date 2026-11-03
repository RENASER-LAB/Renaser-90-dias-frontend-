import type { PreguntaAdmin, ResultadoDeQuitar, SeccionAdmin } from '../types/diagnosticoAdmin.types';
import { aplanar, dependientesEnCadena, recortarTexto } from './condiciones';
import { cantidad, conGenero } from './textos';

/**
 * «Quitar preguntas» (spec 026): se elimina la que nunca se publicó y no tiene respuestas; si no, se RETIRA (deja de mostrarse y se
 * conservan las respuestas). Quién se elimina y quién se retira lo decide el servidor; acá solo se cuenta lo que se sabe de antemano
 * para decírselo a la persona antes de confirmar, y se dice lo que pasó después.
 */

export interface ResumenDeLaSeleccion {
  marcadas: number;
  conRespuestas: number;
}

/** «3 marcadas · 2 con respuestas». */
export function resumenDeLaSeleccion(ids: readonly number[], secciones: readonly SeccionAdmin[]): ResumenDeLaSeleccion {
  const elegidas = aplanar(secciones).filter(p => ids.includes(p.id));
  return { marcadas: elegidas.length, conRespuestas: elegidas.filter(p => p.respuestas > 0).length };
}

export function textoDelContador(resumen: ResumenDeLaSeleccion): string {
  if (resumen.marcadas === 0) return 'Marca las preguntas que quieres quitar';
  const base = `${resumen.marcadas} ${conGenero(resumen.marcadas, 'marcada', 'marcadas')}`;
  return resumen.conRespuestas > 0 ? `${base} · ${cantidad(resumen.conRespuestas, 'con respuestas', 'con respuestas')}` : base;
}

/** Las protegidas no se quitan. */
export function sePuedeMarcar(p: PreguntaAdmin): boolean {
  return !p.protegida;
}

/** Marca o desmarca una pregunta. */
export function alternarMarca(marcadas: readonly number[], id: number): number[] {
  return marcadas.includes(id) ? marcadas.filter(m => m !== id) : [...marcadas, id];
}

/**
 * Lo que se dice en la confirmación única. Con ficha nunca publicada (`hayPublicada` falso), las que no tienen respuestas se eliminan
 * seguro; si ya hubo una versión publicada pudo haberla visto alguien, y el servidor decide: se dice con esas palabras.
 */
export function textoDeLaConfirmacion(resumen: ResumenDeLaSeleccion, hayPublicada: boolean): { titulo: string; mensaje: string } {
  const titulo = resumen.marcadas === 1 ? '¿Quitar esta pregunta?' : `¿Quitar ${resumen.marcadas} preguntas?`;
  const sinRespuestas = resumen.marcadas - resumen.conRespuestas;
  const partes: string[] = [];
  if (resumen.conRespuestas > 0) {
    partes.push(
      `${cantidad(resumen.conRespuestas, 'tiene respuestas y se retirará', 'tienen respuestas y se retirarán')}: dejan de mostrarse y se conservan las respuestas.`,
    );
  }
  if (sinRespuestas > 0) {
    partes.push(
      hayPublicada
        ? `${cantidad(sinRespuestas, 'no tiene respuestas', 'no tienen respuestas')}: se eliminan si nunca se publicaron, y se retiran si ya se publicaron.`
        : `${cantidad(sinRespuestas, 'no tiene respuestas', 'no tienen respuestas')} y nunca se publicaron: se eliminan.`,
    );
  }
  return { titulo, mensaje: partes.join('\n') };
}

/** «2 eliminadas · 1 retirada». */
export function textoDelResultado(r: ResultadoDeQuitar): string {
  const partes: string[] = [];
  if (r.eliminadas > 0) partes.push(`${r.eliminadas} ${conGenero(r.eliminadas, 'eliminada', 'eliminadas')}`);
  if (r.retiradas > 0) partes.push(`${r.retiradas} ${conGenero(r.retiradas, 'retirada', 'retiradas')}`);
  return partes.length > 0 ? partes.join(' · ') : 'No se quitó nada';
}

/** El aviso cuando el servidor dice que otras preguntas dependen de las marcadas (409 `TIENE_DEPENDIENTES`). */
export function textoDeLosDependientes(ids: readonly number[], secciones: readonly SeccionAdmin[], dependientes: readonly number[]): string {
  const todas = aplanar(secciones);
  const nombres = (dependientes.length > 0 ? dependientes : dependientesEnCadena(ids, secciones).map(p => p.id))
    .map(id => todas.find(p => p.id === id))
    .filter((p): p is PreguntaAdmin => !!p)
    .map(p => `«${recortarTexto(p.texto, 50)}»`);
  if (nombres.length === 0) return 'Hay preguntas que se muestran según las que quieres quitar.';
  return nombres.length === 1
    ? `${nombres[0]} se muestra según una de las que quieres quitar.`
    : `${nombres.join(', ')} se muestran según las que quieres quitar.`;
}

/** La confirmación de quitar una sección entera con sus preguntas. */
export function textoDeQuitarSeccion(seccion: SeccionAdmin): { titulo: string; mensaje: string } {
  const n = seccion.preguntas.length;
  const conRespuestas = seccion.preguntas.filter(p => p.respuestas > 0).length;
  const titulo = `¿Quitar la sección «${recortarTexto(seccion.titulo, 40)}»?`;
  if (n === 0) return { titulo, mensaje: 'No tiene preguntas.' };
  const base = `Se quitan sus ${cantidad(n, 'pregunta', 'preguntas')} con las mismas reglas: las que nunca se publicaron ni tienen respuestas se eliminan, y las demás se retiran sin borrar sus respuestas.`;
  return {
    titulo,
    mensaje: conRespuestas > 0 ? `${base}\n${cantidad(conRespuestas, 'tiene respuestas', 'tienen respuestas')}.` : base,
  };
}
