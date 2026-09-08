import { useCallback, useEffect, useState } from 'react';

import type { CourseItem } from '../../../screens/ComunidadScreen';
import { mensajeDeError } from '../../../services/http/apiClient';
import * as cursosApi from '../api/cursosApi';
import { mapearCursoBloqueado, mapearCursoConSecciones } from '../api/academyMappers';

/**
 * Estado real de "Recursos Exclusivos" contra el backend Java, en un solo lugar — mismo criterio
 * que `useWallFeed` en `community`.
 *
 * Decisión del dueño del producto: el aprendiz debe ver TODOS los cursos, no solo los accesibles
 * — el contenido se desbloquea según el día de programa, pero el catálogo entero se muestra como
 * una progresión. Por eso acá se combinan dos listas del backend:
 *   - `GET /api/v1/cursos` — ya accesibles, con progreso real.
 *   - `GET /api/v1/cursos/bloqueados` — todavía no, con el día en que se desbloquean.
 * Combinadas y ordenadas por `orden` (el mismo campo que ya trae cada curso), el catálogo se lee
 * de punta a punta como la progresión que es, en vez de mostrar solo lo ya accesible.
 */
export function useCursos() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Las dos listas se piden en paralelo: son independientes entre sí (una trae lo accesible,
      // la otra lo que falta desbloquear) y ninguna depende del resultado de la otra.
      const [misCursos, bloqueados] = await Promise.all([
        cursosApi.obtenerMisCursos(),
        // Si este endpoint puntual falla, no tira abajo el catálogo entero: se muestra solo lo
        // accesible (comportamiento de antes de este cambio), no un error de pantalla completa.
        cursosApi.obtenerCursosBloqueados().catch(() => []),
      ]);
      // Las secciones de cada curso ACCESIBLE se piden en paralelo, no en cadena: son llamadas GET
      // livianas (metadata de lecciones — título, tipo de video, duración; NUNCA los bytes del
      // video) y el resultado queda cacheado en `courses`. Esto es lo que permite que "%
      // completado" y "Módulos · Recursos" de la tarjeta salgan del árbol real (no de un número
      // inventado) y que "Explorar contenido" abra sin una ida y vuelta nueva a la red. Los cursos
      // bloqueados no tienen árbol que pedir (no son accesibles todavía).
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
      const catalogoCompleto = [...conSecciones, ...bloqueados.map(mapearCursoBloqueado)].sort(
        (a, b) => a.orden - b.orden
      );
      setCourses(catalogoCompleto);
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos cargar los cursos. Revisa tu conexión e intentá de nuevo.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { courses, loading, error, recargar };
}
