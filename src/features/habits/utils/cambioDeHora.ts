import * as habitsApi from '../api/habitsApi';
import * as recordatorios from '../notificaciones/recordatoriosDeHabito';

/**
 * Cambia la hora de un hábito: en el servidor Y en la alarma del teléfono.
 *
 * **El bug que cierra (2026-09-26).** `PlanScreen` guardaba la hora nueva con
 * `PATCH /habit-preferences/{id}` y nada más: la alarma local, programada con la hora vieja, seguía
 * sonando a esa hora todos los días. La hoja de Training sí reprogramaba; Plan no. Ahora las pantallas
 * que cambian la hora pasan por acá (Plan, y Yo → Alarmas para Despertar).
 *
 * El orden importa: primero el servidor. Si el PATCH falla, la alarma no se mueve —quedaría sonando
 * a una hora que el servidor no conoce—. Si el PATCH sale bien y la alarma no se puede reprogramar
 * (sin permiso), el cambio de hora igual vale: se avisa con `alarma: false`.
 *
 * Cuando el servidor difiere el cambio a mañana (`deferred`, D-91), la alarma se mueve igual en el
 * acto, como ya hacía Training: una alarma diaria no sabe «desde mañana», y dejarla en la hora vieja
 * la dejaría mal todos los días que siguen.
 */
export async function cambiarHoraDelHabito(params: {
  userId: string;
  habitoId: string;
  titulo: string;
  /** `HH:mm`. */
  horaNueva: string;
  limitTime: string | null;
  recordatorio: { activo: boolean; minutosAntes: number | null };
}): Promise<{ resultado: habitsApi.CambioHorarioResultado; alarma: boolean | null }> {
  const resultado = await habitsApi.cambiarHorario(
    params.habitoId,
    `${params.horaNueva}:00`,
    params.limitTime,
    params.recordatorio,
  );
  const alarma = await recordatorios.reprogramarTrasCambioDeHora(
    params.userId,
    params.habitoId,
    params.titulo,
    params.horaNueva,
  );
  return { resultado, alarma };
}
