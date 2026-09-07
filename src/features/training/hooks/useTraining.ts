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
 *   - `CUERPO`, `MENTE`, `EMOCIONES`, `ESPÍRITU` ← hábitos, uno por cada fila de
 *     `usePlanHabitos()` (el MISMO hook que usa Plan), agrupados por categoría.
 *   - `VIDA Y NEGOCIO` ← la roca del día (`rocks/today`). Es el objetivo diario de "Diseñar
 *     libertad financiera", no un hábito.
 *
 * Son DOS vocabularios distintos, de módulos distintos, y no se mapean entre sí:
 * las categorías de hábito son `BODY`/`MIND`/`SPIRIT`/`CONSCIENCE`; los ejes de roca son
 * `CUERPO`/`TRABAJO`/`RELACIONES`. No unificarlos.
 *
 * **Por qué `usePlanHabitos()` y no `habit-tracks/today` para decidir la lista (2026-09-07).**
 * Antes esto armaba la lista desde los tracks de hoy, y esos tracks dependen de que
 * `GET /api/v1/habit-tracks/today` ya haya generado el registro del día — cosa que el backend NO
 * hace en el día 0 (compara `diaPrograma` crudo contra `dia_inicio`, sin el mismo ajuste "día
 * 0 = día 1" que sí aplica `GET /api/v1/habits`). Reimplementar esa regla acá hubiera significado
 * mantener DOS copias de "cuándo se desbloquea un hábito" que podrían desalinearse. En vez de
 * eso, se reusa el hook de Plan tal cual: mismas reglas de desbloqueo, mismo horario, misma
 * pausa. Lo único que se le suma acá es el cruce con el track de HOY (`tracks`, más abajo), que
 * es lo único que Plan no necesita y Training sí (el check y la evidencia son de HOY).
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

  // `useMemo` y no estado propio: `plan.habits` vive en OTRA instancia de estado (la de
  // `usePlanHabitos`, adentro de este mismo hook) y se actualiza en su propio momento — armar la
  // lista final acá adentro de `recargar` la habría dejado, la mitad de las veces, un paso atrás
  // de lo que `plan.habits` ya tenía.
  const habits = useMemo(() => {
    const categoriaPorHabito = new Map(catalogo.map(h => [h.id, h.category]));
    const claveSistemaPorHabito = new Map(catalogo.map(h => [h.id, h.systemKey ?? null]));
    const tracksPorHabito = new Map(tracks.map(t => [t.habitoId, t]));

    const deHabitos: HabitItem[] = plan.habits
      // El tipo de retorno es explícito porque `HabitItem` tiene campos opcionales
      // (`systemKey`, `respuestaTexto`): sin anotarlo, TypeScript infiere del objeto literal un
      // tipo MÁS ESTRECHO que `HabitItem` y el `filter` de abajo deja de compilar.
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
        const track = tracksPorHabito.get(habito.id);
        return {
          // Sin track todavía (el backend no lo generó — ver la nota grande de arriba): se usa
          // el id del hábito con un prefijo, único y estable para la `key` de la lista, pero que
          // nunca se manda a ningún endpoint de registro. El check y "Subir evidencia" quedan
          // deshabilitados mientras `tieneTrackHoy` sea `false` (ver `TrainingScreen`).
          id: track?.id ?? `sin-track-${habito.id}`,
          tieneTrackHoy: track != null,
          dimension,
          title: track?.tituloHabito ?? habito.title,
          // La MISMA hora que ya muestra Plan (`usePlanHabitos` ya resolvió catálogo + horario
          // propio + cambio programado): no se recalcula acá.
          time: habito.time,
          tag: (track?.esOpcional ?? habito.isOptional) ? 'Opcional' : 'Innegociable',
          streak: 0,
          done: track?.estado === 'COMPLETADO',
          // Id real del hábito de catálogo (distinto de `track.id`, el id del registro de HOY):
          // lo necesita el botón "Planificar" para llamar a `habit-preferences`/`habit-unlocks`.
          habitoId: habito.id,
          isDeactivatable: habito.isDeactivatable,
          icon: habito.icon,
          // Mismos días que ya pinta Plan (catálogo + pausa aplicada) — se reusan tal cual para
          // sembrar la fila decorativa de "Planificar", en vez de recalcularlos desde
          // `activeWeekdays` crudo.
          diasCatalogo: habito.days,
          // Dato del servidor, no reconstruido acá: es exacto y no depende de cuántas filas
          // entren en una página. `?? false` cubre a un backend anterior a D-113 y el caso sin
          // track todavía.
          hasEvidence: track?.tieneEvidencia ?? false,
          systemKey: claveSistemaPorHabito.get(habito.id) ?? null,
          // `respuestaTexto` ya venía en el track y nadie lo leía. Es donde el backend guarda el
          // resumen de la Clase Diaria (`RegistroHabito.respuestaTexto`), así que sirve para
          // mostrar lo que la persona ya escribió en vez de pedírselo de nuevo.
          respuestaTexto: track?.respuestaTexto ?? null,
          // Puntos en juego y vencimiento, tal cual los manda el backend desde el 2026-09-05.
          // `?? null` y no un default numérico: si el backend es viejo y no los manda, o si
          // todavía no hay track, la pantalla tiene que mostrarse sin esa información.
          pointsAtStake: track?.puntosEnJuego ?? null,
          maxPoints: track?.puntosMaximos ?? null,
          deadline: track?.plazoEvidencia ?? null,
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
  }, [plan.habits, catalogo, tracks, rocas, rocasConEvidencia]);

  return {
    habits,
    loading: loadingPropio || plan.loading,
    error: errorPropio ?? plan.error,
    recargar,
  };
}
