import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PlanHabit } from '../../../screens/PlanScreen';
import type { HabitItem } from '../../../screens/TrainingScreen';
import { mensajeDeError } from '../../../services/http/apiClient';
import type { HabitoCatalogoApi, TrackDelDiaApi } from '../../habits/types/habits.types';
import { cargarEntrenamiento, type DatosEntrenamiento } from '../api/cargarEntrenamiento';
import type { RocaDiariaApi } from '../types/training.types';
import { DIMENSION_POR_CATEGORIA } from '../utils/dimensionDelHabito';

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
 * **Dos listas con responsabilidades distintas.** `planHabits` conserva el inventario que la hoja
 * de Planificar necesita para editar o reactivar hábitos, incluso cuando alguno no corre hoy.
 * `habits` se construye únicamente recorriendo `tracks`, porque el backend ya resolvió fecha,
 * zona horaria, desbloqueo, pausa y horario por día. Así Training no pinta una tarjeta fantasma
 * cuando un hábito está pausado o apagado para la fecha actual.
 */

// La tabla categoría → dimensión vive en `utils/dimensionDelHabito.ts` desde 2026-09-28 (D-218):
// también la usan el aviso de un hábito y Training al abrirse desde ese aviso.

// Vacíos estables: un `[]` nuevo en cada render rompería los `useMemo` de abajo.
const SIN_TRACKS: TrackDelDiaApi[] = [];
const SIN_CATALOGO: HabitoCatalogoApi[] = [];
const SIN_PLAN: PlanHabit[] = [];
const SIN_ROCAS: RocaDiariaApi[] = [];
const SIN_EVIDENCIA: Set<string> = new Set();

export function useTraining() {
  const [datos, setDatos] = useState<DatosEntrenamiento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Si ya se pintó alguna vez con datos: decide entre esqueleto y refresco silencioso. */
  const hayDatos = useRef(false);
  /** Numera las cargas para que una respuesta vieja no pise a una más nueva. */
  const ultimaCarga = useRef(0);

  /**
   * Relee Training del backend.
   *
   * **La primera vez** (o después de un error sin datos) prende `loading` y la pantalla dibuja el
   * esqueleto. **Después, el refresco es silencioso** (V-2, 26/09/2026): lo que ya está en
   * pantalla se queda y se reemplaza cuando llega lo nuevo. Antes cada completar/sellar volvía a
   * tapar la pantalla entera con el esqueleto durante las dos rondas de pedidos (~3 s).
   *
   * Si un refresco silencioso falla, se conserva lo que había y se deja un `console.warn`: la
   * acción que lo disparó ya la confirmó el servidor, y cambiar la pantalla por un error por no
   * haber podido RELEER sería peor que mostrar el dato de hace un segundo.
   */
  const recargar = useCallback(async () => {
    const esta = ++ultimaCarga.current;
    const silencioso = hayDatos.current;
    if (!silencioso) {
      setLoading(true);
      setError(null);
    }
    try {
      const nuevos = await cargarEntrenamiento();
      if (esta !== ultimaCarga.current) return;
      hayDatos.current = true;
      setDatos(nuevos);
      setError(null);
    } catch (e) {
      if (esta !== ultimaCarga.current) return;
      if (silencioso) {
        console.warn('[Training] no se pudo refrescar; queda lo que ya estaba en pantalla:', e);
      } else {
        setError(mensajeDeError(e, 'No pudimos cargar tu entrenamiento'));
      }
    } finally {
      if (esta === ultimaCarga.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const tracks = datos?.tracks ?? SIN_TRACKS;
  const catalogo = datos?.catalogo ?? SIN_CATALOGO;
  const inventario = datos?.planHabits ?? SIN_PLAN;
  const rocas = datos?.rocas ?? SIN_ROCAS;
  const rocasConEvidencia = datos?.rocasConEvidencia ?? SIN_EVIDENCIA;

  /** Inventario completo para la hoja Planificar, incluidos hábitos sin track de hoy. */
  const planHabits = useMemo(() => {
    const categoriaPorHabito = new Map(catalogo.map(h => [h.id, h.category]));
    const claveSistemaPorHabito = new Map(catalogo.map(h => [h.id, h.systemKey ?? null]));
    const exigenciaPorHabito = new Map(catalogo.map(h => [h.id, h.evidenceRequirement]));

    return inventario
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
  }, [inventario, catalogo]);

  // `useMemo` y no estado propio: se deriva de UNA sola lectura (`datos`), así el inventario y los
  // tracks cambian juntos y nunca se cruza un plan nuevo con tracks viejos. Los tracks son la
  // única fuente de verdad para las tarjetas operables de HOY.
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
          // Crudo, para distinguir EXPIRADO/FALLIDO de pendiente: `done` los junta a los tres.
          estado: track.estado,
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
    loading,
    error,
    recargar,
  };
}
