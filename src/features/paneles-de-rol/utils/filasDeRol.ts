import { entradaAlGrupoVisible, esLiderDeMentores } from '../../mentor/utils/entradaAlGrupo';
import type { FalloCelula } from '../../mentor/hooks/useCelulaQueAcompano';

/**
 * Qué filas de rol salen en la lista de Yo, junto a «Administración» (2026-10-31, pedido del dueño: «debe ir dentro de
 * Administración, lo mismo de cada uno, no en Hoy de cada rol»). Antes eran el control «Mi programa · Mi grupo · Mis mentores»
 * de Hoy (spec 018) y las tarjetas sueltas del mentor, del líder y de Administración. **Hoy es solo el programa propio.**
 *
 * Las reglas son las mismas de antes, sin inventar ninguna: las entradas de Soporte TI (`mentoria`, `lider`, `tickets`, `semaforo`),
 * el rol y si acompaña un grupo. Puras, para probarlas sin montar Yo.
 */
export interface EntradaDeLasFilasDeRol {
  /** `useEsMentor()`: mentor o guía de aprendiz, y también el líder (que cuenta como mentor). */
  esMentor: boolean;
  /** `user.role`. */
  rol: string | null | undefined;
  /** Lo que se leyó de «su grupo»: el fallo (`sin_celula` = el servidor dice que no acompaña ninguno) y si ya hay vista. */
  fallo: FalloCelula | null;
  hayVista: boolean;
  /** Interruptores de Soporte TI: `mentor.mi_grupo`, `lider`, `tickets` y `semaforo`. */
  miGrupoDisponible: boolean;
  liderDisponible: boolean;
  ticketsDisponible: boolean;
  semaforoDisponible: boolean;
}

export interface FilasDeRol {
  miGrupo: boolean;
  misMentores: boolean;
}

export function filasDeRolEnYo(e: EntradaDeLasFilasDeRol): FilasDeRol {
  const esLider = esLiderDeMentores(e.rol);

  /*
   * «Mi grupo»: el mentor o la guía que acompaña un grupo. Un mentor sin grupo la conserva (todavía no se lo asignaron y la
   * pantalla se lo explica). El líder solo la ve si de verdad acompaña uno, y no antes de saberlo: dibujarla un instante para
   * quitarla enseguida (cuando el servidor dice `sin_celula`) es peor que esperar.
   */
  let miGrupo = entradaAlGrupoVisible({ esMentor: e.esMentor, rol: e.rol, fallo: e.fallo }) && e.miGrupoDisponible;
  if (miGrupo && esLider) miGrupo = e.hayVista || e.fallo !== null;

  /* «Mis mentores»: solo el líder, y mientras alguna de sus tres entradas siga prendida. */
  const misMentores = esLider && (e.liderDisponible || e.ticketsDisponible || e.semaforoDisponible);

  return { miGrupo, misMentores };
}
