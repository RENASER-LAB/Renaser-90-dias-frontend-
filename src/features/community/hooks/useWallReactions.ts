import { useCallback, useState } from 'react';

import type { ReactionUser } from '../../../screens/ComunidadScreen';
import { mensajeDeError } from '../../../services/http/apiClient';
import * as wallApi from '../api/wallApi';
import { mapearReaccion } from '../api/wallMappers';

/**
 * Estado real de "quién reaccionó" (modal "Reacciones del post"), pedido bajo demanda al abrir
 * el modal — mismo criterio que `useWallFeed.cargarComentarios`: el feed no trae esta lista,
 * solo los conteos, así que se pide recién cuando la persona toca los badges de likes/dislikes.
 *
 * Se pide de nuevo cada vez que se abre el modal (a diferencia de los comentarios, que se
 * cachean por post): las reacciones cambian mientras la persona navega el muro, y este modal es
 * una vista puntual, no algo que quede montado en pantalla.
 */
export function useWallReactions() {
  const [reacciones, setReacciones] = useState<ReactionUser[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarReacciones = useCallback(async (postId: string) => {
    setCargando(true);
    setError(null);
    try {
      const pagina = await wallApi.obtenerReacciones(postId);
      setReacciones(pagina.reactions.map(mapearReaccion));
    } catch (e) {
      setReacciones([]);
      setError(mensajeDeError(e, 'No pudimos cargar quién reaccionó. Intentá de nuevo.'));
    } finally {
      setCargando(false);
    }
  }, []);

  return { reacciones, cargando, error, cargarReacciones };
}
