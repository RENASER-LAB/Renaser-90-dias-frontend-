import { useCallback, useEffect, useState } from 'react';

import type { PlanHabit } from '../../../screens/PlanScreen';
import { mensajeDeError } from '../../../services/http/apiClient';
import * as habitsApi from '../api/habitsApi';
import { aMomento, mapearPlanHabit } from '../api/habitsMappers';
import { aFechaIso, fechasIsoDeLaSemana } from '../utils/semanaDelPlan';

/**
 * Los hábitos de Plan contra el backend Java, en un solo lugar — mismo criterio que `useCursos`
 * en `academy` y `useWallFeed` en `community`.
 *
 * Combina tres endpoints porque ninguno alcanza solo:
 *   - `GET /api/v1/habits` — qué es cada hábito (título, descripción, categoría).
 *   - `GET /api/v1/habit-preferences` — a qué hora lo hace ESTE aprendiz, propia o la del catálogo.
 *   - `GET /api/v1/habit-unlocks` — cuáles tiene en su plan y **cuáles están pausados** (E-145).
 * Se piden en paralelo: son independientes y ninguno depende del resultado del otro.
 *
 * > **El tercero se agregó 2026-09-06 (E-145).** Faltaba, y por eso pausar un hábito parecía no
 * > guardarse: el PATCH escribía la pausa, pero al recargar el interruptor se reconstruía solo con
 * > `activeWeekdays` del catálogo compartido, que no sabe nada de la pausa personal de nadie.
 *
 * El orden final es por hora de disparo, que es como el diseño ya agrupa el día (mañana, tarde,
 * noche). Los hábitos sin hora quedan al principio, no al final: son los que el aprendiz todavía
 * no ubicó en su jornada y conviene que los vea.
 */
export function usePlanHabitos() {
  const [habits, setHabits] = useState<PlanHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogo, preferencias, plan] = await Promise.all([
        habitsApi.obtenerCatalogo(),
        // Si las preferencias fallan, se muestran los hábitos sin horario en vez de una pantalla
        // de error: el catálogo por sí solo ya es útil.
        //
        // D-98: pero se DEJA RASTRO. Antes el catch era mudo, y cuando el dueño vio "Sin horario"
        // en los 18 hábitos no había forma de saber si era un 404, un 500 o el schema — el
        // servidor respondía bien y la pantalla no decía por qué lo descartaba.
        habitsApi.obtenerPreferencias().catch((e: unknown) => {
          console.warn('[Plan] no se pudieron cargar los horarios; se muestran sin hora:', e);
          return [];
        }),
        // E-145: de acá sale el estado de PAUSA de cada hábito. Mismo criterio que los horarios:
        // si falla, se muestran los hábitos con el calendario del catálogo en vez de una pantalla
        // de error — pero se deja rastro, porque el síntoma (el interruptor vuelve a encenderse
        // solo) es idéntico al bug que este endpoint vino a cerrar y conviene poder distinguirlos.
        habitsApi.obtenerPlanDesbloqueos().catch((e: unknown) => {
          console.warn('[Plan] no se pudo leer el estado de pausa; los hábitos se muestran sin ella:', e);
          return null;
        }),
      ]);
      const porHabito = new Map(preferencias.map(p => [p.habitId, p]));
      const desbloqueoPorHabito = new Map((plan?.items ?? []).map(d => [d.habitId, d]));
      // Se calcula UNA vez para los ~22 hábitos, no dentro del map: la semana es la misma para
      // todos y `new Date()` en cada vuelta podría cruzar la medianoche a mitad del recorrido.
      const calendario = { fechasDeLaSemana: fechasIsoDeLaSemana(), hoyIso: aFechaIso(new Date()) };
      // SIN reordenar: el backend ya los devuelve en el orden del catálogo curado
      // (`habitos.orden`), y ese es el que se respeta en la pantalla. Antes acá se ordenaba por
      // hora, lo que descartaba ese orden antes de que el plan pudiera usarlo.
      const mapeados = catalogo.map((h, i) =>
        mapearPlanHabit(h, porHabito.get(h.id), i, desbloqueoPorHabito.get(h.id), calendario),
      );
      setHabits(mapeados);
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos cargar tus hábitos'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  /**
   * Cambia la hora de disparo de un hábito y refleja el cambio de inmediato, sin esperar a
   * recargar todo. Si el backend rechaza el cambio, se vuelve al estado anterior: la pantalla
   * nunca queda mostrando una hora que el servidor no guardó.
   *
   * `limiteActual` es obligatorio y **no es la hora nueva**: es el `limitTime` que el hábito ya
   * tenía (`PlanHabit.limitTime`, crudo `HH:mm:ss`). El PATCH de `/habit-preferences/{id}`
   * reemplaza los dos campos a la vez — mandar `null` acá borraría la hora límite de hábitos
   * como "AUDIOTERAPIA SEMANAL" (23:55) solo por haber tocado la hora de disparo.
   */
  const cambiarHora = useCallback(
    async (habitId: string, hora: string, limiteActual: string | null) => {
      const anterior = habits;
      // `moment` se recalcula con `aMomento`, igual que en el mapeo inicial: si no, el hábito
      // se queda en el bloque viejo aunque su hora nueva sea de otro momento del día (bug
      // reportado por el dueño — ver informe de la migración).
      setHabits(actuales =>
        actuales.map(h => (h.id === habitId ? { ...h, time: hora, moment: aMomento(hora) } : h)),
      );
      try {
        await habitsApi.cambiarHorario(habitId, `${hora}:00`, limiteActual);
      } catch (e) {
        setHabits(anterior);
        setError(mensajeDeError(e, 'No pudimos guardar el horario'));
      }
    },
    [habits],
  );

  return { habits, loading, error, recargar, cambiarHora };
}
