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

/**
 * `SYSTEM` es el tipo `SISTEMA` del backend (`TipoMensaje`, traducido en
 * `MensajeResponse.toWireTipo`): un mensaje que manda el PROGRAMA y no una persona, como la
 * bienvenida del chat de soporte. Con texto o imagen se pinta como burbuja de «Formación Renaser»
 * (`chatMappers.esMensajeDelPrograma`); vacío, como siempre («Mensaje del sistema»).
 */
export type WireTipoMensaje = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'SYSTEM';

/**
 * Lo que de verdad puede llegar en `type` de un mensaje, con el mismo criterio que
 * {@link WireTipoConversacionRecibido} y por el mismo motivo — agravado.
 *
 * `lastMessage` viaja ANIDADO dentro de cada elemento de `GET /conversations`. Con el `z.enum`
 * cerrado, un tipo de mensaje que el binario no conociera no rompia un historial: rompia la
 * validacion del array de conversaciones, o sea **la bandeja entera**, y la persona se quedaba sin
 * ninguna de sus conversaciones por un mensaje suelto que ni siquiera iba a abrir.
 */
export type WireTipoMensajeRecibido = WireTipoMensaje | (string & {});

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
  /**
   * Solo en un SOPORTE (D-205 del backend, 2026-09-27): la ruta de su foto, la tarjeta de Canva con
   * el primer nombre del aprendiz (`/api/v1/chat/conversations/{id}/foto`). Relativa a la API y se
   * pide CON la sesión (`X-Auth-Token`). `null` o ausente en lo demás, y en un backend anterior.
   */
  photoPath?: string | null;
  /** Solo en un SOPORTE (D-244 del backend, 2026-10-02): el aprendiz de ese chat. */
  supportTraineeId?: string | null;
}

/**
 * `MensajeResponse.ReplyPreviewResponse` (#29): el resumen del mensaje citado por una respuesta.
 *
 * Desde D-251 del backend (2026-10-05, responder a un mensaje) trae además lo que hace falta para
 * dibujar la cita sin otra llamada: `mediaMime` (para reconocer un sticker igual que en la burbuja),
 * `mediaDurationSeconds` (la nota de voz), `mediaUrl` (la miniatura de una foto, firmada) y `mine`
 * (el citado lo escribió quien mira: «Tú»). Opcionales: un backend anterior no los manda.
 * `deletedAt` queda siempre en `null` en un backend nuevo (un citado que ya no está llega como
 * `replyToDeleted`), pero uno viejo lo usaba para un mensaje borrado.
 */
export interface WireReplyPreview {
  id: string;
  senderName: string | null;
  type: WireTipoMensajeRecibido;
  text: string | null;
  deletedAt?: string | null;
  mediaMime?: string | null;
  mediaDurationSeconds?: number | null;
  mediaUrl?: string | null;
  mine?: boolean | null;
}

/** `MensajeResponse`. `senderName`/`senderAvatarUrl`/`replyTo` solo vienen resueltos cuando el
 * mensaje sale de `GET .../messages`; en el "último mensaje" de `GET /conversations` viajan en
 * `null` a propósito (ver javadoc de `MensajeResponse` en el backend). */
