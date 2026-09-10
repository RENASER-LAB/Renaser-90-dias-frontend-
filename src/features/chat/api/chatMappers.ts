import type { ChatConversation, ChatMessage, ChatMessageType } from '../../../screens/ComunidadScreen';
import { horaChat } from '../utils/horaChat';
import type { WireConversacionResumen, WireMensaje, WireMiembro, WireTipoConversacion, WireTipoMensaje } from '../types/chat.types';

/**
 * Traduce las respuestas del backend (`chatSchemas.ts`) a los tipos que ya consume el diseño de
 * Atención Personalizada (`ChatConversation`/`ChatMessage`, definidos en `ComunidadScreen.tsx`).
 * El JSX no se toca: solo cambia de dónde sale el valor de cada prop — mismo criterio que
 * `community/api/wallMappers.ts`.
 */

/** El diseño pinta el avatar como un emoji (`<Text>{conv.avatar}</Text>`, sin `<Image>`). Se
 * reutilizan los mismos emojis que ya usaba el mock para célula/global (📷 no aplica acá) y uno
 * neutro para 1 a 1, porque `avatarUrl` del backend es una URL real, no un emoji — mismo motivo
 * que `wallMappers.ts` (`AVATAR_POR_DEFECTO`). */
const AVATAR_POR_TIPO: Record<'celula' | 'direct' | 'global', string> = {
  celula: '👥',
  direct: '👤',
  global: '🌐',
};

const ETIQUETA_ROL: Record<string, string> = {
  TRAINEE: 'Aprendiz',
  MENTOR: 'Mentor',
  MENTOR_LEAD: 'Líder de Mentores',
  ADMIN: 'Administrador',
  ALCHEMIST: 'Alquimista',
};

function traducirRol(role: string): string {
  return ETIQUETA_ROL[role] ?? role;
}

export function mapearTipoConversacion(tipo: WireTipoConversacion): ChatConversation['type'] {
  switch (tipo) {
    case 'CELL':
      return 'celula';
    case 'DIRECT':
      return 'direct';
    case 'GLOBAL':
      return 'global';
  }
}

function mapearTipoMensaje(tipo: WireTipoMensaje): ChatMessageType {
  switch (tipo) {
    case 'AUDIO':
      return 'audio';
    case 'IMAGE':
      return 'image_grid';
    case 'VIDEO':
      return 'video';
    // TEXT y SYSTEM: el diseño no tiene una burbuja propia para "mensaje de sistema", se pintan
    // como texto normal — ver `handleSendChatMessage`/el `.map` de mensajes en ComunidadScreen.
    default:
      return 'text';
  }
}

function formatearDuracion(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = Math.floor(segundos % 60)
    .toString()
    .padStart(2, '0');
  return `${minutos}:${resto}`;
}

/** Texto a mostrar cuando el mensaje no trae `text` (p. ej. un audio sin caption) — nunca inventa
 * contenido, solo rotula el tipo. */
function textoPorTipo(wire: WireMensaje): string | undefined {
  if (wire.text && wire.text.trim()) {
    return wire.text;
  }
  switch (wire.type) {
    case 'AUDIO':
      return 'Nota de voz';
    case 'VIDEO':
      return '▶ Video adjunto';
    case 'IMAGE':
      return 'Imagen adjunta';
    case 'SYSTEM':
      return 'Mensaje del sistema';
    default:
      return undefined;
  }
}

/** `avatar`/`status` de `ChatMessage` no se leen en ningún lado del JSX de la burbuja (el diseño
 * solo pinta `sender`/`senderRole` para mensajes ajenos, y el doble-check `✓✓` depende únicamente
 * de `isMe`) — se dejan en valores neutros, no rotos. */
export function mapearMensaje(wire: WireMensaje, actorId: string | null | undefined): ChatMessage {
  const esMio = !!actorId && wire.senderId === actorId;
  return {
    id: wire.id,
    sender: wire.senderName?.trim() || (esMio ? 'Tú' : 'Miembro Renaser'),
    avatar: '',
    isMe: esMio,
    time: horaChat(wire.createdAt),
    type: mapearTipoMensaje(wire.type),
    text: textoPorTipo(wire),
    audioDuration: wire.mediaDurationSeconds != null ? formatearDuracion(wire.mediaDurationSeconds) : undefined,
    // La URL firmada es lo que hace que la foto se vea y el audio suene. Puede venir `null` en el
    // "último mensaje" de la lista de conversaciones (ahí el backend no la firma a propósito),
    // así que la burbuja tiene que saber vivir sin ella — no es un error.
    mediaUrl: wire.mediaUrl ?? undefined,
    // Respaldo para los mensajes sin URL firmada: se sigue rotulando el adjunto en vez de dejar
    // la burbuja vacía. Con `mediaUrl` presente la burbuja muestra la foto y esto no se usa.
    mediaList: wire.type === 'IMAGE' && !wire.mediaUrl
      ? [wire.text?.trim() || '📷 Imagen adjunta']
      : undefined,
    status: 'read',
  };
}

