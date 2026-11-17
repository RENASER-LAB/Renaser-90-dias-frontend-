import type { ChatConversation } from '../../../screens/ComunidadScreen';
import { SUBTITULO_DE_UN_1_A_1_SIN_ROL } from '../api/chatMappers';

/**
 * El chat 1 a 1 que pide el «Escribirle» de la ficha del mentor se abre EN EL ACTO (spec 055 FR-007, SC-002): antes, Comunidad iba
 * a Tribu, recargaba el listado entero y recién al encontrar la conversación la abría (se veía Tribu, una espera y después el
 * chat). El servidor ya devolvió la conversación al crearla; con su id y el nombre basta para abrirla: los mensajes los trae
 * `abrirConversacion` por id, y el listado se pone al día detrás.
 */
export function conversacionProvisional({ id, titulo }: { id: string; titulo: string | null | undefined }): ChatConversation {
  return {
    id,
    type: 'direct',
    celulaId: null,
    title: titulo?.trim() || 'Chat',
    subtitle: SUBTITULO_DE_UN_1_A_1_SIN_ROL,
    avatar: '',
    lastMessage: '',
    lastTime: '',
    unreadCount: 0,
    messages: [],
  };
}

/** El pedido que llega en los parámetros de la pestaña Comunidad. Con título se abre en el acto; solo con id, como antes. */
export function datosDelChatPedido(
  params: { abrirChatConversacionId?: unknown; abrirChatTitulo?: unknown } | undefined,
): { id: string; titulo: string | null; enElActo: boolean } | null {
  const id = typeof params?.abrirChatConversacionId === 'string' ? params.abrirChatConversacionId : '';
  if (!id) return null;
  const titulo = typeof params?.abrirChatTitulo === 'string' && params.abrirChatTitulo.trim() ? params.abrirChatTitulo.trim() : null;
  return { id, titulo, enElActo: titulo !== null };
}
