import { useCallback, useEffect, useState } from 'react';

import { mensajeDeError } from '../../../services/http/apiClient';
import * as wallApi from '../api/wallApi';
import type { WallCategory } from '../types/community.types';

/**
 * Catálogo de categorías del Muro (`GET /api/v1/wall/categories`), tal como lo devuelve el
 * servidor. Mismo patrón que `useMiCelula`/`useWallFeed`: la pantalla no arma llamadas de red
 * sueltas, las pide acá.
 *
 * **Por qué existe este hook y no una lista escrita a mano.** El compositor tenía tres pastillas
 * fijas en el código (`🔥 VICTORIA SOMÁTICA`, `⚡ ALTO RENDIMIENTO`, `🧠 REFLEXIÓN`) que no
 * existen en ninguna parte del backend: la clave que se manda al publicar tiene que estar en
 * `categorias_muro` o el servidor responde 400 `"Categoria desconocida: ..."`
 * (`PublicacionMuroService.publicar`). El catálogo lo administra ADMIN/ALCHEMIST desde el panel
 * (`/api/v1/admin/wall-categories`), y la promesa de esa pantalla es que un alta o un cambio de
 * emoji llegue a la app **sin publicar una versión nueva** — imposible de cumplir con una lista
 * compilada dentro del bundle.
 *
 * No se reordena ni se filtra nada acá: el backend ya devuelve solo las **activas** y ordenadas
 * por `orden` (`CategoriaMuroPersistenceAdapter.listarActivas` →
 * `findByActivaTrueOrderByOrdenAscClaveAsc`). Reordenarlas de nuevo en el cliente sería una
 * segunda fuente de verdad para algo que el administrador decide desde el panel.
 */
export function useCategoriasMuro() {
  const [categorias, setCategorias] = useState<WallCategory[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setCategorias(await wallApi.obtenerCategoriasMuro());
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos cargar las categorías del Muro.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { categorias, cargando, error, recargar };
}
