import type { FiltroDeGrupos, GrupoDelLider } from '../types/gruposDelLider.types';

/**
 * Qué grupo cae en cada filtro de «Grupos» (spec 056 FR-006). Puras, para probar sin montar nada.
 *
 * «Sin mentor» cuenta lo mismo que `gruposSinMentor` de «Por resolver»: grupos **regulares en curso** sin mentor. Si una cifra y otra
 * contaran distinto, la fila de «Mis mentores» diría 3 y la lista mostraría 2.
 */
export function estaSinMentor(g: GrupoDelLider): boolean {
  return !g.esRecepcion && g.enCurso && g.mentorId === null;
}

/** Lleno: tiene tope y ya lo alcanzó. Un grupo sin tope (recepción) o sin cifra de aprendices no se da por lleno. */
export function estaLleno(g: GrupoDelLider): boolean {
  return g.enCurso && g.cupo !== null && g.cupo > 0 && g.aprendices !== null && g.aprendices >= g.cupo;
}

export function estaActivo(g: GrupoDelLider): boolean {
  return g.enCurso && g.mentorId !== null;
}

const REGLAS: Record<FiltroDeGrupos, (g: GrupoDelLider) => boolean> = { sinMentor: estaSinMentor, activos: estaActivo, llenos: estaLleno };

export function gruposDelFiltro(grupos: readonly GrupoDelLider[], filtro: FiltroDeGrupos): GrupoDelLider[] {
  return grupos.filter(REGLAS[filtro]).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
}

export function cuantosPorFiltro(grupos: readonly GrupoDelLider[]): Record<FiltroDeGrupos, number> {
  return { sinMentor: grupos.filter(estaSinMentor).length, activos: grupos.filter(estaActivo).length, llenos: grupos.filter(estaLleno).length };
}

/** Abre en «Sin mentor» si hay alguno; si no, en «Activos» (FR-006). */
export function filtroInicialDeGrupos(grupos: readonly GrupoDelLider[]): FiltroDeGrupos {
  return grupos.some(estaSinMentor) ? 'sinMentor' : 'activos';
}

/**
 * La generación en la que nace un grupo nuevo: la activa que más grupos de sus formaciones tiene. El líder no lista las generaciones
 * (eso es de Administración): se sabe por los grupos que ya ve. `null` si no hay ninguna activa.
 */
export function cohorteParaCrear(grupos: readonly GrupoDelLider[]): { cohorteId: string; formacion: string | null } | null {
  const cuentas = new Map<string, { cantidad: number; formacion: string | null }>();
  for (const g of grupos) {
    if (!g.cohorteActiva) continue;
    const previa = cuentas.get(g.cohorteId);
    cuentas.set(g.cohorteId, { cantidad: (previa?.cantidad ?? 0) + 1, formacion: previa?.formacion ?? g.formacion });
  }
  let mejor: { cohorteId: string; cantidad: number; formacion: string | null } | null = null;
  for (const [cohorteId, v] of cuentas) if (!mejor || v.cantidad > mejor.cantidad) mejor = { cohorteId, ...v };
  return mejor ? { cohorteId: mejor.cohorteId, formacion: mejor.formacion } : null;
}

/** ¿Ya hay un grupo con ese nombre (sin mayúsculas ni tildes ni espacios de más)? El asistente lo dice antes de avanzar. */
export function nombreYaUsado(nombre: string, grupos: readonly Pick<GrupoDelLider, 'nombre'>[]): boolean {
  const limpio = normalizar(nombre);
  return limpio !== '' && grupos.some(g => normalizar(g.nombre) === limpio);
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('es');
}

/** Lo que cada mentor del asistente dice de su cupo: lleno solo si tiene tope y ya lo alcanzó (un mentor sin grupo recibe). */
export function mentorConCupoLleno(cupo: { acompanados: number; maximo: number } | null | undefined): boolean {
  return !!cupo && cupo.maximo > 0 && cupo.acompanados >= cupo.maximo;
}
