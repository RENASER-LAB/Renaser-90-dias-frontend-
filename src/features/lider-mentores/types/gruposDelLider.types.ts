/**
 * Los grupos de las formaciones del líder (spec 056 FR-006): lo que une el tablero (`GET /admin/cells/dashboard`) con el estado, el tipo y la
 * ocupación de cada grupo (`GET /admin/cells?cohortId=`).
 */
export interface GrupoDelLider {
  id: string;
  nombre: string;
  cohorteId: string;
  /** El código de su formación; con él nace un grupo nuevo en la misma. */
  formacion: string | null;
  mentorId: string | null;
  mentorNombre: string | null;
  /** Los aprendices que tiene hoy; `null` si el servidor no lo dijo (nunca un cero inventado). */
  aprendices: number | null;
  /** El tope de aprendices; `null` en recepción, que no lo tiene. */
  cupo: number | null;
  /** `true` si es de bienvenida (7 días, sin tope): no se cuenta como «sin mentor» ni se llena. */
  esRecepcion: boolean;
  /** `true` si está en curso (vigente o sin período). Un grupo cerrado o por empezar no entra en los filtros. */
  enCurso: boolean;
  /** La cohorte está activa: de ahí sale a cuál pertenece un grupo nuevo. */
  cohorteActiva: boolean;
}

export type FiltroDeGrupos = 'sinMentor' | 'activos' | 'llenos';
