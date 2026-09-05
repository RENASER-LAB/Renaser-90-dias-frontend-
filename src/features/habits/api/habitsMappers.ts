import type { DayMoment, DayOfWeek, PlanHabit } from '../../../screens/PlanScreen';
import type { HabitoCatalogoApi, PreferenciaHabitoApi } from '../types/habits.types';

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
 * TODOS los días en true.
 *
 * PENDIENTE REAL, no una simplificación cómoda: el backend guarda los días en
 * `renaser.dias_semanales_habito` y el tipo de día en `horarios_habito.tipo_dia`
 * (TODOS / DISCIPLINA / DOMINGO), pero **ningún endpoint expone esa información hoy** — ni
 * `GET /api/v1/habits` ni `GET /api/v1/habit-preferences` la devuelven. Inventar acá un mapeo
 * (por ejemplo "DISCIPLINA = lunes a sábado") sería adivinar una regla de negocio que nadie
 * confirmó. Hasta que el backend exponga los días, el selector semanal del diseño se muestra con
 * todos activos.
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

/** Combina catálogo (qué es el hábito) y preferencias (a qué hora lo hace este aprendiz). */
export function mapearPlanHabit(
  habito: HabitoCatalogoApi,
  preferencia: PreferenciaHabitoApi | undefined,
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
    days: { ...TODOS_LOS_DIAS },
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
