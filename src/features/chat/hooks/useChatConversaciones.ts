import { useCallback, useEffect, useState } from 'react';

import type { ChatConversation, ChatMessage } from '../../../screens/ComunidadScreen';
import { mensajeDeError } from '../../../services/http/apiClient';
import * as chatApi from '../api/chatApi';
import { mapearMensaje, mapearResumenConversacion, refinarTituloConMensajes } from '../api/chatMappers';
import type { WireMensaje, WireMiembro } from '../types/chat.types';

/**
 * Estado real de Atención Personalizada (chats) contra el backend Java, en un solo lugar — mismo
 * criterio que `useWallFeed`/`useCursos`.
 *
 * `directorio` se pide UNA vez (no por conversación — evita N+1) para poder resolverle un nombre
 * real a las conversaciones DIRECT que el propio backend no nombra (ver el porqué en
 * `chatMappers.resolverOtroParticipante`). `limit=100` es un techo pragmático de una sola página:
 * si el cohorte de usuarios activos supera eso, algunas conversaciones DIRECT sin mensaje propio
 * más reciente quedan con el título genérico "Conversación directa" hasta que se abren.
 */
export function useChatConversaciones(actorId: string | null | undefined) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajesCargando, setMensajesCargando] = useState(false);

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resumenes, directorioPagina] = await Promise.all([
        chatApi.obtenerConversaciones(),
        chatApi.obtenerDirectorioMiembros(undefined, undefined).catch(() => ({ members: [], nextCursor: null })),
      ]);
      const directorio: Record<string, WireMiembro> = Object.fromEntries(
        directorioPagina.members.map(m => [m.id, m])
      );
      setConversations(resumenes.map(r => mapearResumenConversacion(r, actorId, directorio)));
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos cargar tus conversaciones. Revisa tu conexión e intentá de nuevo.'));
    } finally {
      setLoading(false);
    }
  }, [actorId]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  /**
   * Trae el historial real de una conversación (`GET .../messages`, orden más reciente primero
   * — se da vuelta acá para pintar de más vieja a más nueva, como espera el `.map` del diseño) y
   * la marca como leída. Devuelve la conversación ya con `messages` cargados y, si es un DIRECT
   * sin título resuelto, con el nombre real si algún mensaje enriquecido lo trae.
   */
  const abrirConversacion = useCallback(
    async (conversacion: ChatConversation): Promise<ChatConversation> => {
      setMensajesCargando(true);
      try {
        const pagina = await chatApi.obtenerMensajes(conversacion.id);
        const mensajes: ChatMessage[] = pagina.messages.map(m => mapearMensaje(m, actorId)).reverse();
        const actualizada = refinarTituloConMensajes({ ...conversacion, messages: mensajes }, mensajes);

        setConversations(prev => prev.map(c => (c.id === conversacion.id ? { ...actualizada, unreadCount: 0 } : c)));

        // Best-effort: si falla, la conversación se abre igual y el conteo de no leídos se
        // reintenta la próxima vez que se abra (mismo criterio que `cargarComentarios`).
        chatApi.marcarConversacionLeida(conversacion.id).catch(() => undefined);

        return { ...actualizada, unreadCount: 0 };
      } finally {
        setMensajesCargando(false);
      }
    },
    [actorId]
  );

  /**
   * Refleja en memoria un mensaje que el backend ACABA de crear en esta conversación: lo agrega al
   * final del historial y actualiza la vista previa del listado. El backend es la fuente de verdad
   * del `id`/`createdAt`, así que nada se agrega de forma optimista antes de su respuesta.
   *
   * Se extrajo de `enviarMensajeTexto` (2026-09-14) al aparecer el segundo camino de envío
   * — compartir una publicación del Muro —: las dos hacen exactamente lo mismo con la respuesta,
   * lo único que cambia es qué endpoint la produjo. Duplicar el merge dejaba dos lugares donde
   * olvidarse de actualizar `lastMessage`.
   */
  const registrarMensajeCreado = useCallback(
    (conversacion: ChatConversation, creado: WireMensaje): ChatConversation => {
      const mensaje = mapearMensaje(creado, actorId);
      const actualizada: ChatConversation = {
        ...conversacion,
        messages: [...conversacion.messages, mensaje],
        lastMessage: mensaje.text || 'Mensaje enviado',
        lastTime: mensaje.time,
      };
      setConversations(prev => prev.map(c => (c.id === conversacion.id ? actualizada : c)));
      return actualizada;
    },
    [actorId]
  );

  /** Envía un mensaje de TEXTO real. Para foto o audio va `useEnvioMediaChat`. */
  const enviarMensajeTexto = useCallback(
    async (conversacion: ChatConversation, texto: string): Promise<ChatConversation> => {
      const creado = await chatApi.enviarMensajeTexto(conversacion.id, texto);
      return registrarMensajeCreado(conversacion, creado);
    },
    [registrarMensajeCreado]
  );

  /**
   * Comparte una publicación del Muro en esta conversación. Solo viaja el `postId`: el texto y la
   * foto los arma el SERVIDOR, para que la foto no quede pegada como una URL firmada que vence a
   * los 15 minutos — el porqué completo está en `chatApi.compartirPublicacionDelMuro`.
   */
  const compartirPublicacionDelMuro = useCallback(
    async (conversacion: ChatConversation, postId: string): Promise<ChatConversation> => {
      const creado = await chatApi.compartirPublicacionDelMuro(conversacion.id, postId);
      return registrarMensajeCreado(conversacion, creado);
    },
    [registrarMensajeCreado]
  );

  return {
    conversations,
    setConversations,
    loading,
    error,
    mensajesCargando,
    recargar,
    abrirConversacion,
    enviarMensajeTexto,
    compartirPublicacionDelMuro,
  };
}
