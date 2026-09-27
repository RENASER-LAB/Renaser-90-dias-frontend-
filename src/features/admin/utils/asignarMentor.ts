import type { MentorCandidatoApi } from '../api/adminSchemas';

/**
 * «Asignar mentor» del panel (E-372, ADM-13 del e2e del 2026-09-27).
 *
 * Desde D-141 un mentor puede liderar VARIOS grupos, y el backend tiene dos operaciones distintas:
 * - **Sumar** (`POST /admin/cells/{id}/additional-mentor`): lo pone al frente de este grupo y conserva los
 *   que ya lidera.
 * - **Trasladar** (`PUT /admin/cells/{id}/mentor`): lo pone al frente de este grupo y lo SACA de todos los
 *   demás, que se quedan sin mentor.
 *
 * El panel llamaba siempre al traslado y solo avisaba «Hoy ya acompaña otro grupo.»: asignar a un mentor
 * con cuatro grupos a un quinto los dejaba a los cuatro sin mentor, en silencio. Ahora lo que se elige por
 * defecto es sumar, y el traslado es un botón aparte que nombra los grupos que pierden su mentor.
 */

type MentorConGrupos = Pick<MentorCandidatoApi, 'cellId'> & { cellIds?: readonly string[] | null };

/** Todos los grupos que lidera: `cellIds` (D-141); un backend anterior solo manda `cellId`. */
function gruposQueLidera(mentor: MentorConGrupos): string[] {
  const todos = mentor.cellIds && mentor.cellIds.length > 0 ? mentor.cellIds : mentor.cellId ? [mentor.cellId] : [];
  return [...new Set(todos)];
}

/** Los grupos que ya lidera, sin contar este. */
export function otrosGruposDelMentor(mentor: MentorConGrupos, grupoId: string): string[] {
  return gruposQueLidera(mentor).filter(id => id !== grupoId);
}

/** Si ya lidera este grupo, aunque no sea el primero de su lista (`cellId` es solo el primero). */
export function yaLideraEsteGrupo(mentor: MentorConGrupos, grupoId: string): boolean {
  return gruposQueLidera(mentor).includes(grupoId);
}

/**
 * Lo que hace «Asignar», que por defecto SUMA:
 * - `nada`: ya lo lidera.
 * - `asignar` (`PUT`): no lidera otros grupos, así que el traslado es lo mismo que sumar y, en una sola
 *   operación, además saca al mentor que tuviera el grupo.
 * - `sumar` (`POST additional-mentor`): conserva los que ya lidera. Si el grupo tiene otro mentor, antes se
 *   lo quita (`DELETE …/mentor`): un grupo sigue teniendo UN solo mentor, y el servidor no suma a un grupo
 *   ocupado. Son dos operaciones: si la segunda falla, el grupo queda sin mentor y se avisa.
 */
export type PlanParaAsignarMentor = { tipo: 'nada' } | { tipo: 'asignar' } | { tipo: 'sumar'; quitarAlActual: boolean };

export function planParaAsignarMentor(params: {
  grupoId: string;
  mentorDelGrupoId: string | null;
  mentor: MentorConGrupos & { userId: string };
}): PlanParaAsignarMentor {
  if (params.mentorDelGrupoId === params.mentor.userId || yaLideraEsteGrupo(params.mentor, params.grupoId)) {
    return { tipo: 'nada' };
  }
  if (otrosGruposDelMentor(params.mentor, params.grupoId).length === 0) return { tipo: 'asignar' };
  return { tipo: 'sumar', quitarAlActual: params.mentorDelGrupoId !== null };
}

/** «Aurora», «Aurora y Brisa», «Aurora, Brisa y Cielo». */
export function listaDeNombres(nombres: readonly string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? '';
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/**
 * Los nombres de esos grupos (salen de `GET /admin/cells/dashboard`). Los que no se conocen —falló esa
 * lectura, o el grupo es nuevo— se cuentan en vez de inventarles un nombre.
 */
export function nombresDeLosGrupos(ids: readonly string[], nombresPorId: Readonly<Record<string, string>>): string[] {
  const conocidos = ids.map(id => nombresPorId[id]).filter((nombre): nombre is string => !!nombre);
  const desconocidos = ids.length - conocidos.length;
  if (desconocidos === 0) return conocidos;
  return [...conocidos, desconocidos === 1 ? '1 grupo más' : `${desconocidos} grupos más`];
}

/**
 * La pregunta antes de asignar (A-5, 26/09: un toque de más cambiaba quién acompaña a diez personas). Si ya
 * lidera otros grupos, lo que se hace es SUMAR, y se dice cuáles conserva.
 *
 * > **Corregido 2026-09-27 (E-372).** Vivía en `utils/mensajes.ts` con un booleano, y con otros grupos
 * > decía «Hoy ya acompaña otro grupo.», sin decir que el panel se los iba a quitar.
 */
export function preguntaDeAsignarMentor(
  mentorNombre: string | null | undefined,
  grupoNombre: string | null | undefined,
  otrosGrupos: readonly string[],
): string {
  const quien = mentorNombre?.trim() || 'esta persona';
  const grupo = grupoNombre?.trim() || 'este grupo';
  if (otrosGrupos.length === 0) return `¿Asignar a ${quien} como mentor de ${grupo}?`;
  return `¿Sumar a ${quien} como mentor de ${grupo}? Sigue acompañando a ${listaDeNombres(otrosGrupos)}.`;
}

/** El aviso del traslado, que es la opción destructiva: nombra los grupos que se quedan sin mentor. */
export function avisoDeTrasladoDeMentor(
  mentorNombre: string | null | undefined,
  grupoNombre: string | null | undefined,
  otrosGrupos: readonly string[],
): string {
  const quien = mentorNombre?.trim() || 'esta persona';
  const grupo = grupoNombre?.trim() || 'este grupo';
  return `Si trasladas a ${quien} a ${grupo}, deja de acompañar a ${listaDeNombres(otrosGrupos)}, que se quedan sin mentor.`;
}
