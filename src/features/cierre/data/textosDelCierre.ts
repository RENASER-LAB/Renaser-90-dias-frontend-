import type { IconName } from '../../../components/Icon';
import type { MotivoDelCierre, PlanDeManana } from '../types/cierre.types';

/**
 * Los textos de las dos preguntas del cierre (spec 017), en un solo lugar: los usan la hoja (los chips), la fila de lo
 * que dijiste para mañana y las fichas del acompañamiento. El orden es el de la vista previa aprobada.
 *
 * Cada opción tiene dos textos y un ícono (2026-11-03, «Cierra tu día con chips de ícono»):
 * - `corto` es lo que se VE —en el chip y en las fichas del acompañamiento—: «Tiempo», «Otra hora».
 * - `texto` es el de siempre, completo: lo oye el lector de pantalla («No me alcanzó el tiempo, seleccionado»).
 * - `valor` es lo que viaja al servidor, y no cambia.
 * - `icono` es de línea (Lucide) y acompaña al texto corto; nunca va solo.
 */

export const MOTIVOS: ReadonlyArray<{ valor: MotivoDelCierre; texto: string; corto: string; icono: IconName }> = [
  { valor: 'SIN_TIEMPO', texto: 'No me alcanzó el tiempo', corto: 'Tiempo', icono: 'clock' },
  { valor: 'SURGIO_OTRA_COSA', texto: 'Surgió otra cosa', corto: 'Imprevisto', icono: 'alertTriangle' },
  { valor: 'SIN_ENERGIA', texto: 'Me faltó energía', corto: 'Energía', icono: 'batteryLow' },
  { valor: 'PARA_DESPUES', texto: 'Lo dejé para después', corto: 'Lo evité', icono: 'ban' },
];

export const PLANES_DE_MANANA: ReadonlyArray<{
  valor: PlanDeManana;
  texto: string;
  corto: string;
  icono: IconName;
  enFrase: string;
}> = [
  { valor: 'OTRA_HORA', texto: 'Hacerla a otra hora', corto: 'Otra hora', icono: 'calendarClock', enFrase: 'a otra hora' },
  { valor: 'MAS_CORTA', texto: 'Hacerla más corta', corto: 'Más corta', icono: 'minimize2', enFrase: 'más corta' },
  { valor: 'PEDIR_AYUDA', texto: 'Pedir ayuda', corto: 'Pedir ayuda', icono: 'handHelping', enFrase: 'con ayuda' },
  { valor: 'DEJARLA', texto: 'Dejarla', corto: 'Dejarla', icono: 'x', enFrase: 'la dejas' },
];

export const PREGUNTA_DEL_MOTIVO = '¿Qué pasó?';
export const SUBTITULO_DEL_MOTIVO = 'Selecciona lo que más haya influido.';
export const PREGUNTA_DE_MANANA = '¿Qué harás mañana?';

/** «No me alcanzó el tiempo», o `null` si el valor no es de los que esta versión conoce. */
export function textoDelMotivo(valor: string | null | undefined): string | null {
  return MOTIVOS.find(m => m.valor === valor)?.texto ?? null;
}

/** «Hacerla a otra hora», o `null` si el valor no es de los que esta versión conoce. */
export function textoDelPlan(valor: string | null | undefined): string | null {
  return PLANES_DE_MANANA.find(p => p.valor === valor)?.texto ?? null;
}

/** «Tiempo», lo que se ve del motivo; `null` si el valor no es de los que esta versión conoce. */
export function textoCortoDelMotivo(valor: string | null | undefined): string | null {
  return MOTIVOS.find(m => m.valor === valor)?.corto ?? null;
}

/** «Otra hora», lo que se ve del plan para mañana; `null` si el valor no es de los que esta versión conoce. */
export function textoCortoDelPlan(valor: string | null | undefined): string | null {
  return PLANES_DE_MANANA.find(p => p.valor === valor)?.corto ?? null;
}

/** El ícono del motivo, o `null` si el valor no es de los que esta versión conoce. */
export function iconoDelMotivo(valor: string | null | undefined): IconName | null {
  return MOTIVOS.find(m => m.valor === valor)?.icono ?? null;
}

/** El ícono del plan para mañana, o `null` si el valor no es de los que esta versión conoce. */
export function iconoDelPlan(valor: string | null | undefined): IconName | null {
  return PLANES_DE_MANANA.find(p => p.valor === valor)?.icono ?? null;
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
