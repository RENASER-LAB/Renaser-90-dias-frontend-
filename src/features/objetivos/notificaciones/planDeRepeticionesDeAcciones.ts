import { isoDe } from '../../habits/notificaciones/utils/alarmasPorDia';
import type { CombinacionDeAlarma } from '../../habits/notificaciones/utils/combinacionDeAlarma';
import {
  DIAS_DE_LA_VENTANA,
  fechaCompacta,
  MINUTOS_DE_REPETICION,
} from '../../habits/notificaciones/utils/repeticionesDeAlarma';
import { instanteEnZona } from '../../eventos/utils/zonaHoraria';
import type { RocaDiariaApi } from '../types/objetivos.types';
import { TEXTO_DIARIO } from './planDelDiario';
import { diaIsoDeFecha, resolverDia, type PreferenciasDeAcciones } from './preferenciasPorDia';
import { rutaDelAvisoDeAccion } from './rutaDelAvisoDeAccion';

/**
 * «Repetir si no la atiendo» en las alarmas de las acciones de los objetivos (spec 010). Pura: no toca la librería de
 * avisos ni el almacenamiento (eso es `repeticionesDeAcciones.ts`). Es la misma idea que en los hábitos (spec 009, research
 * R2) con dos orígenes:
 *
 * - **Una acción con hora**: vuelve a sonar a los 5 y a los 10 minutos de SU hora, si su día tiene aviso y su combinación
 *   pide «Repetir». Las alarmas de antes de la hora (30 min antes) no se repiten: la repetición cuelga de la hora de la
 *   acción. Se arma con la lista de acciones que se acaba de leer, así que una acción cumplida, movida o borrada deja de
 *   repetir en la misma lectura.
 * - **El recordatorio diario**: a los 5 y a los 10 minutos de la hora de cada día encendido cuya combinación pida «Repetir».
 *   No cuelga de una lista sino del calendario, así que lleva una ventana de 7 días (hoy y los 6 siguientes) que se renueva
 *   cada vez que la app se pone al día.
 *
 * ## Por qué alarmas de FECHA
 *
 * Una `DAILY` o `WEEKLY` no se puede «saltar solo hoy»: cancelarla borra las de los días siguientes. Con una alarma de
 * fecha por día, cancelar la de HOY es exacto y las de mañana siguen en pie.
 *
 * ## Identificadores
 *
 * - `accion-{rocaId}-rep-{AAAAMMDD}-{5|10}` (la fecha es la de la acción);
 * - `acciones-diario-rep-{AAAAMMDD}-{5|10}` (la fecha es la del día del recordatorio).
 *
 * Programar de nuevo el mismo identificador REEMPLAZA la alarma. No empiezan con `habito-`: las repeticiones de los hábitos
 * y estas no se pisan ni se mezclan al pasarlas al sonido nuevo.
 *
 * ## «Atendida» gana
 *
 * Si la persona ya tocó la alarma de esa acción (o la del recordatorio de ese día), o la selló, sus repeticiones no se
 * vuelven a poner: sin eso, la puesta al día —que corre al abrir la app justo después de tocar la alarma— las resucitaría.
 * `atendidas` trae las claves ya atendidas (`claveDeLaAccionAtendida`, `claveDelDiarioAtendido`).
 */

export { MINUTOS_DE_REPETICION };

export const claveDeLaAccionAtendida = (rocaId: string) => `accion:${rocaId}`;
export const claveDelDiarioAtendido = (fecha: string) => `diario:${fecha}`;

export function identificadorDeRepeticionDeAccion(rocaId: string, fecha: string, minutos: number): string {
  return `accion-${rocaId}-rep-${fecha}-${minutos}`;
}

export function identificadorDeRepeticionDelDiario(fecha: string, minutos: number): string {
  return `acciones-diario-rep-${fecha}-${minutos}`;
}

export type RepeticionDeObjetivos =
  | { tipo: 'accion'; rocaId: string; fecha: string; minutos: number }
  | { tipo: 'diario'; fecha: string; minutos: number };

const DE_UNA_ACCION = /^accion-(.+)-rep-(\d{8})-(\d+)$/;
const DEL_DIARIO = /^acciones-diario-rep-(\d{8})-(\d+)$/;

/** De un identificador, de qué es la repetición; `null` si no es una de estas. */
export function repeticionDeObjetivos(identificador: unknown): RepeticionDeObjetivos | null {
  if (typeof identificador !== 'string') return null;
  const accion = DE_UNA_ACCION.exec(identificador);
  if (accion) return { tipo: 'accion', rocaId: accion[1], fecha: accion[2], minutos: Number(accion[3]) };
  const diario = DEL_DIARIO.exec(identificador);
  return diario ? { tipo: 'diario', fecha: diario[1], minutos: Number(diario[2]) } : null;
}

