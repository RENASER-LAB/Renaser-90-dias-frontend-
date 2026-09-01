import { useCallback, useEffect, useState } from 'react';

import type { CourseItem } from '../../../screens/ComunidadScreen';
import { mensajeDeError } from '../../../services/http/apiClient';
import * as cursosApi from '../api/cursosApi';
import { mapearCursoConSecciones } from '../api/academyMappers';

/**
 * Estado real de "Recursos Exclusivos" contra el backend Java, en un solo lugar — mismo criterio
 * que `useWallFeed` en `community`.
 *
 * `GET /api/v1/cursos` ya devuelve solo el catálogo accesible para el actor (rol + día de
 * programa, ver javadoc de `ConsultarMisCursosUseCase` en el backend), así que ningún curso
 * bloqueado llega a esta lista — es lo que hace que "un curso bloqueado no debe poder abrirse" se
 * cumpla solo, sin tener que filtrar nada acá.
 */
export function useCursos() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const misCursos = await cursosApi.obtenerMisCursos();
      // Las secciones de cada curso se piden en paralelo, no en cadena: son llamadas GET livianas
      // (metadata de lecciones — título, tipo de video, duración; NUNCA los bytes del video) y el
      // resultado queda cacheado en `courses`. Esto es lo que permite que "% completado" y
      // "Módulos · Recursos" de la tarjeta salgan del árbol real (no de un número inventado) y
      // que "Explorar contenido" abra sin una ida y vuelta nueva a la red.
      const conSecciones = await Promise.all(
        misCursos.map(async mc => {
          try {
            const secciones = await cursosApi.obtenerSeccionesCurso(mc.id);
            return mapearCursoConSecciones(mc, secciones);
          } catch {
            // Un curso puntual que falle no tira abajo el listado entero: se muestra igual, con
            // el árbol vacío (se completa solo al volver a entrar a la pestaña).
            return mapearCursoConSecciones(mc, []);
          }
        })
      );
      setCourses(conSecciones);
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos cargar los cursos. Revisá tu conexión e intentá de nuevo.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { courses, loading, error, recargar };
}
