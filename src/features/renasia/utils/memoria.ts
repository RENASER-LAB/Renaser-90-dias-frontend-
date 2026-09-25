import type { MemoriaRenasiaApi, RecuerdoRenasiaApi } from '../types/renasia.types';

/**
 * La memoria del acompañante en el perfil (D-167): qué se muestra y en qué orden. Lógica pura, sin
 * React, para poder probarla sin montar la pantalla.
 */

/** El orden en que las eligió el dueño. Una categoría que no está acá va al final. */
export const ORDEN_DE_CATEGORIAS = ['CONTEXTO_DE_VIDA', 'METAS_Y_LO_QUE_FUNCIONA', 'PREFERENCIAS_DE_TRATO'];

export type GrupoDeRecuerdos = { categoria: string; titulo: string; recuerdos: RecuerdoRenasiaApi[] };

/**
 * Si la sección se muestra: con la memoria encendida, siempre (aunque esté vacía, para contar qué
 * hace); apagada, solo si quedó algo de antes, para que se pueda borrar.
 */
export function mostrarMemoria(memoria: MemoriaRenasiaApi | null): boolean {
  if (!memoria) return false;
  return memoria.activa || memoria.recuerdos.length > 0 || memoria.resumen !== null;
}

/** ¿Hay algo que mostrar o borrar? Sin nada, la pantalla dice que todavía no recuerda nada. */
export function memoriaVacia(memoria: MemoriaRenasiaApi): boolean {
  return memoria.recuerdos.length === 0 && memoria.resumen === null;
}

/** Por categoría, en el orden de arriba; dentro de cada una, en el orden en que llegaron. */
export function agruparRecuerdos(recuerdos: RecuerdoRenasiaApi[]): GrupoDeRecuerdos[] {
  const grupos = new Map<string, GrupoDeRecuerdos>();
  for (const recuerdo of recuerdos) {
    const grupo = grupos.get(recuerdo.categoria) ?? { categoria: recuerdo.categoria, titulo: recuerdo.titulo, recuerdos: [] };
    grupo.recuerdos.push(recuerdo);
    grupos.set(recuerdo.categoria, grupo);
  }
  const lugar = (categoria: string) => {
    const i = ORDEN_DE_CATEGORIAS.indexOf(categoria);
    return i === -1 ? ORDEN_DE_CATEGORIAS.length : i;
  };
  return [...grupos.values()].sort((a, b) => lugar(a.categoria) - lugar(b.categoria));
}
