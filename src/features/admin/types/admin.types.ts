/** Las vistas de Administración. No son rutas del navegador: los cinco tabs no se tocan. */
export type SeccionAdmin = 'inicio' | 'grupos' | 'personas' | 'solicitudes' | 'semaforo' | 'mas';

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
