import type { Palette } from '../../../theme/tokens';
import { TEXTO_SE_GUARDARA } from './accionEnEspera';
import { minutosDeLaHora } from '../../training/utils/listaDelDia';
import type { ColorPareto, RocaDiariaApi, RocaMaestraApi } from '../types/objetivos.types';
import { formatearNumero } from './cifraDelObjetivo';

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
 * Spec 048 (#185): lo que el SERVIDOR ya tiene agendado en los días que todavía no empezaron, para que «Agendar mis acciones» lo muestre,
 * lo cuente para el tope de tres por eje y lo mande otra vez. Agendar un día futuro reemplaza el plan entero de ese día (E-208): una hoja
 * que arranca en 0/3 sobre un día con acciones las borra sin avisar.
 *
 * Quedan fuera: lo que espera señal (`pendienteDeEnvio`, la hoja lo trae aparte), y **el día en curso** —el servidor no deja rehacerlo
 * (409) y su comportamiento no cambia—. El día en curso es el de `/rocks/today` (`deHoy`) y, si se conoce, `hoyIso` y los anteriores.
 */
export function agendadasDeDiasQueVienen(
  todas: readonly RocaDiariaApi[],
  deHoy: readonly RocaDiariaApi[],
  hoyIso: string | null,
): RocaDiariaApi[] {
  const diasEnCurso = new Set(deHoy.map(a => a.fecha));
  return todas.filter(a => a.pendienteDeEnvio !== true && !diasEnCurso.has(a.fecha) && (hoyIso === null || a.fecha > hoyIso));
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
export function etiquetaDeLaAccion(roca: Pick<RocaDiariaApi, 'fecha' | 'horaInicio'> & { pendienteDeEnvio?: boolean }): string {
  const fecha = new Date(`${roca.fecha}T00:00:00Z`);
  const dia = Number.isNaN(fecha.getTime()) ? roca.fecha : `${DIAS[fecha.getUTCDay()]} ${fecha.getUTCDate()} ${MESES[fecha.getUTCMonth()]}`;
  const hora = minutosDeLaHora(roca.horaInicio) === null ? null : (roca.horaInicio as string).slice(0, 5);
  const base = hora ? `${dia} · ${hora}` : dia;
  // Spec 048 fase 3 (P6): agendada sin señal, todavía no llegó al servidor y no se puede marcar hasta que llegue.
  return roca.pendienteDeEnvio ? `${base} · ${TEXTO_SE_GUARDARA}` : base;
}

/** Un espacio que no deja partir el renglón: la etiqueta, la cifra y la unidad van juntas. */
const NBSP = '\u00A0';

/**
 * La línea de números del objetivo de 90 días: «Inicio 82 · Actual 81 · Meta 80 kg». Sin número de partida: «Actual 81 · Meta 80 kg».
 * Un objetivo sin meta medible (Relaciones, por ejemplo) no tiene línea: `null`.
 *
 * Las cifras llevan el separador de miles de la app (`formatearNumero`: «30 000», con espacio duro) y cada parte —«Meta 30 000 S/»—
 * va con espacios duros, así que si el renglón se parte (lo hace en un teléfono angosto) es entre partes, en el « · », y nunca a la
 * mitad de una cifra ni entre la cifra y su unidad (2026-10-31, E2E del rediseño: «Meta / 30000 S/»). El único espacio que deja partir es
 * el de ANTES del punto: «Inicio 8 000 · Actual 8 000» / «· Meta 12 000 S/», y no «… Actual 8 000 ·» / «Meta 12 000 S/» con el punto colgado
 * (E2E del 03/11, issue #115).
 */
/**
 * Las cifras del objetivo como piezas («Inicio 82», «Actual 81», «Meta 80 kg»). La tarjeta las dibuja como piezas que bajan enteras de renglón, sin «·»
 * entre ellas: con un separador, al partirse el renglón el punto siempre quedaba colgado al final o al empezar el de abajo (E2E 03/11, issue #115, 3).
 */
export function partesDelObjetivo(roca: Pick<RocaMaestraApi, 'lineaBase' | 'avance' | 'meta' | 'unidad'>): string[] | null {
  if (roca.meta == null || roca.avance == null) return null;
  const sufijo = roca.unidad?.trim() ?? '';
  // Una unidad que empieza con «/» («/10», la escala de Relaciones) es parte de la cifra: «8/10», no «8 /10» (issue #115, 2).
  const unidad = sufijo ? (sufijo.startsWith('/') ? sufijo : `${NBSP}${sufijo}`) : '';
  const partes: string[] = [];
  if (roca.lineaBase != null) partes.push(`Inicio${NBSP}${formatearNumero(roca.lineaBase)}`);
  partes.push(`Actual${NBSP}${formatearNumero(roca.avance)}`, `Meta${NBSP}${formatearNumero(roca.meta)}${unidad}`);
  return partes;
}

/** La misma línea en una sola frase, para el lector de pantalla y las pruebas: «Inicio 82 · Actual 81 · Meta 80 kg». */
export function lineaDelObjetivo(roca: Pick<RocaMaestraApi, 'lineaBase' | 'avance' | 'meta' | 'unidad'>): string | null {
  const partes = partesDelObjetivo(roca);
  return partes ? partes.join(' · ') : null;
}

/** El color de la regla de Pareto: la VERDE va primero. Recibe la paleta porque el verde y el rojo cambian con el tema. */
export function colorDePareto(color: ColorPareto, c: Pick<Palette, 'success' | 'goldGrad' | 'danger'>): string {
  if (color === 'VERDE') return c.success;
  return color === 'AMARILLA' ? c.goldGrad[0] : c.danger;
}

/** El nombre del color, para decirlo con palabras además del color (nunca solo color). */
export const NOMBRE_DEL_COLOR: Record<ColorPareto, string> = { VERDE: 'Verde', AMARILLA: 'Amarilla', ROJA: 'Roja' };
