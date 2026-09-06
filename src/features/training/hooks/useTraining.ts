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
      //
      // Degradan, pero ya no en silencio (2026-09-05): antes eran `.catch(() => [])` a secas, así
      // que un endpoint caído se veía igual que "no hay nada que mostrar" y el contador se quedaba
      // en cero sin que nadie se enterara. Se sigue devolviendo `[]` a propósito — la pantalla
      // tiene que abrirse igual —, pero el fallo queda escrito.
      const [tracks, catalogo, rocas, evidenciasDeRocas] = await Promise.all([
        habitsApi.obtenerTracksDeHoy(),
        habitsApi.obtenerCatalogo(),
        trainingApi.obtenerRocasDeHoy().catch(e => {
          console.warn('[Training] no se pudo cargar la roca del día; la dimensión sale vacía:', e);
          return [];
        }),
        trainingApi.obtenerEvidenciasDeRocas().catch(e => {
          console.warn('[Training] no se pudo cargar la evidencia de rocas; se muestran sin sellar:', e);
          return [];
        }),
      ]);

      const categoriaPorHabito = new Map(catalogo.map(h => [h.id, h.category]));
      // `systemKey` es lo que deja reconocer un hábito puntual del catálogo (hoy: la Clase
      // Diaria, que tiene su propio flujo de cierre con resumen). Se toma del CATÁLOGO y no del
      // track porque es un atributo del hábito, no del registro del día — el track ya se une al
      // catálogo por `habitoId` unas líneas más abajo, así que no cuesta ninguna llamada extra.
      const claveSistemaPorHabito = new Map(catalogo.map(h => [h.id, h.systemKey ?? null]));
      // Para las ROCAS todavía hay que cruzar contra el listado de evidencia. Para los HÁBITOS ya
      // no: desde el 2026-09-05 (D-113) cada track de `habit-tracks/today` trae `tieneEvidencia`
      // resuelto por el backend.
      //
      // El cruce se retiró del lado de los hábitos porque estaba roto por construcción, no por
      // prolijidad: `GET /api/v1/evidence` devuelve UNA página de 20 filas, ordenada por fecha de
      // creación descendente y sin filtro de día, así que apenas el aprendiz superaba esas 20
      // filas la evidencia de un hábito de hoy quedaba afuera y el chip decía "SUBIR" sobre un
      // archivo que ya estaba guardado. No se notaba porque `renaser.evidencias` tenía una sola
      // fila. La misma limitación sigue viva para rocas — ver `trainingApi.obtenerEvidenciasDeRocas`.
      const rocasConEvidencia = new Set(
        evidenciasDeRocas.map(e => e.rocaDiariaId).filter((id): id is string => Boolean(id)),
      );

      const deHabitos: HabitItem[] = tracks
        // El tipo de retorno es explícito porque `HabitItem` tiene campos opcionales
        // (`systemKey`, `respuestaTexto`): sin anotarlo, TypeScript infiere del objeto literal un
        // tipo MÁS ESTRECHO que `HabitItem` y el `filter` de abajo deja de compilar.
        .map((track): HabitItem | null => {
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
            // Dato del servidor, no reconstruido acá: es exacto y no depende de cuántas filas
            // entren en una página. `?? false` cubre a un backend anterior a D-113.
            hasEvidence: track.tieneEvidencia ?? false,
            systemKey: claveSistemaPorHabito.get(track.habitoId) ?? null,
            // `respuestaTexto` ya venía en el track y nadie lo leía. Es donde el backend guarda el
            // resumen de la Clase Diaria (`RegistroHabito.respuestaTexto`), así que sirve para
            // mostrar lo que la persona ya escribió en vez de pedírselo de nuevo.
            respuestaTexto: track.respuestaTexto,
            // Puntos en juego y vencimiento, tal cual los manda el backend desde el 2026-09-05.
            // `?? null` y no un default numérico: si el backend es viejo y no los manda, la
            // pantalla tiene que mostrarse sin esa información, no inventar un 10.
            pointsAtStake: track.puntosEnJuego ?? null,
            maxPoints: track.puntosMaximos ?? null,
            deadline: track.plazoEvidencia ?? null,
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
        // Una roca no es un hábito de catálogo: no tiene clave de sistema ni resumen.
        systemKey: null,
        respuestaTexto: null,
        // Una roca no pasa por la escala de puntos de hábitos ni tiene plazo de evidencia
        // expuesto por su endpoint: se deja explícito en null en vez de fingir un valor.
        pointsAtStake: null,
        maxPoints: null,
        deadline: null,
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