/**
 * `GET /conversations` NO expone participantes de un DIRECT: ni `ConversacionResponse.nombre`
 * (siempre `null` para DIRECT, ver `Conversacion.crearDirecta`) ni el "último mensaje" resuelven
 * nombre de emisor (`MensajeResponse.from(Mensaje)` deja `senderName` en `null` a propósito —
 * ver su javadoc en el backend). Lo único aprovechable es `lastMessage.senderId`: si el último
 * mensaje NO lo mandé yo, se busca ese id en el directorio (`GET /chat/members`, que trae a TODO
 * usuario activo) para mostrar un nombre real. Si lo mandé yo, o todavía no hay mensajes, no hay
 * forma de saber quién es "el otro" sin abrir la conversación — limitación real del contrato,
 * documentada también en el informe de esta integración.
 */
function resolverOtroParticipante(
  resumen: WireConversacionResumen,
  actorId: string | null | undefined,
  directorio: Record<string, WireMiembro>
): WireMiembro | undefined {
  /* El servidor manda el NOMBRE ya resuelto. Primero se intentó que mandara solo el id y que el
     móvil lo buscara en el directorio (`GET /chat/members`), pero ese directorio exige que exista
     la conversación GLOBAL y donde no existe responde 404: la bandeja de mensajes directos se
     quedaba sin nombres por culpa de otra conversación que no tiene nada que ver.

     Antes de eso había que adivinarlo por el remitente del último mensaje, y eso solo funcionaba
     si el último lo había mandado el otro: si lo mandabas tú, o si el chat estaba vacío, la fila
     decía "Conversación directa". */
  const declarado = resumen.otherParticipantId;
  if (declarado && resumen.otherParticipantName) {
    return {
      id: declarado,
      fullName: resumen.otherParticipantName,
      avatarUrl: resumen.otherParticipantAvatarUrl ?? null,
      /* El rol no viaja en el resumen. Se toma del directorio SI está; si no, el subtítulo cae en
         el genérico. Un nombre correcto con subtítulo genérico es mejor que ningún nombre. */
      role: directorio[declarado]?.role ?? 'TRAINEE',
    } as WireMiembro;
  }
  if (declarado && directorio[declarado]) {
    return directorio[declarado];
  }
  /* Sin el campo —backend viejo— se conserva la heurística de antes. Es peor, pero es lo que
     había, y quitarla dejaría SIN nombre también los casos que hoy sí lo resuelven. */
  const ultimo = resumen.lastMessage;
  if (!ultimo || !actorId || ultimo.senderId === actorId) {
    return undefined;
  }
  return directorio[ultimo.senderId];
}

function construirTitulo(tipo: ChatConversation['type'], nombre: string | null, otro?: WireMiembro): string {
  if (tipo === 'global') {
    return nombre?.trim() || 'Comunidad Global';
  }
  if (tipo === 'celula') {
    // La célula real (`community.Celula`) no se resuelve acá: `chat` solo expone `celulaId`
    // (UUID), sin nombre — `community` no está en el alcance de esta integración.
    return 'Mi Célula';
  }
  return otro?.fullName?.trim() || 'Conversación directa';
}

function construirSubtitulo(tipo: ChatConversation['type'], otro?: WireMiembro): string {
  if (tipo === 'global') return 'Comunidad completa RENASER';
  if (tipo === 'celula') return 'Chat de tu célula';
  return otro ? `${traducirRol(otro.role)} · 1 a 1` : 'Conversación directa';
}

function construirUltimoMensajeTexto(ultimo: WireMensaje | null): string {
  if (!ultimo) return 'Todavía no hay mensajes';
  return textoPorTipo(ultimo) ?? '';
}

export function mapearResumenConversacion(
  resumen: WireConversacionResumen,
  actorId: string | null | undefined,
  directorio: Record<string, WireMiembro>
): ChatConversation {
  const tipo = mapearTipoConversacion(resumen.conversation.type);
  const otro = tipo === 'direct' ? resolverOtroParticipante(resumen, actorId, directorio) : undefined;

  return {
    id: resumen.conversation.id,
    type: tipo,
    title: construirTitulo(tipo, resumen.conversation.nombre, otro),
    subtitle: construirSubtitulo(tipo, otro),
    avatar: AVATAR_POR_TIPO[tipo],
    lastMessage: construirUltimoMensajeTexto(resumen.lastMessage),
    lastTime: resumen.lastMessage ? horaChat(resumen.lastMessage.createdAt) : '',
    unreadCount: resumen.unreadCount,
    // El listado nunca trae el historial completo — se pide recién al abrir la conversación
    // (`GET .../messages`), mismo criterio que `useWallFeed.cargarComentarios`.
    messages: [],
  };
}

/**
 * Mejora el título de una conversación DIRECT una vez que se cargaron sus mensajes reales: si
 * `resolverOtroParticipante` no pudo resolver un nombre desde el directorio (porque el último
 * mensaje lo mandé yo, o no había ninguno), los mensajes enriquecidos de `GET .../messages` sí
 * traen `senderName` — se usa el primero que no sea mío. No pisa un título ya resuelto.
 */
export function refinarTituloConMensajes(conversacion: ChatConversation, mensajes: ChatMessage[]): ChatConversation {
  if (conversacion.type !== 'direct' || conversacion.title !== 'Conversación directa') {
    return conversacion;
  }
  const deOtro = mensajes.find(m => !m.isMe && m.sender && m.sender !== 'Miembro Renaser');
  if (!deOtro) {
    return conversacion;
  }
  return { ...conversacion, title: deOtro.sender };
}
