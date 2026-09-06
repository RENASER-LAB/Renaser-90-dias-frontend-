import type { DayMoment, DayOfWeek, PlanHabit } from '../../../screens/PlanScreen';
import type { DesbloqueoHabitoApi, HabitoCatalogoApi, PreferenciaHabitoApi } from '../types/habits.types';

/**
 * Traduce lo que responde el backend a la forma que ya usa `PlanScreen`. El diseño manda: acá se
 * adapta el dato al componente, nunca al revés.
 */

/**
 * Las CUATRO categorías que existen de verdad. Verificado contra `renaser.categorias_habito`:
 * `CUERPO`, `MENTE`, `ESPIRITU` y `CONSCIENCIA` — esta última se muestra como "Emociones", que es
 * su nombre en la base. La API las expone traducidas al inglés (`BODY`, `MIND`, `SPIRIT`,
 * `CONSCIENCE`).
 *
 * No agregar categorías acá sin confirmar que existan en la base: una versión anterior de este
 * archivo inventó `WORK` y `RELATIONSHIPS` (que no existen) y omitió `CONSCIENCE` (que sí),
 * dejando ese hábito con la etiqueta genérica.
 *
 * Nota para quien conecte la pantalla de Training: ahí se muestran CINCO bloques, y el quinto
 * ("Vida y Negocio") no tiene ninguna categoría equivalente en la base — ningún hábito puede
 * caer en él hoy.
 */
const CATEGORIA: Record<string, { tag: string; tagColor: string; icon: string }> = {
  BODY: { tag: 'Cuerpo', tagColor: '#4ADE80', icon: '💪' },
  MIND: { tag: 'Mente', tagColor: '#60A5FA', icon: '🧘' },
  SPIRIT: { tag: 'Espíritu', tagColor: '#C084FC', icon: '✨' },
  CONSCIENCE: { tag: 'Emociones', tagColor: '#F472B6', icon: '❤️' },
};

const CATEGORIA_POR_DEFECTO = { tag: 'Hábito', tagColor: '#94A3B8', icon: '🎯' };

/** `HH:mm:ss` → `HH:mm`. Nulo o vacío quedan como cadena vacía: el diseño ya contempla ese caso. */
export function aHoraCorta(hora: string | null | undefined): string {
  if (!hora) {
    return '';
  }
  return hora.slice(0, 5);
}

/**
 * Momento del día a partir de la hora de disparo, con los mismos cortes que el diseño ya asume en
 * sus tres secciones. Sin hora de disparo se asume mañana, que es donde el diseño agrupa lo que no
 * tiene horario propio.
 */
export function aMomento(horaDisparo: string | null): DayMoment {
  if (!horaDisparo) {
    return 'mañana';
  }
  const hora = Number(horaDisparo.slice(0, 2));
  if (hora < 12) {
    return 'mañana';
  }
  return hora < 18 ? 'tarde' : 'noche';
}

/**
 * Duración estimada a partir de la ventana de entrega. Solo la tienen los hábitos con hora de
 * cierre; el resto no vence dentro del día y el diseño muestra ese campo vacío.
 */
export function aDuracion(horaDisparo: string | null, horaLimite: string | null): string {
  if (!horaDisparo || !horaLimite) {
    return '';
  }
  const minutos =
    Number(horaLimite.slice(0, 2)) * 60 +
    Number(horaLimite.slice(3, 5)) -
    (Number(horaDisparo.slice(0, 2)) * 60 + Number(horaDisparo.slice(3, 5)));
  if (minutos <= 0) {
    return '';
  }
  return minutos >= 60 ? `${Math.round(minutos / 60)} h` : `${minutos} min`;
}

/**
 * Todos los días en true. Es el valor por defecto cuando el backend no informa los días — ver
 * `diasDeHabito`.
 */
const TODOS_LOS_DIAS: Record<DayOfWeek, boolean> = {
  LUN: true,
  MAR: true,
  MIÉ: true,
  JUE: true,
  VIE: true,
  SÁB: true,
  DOM: true,
};

