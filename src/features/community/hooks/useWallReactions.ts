import { useCallback, useState } from 'react';

import type { ReactionUser } from '../../../screens/ComunidadScreen';
import { mensajeDeError } from '../../../services/http/apiClient';
import * as wallApi from '../api/wallApi';
import { mapearReaccion } from '../api/wallMappers';

/**
 * Estado real de "quién reaccionó" (modal "Reacciones del post"), pedido bajo demanda al abrir
 * el modal — mismo criterio que `useWallFeed.cargarComentarios`: el feed no trae esta lista,
 * solo los conteos, así que se pide recién cuando la persona toca el contador de "me gusta".
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
      // Solo "me gusta". El endpoint sigue devolviendo las filas DISLIKE que quedaron guardadas de
      // antes de retirar esa reacción del producto; mostrarlas obligaría a dibujarlas con un
      // pulgar arriba (el único ícono que quedó), o sea a decir que a esa persona le gustó algo
      // que en realidad no le gustó. Se descartan acá, antes de traducirlas.
      setReacciones(pagina.reactions.filter(r => r.type === 'LIKE').map(mapearReaccion));
    } catch (e) {
      setReacciones([]);
      setError(mensajeDeError(e, 'No pudimos cargar quién reaccionó. Intenta de nuevo.'));
    } finally {
      setCargando(false);
    }
  }, []);

  return { reacciones, cargando, error, cargarReacciones };
}
