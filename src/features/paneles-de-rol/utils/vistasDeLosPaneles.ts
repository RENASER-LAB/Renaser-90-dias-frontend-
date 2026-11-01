import type { GrupoAbierto } from '../../lider-mentores/screens/CumplimientoDelLiderScreen';
import type { AlumnoConEstado } from '../../mentor/types/mentor.types';

/**
 * Las pantallas de los paneles de rol que se abren desde Yo (2026-10-31): «Mi grupo» (el mentor o la guía) y «Mis mentores» (el
 * líder), con las que cuelgan de ellas. **El atrás sube un nivel por vez hasta Yo** (AGENTS.md §6): `vistaDeRegreso` dice a dónde.
 * Pura, para probar el recorrido sin montar nada.
 *
 *   Yo ← Mi grupo ← ficha del aprendiz
 *   Yo ← Mis mentores ← consultas | mentores y reporte del mes | todos los aprendices | hábitos de todos (← un hábito ← persona) | resultado por grupo (← su grupo ← persona)
 */
export type VistaDelPanel =
  | { tipo: 'ninguna' }
  | { tipo: 'miGrupo'; enfocarSemaforo: boolean }
  | { tipo: 'alumno'; alumno: AlumnoConEstado }
  | { tipo: 'misMentores' }
  | { tipo: 'consultas' }
  | { tipo: 'mentores' }
  | { tipo: 'todos' }
  /** «Hábitos de todos» (spec 029): un día, hábito por hábito, con sus personas y su ficha. Los niveles de adentro los lleva la pantalla. */
  | { tipo: 'habitosDeTodos' }
  /** El resumen por grupos del líder; con `grupo`, directo en la lista de ese grupo (la fila que se tocó). */
  | { tipo: 'cumplimiento'; grupo: GrupoAbierto | null };

export const SIN_VISTA: VistaDelPanel = { tipo: 'ninguna' };

/** Adónde lleva «volver» (la flecha o el atrás del sistema) desde `vista`. */
export function vistaDeRegreso(vista: VistaDelPanel): VistaDelPanel {
  switch (vista.tipo) {
    case 'alumno':
      return { tipo: 'miGrupo', enfocarSemaforo: false };
    case 'consultas':
    case 'mentores':
    case 'todos':
    case 'habitosDeTodos':
    case 'cumplimiento':
      return { tipo: 'misMentores' };
    case 'miGrupo':
    case 'misMentores':
    case 'ninguna':
      return SIN_VISTA;
  }
}

/** ¿Hay un panel de rol a la vista? Mientras sí, Yo no dibuja su lista. */
export function hayPanelAbierto(vista: VistaDelPanel): boolean {
  return vista.tipo !== 'ninguna';
}
