import { primeraEnMayuscula, rangoDeFechas, sumarDias } from '../../semaforo/utils/lecturaDelSemaforo';
import type { SemanaDePersona } from '../types/cumplimientoDelLider.types';

/**
 * Moverse entre las semanas de una persona en la ficha del líder (spec 005, FR-010).
 *
 * Una semana es de **sábado a viernes**, como el semáforo, y se pide por su viernes (`semanaHasta`). Hacia
 * atrás se puede ir hasta la semana en que empezó el programa de la persona (`primeraSemana`, que manda el
 * servidor); hacia adelante hasta la semana en curso, y de ahí no hay más: **el futuro no se mide**.
 *
 * Todo sale de fechas que ya dijo el servidor y aritmética de calendario con UTC (`sumarDias`): dejar que el
 * teléfono interprete `yyyy-MM-dd` en su huso corre el día una casilla fuera de Lima.
 */

const VIERNES = 5;
const DIAS_DE_LA_SEMANA = 7;

function leerFecha(iso: string | null | undefined): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * El viernes que cierra la primera semana del programa: el primer viernes desde `primeraSemana` (el
 * contrato manda el sábado en que abre; un viernes ya es su propio cierre). `null` si no se sabe: entonces
 * no se inventa un tope y es el servidor quien contesta, con la semana vacía y su motivo.
 */
export function primerViernesDelPrograma(primeraSemana: string | null | undefined): string | null {
  const d = leerFecha(primeraSemana);
  if (!d || !primeraSemana) return null;
  return sumarDias(primeraSemana, (VIERNES - d.getUTCDay() + DIAS_DE_LA_SEMANA) % DIAS_DE_LA_SEMANA);
}

/** El viernes de la semana de antes, o `null` si esa ya sería anterior al programa. */
export function semanaAnteriorDe(viernes: string, primeraSemana: string | null | undefined): string | null {
  const anterior = sumarDias(viernes, -DIAS_DE_LA_SEMANA);
  const primero = primerViernesDelPrograma(primeraSemana);
  return primero && anterior < primero ? null : anterior;
}

export function puedeIrALaAnterior(viernes: string, primeraSemana: string | null | undefined): boolean {
  return semanaAnteriorDe(viernes, primeraSemana) !== null;
}

/** El viernes de la semana de después. `null` en la semana en curso: no hay futuro que mirar. */
export function semanaSiguienteDe(semana: Pick<SemanaDePersona, 'hasta' | 'semanaEnCurso'>): string | null {
  return semana.semanaEnCurso ? null : sumarDias(semana.hasta, DIAS_DE_LA_SEMANA);
}

/**
 * Cómo se rotula la semana que se mira. El rango va siempre escrito (la fecha de corte que pide el contrato
 * del semáforo, §5). Mientras llega la respuesta solo se conoce el viernes que se pidió: de ahí sale el rango,
 * para que la pantalla no quede sin saber qué semana está cargando ni muestre el rótulo de la anterior.
 */
export function rotuloDeLaSemana(semana: {
  desde?: string;
  hasta: string | null;
  semanaEnCurso?: boolean;
}): { titulo: string; rango: string | null } {
  const titulo = semana.semanaEnCurso === undefined ? 'Semana' : semana.semanaEnCurso ? 'Esta semana' : 'Semana cerrada';
  if (!semana.hasta) return { titulo, rango: null };
  const desde = semana.desde ?? sumarDias(semana.hasta, -(DIAS_DE_LA_SEMANA - 1));
  return { titulo, rango: primeraEnMayuscula(rangoDeFechas(desde, semana.hasta)) };
}
