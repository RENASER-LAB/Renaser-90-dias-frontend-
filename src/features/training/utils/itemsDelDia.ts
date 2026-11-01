import type { IconName } from '../../../components/Icon';
import type { HabitItem } from '../../../screens/TrainingScreen';
import type { PreferenciaHabitoApi, TrackDelDiaApi } from '../../habits/types/habits.types';
import { DIAS_DEL_PLAN, NOMBRE_ISO_DEL_DIA, type DiaDelPlan } from '../../habits/utils/semanaDelPlan';
import { tituloParaMostrar } from '../../habits/utils/tituloEnTipoOracion';
import type { Ocurrencia } from '../../eventos/types/eventos.types';
import { linkParaUnirme, nombreDelLink } from '../../eventos/utils/linkDelEvento';
import { fechaEnZona, horaEnZona } from '../../eventos/utils/zonaHoraria';
import { nombreDeLaDimension } from '../data/dimensiones';
import { guiaDelHabito, type GuiaDelHabito } from './guiaDelHabito';
import { indiceIsoDeLaFecha } from './semanaDeTraining';
import { minutosDeLaHora, type ItemBase } from './listaDelDia';
import { horaLocal } from './tarjetaDelHabito';
import { estaVencido } from './registroConFotoEnTraining';

/**
 * Lo que dibuja una fila de Training (spec 014): un hábito, una acción del día o un evento, de HOY, de un día
 * anterior ya leído del servidor o simplemente PLANIFICADO. Acá se arma cada ítem con los datos que ya trae la
 * app; ninguna de estas funciones pide nada ni sabe de React.
 */

/** Lo que se sabe de un ítem ya cumplido, para decir «Cumplido a las 06:12 · +8 pts» y lo que se escribió. */
export interface DatosDeCumplido {
  /** `HH:mm` en la hora del teléfono, o `null` si el servidor no mandó el instante. */
  hora: string | null;
  puntos: number | null;
  escrito: string | null;
}

export interface ItemDelDia extends ItemBase {
  titulo: string;
  /** El ícono propio del hábito, si lo hay. */
  icono: IconName | null;
  /** «Cuerpo», «Espíritu»…, o `null` (acciones y eventos). */
  dimension: string | null;
  /** Lo que paga hacerlo ahora (pendiente) o lo que pagó (hecho); `null` si el servidor no lo dijo. */
  puntos: number | null;
  guia: GuiaDelHabito | null;
  /** El hábito o la acción de Training detrás de la fila (solo hoy): con él se registra por los caminos de siempre. */
  habit?: HabitItem;
  eventoId?: string | null;
  /** Solo eventos: «Zoom», una dirección, o `null`. */
  lugar?: string | null;
  cumplido?: DatosDeCumplido | null;
}

/** El día de la semana como lo escribe la app (`LUN`…`DOM`), para `fechaIso`. */
export function diaDelPlanDeLaFecha(fechaIso: string): DiaDelPlan {
  return DIAS_DEL_PLAN[indiceIsoDeLaFecha(fechaIso)];
}

function dosCifras(n: number): string {
  return String(n).padStart(2, '0');
}

function horaCorta(hora: string | null | undefined): string | null {
  const min = minutosDeLaHora(hora);
  return min == null ? null : `${dosCifras(Math.floor(min / 60))}:${dosCifras(min % 60)}`;
}

/* ------------------------------------------------------------------------------------------------
 * Eventos
 * ---------------------------------------------------------------------------------------------- */

/** Los eventos de ESE día, en la zona del teléfono. Los que la persona descartó («No voy») no se muestran. */
export function itemsDeEventos(ocurrencias: Ocurrencia[], fechaIso: string, zona: string | null): ItemDelDia[] {
  const items: ItemDelDia[] = [];
  for (const oc of ocurrencias) {
    if (oc.asistencia === 'NOT_GOING') continue;
    if (fechaEnZona(oc.iniciaEn, zona) !== fechaIso) continue;
    const link = linkParaUnirme(oc.evento);
    const lugar = link
      ? nombreDelLink(link)
      : oc.evento.tipoUbicacion === 'ADDRESS'
        ? oc.evento.valorUbicacion?.trim() || null
        : null;
    items.push({
      clave: `evento-${oc.evento.id}-${oc.inicioOcurrencia}`,
      tipo: 'evento',
      titulo: oc.titulo,
      hora: horaEnZona(oc.iniciaEn, zona),
      hecho: false,
      duracionMin: oc.duracionMinutos ?? oc.evento.duracionMinutos,
      icono: null,
      dimension: null,
      puntos: null,
      guia: null,
      eventoId: oc.evento.id,
      lugar,
    });
  }
  return items;
}

