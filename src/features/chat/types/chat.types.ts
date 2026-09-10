/**
 * Formas EXACTAS que devuelve el backend Java para Chat (`chat/infrastructure/adapter/in/rest/*`
 * en el repo Spring — SOLO LECTURA, no se modifica). Separadas de los tipos de UI
 * (`ChatConversation`/`ChatMessage`/`GroupMember`, definidos en `screens/ComunidadScreen.tsx`):
 * el wire habla en inglés salvo `nombre` (ver nota abajo), la UI habla el vocabulario del diseño
 * ya hecho. `api/chatMappers.ts` traduce de uno a otro.
 *
 * OJO `nombre`: `ConversacionResponse` es un record Java sin `@JsonNaming`, así que sus claves
 * salen tal cual sus nombres de campo — y ese campo específico se llama `nombre` (español) aunque
 * `type` sí viaja traducido a inglés (CELL/DIRECT/GLOBAL). No es un typo de este archivo, es el
 * wire real; ya pasó una vez en este proyecto asumir un nombre en inglés que el backend no manda.
 */

export type WireTipoConversacion = 'CELL' | 'DIRECT' | 'GLOBAL';
export type WireTipoMensaje = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'SYSTEM';

/** `ConversacionResponse`. */
export interface WireConversacion {
  id: string;
  type: WireTipoConversacion;
  celulaId: string | null;
  nombre: string | null;
  createdAt: string;
}

/** `MensajeResponse.ReplyPreviewResponse` (#29). */
export interface WireReplyPreview {
  id: string;
  senderName: string | null;
  type: WireTipoMensaje;
  text: string | null;
  deletedAt: string | null;
}

/** `MensajeResponse`. `senderName`/`senderAvatarUrl`/`replyTo` solo vienen resueltos cuando el
 * mensaje sale de `GET .../messages`; en el "último mensaje" de `GET /conversations` viajan en
 * `null` a propósito (ver javadoc de `MensajeResponse` en el backend). */
export interface WireMensaje {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string | null;
  senderAvatarUrl: string | null;
  type: WireTipoMensaje;
  text: string | null;
  mediaBucket: string | null;
  mediaPath: string | null;
  mediaMime: string | null;
  mediaBytes: number | null;
  mediaDurationSeconds: number | null;
  /** URL de lectura ya firmada del adjunto; `null` si el mensaje no lleva media. Solo viene
   * resuelta en `GET .../messages` — en el "último mensaje" de `GET /conversations` viaja `null`
   * a propósito, igual que `senderName` (ver javadoc de `MensajeResponse` en el backend). */
  mediaUrl: string | null;
  hidden: boolean;
  replyToId: string | null;
  replyTo: WireReplyPreview | null;
  createdAt: string;
}

/** `ConversacionResumenResponse` — item de `GET /api/v1/chat/conversations`. */
export interface WireConversacionResumen {
  conversation: WireConversacion;
  lastMessage: WireMensaje | null;
  unreadCount: number;
  /** Con quién es el chat, cuando es 1 a 1. `null`/ausente en grupos y en backends anteriores. */
  otherParticipantId?: string | null;
}

/** `MensajesPageResponse` — `GET /conversations/{id}/messages`. Paginación keyset por
 * `createdAt`, orden DESCENDENTE (más reciente primero) — ver `SpringDataMensajeRepository`. */
export interface WireMensajesPage {
  messages: WireMensaje[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * `UrlSubidaMediaChatResponse` — `POST /conversations/{id}/media/upload-url`.
 *
 * `ruta` es la clave del objeto en S3 y es lo que hay que devolver después en
 * `mediaPath` al crear el mensaje. `uploadUrl` es la URL firmada del `PUT` y NO se guarda: vence.
 */
export interface ChatUrlSubida {
  uploadUrl: string;
  bucket: string;
  ruta: string;
}

/** `MiembroResponse` — fila del directorio (`GET /chat/members`) o del roster GLOBAL
 * (`GET /conversations/global/members`). `role` ya viaja en inglés (TRAINEE/MENTOR/MENTOR_LEAD/
 * ADMIN/ALCHEMIST), sin traducción D-36 porque `users.api` ya lo expone así. */
export interface WireMiembro {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
}

/** `MiembrosPageResponse`. */
export interface WireMiembrosPage {
  members: WireMiembro[];
  nextCursor: string | null;
}
