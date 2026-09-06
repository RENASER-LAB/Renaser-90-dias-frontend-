import { useCallback, useEffect, useState } from 'react';

import type { CommentItem, PostItem } from '../../../screens/ComunidadScreen';
import { mensajeDeError } from '../../../services/http/apiClient';
import * as wallApi from '../api/wallApi';
import { aplicarReaccion, mapearComentario, mapearPublicacion } from '../api/wallMappers';
import type { WallReactionType } from '../types/community.types';
import type { FotoMuroNormalizada } from '../utils/normalizarImagen';

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

  /**
   * Publica con **UI optimista**: la publicación aparece en el muro en el instante en que la
   * persona toca "Publicar", con la foto que todavía está en su teléfono, y recién después viaja
   * a la red. Es el patrón que usan Instagram y WhatsApp, y la única forma real de que publicar
   * "se sienta instantáneo" — el resto de los cambios reduce el tiempo, esto elimina la espera.
   *
   * **Por qué no se puede simplemente "hacerlo más rápido":** publicar son tres viajes de red
   * (pedir URL firmada → `PUT` de los bytes a S3 → `POST /wall`), y solo el `PUT` de una foto de
   * ~90 KB a us-east-1 mide 0,6–0,7 s desde Perú. No hay optimización de servidor que baje eso:
   * es distancia física. Lo que sí se puede es dejar de hacer esperar a la persona.
   *
   * **El precio, explícito:** una UI optimista miente por un rato. Si la subida falla, hay que
   * poder deshacer — por eso se guarda el post temporal por su `id` y en el `catch` se lo saca
   * (rollback) y se devuelve el borrador a quien lo escribió, en vez de dejar en pantalla algo
   * que el servidor nunca guardó.
   *
   * @returns el borrador a restaurar si falló, o `null` si se publicó bien.
   */
  const publicarOptimista = useCallback(
    async (
      texto: string,
      fotos: FotoMuroNormalizada[],
      autor: string,
      // Clave del catálogo (`GET /api/v1/wall/categories`) o `null` si la persona no eligió
      // ninguna — `category` es opcional en `POST /api/v1/wall`. Antes este parámetro no existía y
      // la categoría elegida en el compositor no llegaba nunca al backend.
      categoria: string | null = null
    ) => {
      const idTemporal = `pendiente-${Date.now()}`;
      const optimista: PostItem = {
        id: idTemporal,
        author: autor,
        avatar: '👤',
        // El feed real tampoco trae célula ni racha (ver `mapearPublicacion`): se dejan igual que
        // ahí para que el post temporal y el definitivo se vean idénticos y el cambio no parpadee.
        cell: '',
        dayStreak: 0,
        timeAgo: 'Ahora',
        text: texto,
        media: fotos.map((foto, idx) => ({
          type: 'image' as const,
          title: `📷 Foto ${idx + 1}`,
          // La foto LOCAL del teléfono: se ve al instante, sin esperar a que S3 la reciba.
          url: foto.uri,
          mimeType: foto.mimeType,
        })),
        likes: 0,
        userReaction: null,
        comments: [],
        pendiente: true,
      };
      setPosts(prev => [optimista, ...prev]);

      try {
        const media: { url: string; mimeType: string }[] = [];
        for (const foto of fotos) {
          const urlSubida = await wallApi.solicitarUrlSubidaMuro(foto.mimeType);
          if (wallApi.almacenamientoSinConfigurar(urlSubida.uploadUrl)) {
            throw new Error(
              'El almacenamiento de fotos (S3) todavía no está configurado en el servidor. Avisale al equipo técnico e intentá de nuevo más tarde.'
            );
          }
          await wallApi.subirImagenAS3(urlSubida.uploadUrl, foto.uri, foto.mimeType);
          // Se manda la RUTA que devolvió el backend, no la URL absoluta armada a mano: lo que se
          // guarda tiene que ser la clave del objeto en S3, porque el feed la vuelve a firmar en
          // cada lectura. Mandar una URL dejaba la foto en 404 para siempre aunque el archivo
          // existiera — es el defecto E-79, y este es su lado del cliente.
          media.push({ url: urlSubida.ruta, mimeType: foto.mimeType });
        }
        // La respuesta ya trae la publicación real (id del servidor, conteos, URL firmada), así que
        // se cambia el temporal por ella. NO se recarga el muro entero: esa recarga era una carga
        // completa del feed de más por cada publicación.
        const real = await wallApi.publicarEnMuro(texto, media, categoria);
        setPosts(prev => prev.map(p => (p.id === idTemporal ? mapearPublicacion(real) : p)));
        return null;
      } catch (e) {
        setPosts(prev => prev.filter(p => p.id !== idTemporal)); // rollback: nunca dejar una mentira en pantalla
        throw e;
      }
    },
    []
  );

  const agregarComentario = useCallback(
    async (postId: string, texto: string, photoUri?: string) => {
      let textoParaEnviar = texto;
      let urlSubidaFinal = photoUri;

      if (photoUri) {
        try {
          const mimeType = photoUri.endsWith('.png') ? 'image/png' : 'image/jpeg';
          const urlSubida = await wallApi.solicitarUrlSubidaMuro(mimeType);
          if (!wallApi.almacenamientoSinConfigurar(urlSubida.uploadUrl)) {
            await wallApi.subirImagenAS3(urlSubida.uploadUrl, photoUri, mimeType);
            urlSubidaFinal = urlSubida.ruta;
          }
        } catch {
          // Si falla o no está configurado S3 en el entorno, se preserva el photoUri local
        }

        if (urlSubidaFinal) {
          const etiqueta = ` [📷:${urlSubidaFinal}]`;
          if (textoParaEnviar.length + etiqueta.length <= 500) {
            textoParaEnviar = `${textoParaEnviar}${etiqueta}`;
          }
        }
      }

      const resultado = await wallApi.crearComentario(postId, textoParaEnviar);
      const nuevoComentario = mapearComentario(resultado.comment);
      if (photoUri) {
        nuevoComentario.photoAttached = photoUri;
      }
      setPosts(prev =>
        prev.map(p =>
          p.id === postId ? { ...p, comments: [...p.comments, nuevoComentario] } : p
        )
      );
      setComentariosCargados(prev => ({ ...prev, [postId]: true }));
    },
    []
  );

  return {
    posts,
    setPosts,
    loading,
    error,
    recargar,
    reaccionar,
    cargarComentarios,
    agregarComentario,
    publicarOptimista,
  };
}
