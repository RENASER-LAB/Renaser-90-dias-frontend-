import type { CategoriaAdmin } from '../../habits/categorias/types/categorias.types';
import { comparable } from './filtrarCandidatos';

/**
 * Reglas puras de «Categorías» de Administración (spec 023): validar el nombre antes de enviar, mover una categoría en el orden y decir en
 * palabras cuántos hábitos tiene. Sin React, para probarlas sin montar nada. El servidor vuelve a validar todo y explica cada rechazo.
 */

export const LARGO_MINIMO_DE_LA_CATEGORIA = 2;
export const LARGO_MAXIMO_DE_LA_CATEGORIA = 40;

/** El motivo del servidor cuando se intenta desactivar o eliminar una categoría con hábitos activos (se repite aquí para decirlo sin pedir). */
export const TEXTO_CON_HABITOS_ACTIVOS = 'Esta categoría tiene hábitos activos. Muévelos o desactívalos primero.';

/** Dos nombres que solo difieren en mayúsculas o tildes son el mismo (FR-003): igual que el servidor. */
export function nombreNormalizado(nombre: string): string {
  return comparable(nombre);
}

/** Qué falta, en palabras, o `null` si se puede guardar (AGENTS.md §5: validar antes de enviar). `clave` es la que se edita (no se choca consigo misma). */
export function faltaEnLaCategoria(nombre: string, existentes: readonly CategoriaAdmin[], clave: string | null): string | null {
  const limpio = nombre.trim();
  if (!limpio) return 'Escribe el nombre de la categoría.';
  if (limpio.length < LARGO_MINIMO_DE_LA_CATEGORIA) return `El nombre necesita al menos ${LARGO_MINIMO_DE_LA_CATEGORIA} letras.`;
  if (limpio.length > LARGO_MAXIMO_DE_LA_CATEGORIA) return `El nombre puede tener hasta ${LARGO_MAXIMO_DE_LA_CATEGORIA} caracteres.`;
  const repetida = existentes.some(c => c.key !== clave && nombreNormalizado(c.name) === nombreNormalizado(limpio));
  return repetida ? 'Ya hay una categoría con ese nombre en esta formación.' : null;
}

/**
 * El orden nuevo al mover `clave` una posición (`-1` sube, `1` baja), o `null` si ya está en el borde (o no está). Devuelve TODAS las claves,
 * porque el servidor pide la lista completa.
 */
export function movida(claves: readonly string[], clave: string, delta: -1 | 1): string[] | null {
  const desde = claves.indexOf(clave);
  const hasta = desde + delta;
  if (desde < 0 || hasta < 0 || hasta >= claves.length) return null;
  const siguiente = [...claves];
  [siguiente[desde], siguiente[hasta]] = [siguiente[hasta], siguiente[desde]];
  return siguiente;
}

/** «Sin hábitos», «1 hábito activo» o «3 hábitos activos de 4». */
export function textoDeLosHabitosDeLaCategoria(categoria: Pick<CategoriaAdmin, 'activeHabits' | 'totalHabits'>): string {
  const { activeHabits: activos, totalHabits: total } = categoria;
  if (total === 0) return 'Sin hábitos';
  const activosEnPalabras = `${activos} ${activos === 1 ? 'hábito activo' : 'hábitos activos'}`;
  return total > activos ? `${activosEnPalabras} de ${total}` : activosEnPalabras;
}
