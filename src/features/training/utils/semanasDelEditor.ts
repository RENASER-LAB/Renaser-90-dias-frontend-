import type { FechaDelHabitoApi } from '../../habits/types/habits.types';
import { DIAS_DEL_PLAN, type DiaDelPlan } from '../../habits/utils/semanaDelPlan';
import { fraseDeLaSemana, sumarDiasIso } from './ofertaDeRepetir';

/**
 * Las semanas que el editor de «Planificar» deja ver en «Por semana» (2026-11-02, pedido del dueño: «¿a qué? debería deslizar hacia la
 * derecha y poder planificar»): desde la semana en curso (el domingo, desde la que empieza) hasta la última del programa de la persona
 * —90 días, 3 meses o 1 año—. Todo puro y con fechas `YYYY-MM-DD`: no lee el reloj, quien lo llama le dice cuándo es hoy.
 *
 * La regla de la última semana es la del servidor (`PlanDeLaSemanaService`): una semana futura se acepta si su lunes cae dentro del
 * programa, es decir, si no es posterior al último día (`hoy + duración − día de programa`).
 */

/** Tope de seguridad: un año tiene 53 semanas; nada de esto debería pasar de ahí. */
const MAXIMO_DE_SEMANAS = 60;

/** El lunes de la semana que contiene a esa fecha. */
export function lunesDeLaFecha(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  const diaDeLaSemana = new Date(a, m - 1, d, 12, 0, 0, 0).getDay();
  return sumarDiasIso(iso, -((diaDeLaSemana + 6) % 7));
}

/**
 * La fecha de hoy a partir del lunes de la primera semana del editor: esa semana es la en curso (hoy es el día `indiceDeHoy`, lunes = 0)
 * o, si hoy es domingo, la que empieza mañana.
 */
export function hoyDesdeLaPrimeraSemana(lunesInicial: string, indiceDeHoy: number, esLaSiguiente: boolean): string {
  return sumarDiasIso(lunesInicial, esLaSiguiente ? indiceDeHoy - 7 : indiceDeHoy);
}

/**
 * El último día del programa de la persona, o `null` si no se sabe (sin día de programa o sin duración): sin ese dato no se inventa un
 * tope y el editor ofrece solo la primera semana, como antes.
 */
export function ultimoDiaDelPrograma(
  hoyIso: string,
  diaPrograma: number | null | undefined,
  duracionDias: number | null | undefined,
): string | null {
  if (typeof diaPrograma !== 'number' || typeof duracionDias !== 'number') return null;
  if (!(diaPrograma >= 1) || !(duracionDias >= 1)) return null;
  return sumarDiasIso(hoyIso, Math.max(0, Math.floor(duracionDias) - Math.floor(diaPrograma)));
}

/**
 * Los lunes de las semanas que se pueden ver, en orden: el de la primera semana y los siguientes mientras no pasen del último día del
 * programa. Sin último día conocido, solo la primera. Si el programa ya terminó antes de la primera semana, ninguna (no se ofrece).
 */
export function lunesDeLasSemanas(lunesInicial: string, ultimoDia: string | null): string[] {
  if (ultimoDia === null) return [lunesInicial];
  const lunes: string[] = [];
  for (let l = lunesInicial; l <= ultimoDia && lunes.length < MAXIMO_DE_SEMANAS; l = sumarDiasIso(l, 7)) lunes.push(l);
  return lunes;
}

/** La fecha de cada día de la semana que empieza ese lunes. */
export function fechasDeLaSemana(lunesIso: string): Record<DiaDelPlan, string> {
  const fechas = {} as Record<DiaDelPlan, string>;
  DIAS_DEL_PLAN.forEach((dia, indice) => {
    fechas[dia] = sumarDiasIso(lunesIso, indice);
  });
  return fechas;
}

/** Solo el día del mes (`09`) de cada día de la semana que empieza ese lunes: lo que dibuja la pastilla. */
export function diasDelMesDeLaSemana(lunesIso: string): Record<DiaDelPlan, string> {
  const fechas = fechasDeLaSemana(lunesIso);
  const dias = {} as Record<DiaDelPlan, string>;
  for (const dia of DIAS_DEL_PLAN) dias[dia] = fechas[dia].slice(-2);
  return dias;
}

/** «Semana del 9 al 15 nov» (o «Semana del 26 oct al 1 nov» cuando cruza de mes). */
export function rotuloDeLaSemana(lunesIso: string): string {
  return `Semana del ${fraseDeLaSemana(lunesIso)}`;
}

/** «9–15 nov» o «26 oct–1 nov»: la semana en el botón de guardar. */
export function rangoCortoDeLaSemana(lunesIso: string): string {
  return fraseDeLaSemana(lunesIso).replace(' al ', '–');
}

/**
 * La primera semana con cambios propios que todavía se pueden ver y cambiar, o `null` si ninguna tiene (el editor abre en «Siempre»).
 * Sale de las fechas con fila propia que manda `GET /habit-preferences` (`dateOverrides`); las de hoy y las pasadas no cuentan: ya no
 * se pueden tocar y la pastilla no las marcaría.
 */
export function primeraSemanaConCambiosPropios(
  fechas: readonly Pick<FechaDelHabitoApi, 'date' | 'customDate'>[] | null | undefined,
  semanas: readonly string[],
  hoyIso: string,
): string | null {
  if (!Array.isArray(fechas) || semanas.length === 0) return null;
  const propias = fechas
    .filter(f => f && typeof f.date === 'string' && f.customDate !== false && f.date > hoyIso)
    .map(f => f.date)
    .sort();
  for (const fecha of propias) {
    const lunes = lunesDeLaFecha(fecha);
    if (semanas.includes(lunes)) return lunes;
  }
  return null;
}

/* ------------------------------------------------------------------------------------------------
 * Deslizar la fila de días para pasar de semana
 * ---------------------------------------------------------------------------------------------- */

export type CambioDeSemana = 'anterior' | 'siguiente';

/** Cuánto hay que moverse de lado, como mínimo, para que cuente como un deslizamiento. */
export const UMBRAL_PARA_EMPEZAR = 10;
/** Cuánto recorrido basta para cambiar de semana soltando. */
export const RECORRIDO_PARA_CAMBIAR = 48;
/** Un golpe rápido cambia de semana con menos recorrido. */
export const VELOCIDAD_DEL_GOLPE = 0.4;
export const RECORRIDO_DEL_GOLPE = 20;

/**
 * ¿El dedo ya va de lado? Solo si el movimiento horizontal gana al vertical con holgura: así el desplazamiento de la hoja (vertical) y
 * los toques en las pastillas no se confunden con un deslizamiento.
 */
export function empiezaElDeslizamiento(dx: number, dy: number): boolean {
  return Math.abs(dx) > UMBRAL_PARA_EMPEZAR && Math.abs(dx) > 1.5 * Math.abs(dy);
}

/**
 * Qué hacer al soltar: dedo hacia la izquierda = la semana siguiente; hacia la derecha = la anterior (como pasar una página). `null` si
 * el movimiento fue corto o más vertical que horizontal.
 */
export function cambioAlSoltar({ dx, dy, vx }: { dx: number; dy: number; vx: number }): CambioDeSemana | null {
  if (Math.abs(dx) <= Math.abs(dy)) return null;
  const largo = Math.abs(dx) >= RECORRIDO_PARA_CAMBIAR;
  const golpe = Math.abs(vx) >= VELOCIDAD_DEL_GOLPE && Math.abs(dx) >= RECORRIDO_DEL_GOLPE;
  if (!largo && !golpe) return null;
  return dx < 0 ? 'siguiente' : 'anterior';
}
