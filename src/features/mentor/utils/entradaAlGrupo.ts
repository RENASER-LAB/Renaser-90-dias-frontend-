import type { FalloCelula } from '../hooks/useCelulaQueAcompano';

/**
 * Si se dibuja la entrada a «Mi grupo».
 *
 * <blockquote><b>El caso que motivó esto.</b> Un LÍDER DE MENTORES ve la tarjeta porque
 * `useEsMentor()` lo cuenta como mentor. Pero el backend **le impide tener grupo asignado**:
 * asignar mentor a un grupo exige rol MENTOR, ADMIN o ALQUIMISTA
 * (`ComposicionDeCelulaService`). El resultado es una tarjeta que dice para siempre que no
 * tiene aprendices, y una pantalla vacía detrás. Es, literalmente, la única entrada propia que
 * ese rol tiene en toda la app.</blockquote>
 *
 * La condición se escribe acá, pura, por dos motivos: se prueba sin montar la pantalla, y las
 * dos entradas que existen —la tarjeta de Hoy y la fila de Comunidad— preguntan lo mismo en vez
 * de repetir la condición y desincronizarse.
 */

/**
 * Líder de mentores, en las dos nomenclaturas vivas.
 *
 * El enum de la base está en castellano (`LIDER_MENTORES`) y Java lo traduce al inglés
 * (`MENTOR_LEAD`). Comprobar solo uno es la clase de fallo que no avisa, el mismo motivo por el
 * que `ROL_MENTOR` acepta los dos.
 */
const ROL_LIDER_MENTORES = ['MENTOR_LEAD', 'LIDER_MENTORES'] as const;

export function esLiderDeMentores(rol: string | null | undefined): boolean {
  const clave = rol?.toUpperCase();
  return Boolean(clave && (ROL_LIDER_MENTORES as readonly string[]).includes(clave));
}

/**
 * `false` solo en un caso: quien es **líder de mentores** y el servidor ya respondió que no
 * acompaña ningún grupo.
 *
 * Todo lo demás sigue exactamente como estaba:
 *
 * - Un MENTOR sin grupo **conserva** la tarjeta. Para él, no tener grupo todavía es un estado
 *   transitorio —se lo van a asignar—, y la pantalla de atrás se lo explica. Esconderla sería
 *   cambiarle la app a un rol que hoy funciona.
 * - `sin_celula` es el único fallo que significa "no acompaña nada", y lo dice el servidor:
 *   `GET /mentor/context` responde 200 con `assignments: []`. Un 404, un 403 o un corte de red
 *   **no** esconden nada, porque entonces no se sabe si tiene grupo, y esconder la entrada
 *   dejaría a la persona sin forma de reintentar ni de leer qué pasó.
 * - Mientras carga tampoco se esconde: parpadear la entrada en cada foco sería peor que la
 *   tarjeta vacía que esto viene a sacar.
 */
export function entradaAlGrupoVisible(params: {
  /** Lo que ya decide hoy si la entrada existe: `useEsMentor()`. */
  esMentor: boolean;
  /** `user.role` de `GET /auth/me`. */
  rol: string | null | undefined;
  fallo: FalloCelula | null;
}): boolean {
  if (!params.esMentor) return false;
  if (!esLiderDeMentores(params.rol)) return true;
  return params.fallo !== 'sin_celula';
}
