import { useCallback, useEffect, useState } from 'react';

import type { CommentItem, PostItem } from '../../../screens/ComunidadScreen';
import { mensajeDeError } from '../../../services/http/apiClient';
import * as wallApi from '../api/wallApi';
import { aplicarReaccion, mapearComentario, mapearPublicacion } from '../api/wallMappers';
import type { WallReactionType } from '../types/community.types';

/**
 * Estado real del Muro contra el backend Java, en un solo lugar — mismo criterio que
 * `useRegistroConOtp` en `auth`: la pantalla no arma llamadas de red sueltas, las pide acá.
 *
 * Expone `setPosts` crudo además de las acciones de red porque el Muro tiene interacciones que
 * el backend todavía no soporta (reaccionar a un comentario, adjuntar foto a un comentario,
 * publicar sin foto real — ver el informe de la integración) y esas siguen resolviéndose de forma
 * local, en la pantalla, con el mismo `setPosts` que usa este hook para lo que sí es real.
 */
export function useWallFeed() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comentariosCargados, setComentariosCargados] = useState<Record<string, boolean>>({});

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pagina = await wallApi.obtenerFeedMuro();
      setPosts(pagina.posts.map(mapearPublicacion));
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos cargar el muro. Revisá tu conexión e intentá de nuevo.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  /**
   * El backend hace el toggle (tocar el mismo tipo lo saca, tocar el otro lo reemplaza), así que
   * alcanza con mandar el tipo que la persona tocó y reflejar los conteos reales que devuelve —
   * no hay que llevar la cuenta a mano en el cliente.
   */
  const reaccionar = useCallback(async (postId: string, tipo: WallReactionType) => {
    const resultado = await wallApi.reaccionarPublicacion(postId, tipo);
    setPosts(prev => prev.map(p => (p.id === postId ? aplicarReaccion(p, tipo, resultado) : p)));
  }, []);

  /**
   * Se pide una sola vez por post: el feed no trae comentarios (solo `commentCount`), así que se
   * cargan recién cuando la persona abre la sección — mismo patrón de "pedir bajo demanda" que ya
   * usa el resto del backend (async + polling en evidencia/onboarding).
   */
  const cargarComentarios = useCallback(
    async (postId: string) => {
      if (comentariosCargados[postId]) {
        return;
      }
      try {
        const pagina = await wallApi.obtenerComentarios(postId);
        const comentarios: CommentItem[] = pagina.comments.map(mapearComentario);
        setPosts(prev => prev.map(p => (p.id === postId ? { ...p, comments: comentarios } : p)));
        setComentariosCargados(prev => ({ ...prev, [postId]: true }));
      } catch {
        // Silencioso a propósito: abrir la sección de comentarios no debe interrumpir con una
        // alerta. Si falla, queda vacía y `comentariosCargados` no se marca, así que se reintenta
        // sola la próxima vez que la persona la abra.
      }
    },
    [comentariosCargados]
  );

  const agregarComentario = useCallback(async (postId: string, texto: string) => {
    const resultado = await wallApi.crearComentario(postId, texto);
    setPosts(prev =>
      prev.map(p =>
        p.id === postId ? { ...p, comments: [...p.comments, mapearComentario(resultado.comment)] } : p
      )
    );
    setComentariosCargados(prev => ({ ...prev, [postId]: true }));
  }, []);

  return { posts, setPosts, loading, error, recargar, reaccionar, cargarComentarios, agregarComentario };
}
