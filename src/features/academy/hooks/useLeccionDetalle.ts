import { useCallback, useState } from 'react';

import type { LessonResource } from '../../../screens/ComunidadScreen';
import { mensajeDeError } from '../../../services/http/apiClient';
import * as leccionesApi from '../api/leccionesApi';
import { extraerCamposDetalle } from '../api/academyMappers';

/**
 * Detalle real de una lección (videoUrl, cuerpo, recursos), pedido bajo demanda al abrir la
 * lección a pantalla completa, más las acciones de completar/descompletar contra el backend.
 *
 * No reemplaza el estado `fullScreenLesson` de `ComunidadScreen.tsx` (que sigue siendo la fuente
 * de "qué lección está abierta", ya conectado a `useSystemBackHandler`): este hook solo guarda,
 * por id de lección, los campos EXTRA que trae `GET /lecciones/{id}` y que el árbol
 * (`GET /cursos/{id}/secciones`) no tiene. La pantalla combina ambos (`{...fullScreenLesson,
 * ...detallePorId[fullScreenLesson.id]}`) — así la lección se abre al toque, con lo que ya había
 * en el árbol, y el video/cuerpo aparecen apenas llegan, sin bloquear la navegación.
 */
export function useLeccionDetalle() {
  const [detallePorId, setDetallePorId] = useState<Record<string, Partial<LessonResource>>>({});
  const [cargandoId, setCargandoId] = useState<string | null>(null);
  const [errorPorId, setErrorPorId] = useState<Record<string, string>>({});
  const [actualizando, setActualizando] = useState(false);

  const cargarDetalle = useCallback((leccionId: string) => {
    setCargandoId(leccionId);
    setErrorPorId(prev => {
      if (!(leccionId in prev)) return prev;
      const { [leccionId]: _omitido, ...resto } = prev;
      return resto;
    });
    leccionesApi
      .obtenerLeccion(leccionId)
      .then(detalle => {
        setDetallePorId(prev => ({ ...prev, [leccionId]: extraerCamposDetalle(detalle) }));
      })
      .catch(e => {
        setErrorPorId(prev => ({ ...prev, [leccionId]: mensajeDeError(e, 'No pudimos cargar esta lección.') }));
      })
      .finally(() => {
        setCargandoId(prev => (prev === leccionId ? null : prev));
      });
  }, []);

  /**
   * El backend hace el cambio real (POST/DELETE) y, si sale bien, se refleja acá mismo en
   * `detallePorId` (`completed`) — así, si la persona vuelve a abrir la MISMA lección más
   * adelante en esta sesión, el botón ya sabe que se completó, en vez de volver a mostrar
   * "MARCAR COMO COMPLETADA". No se toca el % agregado del curso (`courses` de `useCursos`): el
   * backend no expone qué lecciones puntuales ya estaban completas de antes (solo el conteo
   * total, `ProgresoCursoResponse.completadas`), así que no hay una verdad de partida confiable
   * para sumar/restar sin arriesgar mostrar un número incorrecto — ver el informe de la
   * integración.
   */
  const alternarCompletada = useCallback(async (leccionId: string, estabaCompleta: boolean) => {
    setActualizando(true);
    try {
      if (estabaCompleta) {
        await leccionesApi.descompletarLeccion(leccionId);
      } else {
        await leccionesApi.completarLeccion(leccionId);
      }
      setDetallePorId(prev => ({ ...prev, [leccionId]: { ...prev[leccionId], completed: !estabaCompleta } }));
    } finally {
      setActualizando(false);
    }
  }, []);

  return { detallePorId, cargandoId, errorPorId, actualizando, cargarDetalle, alternarCompletada };
}
