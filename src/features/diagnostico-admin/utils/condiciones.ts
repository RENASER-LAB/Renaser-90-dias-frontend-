import type { CondicionDeLaPregunta, DestinoDeLaPregunta } from '../../diagnostico/types/diagnostico.types';
import type { PreguntaAdmin, SeccionAdmin } from '../types/diagnosticoAdmin.types';
import { etiquetaDelDestino } from './tiposDePregunta';

/**
 * «Se muestra solo si…» y «Alimenta…»: las reglas que atan unas preguntas a otras (spec 026). Todo puro, sobre las secciones del
 * borrador, para probar sin pantalla.
 */

/** Las preguntas en el orden en que las ve la persona: sección por sección, cada una en su orden. */
export function aplanar(secciones: readonly SeccionAdmin[]): PreguntaAdmin[] {
  return secciones.flatMap(s => s.preguntas);
}

/** Las que dependen de esta: su condición nombra a `preguntaId`. */
export function dependientesDe(preguntaId: number, secciones: readonly SeccionAdmin[]): PreguntaAdmin[] {
  return aplanar(secciones).filter(p => p.seMuestraSi?.preguntaId === preguntaId);
}

/** Con una pregunta marcada para quitar, todas las que dependen de ella, de forma directa o en cadena. */
export function dependientesEnCadena(ids: readonly number[], secciones: readonly SeccionAdmin[]): PreguntaAdmin[] {
  const vistos = new Set<number>(ids);
  const salida: PreguntaAdmin[] = [];
  let pendientes = [...ids];
  while (pendientes.length > 0) {
    const siguientes: number[] = [];
    for (const id of pendientes) {
      for (const d of dependientesDe(id, secciones)) {
        if (vistos.has(d.id)) continue;
        vistos.add(d.id);
        salida.push(d);
        siguientes.push(d.id);
      }
    }
    pendientes = siguientes;
  }
  return salida;
}

/**
 * Las preguntas que pueden ser la condición de otra: las ANTERIORES (la condición no puede mirar hacia adelante) y de opción única
 * o casillas, que son las que tienen opciones que elegir.
 *
 * - Pregunta que ya existe (`preguntaId`): las que están antes que ella en el orden de la ficha.
 * - Pregunta nueva (`preguntaId` nulo): se agrega al final de su sección, así que valen todas las de las secciones anteriores y las
 *   de su propia sección.
 */
export function preguntasQuePuedenSerCondicion(
  secciones: readonly SeccionAdmin[],
  preguntaId: number | null,
  seccionId: number,
): PreguntaAdmin[] {
  const orden = aplanar(secciones);
  let previas: PreguntaAdmin[];
  if (preguntaId !== null && orden.some(p => p.id === preguntaId)) {
    previas = orden.slice(0, orden.findIndex(p => p.id === preguntaId));
  } else {
    const hasta = secciones.findIndex(s => s.id === seccionId);
    previas = hasta === -1 ? orden : secciones.slice(0, hasta + 1).flatMap(s => s.preguntas);
  }
  return previas.filter(p => p.estado === 'ACTIVA' && (p.tipo === 'SELECCION_UNICA' || p.tipo === 'SELECCION_MULTIPLE') && p.opciones.length > 0);
}

/** ¿La condición sigue válida? Su pregunta existe, está antes y tiene esa opción. */
export function condicionEsValida(
  condicion: CondicionDeLaPregunta | null,
  secciones: readonly SeccionAdmin[],
  preguntaId: number | null,
  seccionId: number,
): boolean {
  if (!condicion) return true;
  const origen = preguntasQuePuedenSerCondicion(secciones, preguntaId, seccionId).find(p => p.id === condicion.preguntaId);
  return !!origen && origen.opciones.some(o => o.valor === condicion.valor);
}

function recorte(texto: string, largo = 60): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length > largo ? `${limpio.slice(0, largo - 1)}…` : limpio;
}

/** «Se muestra si «¿Tienes pareja?» es «Sí.»». Sin la pregunta (se quitó) lo dice. */
export function describirLaCondicion(condicion: CondicionDeLaPregunta, secciones: readonly SeccionAdmin[], retiradas: readonly PreguntaAdmin[] = []): string {
  const origen = [...aplanar(secciones), ...retiradas].find(p => p.id === condicion.preguntaId);
  if (!origen) return 'Se muestra según una pregunta que ya no está';
  const opcion = origen.opciones.find(o => o.valor === condicion.valor)?.etiqueta ?? condicion.valor;
  return `Se muestra si «${recorte(origen.texto)}» es «${recorte(opcion, 40)}»`;
}

/** La pregunta activa que ya alimenta ese destino, si hay una (cada destino admite una sola; el servidor responde 409 si no). */
export function quienAlimenta(destino: DestinoDeLaPregunta, secciones: readonly SeccionAdmin[], exceptoId: number | null): PreguntaAdmin | null {
  return aplanar(secciones).find(p => p.alimenta === destino && p.id !== exceptoId) ?? null;
}

/** «Alimenta: Objetivo de Cuerpo». */
export function describirElDestino(destino: DestinoDeLaPregunta): string {
  return `Alimenta: ${etiquetaDelDestino(destino)}`;
}

export function recortarTexto(texto: string, largo = 60): string {
  return recorte(texto, largo);
}