/* ------------------------------------------------------------------------------------------------
 * HOY
 * ---------------------------------------------------------------------------------------------- */

export interface ContextoDeHoy {
  hoyIso: string;
  zona: string | null;
  /** Los nombres que la persona le puso a sus hábitos (D-127). */
  titulos: Readonly<Record<string, string>>;
}

/**
 * Los hábitos y las acciones de hoy que ya trae `useTraining`, más los eventos de hoy.
 *
 * - Solo entra lo que tiene registro de hoy (`tieneTrackHoy`): el servidor ya resolvió fecha, desbloqueo y pausa.
 *   Un hábito sin registro hoy (pausado, no le toca) no está en la lista.
 * - Una pausa guardada después de generarse el registro también lo esconde, si todavía no se hizo
 *   (`diasCatalogo` ya trae la pausa aplicada).
 */
export function itemsDeHoy(habits: HabitItem[], ocurrencias: Ocurrencia[], contexto: ContextoDeHoy): ItemDelDia[] {
  const diaDeHoy = diaDelPlanDeLaFecha(contexto.hoyIso);
  const deTraining: ItemDelDia[] = habits
    .filter(h => h.tieneTrackHoy)
    .map((h): ItemDelDia => {
      const esAccion = h.dimension === 'VIDA Y NEGOCIO';
      const hecho = h.done;
      const pausado = !esAccion && !hecho && h.diasCatalogo != null && h.diasCatalogo[diaDeHoy] === false;
      return {
        clave: h.id,
        tipo: esAccion ? 'accion' : 'habito',
        titulo: esAccion ? h.title : tituloParaMostrar({ id: h.habitoId ?? h.id, title: h.title }, contexto.titulos),
        hora: horaCorta(h.time),
        hecho,
        pausado,
        cerrado: !hecho && estaVencido(h.estado),
        icono: h.icon ?? null,
        dimension: esAccion ? null : nombreDeLaDimension(h.dimension),
        puntos: hecho ? (h.puntosOtorgados ?? null) : (h.pointsAtStake ?? null),
        guia: h.guia ?? null,
        habit: h,
        cumplido: hecho
          ? { hora: horaLocal(h.completadoEn), puntos: h.puntosOtorgados ?? null, escrito: h.respuestaTexto?.trim() || null }
          : null,
      };
    });
  return [...deTraining, ...itemsDeEventos(ocurrencias, contexto.hoyIso, contexto.zona)];
}

/** Los puntos que sumó hoy lo ya cumplido (los que pagó el servidor; nada se calcula acá). */
export function puntosDeHoy(items: ItemDelDia[]): number {
  return items.reduce(
    (suma, x) => (x.tipo !== 'evento' && !x.pausado && x.hecho ? suma + (x.puntos ?? 0) : suma),
    0,
  );
}

/* ------------------------------------------------------------------------------------------------
 * Un día ANTERIOR, con la lectura del servidor
 * ---------------------------------------------------------------------------------------------- */

/**
 * Lo que pasó ese día, de `GET /habit-tracks/day`: lo cumplido lleva ✓; lo demás queda cerrado (candado). Nada se
 * puede registrar. Los eventos de ese día van aparte y sin estado: un evento no se «hace».
 */
export function itemsDeUnDiaCerrado(
  tracks: TrackDelDiaApi[],
  ocurrencias: Ocurrencia[],
  contexto: ContextoDeHoy & { fechaIso: string },
): ItemDelDia[] {
  const habitos = tracks.map((t): ItemDelDia => {
    const hecho = t.estado === 'COMPLETADO';
    return {
      clave: `dia-${contexto.fechaIso}-${t.id}`,
      tipo: 'habito',
      titulo: tituloParaMostrar({ id: t.habitoId, title: t.tituloHabito }, contexto.titulos),
      hora: horaCorta(t.horaDisparo),
      hecho,
      cerrado: !hecho,
      icono: null,
      dimension: null,
      puntos: hecho ? t.puntosOtorgados : null,
      guia: guiaDelHabito(t.guia),
      cumplido: hecho ? { hora: horaLocal(t.completadoEn), puntos: t.puntosOtorgados, escrito: t.respuestaTexto?.trim() || null } : null,
    };
  });
  return [...habitos, ...itemsDeEventos(ocurrencias, contexto.fechaIso, contexto.zona)];
}

