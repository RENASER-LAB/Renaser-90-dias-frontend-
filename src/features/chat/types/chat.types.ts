/**
 * Formas EXACTAS que devuelve el backend Java para Chat (`chat/infrastructure/adapter/in/rest/*`
 * en el repo Spring — SOLO LECTURA, no se modifica). Separadas de los tipos de UI
 * (`ChatConversation`/`ChatMessage`/`GroupMember`, definidos en `screens/ComunidadScreen.tsx`):
 * el wire habla en inglés salvo `nombre` (ver nota abajo), la UI habla el vocabulario del diseño
 * ya hecho. `api/chatMappers.ts` traduce de uno a otro.
 *
 * OJO `nombre`: `ConversacionResponse` es un record Java sin `@JsonNaming`, así que sus claves
 * salen tal cual sus nombres de campo — y ese campo específico se llama `nombre` (español) aunque
 * `type` sí viaja traducido a inglés (CELL/DIRECT/GLOBAL/SUPPORT). No es un typo de este archivo,
 * es el wire real; ya pasó una vez en este proyecto asumir un nombre en inglés que el backend no
 * manda.
 *
 * > **Corregido 2026-09-16.** Acá decía que `type` viaja como `(CELL/DIRECT/GLOBAL)`. Son cuatro
 * > desde que existe el chat de soporte por aprendiz: en el dominio del backend el enum se llama
 * > `SOPORTE` y `ConversacionResponse.toWireTipo` lo traduce a `SUPPORT`, igual que CELULA→CELL y
 * > DIRECTA→DIRECT.
 */

/**
 * Los tipos de conversación que ESTA versión del cliente sabe pintar.
 *
 * `SUPPORT` es el chat de soporte de un aprendiz: adentro están ese aprendiz y el staff
 * (ADMIN / ALQUIMISTA). El aprendiz no puede salirse; el staff sí. Nada de eso se decide desde el
 * móvil — lo impone el backend —, pero explica por qué el chat aparece solo en la bandeja sin que
 * nadie lo haya abierto.
 */
export type WireTipoConversacion = 'CELL' | 'DIRECT' | 'GLOBAL' | 'SUPPORT';

/**
 * Lo que puede llegar REALMENTE en `type`: uno de los conocidos, o cualquier otro string.
 *
 * La app vive publicada en la tienda y el backend se despliega solo: entre que sale una versión y
 * la gente la actualiza pueden pasar semanas, y durante esas semanas el servidor puede empezar a
 * mandar un tipo que este binario no conoce. Por eso el tipo del cable NO es la unión cerrada — es
 * la unión cerrada MÁS `string`. El `& {}` es el truco de TypeScript que evita que la unión colapse
 * a `string` a secas: sigue autocompletando los cuatro valores conocidos y a la vez acepta el
 * quinto que todavía no existe.
 */
export type WireTipoConversacionRecibido = WireTipoConversacion | (string & {});

export type WireTipoMensaje = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'SYSTEM';

/** `ConversacionResponse`. */
export interface WireConversacion {
  id: string;
  /** Ojo: `WireTipoConversacionRecibido`, no `WireTipoConversacion`. Quien lo lea tiene que pasar
   * por `reconocerTipoChat` (`api/chatMappers.ts`) en vez de comparar contra literales: es lo que
   * decide qué hacer con un tipo que este cliente no conoce. */
  type: WireTipoConversacionRecibido;
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
  /** Su nombre, ya resuelto por el servidor. */
  otherParticipantName?: string | null;
  otherParticipantAvatarUrl?: string | null;
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
