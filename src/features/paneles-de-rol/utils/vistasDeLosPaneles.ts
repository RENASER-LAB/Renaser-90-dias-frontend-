import type { GrupoAbierto } from '../../lider-mentores/screens/CumplimientoDelLiderScreen';
import { entradaAMisGrupos } from '../../mentor/utils/entradaAMisGrupos';
import type { AlumnoConEstado } from '../../mentor/types/mentor.types';

/**
 * Las pantallas de los paneles de rol que se abren desde Yo (2026-10-31): «Mi grupo» (el mentor o la guía) y «Mis mentores» (el
 * líder), con las que cuelgan de ellas. **El atrás sube un nivel por vez hasta Yo** (AGENTS.md §6): `vistaDeRegreso` dice a dónde.
 * Pura, para probar el recorrido sin montar nada.
 *
 *   Yo ← Mis grupos (si acompaña a más de uno) ← Mi grupo ← ficha del aprendiz   (con un solo grupo: Yo ← Mi grupo ← ficha)
 *   Yo ← Mis mentores ← todos los aprendices | hábitos de todos (← un hábito ← persona) | resultado por grupo (← su grupo ← persona)
 *   Yo ← Mis mentores (la pila de la spec 056: `LiderMentoresScreen`, con su propio atrás de un nivel por vez: mentor, grupos, grupo, aprendiz, consultas, reporte)
 */
export type VistaDelPanel =
  | { tipo: 'ninguna' }
  /** Spec 055 FR-001: la lista de los grupos que acompaña; solo se llega con dos o más (con uno, la entrada va directo a `miGrupo`). */
  | { tipo: 'misGrupos' }
  | { tipo: 'miGrupo'; enfocarSemaforo: boolean }
  | { tipo: 'alumno'; alumno: AlumnoConEstado }
  /** Spec 056: «Mis mentores» y todo lo que cuelga de él (`LiderMentoresScreen`) vive adentro de esta vista. */
  | { tipo: 'misMentores' }
  | { tipo: 'todos' }
  /** «Hábitos de todos» (spec 029): un día, hábito por hábito, con sus personas y su ficha. Los niveles de adentro los lleva la pantalla. */
  | { tipo: 'habitosDeTodos' }
  /** El resumen por grupos del líder; con `grupo`, directo en la lista de ese grupo (la fila que se tocó). */
  | { tipo: 'cumplimiento'; grupo: GrupoAbierto | null };

export const SIN_VISTA: VistaDelPanel = { tipo: 'ninguna' };

/** Spec 055 FR-001 y FR-002: la vista a la que entra la fila de Yo — «Mis grupos» con dos o más grupos, «Mi grupo» con uno. */
export function vistaDeEntradaAlGrupo(cantidadDeGrupos: number): VistaDelPanel {
  return entradaAMisGrupos(cantidadDeGrupos) === 'misGrupos' ? { tipo: 'misGrupos' } : { tipo: 'miGrupo', enfocarSemaforo: false };
}

/**
 * Adónde lleva «volver» (la flecha o el atrás del sistema) desde `vista`. `variosGrupos`: acompaña a más de un grupo, y entonces
 * desde «Mi grupo» se vuelve a «Mis grupos»; con uno solo se sale a Yo (spec 055 FR-003).
 */
export function vistaDeRegreso(vista: VistaDelPanel, variosGrupos = false): VistaDelPanel {
  switch (vista.tipo) {
    case 'alumno':
      return { tipo: 'miGrupo', enfocarSemaforo: false };
    case 'todos':
    case 'habitosDeTodos':
    case 'cumplimiento':
      return { tipo: 'misMentores' };
    case 'miGrupo':
      return variosGrupos ? { tipo: 'misGrupos' } : SIN_VISTA;
    case 'misGrupos':
    case 'misMentores':
    case 'ninguna':
      return SIN_VISTA;
  }
}

/** ¿Hay un panel de rol a la vista? Mientras sí, Yo no dibuja su lista. */
export function hayPanelAbierto(vista: VistaDelPanel): boolean {
  return vista.tipo !== 'ninguna';
}