/** `AAAAMMDD` → `AAAA-MM-DD`. */
export const fechaIsoDeLaCompacta = (compacta: string) => `${compacta.slice(0, 4)}-${compacta.slice(4, 6)}-${compacta.slice(6, 8)}`;

export interface PedidoDeRepeticionDeObjetivos {
  identificador: string;
  origen: { tipo: 'accion'; rocaId: string } | { tipo: 'diario' };
  /** El día de la acción o del recordatorio, `AAAAMMDD`. */
  fecha: string;
  minutosDespues: number;
  instanteMs: number;
  titulo: string;
  cuerpo: string;
  /** Lo que lleva el aviso en `data`: la ruta y la acción (o `diario`) para saber qué atiende un toque, y cómo suena. */
  data: Record<string, unknown>;
  /** Cómo suena ESE día: por qué canal sale. */
  alarma: CombinacionDeAlarma;
}

/**
 * Las repeticiones que hay que tener puestas para estas acciones, a partir de `ahoraMs`. Una por cada minuto de repetición
 * (5 y 10) de cada acción con hora, sin cumplir, cuyo día tiene aviso y cuya combinación pide «Repetir». No incluye lo
 * que ya pasó ni las acciones atendidas.
 */
export function planDeRepeticionesDeLasAcciones(
  rocas: readonly RocaDiariaApi[],
  prefs: PreferenciasDeAcciones,
  ahoraMs: number,
  zona: string | null,
  atendidas: ReadonlySet<string> = new Set(),
): PedidoDeRepeticionDeObjetivos[] {
  const pedidos: PedidoDeRepeticionDeObjetivos[] = [];
  for (const roca of rocas) {
    if (roca.completada || !roca.horaInicio || atendidas.has(claveDeLaAccionAtendida(roca.id))) continue;
    const iso = diaIsoDeFecha(roca.fecha);
    if (!iso) continue;
    const dia = resolverDia(prefs, iso);
    // Sin aviso ese día no hay alarma de la acción; lo único que se repetiría es lo que no suena.
    if (dia.antelaciones.length === 0 || !dia.alarma.repetir) continue;
    const hora = roca.horaInicio.slice(0, 5);
    const aLaHora = instanteEnZona(roca.fecha, hora, zona);
    if (aLaHora === null) continue;
    const fecha = roca.fecha.replace(/-/g, '');
    for (const minutos of MINUTOS_DE_REPETICION) {
      const instanteMs = aLaHora + minutos * 60_000;
      if (instanteMs <= ahoraMs) continue;
      pedidos.push({
        identificador: identificadorDeRepeticionDeAccion(roca.id, fecha, minutos),
        origen: { tipo: 'accion', rocaId: roca.id },
        fecha,
        minutosDespues: minutos,
        instanteMs,
        titulo: roca.titulo,
        cuerpo: `Te tocaba a las ${hora}.`,
        data: { route: rutaDelAvisoDeAccion(roca), rocaId: roca.id, alarma: dia.alarma },
        alarma: dia.alarma,
      });
    }
  }
  return pedidos;
}

/**
 * Las repeticiones que hay que tener puestas del recordatorio diario desde `ahora`: dos por día de la ventana (hoy y los 6
 * siguientes) en que el recordatorio está encendido y su combinación pide «Repetir». Los días son los del calendario del
 * teléfono, como el recordatorio mismo (una alarma `DAILY` o `WEEKLY` va a la hora local).
 */
export function planDeRepeticionesDelDiario(
  prefs: PreferenciasDeAcciones,
  ahora: Date,
  atendidas: ReadonlySet<string> = new Set(),
): PedidoDeRepeticionDeObjetivos[] {
  const pedidos: PedidoDeRepeticionDeObjetivos[] = [];
  for (let i = 0; i < DIAS_DE_LA_VENTANA; i++) {
    const dia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + i, 12, 0, 0, 0);
    const ajustes = resolverDia(prefs, isoDe(dia));
    if (!ajustes.diarioActivo || !ajustes.alarma.repetir) continue;
    const fecha = fechaCompacta(dia);
    if (atendidas.has(claveDelDiarioAtendido(fecha))) continue;
    const [h, m] = ajustes.horaDiaria.split(':').map(Number);
    for (const minutos of MINUTOS_DE_REPETICION) {
      const instanteMs = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, m + minutos, 0, 0).getTime();
      if (instanteMs <= ahora.getTime()) continue;
      pedidos.push({
        identificador: identificadorDeRepeticionDelDiario(fecha, minutos),
        origen: { tipo: 'diario' },
        fecha,
        minutosDespues: minutos,
        instanteMs,
        titulo: TEXTO_DIARIO.titulo,
        cuerpo: TEXTO_DIARIO.cuerpo,
        data: { diario: true, alarma: ajustes.alarma },
        alarma: ajustes.alarma,
      });
    }
  }
  return pedidos;
}
