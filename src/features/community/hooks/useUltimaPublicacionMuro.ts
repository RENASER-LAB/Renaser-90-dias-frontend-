import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { mensajeDeError } from '../../../services/http/apiClient';
import * as wallApi from '../api/wallApi';
import type { WallPost } from '../types/community.types';

/**
 * Evidencia más reciente del Muro para las superficies resumidas, como Hoy.
 *
 * El backend ya devuelve el feed más nuevo primero, así que no se inventa un orden ni se
 * duplica la consulta en la pantalla. Se refresca cada vez que Hoy vuelve a recibir el foco y
 * expone `recargar` para que el gesto de pull-to-refresh actualice todo junto.
 */
export function useUltimaPublicacionMuro() {
  const [publicacion, setPublicacion] = useState<WallPost | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const pagina = await wallApi.obtenerFeedMuro();
      // Hoy solo debe destacar evidencias. Una publicación de texto sin media no ocupa esta
      // tarjeta ni desplaza la última prueba que la persona puede abrir y revisar.
      setPublicacion(pagina.posts.find(post => post.media.length > 0) ?? null);
    } catch (e) {
      setPublicacion(null);
      setError(mensajeDeError(e, 'No pudimos cargar la última evidencia del Muro.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar])
  );

  return { publicacion, cargando, error, recargar };
}