/** `java.time.DayOfWeek` -> la abreviatura que usa el selector semanal del plan. */
const DIA_POR_NOMBRE: Record<string, DayOfWeek> = {
  MONDAY: 'LUN',
  TUESDAY: 'MAR',
  WEDNESDAY: 'MIÉ',
  THURSDAY: 'JUE',
  FRIDAY: 'VIE',
  SATURDAY: 'SÁB',
  SUNDAY: 'DOM',
};

/**
 * En qué días de la semana aplica el hábito.
 *
 * Hasta 2026-09-04 esto devolvía SIEMPRE los 7 días, y con razón: el backend guardaba el tipo de
 * día en `horarios_habito.tipo_dia` pero ningún endpoint lo exponía, así que mapearlo acá habría
 * sido adivinar una regla de negocio. Ahora `GET /api/v1/habits` manda `activeWeekdays` ya
 * resuelto por el dominio (`TipoDia.diasDeLaSemana`), así que se usa tal cual — la regla sigue
 * viviendo del lado del backend, acá solo se traduce el nombre del día.
 *
 * El efecto visible: los tres hábitos de DOMINGO (`DESCANSO PROFUNDO`, `RITUAL DE MAÑANA`,
 * `AGUA E HIDRATACIÓN`) dejan de aparecer activos de lunes a sábado.
 *
 * Sin el campo (backend anterior a V28) se conserva el comportamiento viejo: los 7 días. Un array
 * vacío también cae ahí a propósito — significa que el backend no supo decidir, y esconder el
 * hábito los 7 días sería peor que mostrarlo de más.
 */
function diasDeHabito(activeWeekdays: string[] | undefined): Record<DayOfWeek, boolean> {
  if (!activeWeekdays?.length) return { ...TODOS_LOS_DIAS };
  const dias: Record<DayOfWeek, boolean> = {
    LUN: false, MAR: false, MIÉ: false, JUE: false, VIE: false, SÁB: false, DOM: false,
  };
  for (const nombre of activeWeekdays) {
    const dia = DIA_POR_NOMBRE[nombre];
    if (dia) dias[dia] = true;
  }
  return dias;
}

/**
 * Apaga los días en que el hábito está PAUSADO por este aprendiz (E-145).
 *
 * `diasDeHabito` de arriba responde una pregunta distinta —qué días aplica el hábito según el
 * catálogo COMPARTIDO— y es la única que se contestaba hasta ahora. Por eso pausar se veía bien
 * hasta recargar: la pausa se guardaba en `desbloqueos_habito` y después nadie la leía.
 *
 * **Solo se apagan días de HOY en adelante, nunca los ya pasados.** La respuesta trae `pausedUntil`
 * (hasta cuándo) pero no desde cuándo, así que apagar hacia atrás inventaría un pasado que no
 * ocurrió: si alguien pausa el jueves "hasta el domingo", el lunes de esa semana el hábito estuvo
 * activo de verdad y su registro lo demuestra. Ante la duda, no se reescribe la historia.
 */
function apagarDiasPausados(
  dias: Record<DayOfWeek, boolean>,
  desbloqueo: DesbloqueoHabitoApi | undefined,
  fechasDeLaSemana: Record<DayOfWeek, string>,
  hoyIso: string,
): Record<DayOfWeek, boolean> {
  if (!desbloqueo?.paused) return dias;
  const resultado = { ...dias };
  for (const dia of Object.keys(resultado) as DayOfWeek[]) {
    const fecha = fechasDeLaSemana[dia];
    if (!fecha || fecha < hoyIso) continue;
    // Sin `pausedUntil` la pausa es indefinida ("hasta que yo lo reactive"): apaga todo lo que
    // viene. Con fecha, apaga hasta ese día INCLUSIVE — comparar `yyyy-MM-dd` como texto es
    // correcto porque ese formato ordena igual como cadena que como fecha.
    if (desbloqueo.pausedUntil === null || fecha <= desbloqueo.pausedUntil) {
      resultado[dia] = false;
    }
  }
  return resultado;
}

