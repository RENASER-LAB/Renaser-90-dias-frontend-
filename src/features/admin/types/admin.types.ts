/** Las vistas de Administración. No son rutas del navegador: los cinco tabs no se tocan. */
export type SeccionAdmin = 'inicio' | 'grupos' | 'personas' | 'solicitudes' | 'semaforo' | 'caja' | 'mas';

/** Un grupo tal como lo muestra la lista, ya traducido del contrato HTTP. */
export type GrupoAdmin = {
  id: string;
  nombre: string;
  cohorteId: string;
  mentorNombre: string | null;
  especialidadMentor: string | null;
  periodoInicio: string | null;
  periodoFin: string | null;
  estado: 'VIGENTE' | 'PROGRAMADO' | 'CERRADO' | 'SIN_PERIODO' | null;
  tipo: string | null;
  aprendices: number | null;
  cupo: number | null;
};

/**
 * A quién abre la ficha de un aprendiz. La lista de Personas trae la fila entera
 * (`AprendizAdminApi`); el semáforo y «¿A quién atiendo hoy?» (26/09, S-3 y S-4) solo saben su id,
 * su nombre y de qué grupo viene. La ficha muestra lo que haya y no pide nada más: el resto (su
 * semana, su semáforo) lo lee por el id.
 */
export type PersonaDeFicha = {
  id: string;
  fullName: string | null;
  email?: string | null;
  programDay?: number | null;
  phase?: string | null;
  cellId?: string | null;
  /** D-243: la fila de Personas lo trae si la persona cerró su cuenta (fecha del borrado, ISO). */
  deletionScheduledFor?: string | null;
};
