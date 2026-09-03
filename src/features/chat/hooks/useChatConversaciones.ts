import { useCallback, useEffect, useState } from 'react';

import type { ChatConversation, ChatMessage } from '../../../screens/ComunidadScreen';
import { mensajeDeError } from '../../../services/http/apiClient';
import * as chatApi from '../api/chatApi';
import { mapearMensaje, mapearResumenConversacion, refinarTituloConMensajes } from '../api/chatMappers';
import type { WireMiembro } from '../types/chat.types';

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
      setError(mensajeDeError(e, 'No pudimos cargar tus conversaciones. Revisá tu conexión e intentá de nuevo.'));
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

  /** Envía un mensaje de TEXTO real y lo agrega al final del historial en memoria — el backend
   * es la fuente de verdad del `id`/`createdAt`, no se optimista-agrega antes de la respuesta. */
  const enviarMensajeTexto = useCallback(
    async (conversacion: ChatConversation, texto: string): Promise<ChatConversation> => {
      const creado = await chatApi.enviarMensajeTexto(conversacion.id, texto);
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

  return {
    conversations,
    setConversations,
    loading,
    error,
    mensajesCargando,
    recargar,
    abrirConversacion,
    enviarMensajeTexto,
  };
}
