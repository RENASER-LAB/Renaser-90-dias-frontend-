import { comoAbrirElSemaforoDelGrupo, quienAbreElResumenPorGrupos } from '../../semaforo/utils/entradasDelSemaforo';
import type { VistaCelula } from '../../mentor/hooks/useCelulaQueAcompano';
import { esOtroDeMisGrupos } from '../../mentor/utils/entradaAlGrupo';
import type { AlumnoConEstado } from '../../mentor/types/mentor.types';
import type { VistaDelPanel } from './vistasDeLosPaneles';

/**
 * Los avisos del teléfono que abren un panel de rol (2026-10-31: antes los atendía Hoy; ahora Yo, donde viven los paneles).
 *
 * `AbridorDeAvisos` lleva el toque a Yo con un parámetro (`abrirAlumno`, `abrirSemaforoDelGrupo`, `abrirSemaforoPorGrupos`); Yo lo
 * deja como un pendiente y lo resuelve en cuanto tiene lo que le falta: el padrón del grupo (el mentor) o saber si la cuenta
 * administra (el resumen general). Las decisiones son estas funciones puras: no abren nada por su cuenta, dicen QUÉ abrir.
 */

export type PendienteDeAviso =
  /** `/mentor/groups/{g}/learners/{a}` (RF-25): la ficha de ese alumno. */
  | { tipo: 'alumno'; grupoId: string; alumnoId: string }
  /** `/mentor/groups/{g}/semaforo`: «Mi grupo» con la sección del semáforo a la vista. */
  | { tipo: 'semaforoGrupo'; grupoId: string }
  /** `/semaforo/grupos`: el resumen por grupos del líder, o el semáforo de Administración. */
  | { tipo: 'semaforoGrupos' };

/** Lo que dicen los parámetros de la pestaña Yo, ya leídos. */
export interface ParametrosDeAvisoDeRol {
  abrirAlumno?: { grupoId: string; alumnoId: string };
  abrirSemaforoDelGrupo?: string;
  abrirSemaforoPorGrupos?: boolean;
}

/** El pendiente que pide un conjunto de parámetros, o `null` si no pide ninguno. Mal formado = nada. */
export function pendienteDeLosParametros(params: unknown): PendienteDeAviso | null {
  const p = (params ?? {}) as ParametrosDeAvisoDeRol;
  if (p.abrirAlumno && typeof p.abrirAlumno.grupoId === 'string' && typeof p.abrirAlumno.alumnoId === 'string') {
    return { tipo: 'alumno', grupoId: p.abrirAlumno.grupoId, alumnoId: p.abrirAlumno.alumnoId };
  }
  if (typeof p.abrirSemaforoDelGrupo === 'string' && p.abrirSemaforoDelGrupo) {
    return { tipo: 'semaforoGrupo', grupoId: p.abrirSemaforoDelGrupo };
  }
  if (p.abrirSemaforoPorGrupos === true) return { tipo: 'semaforoGrupos' };
  return null;
}

/** Los nombres de los parámetros que Yo consume una vez y limpia. */
export const PARAMETROS_DE_AVISO_DE_ROL = ['abrirAlumno', 'abrirSemaforoDelGrupo', 'abrirSemaforoPorGrupos'] as const;

/** Qué hacer con un pendiente de la ficha de un alumno o del semáforo de un grupo, cuando ya se leyó (o no) el padrón. */
export type ResolucionDelAvisoDeGrupo =
  /** Todavía no hay padrón: se espera. */
  | { hacer: 'esperar' }
  /** No es mentor, o no se pudo leer su grupo: se descarta el aviso. */
  | { hacer: 'descartar' }
  /** La ficha de ese alumno, que está en el padrón del grupo que se mira. */
  | { hacer: 'abrirAlumno'; alumno: AlumnoConEstado }
  /** El grupo, sin ficha: el alumno ya no está en el padrón (un aviso viejo no lleva a la ficha de alguien que rotó). */
  | { hacer: 'abrirGrupo' }
  /** El alumno es de OTRO de sus grupos: se pasa a ese grupo y, con su padrón, se abre la ficha. */
  | { hacer: 'cambiarDeGrupoYAbrirAlumno'; grupoId: string; alumnoId: string }
  /** El semáforo de un grupo: `cambiar` = primero pasar a ese grupo; `enfocar` = bajar hasta la sección. */
  | { hacer: 'abrirSemaforoDelGrupo'; cambiarAlGrupo: string | null; enfocar: boolean };

export function resolverAvisoDeGrupo(
  pendiente: Extract<PendienteDeAviso, { tipo: 'alumno' | 'semaforoGrupo' }>,
  situacion: { esMentor: boolean; vista: VistaCelula | null; huboFallo: boolean },
): ResolucionDelAvisoDeGrupo {
  if (!situacion.esMentor) return { hacer: 'descartar' };
  const vista = situacion.vista;
  if (!vista) return situacion.huboFallo ? { hacer: 'descartar' } : { hacer: 'esperar' };

  if (pendiente.tipo === 'alumno') {
    if (esOtroDeMisGrupos(pendiente.grupoId, vista)) {
      return { hacer: 'cambiarDeGrupoYAbrirAlumno', grupoId: pendiente.grupoId, alumnoId: pendiente.alumnoId };
    }
    const alumno = vista.todos.find(a => a.participanteId === pendiente.alumnoId);
    return alumno ? { hacer: 'abrirAlumno', alumno } : { hacer: 'abrirGrupo' };
  }

  const como = comoAbrirElSemaforoDelGrupo(pendiente.grupoId, vista.celula.id, vista.grupos.map(g => g.id));
  return { hacer: 'abrirSemaforoDelGrupo', cambiarAlGrupo: como === 'cambiar' ? pendiente.grupoId : null, enfocar: como !== 'grupo' };
}

/** El resumen general del sábado: el líder abre su pantalla; Administración y Alquimista, el semáforo de Administración. */
export function resolverAvisoDelResumenGeneral(params: {
  esLider: boolean;
  administrar: boolean;
  cargandoCapacidades: boolean;
}): { hacer: 'esperar' } | { hacer: 'descartar' } | { hacer: 'abrir'; vista: VistaDelPanel } | { hacer: 'abrirAdministracion' } {
  const quien = quienAbreElResumenPorGrupos(params);
  if (quien === 'esperar') return { hacer: 'esperar' };
  if (quien === 'nadie') return { hacer: 'descartar' };
  return quien === 'lider' ? { hacer: 'abrir', vista: { tipo: 'cumplimiento', grupo: null } } : { hacer: 'abrirAdministracion' };
}
