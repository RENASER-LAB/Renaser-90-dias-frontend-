import { useCallback, useEffect, useState } from 'react';

import type { HabitItem } from '../../../screens/TrainingScreen';
import { mensajeDeError } from '../../../services/http/apiClient';
import * as habitsApi from '../../habits/api/habitsApi';
import * as trainingApi from '../api/trainingApi';

/**
 * Alimenta `TrainingScreen` con datos reales, agrupados por dimensión.
 *
 * Las CINCO dimensiones de la pantalla NO salen todas del mismo lado, y esa es la parte que hay
 * que entender antes de tocar este archivo:
 *
 *   - `CUERPO`, `MENTE`, `EMOCIONES`, `ESPÍRITU` ← hábitos del día (`habit-tracks/today`),
 *     agrupados por la categoría del hábito en el catálogo.
 *   - `VIDA Y NEGOCIO` ← la roca del día (`rocks/today`). Es el objetivo diario de "Diseñar
 *     libertad financiera", no un hábito.
 *
 * Son DOS vocabularios distintos, de módulos distintos, y no se mapean entre sí:
 * las categorías de hábito son `BODY`/`MIND`/`SPIRIT`/`CONSCIENCE`; los ejes de roca son
 * `CUERPO`/`TRABAJO`/`RELACIONES`. No unificarlos.
 */

/** Las cuatro categorías reales del catálogo de hábitos → la dimensión que les corresponde. */
const DIMENSION_POR_CATEGORIA: Record<string, HabitItem['dimension']> = {
  BODY: 'CUERPO',
  MIND: 'MENTE',
  CONSCIENCE: 'EMOCIONES',
  SPIRIT: 'ESPÍRITU',
};

function aHoraCorta(hora: string | null | undefined): string {
  return hora ? hora.slice(0, 5) : '';
}

export function useTraining() {
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Las cuatro llamadas son independientes entre sí: se piden en paralelo. Las dos que no son
      // imprescindibles degradan solas en vez de tirar abajo la pantalla entera — si falla la
      // roca, se ven las cuatro dimensiones de hábitos igual.
      const [tracks, catalogo, rocas, evidencias] = await Promise.all([
        habitsApi.obtenerTracksDeHoy(),
        habitsApi.obtenerCatalogo(),
        trainingApi.obtenerRocasDeHoy().catch(() => []),
        trainingApi.obtenerEvidencias().catch(() => []),
      ]);

      const categoriaPorHabito = new Map(catalogo.map(h => [h.id, h.category]));
      // La evidencia apunta a su origen con un campo distinto segun de qué sea: `registroHabitoId`
      // para un hábito, `rocaDiariaId` para una roca. Se indexan por separado para no cruzar ids
      // de dos módulos que no comparten espacio de identidad.
      const habitosConEvidencia = new Set(
        evidencias.map(e => e.registroHabitoId).filter((id): id is string => Boolean(id)),
      );
      const rocasConEvidencia = new Set(
        evidencias.map(e => e.rocaDiariaId).filter((id): id is string => Boolean(id)),
      );

      const deHabitos: HabitItem[] = tracks
        .map(track => {
          const dimension = DIMENSION_POR_CATEGORIA[categoriaPorHabito.get(track.habitoId) ?? ''];
          if (!dimension) {
            return null;
          }
          return {
            id: track.id,
            dimension,
            title: track.tituloHabito,
            time: aHoraCorta(track.horaDisparo),
            tag: track.esOpcional ? 'Opcional' : 'Innegociable',
            streak: 0,
            done: track.estado === 'COMPLETADO',
            hasEvidence: habitosConEvidencia.has(track.id),
          };
        })
        .filter((h): h is HabitItem => h !== null);

      const deRocas: HabitItem[] = rocas.map(roca => ({
        id: roca.id,
        dimension: 'VIDA Y NEGOCIO',
        title: roca.titulo,
        time: aHoraCorta(roca.horaInicio),
        tag: roca.esDelegable ? 'Delegable' : 'Innegociable',
        streak: 0,
        done: roca.completada,
        hasEvidence: rocasConEvidencia.has(roca.id),
        note: roca.descripcion ?? undefined,
      }));

      setHabits([...deHabitos, ...deRocas]);
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos cargar tu entrenamiento'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { habits, loading, error, recargar };
}