/** Combina catálogo (qué es el hábito) y preferencias (a qué hora lo hace este aprendiz). */
export function mapearPlanHabit(
  habito: HabitoCatalogoApi,
  preferencia: PreferenciaHabitoApi | undefined,
  /**
   * Posición del hábito dentro de la respuesta de `GET /api/v1/habits`. El backend la devuelve ya
   * ordenada por `habitos.orden` (V28/V30 + el `ORDER BY` del repositorio), así que el índice del
   * array ES el orden del catálogo — no hace falta que el campo viaje aparte.
   */
  ordenCatalogo: number,
  /**
   * Fila de `GET /api/v1/habit-unlocks` para este hábito, si el aprendiz ya lo tiene en su plan.
   * `undefined` cuando no la tiene (o cuando esa lectura falló): ahí no hay pausa que aplicar y
   * el hábito se pinta con el calendario del catálogo, que es como se comportaba antes.
   */
  desbloqueo?: DesbloqueoHabitoApi,
  /** Fecha real de cada día de la semana mostrada, y hoy — para saber sobre qué días cae la pausa. */
  calendario?: { fechasDeLaSemana: Record<DayOfWeek, string>; hoyIso: string },
): PlanHabit {
  const categoria = CATEGORIA[habito.category] ?? CATEGORIA_POR_DEFECTO;
  const horaDisparo = preferencia?.triggerTime ?? null;
  return {
    id: habito.id,
    title: habito.title,
    icon: categoria.icon,
    tag: categoria.tag,
    tagColor: categoria.tagColor,
    time: aHoraCorta(horaDisparo),
    duration: aDuracion(horaDisparo, preferencia?.limitTime ?? null),
    moment: aMomento(horaDisparo),
    desc: habito.description ?? '',
    ordenCatalogo,
    locked: habito.locked ?? false,
    unlockDay: habito.unlockDay ?? 1,
    daysUntilUnlock: habito.daysUntilUnlock ?? 0,
    days: calendario
      ? apagarDiasPausados(diasDeHabito(habito.activeWeekdays), desbloqueo,
          calendario.fechasDeLaSemana, calendario.hoyIso)
      : diasDeHabito(habito.activeWeekdays),
    // `HH:mm:ss` crudo, sin recortar: hace falta tal cual para (a) decidir si ya venció hoy y
    // (b) reenviarlo al PATCH de horario sin borrarlo cuando lo único que cambia es la hora de
    // disparo (ver `cambiarHorario` en `habitsApi.ts`).
    limitTime: preferencia?.limitTime ?? null,
    // `false` = obligatorio (el catálogo real hoy trae 21 de 22 hábitos así, no solo los 4 que
    // nombró el dueño del producto — ver `docs/informes/plan-horarios-y-bloqueos.md`).
    isOptional: habito.isOptional,
    // Regla distinta de isOptional: esta dice si el aprendiz puede SACARLO de su plan. Los cuatro
    // hábitos que el dueño marcó (audioterapia, pastilla, clase diaria, post diario) vienen en
    // false desde V18__habitos_desactivable.sql. Usar isOptional acá bloquearía 21 de 22.
    isDeactivatable: habito.isDeactivatable,
    // Se lee del backend y no solo de la respuesta del PATCH: si no, el aviso "desde mañana a
    // las 09:00" duraba lo que durara la pantalla abierta y desaparecía al recargar la app,
    // que es justo cuando el aprendiz vuelve a dudar de si su cambio se guardó.
    cambioProgramado: preferencia?.pendingChange
      ? {
          time: aHoraCorta(preferencia.pendingChange.triggerTime),
          desde: preferencia.pendingChange.effectiveDate,
        }
      : null,
  };
}
