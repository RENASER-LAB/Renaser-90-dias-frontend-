import type { Palette } from '../../../theme/tokens';
import { minutosDeLaHora } from '../../training/utils/listaDelDia';
import type { ColorPareto, RocaDiariaApi, RocaMaestraApi } from '../types/objetivos.types';

/**
 * La pantalla principal de Plan (2026-10-31, pedido del dueño: «en Plan replica este formato»): el eje elegido con su objetivo
 * de 90 días, «Esta semana», «Acciones que mueven la meta» y «Tu 80/20». Lógica pura, sin React ni red: la prueban
 * `__tests__/planPrincipal.test.ts` y la dibujan `components/TarjetasDelPlan` y `components/PlanDelEje`.
 */

/** Las acciones de un eje, sin repetir ninguna, por fecha, hora (las sin hora al final del día) y posición (la verde primero). */
export function accionesDelEje(rocas: readonly RocaDiariaApi[], eje: RocaDiariaApi['eje']): RocaDiariaApi[] {
  const vistas = new Set<string>();
  const delEje: RocaDiariaApi[] = [];
  for (const roca of rocas) {
    if (roca.eje !== eje || vistas.has(roca.id)) continue;
    vistas.add(roca.id);
    delEje.push(roca);
  }
  return delEje.sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      (minutosDeLaHora(a.horaInicio) ?? Infinity) - (minutosDeLaHora(b.horaInicio) ?? Infinity) ||
      a.posicion - b.posicion,
  );
}

/**
 * Juntar varias lecturas de acciones (hoy, mañana, lo agendado de la semana) sin repetir: gana la primera que traiga cada `id`
 * (las de `/rocks/today` son las que tienen el estado al día).
 */
export function unirAcciones(...listas: ReadonlyArray<readonly RocaDiariaApi[]>): RocaDiariaApi[] {
  const porId = new Map<string, RocaDiariaApi>();
  for (const lista of listas) for (const roca of lista) if (!porId.has(roca.id)) porId.set(roca.id, roca);
  return [...porId.values()];
}

/**
 * Cuántas de las acciones agendadas de hoy en adelante están cumplidas: «2 de 6». **Solo cuenta de hoy a fin de semana** —las
 * lecturas del servidor (`/rocks/today` y `/rocks/upcoming`) no traen los días que ya pasaron—, y por eso la tarjeta lo dice.
 */
export function avanceDeLasAcciones(acciones: readonly RocaDiariaApi[], hoyIso: string | null): { cumplidas: number; total: number } {
  const desdeHoy = hoyIso ? acciones.filter(a => a.fecha >= hoyIso) : acciones;
  return { cumplidas: desdeHoy.filter(a => a.completada).length, total: desdeHoy.length };
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «Mar 27 oct · 09:00»; sin hora, «Mar 27 oct». `fecha` es `yyyy-MM-dd` (una fecha de calendario: se lee en UTC para que el huso no la corra). */
export function etiquetaDeLaAccion(roca: Pick<RocaDiariaApi, 'fecha' | 'horaInicio'>): string {
  const fecha = new Date(`${roca.fecha}T00:00:00Z`);
  const dia = Number.isNaN(fecha.getTime()) ? roca.fecha : `${DIAS[fecha.getUTCDay()]} ${fecha.getUTCDate()} ${MESES[fecha.getUTCMonth()]}`;
  const hora = minutosDeLaHora(roca.horaInicio) === null ? null : (roca.horaInicio as string).slice(0, 5);
  return hora ? `${dia} · ${hora}` : dia;
}

/**
 * La línea de números del objetivo de 90 días: «Inicio 82 · Actual 81 · Meta 80 kg». Sin número de partida: «Actual 81 · Meta 80 kg».
 * Un objetivo sin meta medible (Relaciones, por ejemplo) no tiene línea: `null`.
 */
export function lineaDelObjetivo(roca: Pick<RocaMaestraApi, 'lineaBase' | 'avance' | 'meta' | 'unidad'>): string | null {
  if (roca.meta == null || roca.avance == null) return null;
  const unidad = roca.unidad?.trim() ? ` ${roca.unidad.trim()}` : '';
  const partes: string[] = [];
  if (roca.lineaBase != null) partes.push(`Inicio ${roca.lineaBase}`);
  partes.push(`Actual ${roca.avance}`, `Meta ${roca.meta}${unidad}`);
  return partes.join(' · ');
}

/** El color de la regla de Pareto: la VERDE va primero. Recibe la paleta porque el verde y el rojo cambian con el tema. */
export function colorDePareto(color: ColorPareto, c: Pick<Palette, 'success' | 'goldGrad' | 'danger'>): string {
  if (color === 'VERDE') return c.success;
  return color === 'AMARILLA' ? c.goldGrad[0] : c.danger;
}

/** El nombre del color, para decirlo con palabras además del color (nunca solo color). */
export const NOMBRE_DEL_COLOR: Record<ColorPareto, string> = { VERDE: 'Verde', AMARILLA: 'Amarilla', ROJA: 'Roja' };
