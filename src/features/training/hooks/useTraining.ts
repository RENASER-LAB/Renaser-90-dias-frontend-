import { useCallback, useEffect, useMemo, useState } from 'react';

import type { HabitItem } from '../../../screens/TrainingScreen';
import { mensajeDeError } from '../../../services/http/apiClient';
import * as habitsApi from '../../habits/api/habitsApi';
import { usePlanHabitos } from '../../habits/hooks/usePlanHabitos';
import type { HabitoCatalogoApi, TrackDelDiaApi } from '../../habits/types/habits.types';
import * as trainingApi from '../api/trainingApi';
import type { EvidenciaApi, RocaDiariaApi } from '../types/training.types';

/**
 * Alimenta `TrainingScreen` con datos reales, agrupados por dimensión.
 *
 * Las CINCO dimensiones de la pantalla NO salen todas del mismo lado, y esa es la parte que hay
 * que entender antes de tocar este archivo:
 *
 *   - `CUERPO`, `MENTE`, `EMOCIONES`, `ESPÍRITU` ← tracks de hábitos de HOY, enriquecidos con
 *     el catálogo y el plan personal del aprendiz, agrupados por categoría.
 *   - `VIDA Y NEGOCIO` ← la roca del día (`rocks/today`). Es el objetivo diario de "Diseñar
 *     libertad financiera", no un hábito.
 *
 * Son DOS vocabularios distintos, de módulos distintos, y no se mapean entre sí:
 * las categorías de hábito son `BODY`/`MIND`/`SPIRIT`/`CONSCIENCE`; los ejes de roca son
 * `CUERPO`/`TRABAJO`/`RELACIONES`. No unificarlos.
 *
 * **Dos listas con responsabilidades distintas.** `plan.habits` conserva el inventario que la hoja
 * de Planificar necesita para editar o reactivar hábitos, incluso cuando alguno no corre hoy.
 * `habits` se construye únicamente recorriendo `tracks`, porque el backend ya resolvió fecha,
 * zona horaria, desbloqueo, pausa y horario por día. Así Training no pinta una tarjeta fantasma
 * cuando un hábito está pausado o apagado para la fecha actual.
 */

/** Categoría del catálogo (no la trae `PlanHabit`) → la dimensión que le corresponde acá. */
const DIMENSION_POR_CATEGORIA: Record<string, HabitItem['dimension']> = {
  BODY: 'CUERPO',
  MIND: 'MENTE',
  CONSCIENCE: 'EMOCIONES',
  SPIRIT: 'ESPÍRITU',
};

