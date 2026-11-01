import type { FormacionDeLaSesion } from '../types/formaciones.types';
import { nombreLargoDeFormacion } from './nombreDeFormacion';

/**
 * «Mi programa» del personal con varias formaciones (spec 023, FR-030a). Quien trabaja en dos formaciones y hace su propio programa en una
 * de ellas lo ve SOLO en esa: con la otra activa, Training y Hoy dicen en una línea dónde está y llevan a cambiar de formación.
 *
 * El servidor dice en cuál formación son los hábitos de la persona (`GET /habit-categories` → `formation`): la de su programa o, si no hace
 * programa, la que tiene activa (en ese caso coincide con la activa y no hay aviso). Para quien tiene UNA sola formación, o ve todas
 * (Administración), nada cambia: no hay a dónde cambiarse.
 */
export type ProgramaEnOtraFormacion = { codigo: string; nombre: string };

export function programaEnOtraFormacion(
  formacion: FormacionDeLaSesion | null | undefined,
  formacionDelPrograma: string | null | undefined,
): ProgramaEnOtraFormacion | null {
  if (!formacion || !formacion.puedeElegir || formacion.veTodas || !formacion.activa || !formacionDelPrograma) return null;
  if (formacion.activa.codigo === formacionDelPrograma) return null;
  const nombre = formacion.disponibles.find(f => f.codigo === formacionDelPrograma)?.nombre ?? nombreLargoDeFormacion(formacionDelPrograma);
  return { codigo: formacionDelPrograma, nombre };
}

export function textoDelProgramaEnOtraFormacion(nombre: string): string {
  return `Tu programa propio está en ${nombre}. Cámbiate a ella para verlo.`;
}
