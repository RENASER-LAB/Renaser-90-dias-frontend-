import type { EstadoMapa } from '../../mapa-renacimiento/tipos';

/**
 * ¿Se puede definir o editar el objetivo de 90 días en Plan? Solo con el Mapa de Renacimiento activo
 * (2026-10-27, issue #37).
 *
 * **Por qué.** El objetivo de 90 días nace del Mapa y queda fijo (D-234). Una persona lo escribió en Plan sin haber
 * activado el Mapa y, al activarlo, el servidor le respondió `409 ROCA_MAESTRA_FIJA` (backend #20). La regla del dueño:
 * los objetivos esperan al Mapa. El Mapa en sí sigue siendo opcional en el resto de la app.
 *
 * Esto es SOLO la decisión: de qué lectura del Mapa depende y qué se dibuja lo ven el hook y la pantalla.
 */

/**
 * Lo que se sabe del Mapa de esta persona.
 *
 * - `cargando`: todavía no se leyó nada. No se puede prometer ni negar nada.
 * - `confirmada`: el borrador del teléfono dice «activo», o el servidor respondió (`stageCompleted`).
 * - `sin-confirmar`: el borrador no está activo y el servidor no contestó (red, 5xx): se ignora si el Mapa está
 *   hecho. No es lo mismo que «no está hecho»: no se la deja pasar ni se la bloquea, se le dice que se reintente.
 */
export type LecturaDelMapa =
  | { fase: 'cargando' }
  | { fase: 'confirmada'; estado: EstadoMapa }
  | { fase: 'sin-confirmar'; estado: EstadoMapa };

/**
 * - `abierta`: los objetivos son los de siempre.
 * - `espera-al-mapa`: el Mapa no está activo; en lugar de los objetivos va el aviso «Primero tu Mapa».
 * - `comprobando`: se está leyendo; ni formularios ni aviso.
 * - `sin-comprobar`: no se pudo leer; «No pudimos comprobar tu Mapa» y «Reintentar».
 */
export type PuertaDeObjetivos = 'abierta' | 'espera-al-mapa' | 'comprobando' | 'sin-comprobar';

export function puertaDeObjetivos(habilitado: boolean, lectura: LecturaDelMapa): PuertaDeObjetivos {
  // Un build sin el Mapa no puede pedírselo a nadie: nada se bloquea.
  if (!habilitado) return 'abierta';
  if (lectura.fase === 'cargando') return 'comprobando';
  // «activo» en el teléfono basta: lo escribe `activar()` cuando las tres rocas y los hábitos ya están creados.
  if (lectura.estado === 'activo') return 'abierta';
  return lectura.fase === 'confirmada' ? 'espera-al-mapa' : 'sin-comprobar';
}