/* ------------------------------------------------------------------------------------------------
 * Un día PLANIFICADO (los que vienen, o un día anterior sin lectura del servidor)
 * ---------------------------------------------------------------------------------------------- */

/** Lo mínimo de una acción de un día (`RocaDiariaApi`). */
export interface AccionDeUnDia {
  id: string;
  fecha: string;
  titulo: string;
  horaInicio: string | null;
  completada: boolean;
}

export interface ContextoPlanificado extends ContextoDeHoy {
  fechaIso: string;
  /** El inventario de hábitos de la persona (`planHabits` de `useTraining`). */
  inventario: HabitItem[];
  /** `GET /habit-preferences`: de ahí salen las horas de cada día (`weekdays[i].triggerTime`, spec 008). */
  preferencias: ReadonlyMap<string, PreferenciaHabitoApi>;
  acciones: AccionDeUnDia[];
  ocurrencias: Ocurrencia[];
}

/**
 * La hora de un hábito en un día planificado. Un cambio de hora GENERAL guardado que todavía no rige (`pendingChange`, D-91: «Desde el
 * viernes 30 de octubre: 21:30») es lo que se planificó para desde esa fecha: el día que viene lo muestra a su hora nueva, no a la
 * vieja. Un día con hora PROPIA (spec 008) conserva la suya: el cambio general no lo toca.
 */
function horaDelDiaPlanificado(
  preferencia: PreferenciaHabitoApi | undefined,
  delDia: { triggerTime?: string | null; customTime?: boolean; custom?: boolean } | undefined,
  fechaIso: string,
): string | null {
  const pendiente = preferencia?.pendingChange;
  const tieneHoraPropia = (delDia?.customTime ?? delDia?.custom) === true;
  if (pendiente?.triggerTime && pendiente.effectiveDate && pendiente.effectiveDate <= fechaIso && !tieneHoraPropia) {
    const hora = horaCorta(pendiente.triggerTime);
    if (hora) return hora;
  }
  return horaCorta(delDia?.triggerTime);
}

/**
 * Lo planificado para un día: los hábitos que corren ese día de la semana, con la hora de ESE día, las acciones
 * agendadas para esa fecha y los eventos. Sin estados: no es lo que pasó, es lo que se planificó.
 *
 * - Un día que el hábito no corre (catálogo, pausa) o que la persona apagó (`active: false`) no entra.
 * - Sin hora propia del día, la general del hábito; sin ninguna, queda «sin hora».
 */
export function itemsPlanificados(contexto: ContextoPlanificado): ItemDelDia[] {
  const dia = diaDelPlanDeLaFecha(contexto.fechaIso);
  const nombreDelDia = NOMBRE_ISO_DEL_DIA[dia];
  const habitos: ItemDelDia[] = [];
  for (const h of contexto.inventario) {
    if (!h.habitoId) continue;
    if (h.diasCatalogo && h.diasCatalogo[dia] === false) continue;
    const preferencia = contexto.preferencias.get(h.habitoId);
    const delDia = preferencia?.weekdays?.find(w => w.weekday === nombreDelDia);
    if (delDia?.active === false) continue;
    habitos.push({
      clave: `plan-${contexto.fechaIso}-${h.habitoId}`,
      tipo: 'habito',
      titulo: tituloParaMostrar({ id: h.habitoId, title: h.title }, contexto.titulos),
      hora: horaDelDiaPlanificado(preferencia, delDia, contexto.fechaIso) ?? horaCorta(h.time),
      hecho: false,
      icono: h.icon ?? null,
      dimension: nombreDeLaDimension(h.dimension),
      puntos: null,
      guia: null,
    });
  }
  const acciones: ItemDelDia[] = contexto.acciones
    .filter(a => a.fecha === contexto.fechaIso)
    .map(a => ({
      clave: `plan-accion-${a.id}`,
      tipo: 'accion',
      titulo: a.titulo,
      hora: horaCorta(a.horaInicio),
      hecho: false,
      icono: null,
      dimension: null,
      puntos: null,
      guia: null,
    }));
  return [...habitos, ...acciones, ...itemsDeEventos(contexto.ocurrencias, contexto.fechaIso, contexto.zona)];
}