export function useTraining() {
  // Catálogo + horario propio + pausas, con las reglas EXACTAS que ya usa Plan (incluida la
  // normalización de día 0). Se importa el hook, no se reimplementa.
  const plan = usePlanHabitos();

  const [tracks, setTracks] = useState<TrackDelDiaApi[]>([]);
  // Solo para lo que `PlanHabit` no trae: la categoría cruda (BODY/MIND/...) y `systemKey`.
  const [catalogo, setCatalogo] = useState<HabitoCatalogoApi[]>([]);
  const [rocas, setRocas] = useState<RocaDiariaApi[]>([]);
  const [rocasConEvidencia, setRocasConEvidencia] = useState<Set<string>>(new Set());
  const [loadingPropio, setLoadingPropio] = useState(true);
  const [errorPropio, setErrorPropio] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setLoadingPropio(true);
    setErrorPropio(null);
    try {
      // Las tres llamadas son independientes entre sí: se piden en paralelo. Las dos que no son
      // imprescindibles degradan solas en vez de tirar abajo la pantalla entera — si falla la
      // roca, se ven las cuatro dimensiones de hábitos igual. Degradan, pero no en silencio
      // (2026-09-05): queda un `console.warn` para poder distinguir "no hay nada" de "un
      // endpoint se cayó".
      const [tr, cat, rk, ev] = await Promise.all([
        habitsApi.obtenerTracksDeHoy(),
        habitsApi.obtenerCatalogo(),
        trainingApi.obtenerRocasDeHoy().catch(e => {
          console.warn('[Training] no se pudo cargar la roca del día; la dimensión sale vacía:', e);
          return [] as RocaDiariaApi[];
        }),
        trainingApi.obtenerEvidenciasDeRocas().catch(e => {
          console.warn('[Training] no se pudo cargar la evidencia de rocas; se muestran sin sellar:', e);
          return [] as EvidenciaApi[];
        }),
      ]);
      setTracks(tr);
      setCatalogo(cat);
      setRocas(rk);
      // Para las ROCAS hay que cruzar contra el listado de evidencia. Para los HÁBITOS no: desde
      // el 2026-09-05 (D-113) cada track de `habit-tracks/today` trae `tieneEvidencia` resuelto
      // por el backend.
      setRocasConEvidencia(
        new Set(ev.map(e => e.rocaDiariaId).filter((id): id is string => Boolean(id))),
      );
    } catch (e) {
      setErrorPropio(mensajeDeError(e, 'No pudimos cargar tu entrenamiento'));
    } finally {
      setLoadingPropio(false);
    }
    // Refresca también el hook de Plan: sin esto, un cambio recién guardado desde "Planificar"
    // (hora, activo/pausado) no se vería reflejado hasta que la persona saliera y volviera a
    // entrar a Training.
    await plan.recargar();
  }, [plan.recargar]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  /** Inventario completo para la hoja Planificar, incluidos hábitos sin track de hoy. */
  const planHabits = useMemo(() => {
    const categoriaPorHabito = new Map(catalogo.map(h => [h.id, h.category]));
    const claveSistemaPorHabito = new Map(catalogo.map(h => [h.id, h.systemKey ?? null]));
    const exigenciaPorHabito = new Map(catalogo.map(h => [h.id, h.evidenceRequirement]));

    return plan.habits
      .map((habito): HabitItem | null => {
        const dimension = DIMENSION_POR_CATEGORIA[categoriaPorHabito.get(habito.id) ?? ''];
        if (!dimension) {
          return null;
        }
        // `habito.locked` ya viene con la normalización de día 0 aplicada (mismo campo que Plan
        // usa para pintar el candado): un hábito con `unlockDay=1` sale `false` desde el día 0.
        if (habito.locked) {
          return null;
        }
        return {
          id: habito.id,
          tieneTrackHoy: false,
          dimension,
          title: habito.title,
          time: habito.time,
          tag: habito.isOptional ? 'Opcional' : 'Innegociable',
          streak: 0,
          done: false,
          habitoId: habito.id,
          isDeactivatable: habito.isDeactivatable,
          icon: habito.icon,
          evidenceRequirement: exigenciaPorHabito.get(habito.id),
          diasCatalogo: habito.days,
          hasEvidence: false,
          systemKey: claveSistemaPorHabito.get(habito.id) ?? null,
          respuestaTexto: null,
          pointsAtStake: null,
          maxPoints: null,
          deadline: null,
        };
      })
      .filter((h): h is HabitItem => h !== null);
  }, [plan.habits, catalogo]);

  // `useMemo` y no estado propio: `plan.habits` vive en OTRA instancia de estado (la de
  // `usePlanHabitos`, adentro de este mismo hook) y se actualiza en su propio momento. Los tracks
  // son la única fuente de verdad para las tarjetas operables de HOY.
  const habits = useMemo(() => {
    const trackPorHabito = new Map(tracks.map(t => [t.habitoId, t] as const));

    // Se recorre el INVENTARIO y se le adosa el track cuando existe, en vez de recorrer los
    // tracks. La diferencia importa el Día 0: `GET /api/v1/habit-tracks/today` no genera ningún
    // registro ahí —`RegistroService` compara `diaPrograma` crudo contra `dia_desbloqueo`, sin el
    // ajuste "día 0 = día 1" que sí aplican `GET /api/v1/habits` y D-103—, así que armar la lista
    // desde `tracks` deja Training VACÍO para toda cuenta recién aprobada. Y el Día 0 no es un
    // caso de borde: es el estado inicial de todas (E-137).
    //
    // Un hábito sin track viaja con `tieneTrackHoy: false`, que es lo que `TrainingScreen` ya usa
    // para deshabilitar el check y "Subir evidencia": se ve el plan, no se puede operar sobre él.
    const deHabitos: HabitItem[] = planHabits
      .map((planHabit): HabitItem | null => {
        const track = planHabit.habitoId ? trackPorHabito.get(planHabit.habitoId) : undefined;
        if (!track) {
          return planHabit;
        }
        return {
          ...planHabit,
          id: track.id,
          tieneTrackHoy: true,
          title: track.tituloHabito || planHabit.title,
          // `horaDisparo` es el horario resuelto para ESTA fecha por el backend. Usar la hora
          // general del plan aquí volvería a mostrar una hora distinta cuando existe una regla
          // semanal o por fecha.
          time: track.horaDisparo?.slice(0, 5) ?? '',
          tag: track.esOpcional ? 'Opcional' : 'Innegociable',
          done: track.estado === 'COMPLETADO',
          hasEvidence: track.tieneEvidencia ?? false,
          respuestaTexto: track.respuestaTexto ?? null,
          pointsAtStake: track.puntosEnJuego ?? null,
          maxPoints: track.puntosMaximos ?? null,
          deadline: track.plazoEvidencia ?? null,
        };
      })
      .filter((h): h is HabitItem => h !== null);

    const deRocas: HabitItem[] = rocas.map(roca => ({
      id: roca.id,
      tieneTrackHoy: true,
      dimension: 'VIDA Y NEGOCIO',
      title: roca.titulo,
      time: roca.horaInicio ? roca.horaInicio.slice(0, 5) : '',
      tag: roca.esDelegable ? 'Delegable' : 'Innegociable',
      streak: 0,
      done: roca.completada,
      hasEvidence: rocasConEvidencia.has(roca.id),
      // Una roca no es un hábito de catálogo: no tiene clave de sistema ni resumen, y tampoco
      // tiene `habitoId` de este módulo — por eso el botón "Planificar" no aparece acá.
      systemKey: null,
      habitoId: null,
      isDeactivatable: undefined,
      diasCatalogo: undefined,
      respuestaTexto: null,
      // Una roca no pasa por la escala de puntos de hábitos ni tiene plazo de evidencia
      // expuesto por su endpoint: se deja explícito en null en vez de fingir un valor.
      pointsAtStake: null,
      maxPoints: null,
      deadline: null,
      note: roca.descripcion ?? undefined,
    }));

    return [...deHabitos, ...deRocas];
  }, [planHabits, tracks, rocas, rocasConEvidencia]);

  return {
    habits,
    planHabits,
    loading: loadingPropio || plan.loading,
    error: errorPropio ?? plan.error,
    recargar,
  };
}