export interface WireMensaje {
  id: string;
  conversationId: string;
  /**
   * Quién lo mandó. `null` (2026-09-27) cuando no hay una persona detrás: un mensaje del programa
   * (`SYSTEM`) puede llegar sin emisor, vacío o sin el campo, y el esquema lo normaliza a `null`
   * en vez de rechazar la página entera. Ver `chatSchemas.emisorTolerante`.
   */
  senderId: string | null;
  senderName: string | null;
  senderAvatarUrl: string | null;
  type: WireTipoMensajeRecibido;
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
  /** El mensaje citado, si este responde a otro y el citado se puede mostrar. */
  replyToId?: string | null;
  /** Su resumen. Desde D-251 viene también en la respuesta de enviar (antes solo en el listado). */
  replyTo?: WireReplyPreview | null;
  /**
   * D-251: este mensaje respondía a otro que ya no está (lo borraron, su cuenta se eliminó o lo
   * retiraron). La burbuja dice «Mensaje eliminado», sin autor. Ausente en un backend anterior.
   */
  replyToDeleted?: boolean | null;
  createdAt: string;
  /**
   * La marca de un mensaje PROPIO (D-208 del backend, 2026-09-27): `SENT` (✓, el servidor lo guardó)
   * o `READ` (✓✓, lo leyeron; en un grupo o un soporte, todos los demás). En la comunidad siempre
   * `SENT`. `null` en los de otras personas y en los del programa. Solo viene resuelto en
   * `GET .../messages`: en la respuesta de enviar y en el «último mensaje» de la lista viaja `null`,
   * y un backend anterior no lo manda. Ausente, `null` o desconocido se lee como ✓
   * (`utils/lecturaDelChat.ts`).
   */
  status?: WireEstadoDeEntregaRecibido | null;
}

/** Las marcas que ESTA versión del cliente sabe pintar. Ver {@link WireMensaje.status}. */
export type WireEstadoDeEntrega = 'SENT' | 'READ';

/**
 * Lo que de verdad puede llegar en `status`, con el mismo criterio que
 * {@link WireTipoMensajeRecibido}: un valor que este binario no conozca (un «entregado» futuro) no
 * puede romper la página de mensajes; se pinta ✓.
 */
export type WireEstadoDeEntregaRecibido = WireEstadoDeEntrega | (string & {});

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

/** `SoportesPageResponse` — `GET /api/v1/chat/support-conversations` (D-249). */
export interface WireSoportesPage {
  conversations: WireConversacionResumen[];
  nextCursor: string | null;
  hasMore: boolean;
  /** Solo en la primera página. */
  totalCount?: number | null;
  unreadConversations?: number | null;
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

/**
 * `ParticipanteDelChatResponse` — una persona de la lista de integrantes de un chat
 * (`GET /conversations/{id}/participants`). `rol` es lo que la persona ES hoy (APRENDIZ, MENTOR, ADMIN,
 * ALQUIMISTA), no un permiso; `fotoPath` es la ruta de su tarjeta con nombre (solo en grupo y soporte);
 * `avatarUrl`, la foto que subió. Nunca correo ni teléfono.
 */
export interface WireParticipante {
  userId: string;
  nombre: string;
  rol: string;
  esUnoMismo: boolean;
  fotoPath?: string | null;
  avatarUrl?: string | null;
}

/** `ParticipantesDelChatResponse`. `total` cuenta la búsqueda entera, no la página. */
export interface WireParticipantesPage {
  participants: WireParticipante[];
  total: number;
  page: number;
  size: number;
}

/** De qué es el mensaje citado: decide el ícono y el rótulo de la cita (D-251 del backend). */
export type ClaseDeCita = 'texto' | 'foto' | 'sticker' | 'audio' | 'video';

/**
 * La cita de una respuesta, lista para dibujar: en la burbuja y en la barra «Respondiendo a…» de
 * encima del campo. `eliminada` es un mensaje que respondía a otro que ya no está.
 */
export type CitaDelMensaje =
  | {
      estado: 'visible';
      /** El mensaje citado: tocar la cita lleva a él si está cargado. */
      id: string;
      /** «Tú», su nombre, «Formación Renaser» o «Miembro Renaser». */
      autor: string;
      /** Lo escribió quien mira: va en dorado, como «Tú». */
      esMia: boolean;
      clase: ClaseDeCita;
      /** Lo que se lee: el extracto, o el rótulo del adjunto («Foto», «Sticker», «Nota de voz (0:12)»). */
      resumen: string;
      /** Miniatura de la foto o del sticker citado (URL firmada o archivo local), si la hay. */
      miniatura?: string;
    }
  | { estado: 'eliminada' };
