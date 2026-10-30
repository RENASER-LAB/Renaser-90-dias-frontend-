import type { MotivoDelCierre, PlanDeManana } from '../types/cierre.types';

/**
 * Los textos de las dos preguntas del cierre (spec 017), en un solo lugar: los usan la hoja (los chips), la fila de lo
 * que dijiste para mañana y las fichas del acompañamiento. El orden es el de la vista previa aprobada.
 */

export const MOTIVOS: ReadonlyArray<{ valor: MotivoDelCierre; texto: string }> = [
  { valor: 'SIN_TIEMPO', texto: 'No me alcanzó el tiempo' },
  { valor: 'SURGIO_OTRA_COSA', texto: 'Surgió otra cosa' },
  { valor: 'SIN_ENERGIA', texto: 'Me faltó energía' },
  { valor: 'PARA_DESPUES', texto: 'Lo dejé para después' },
];

export const PLANES_DE_MANANA: ReadonlyArray<{ valor: PlanDeManana; texto: string; enFrase: string }> = [
  { valor: 'OTRA_HORA', texto: 'Hacerla a otra hora', enFrase: 'a otra hora' },
  { valor: 'MAS_CORTA', texto: 'Hacerla más corta', enFrase: 'más corta' },
  { valor: 'PEDIR_AYUDA', texto: 'Pedir ayuda', enFrase: 'con ayuda' },
  { valor: 'DEJARLA', texto: 'Dejarla', enFrase: 'la dejas' },
];

export const PREGUNTA_DEL_MOTIVO = '¿Qué pasó?';
export const PREGUNTA_DE_MANANA = '¿Qué harás mañana?';

/** «No me alcanzó el tiempo», o `null` si el valor no es de los que esta versión conoce. */
export function textoDelMotivo(valor: string | null | undefined): string | null {
  return MOTIVOS.find(m => m.valor === valor)?.texto ?? null;
}

/** «Hacerla a otra hora», o `null` si el valor no es de los que esta versión conoce. */
export function textoDelPlan(valor: string | null | undefined): string | null {
  return PLANES_DE_MANANA.find(p => p.valor === valor)?.texto ?? null;
}

/** «a otra hora»: lo que se dice detrás del nombre de la acción (««Revisar las facturas» a otra hora»). */
export function planEnFrase(valor: string | null | undefined): string | null {
  return PLANES_DE_MANANA.find(p => p.valor === valor)?.enFrase ?? null;
}

export function esMotivoConocido(valor: unknown): valor is MotivoDelCierre {
  return MOTIVOS.some(m => m.valor === valor);
}

export function esPlanConocido(valor: unknown): valor is PlanDeManana {
  return PLANES_DE_MANANA.some(p => p.valor === valor);
}
