import type { FiltroDeGrupos } from '../types/gruposDelLider.types';

/**
 * Las pantallas del líder dentro de «Mis mentores» (spec 056 FR-046): Mis mentores → mentor → grupo → aprendiz, y Grupos, Crear grupo, Consultas y el
 * reporte. Es una pila: **el atrás sube un nivel por vez** hasta «Mis mentores» y de ahí a Yo; nunca cierra la app desde una subpantalla (AGENTS.md §6).
 * Pura, para probar el recorrido sin montar nada.
 */
export type VistaDelLider =
  | { tipo: 'misMentores' }
  | { tipo: 'fichaMentor'; mentorId: string; nombre: string }
  | { tipo: 'grupos'; filtro?: FiltroDeGrupos }
  | { tipo: 'crearGrupo' }
  | { tipo: 'grupo'; grupoId: string; nombre: string; mentorNombre: string | null }
  | { tipo: 'fichaAprendiz'; personaId: string; nombre: string; grupoId: string | null; mentorNombre: string | null }
  | { tipo: 'consultas' }
  | { tipo: 'reporte' };

export const PILA_INICIAL: readonly VistaDelLider[] = [{ tipo: 'misMentores' }];

export const abrir = (pila: readonly VistaDelLider[], vista: VistaDelLider): VistaDelLider[] => [...pila, vista];

/** Un nivel atrás. `null` = ya está en «Mis mentores»: quien la monta sale a Yo. */
export function volver(pila: readonly VistaDelLider[]): VistaDelLider[] | null {
  return pila.length > 1 ? pila.slice(0, -1) : null;
}

/** Al crear un grupo, el asistente se cambia por «Grupos» en «Activos»: ahí aparece el grupo nuevo y el atrás lleva a donde se estaba. */
export function alCrearUnGrupo(pila: readonly VistaDelLider[]): VistaDelLider[] {
  const sinElAsistente = pila.filter(v => v.tipo !== 'crearGrupo');
  const base = sinElAsistente.filter((v, i) => !(v.tipo === 'grupos' && i === sinElAsistente.length - 1));
  return [...base, { tipo: 'grupos', filtro: 'activos' }];
}

/**
 * Al cambiar el mentor de un grupo con el grupo abierto, la pila recuerda al mentor nuevo: el grupo y las fichas de sus aprendices que están debajo vuelven a
 * dibujarse con lo que dice la pila, y sin esto la cabecera volvería a decir el mentor anterior (spec 056 FR-009, «lo que cambia se ve»).
 */
export function alCambiarElMentorDelGrupo(pila: readonly VistaDelLider[], grupoId: string, mentorNombre: string): VistaDelLider[] {
  return pila.map(vista => {
    if (vista.tipo === 'grupo' && vista.grupoId === grupoId) return { ...vista, mentorNombre };
    if (vista.tipo === 'fichaAprendiz' && vista.grupoId === grupoId) return { ...vista, mentorNombre };
    return vista;
  });
}

/** Lo que dice la flecha de una ficha: a qué pantalla vuelve («Mis mentores», «Grupos», el nombre del grupo o del mentor). */
export function rotuloDeVolver(pila: readonly VistaDelLider[]): string {
  const anterior = pila.length > 1 ? pila[pila.length - 2] : null;
  switch (anterior?.tipo) {
    case 'fichaMentor':
      return anterior.nombre;
    case 'grupo':
      return anterior.nombre;
    case 'grupos':
      return 'Grupos';
    case 'consultas':
      return 'Consultas';
    case 'reporte':
      return 'Reporte del mes';
    default:
      return 'Mis mentores';
  }
}
