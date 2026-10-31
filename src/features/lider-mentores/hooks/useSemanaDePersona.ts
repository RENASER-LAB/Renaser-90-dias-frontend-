import { useLecturaPorSemana, type InicioSemanal, type LecturaPorSemana } from '../../semaforo/hooks/useLecturaPorSemana';
import { primerViernesDelPrograma } from '../../semaforo/utils/semanasDelSemaforo';
import { obtenerSemanaDePersona } from '../api/cumplimientoDelLiderApi';
import type { SemanaDePersona } from '../types/cumplimientoDelLider.types';

/** Lo que una pantalla necesita para mostrar la ventana de una persona y moverse entre ventanas. */
export type LecturaDeLaSemana = LecturaPorSemana<SemanaDePersona>;

/**
 * La ventana de una persona del grupo (spec 005; `GET /leadership/groups/{g}/people/{p}/week`).
 *
 * **Es la misma ventana, y se mueve igual, que el resumen por grupos y la lista del grupo** (decisión del dueño del
 * 2026-10-19: «la ventana del resumen manda en todo»): es la lectura por semanas de siempre (`useLecturaPorSemana`),
 * que arranca donde diga `inicio` —lo que la lista estaba mirando— y que sin fecha es la ventana vigente (los 7 días
 * que terminan ayer). ‹ lleva a la última semana cerrada y de ahí de 7 en 7 días; › vuelve; ninguna llega al futuro.
 * Hacia atrás se llega hasta el inicio del programa de la persona (`primeraSemana`, que manda el servidor).
 *
 * - **Una respuesta vieja nunca pisa a una nueva**: cada lectura toma un turno y solo la última escribe.
 * - **Al cambiar de persona o de ventana no queda a la vista el dato anterior, ni por un instante** (SC-005).
 * - **Si falla, se dice y se puede reintentar**; no quedan datos viejos que parezcan de ahora.
 * - **Cada lectura deja un registro de consulta en el servidor** (FR-016): se pide al abrir la ficha y al cambiar de
 *   ventana, no en cada foco ni en un sondeo.
 *
 * @param grupoId el grupo desde el que se abrió a la persona; `null` = la puerta sin grupo del líder
 *   (`/leadership/people/{p}/week`, 2026-10-31: «Todos los aprendices»).
 * @param inicio la posición con que se abre (la que tenía la lista); ausente = la ventana vigente.
 */
export function useSemanaDePersona(grupoId: string | null, personaId: string, inicio?: InicioSemanal): LecturaDeLaSemana {
  return useLecturaPorSemana(
    semanaHasta => obtenerSemanaDePersona(grupoId, personaId, semanaHasta),
    `lider:${grupoId ?? '*'}|${personaId}`,
    inicio,
    { primerViernes: semana => primerViernesDelPrograma(semana.primeraSemana) },
  );
}
