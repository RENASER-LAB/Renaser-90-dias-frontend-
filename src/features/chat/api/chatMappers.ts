import type { ChatConversation, ChatMessage, ChatMessageType } from '../../../screens/ComunidadScreen';
import { horaCorta, horaDeLaLista, vistaPreviaDelMensaje } from '../utils/formatoChat';
import { estadoDeEntrega } from '../utils/lecturaDelChat';
import type {
  WireConversacionResumen,
  WireMensaje,
  WireMiembro,
  WireTipoConversacion,
  WireTipoConversacionRecibido,
  WireTipoMensaje,
  WireTipoMensajeRecibido,
} from '../types/chat.types';

/**
 * Traduce las respuestas del backend (`chatSchemas.ts`) a los tipos que ya consume el diseño de
 * Atención Personalizada (`ChatConversation`/`ChatMessage`, definidos en `ComunidadScreen.tsx`).
 * El JSX no se toca: solo cambia de dónde sale el valor de cada prop — mismo criterio que
 * `community/api/wallMappers.ts`.
 */

/**
 * Con qué ficha se pinta cada conversación en la bandeja.
 *
 * Tiene DOS valores más que `ChatConversation['type']` a propósito. `ChatConversation` vive en
 * `screens/ComunidadScreen.tsx` y su unión sigue siendo `'celula' | 'direct' | 'global'`: esa
 * pantalla es uno de los cinco tabs principales y AGENTS.md §1 prohíbe tocarla. Así que la decisión
 * de "qué es esta conversación" se toma acá, con el vocabulario completo, y recién al final
 * `mapearTipoConversacion` la traduce a los tres valores que la pantalla sabe filtrar y pintar.
 */
export type TipoChat = 'celula' | 'direct' | 'global' | 'soporte' | 'desconocido';

/**
 * Traducción del tipo del cable al de la bandeja, exhaustiva **por construcción**: es un `Record`
 * sobre `WireTipoConversacion`, así que agregar un valor a esa unión no compila hasta que alguien
 * decida cómo se pinta. Un `switch` sin `default` daba la misma garantía, pero se caía solo en
 * cuanto el parámetro dejó de ser una unión cerrada (ver `WireTipoConversacionRecibido`).
 */
const TIPO_CHAT_POR_WIRE: Record<WireTipoConversacion, TipoChat> = {
  CELL: 'celula',
  DIRECT: 'direct',
  GLOBAL: 'global',
  SUPPORT: 'soporte',
};

/**
 * Qué es esta conversación para el cliente. Un tipo que este binario no conoce NO es un error: es
 * `'desconocido'`, y se sigue mostrando con el `nombre` que mandó el servidor. Ver el porqué largo
 * en `chatSchemas.wireConversacionSchema.type` — resumido: es preferible una fila genérica a una
 * bandeja vacía para todo el que no actualizó la app.
 */
export function reconocerTipoChat(tipo: WireTipoConversacionRecibido): TipoChat {
  /* `hasOwnProperty` y no un `??` sobre el acceso directo: un objeto literal hereda de
     `Object.prototype`, así que `TIPO_CHAT_POR_WIRE['constructor']` no devuelve `undefined` sino
     una función, y el `??` la dejaría pasar como si fuera un tipo de chat válido — la fila
     terminaría con el avatar en `undefined`. Es rebuscado viniendo de un enum de Java, pero esta
     función existe justamente para que NINGÚN string caiga fuera de los cinco valores de
     `TipoChat`. */
  return Object.prototype.hasOwnProperty.call(TIPO_CHAT_POR_WIRE, tipo)
    ? TIPO_CHAT_POR_WIRE[tipo as WireTipoConversacion]
    : 'desconocido';
}

/** El diseño pinta el avatar como un emoji (`<Text>{conv.avatar}</Text>`, sin `<Image>`). Se
 * reutilizan los mismos emojis que ya usaba el mock para célula/global (📷 no aplica acá) y uno
 * neutro para 1 a 1, porque `avatarUrl` del backend es una URL real, no un emoji — mismo motivo
 * que `wallMappers.ts` (`AVATAR_POR_DEFECTO`). Los dos nuevos se eligieron viejos a propósito:
 * 🎧 y 💬 son Unicode 6.0 (2010) y existen en cualquier Android que corra la app; 🛟, que sería
 * el ícono obvio de soporte, es Unicode 14 y se vería como un cuadrado vacío en teléfonos viejos. */
const AVATAR_POR_TIPO: Record<TipoChat, string> = {
  celula: '👥',
  direct: '👤',
  global: '🌐',
  soporte: '🎧',
  desconocido: '💬',
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

/**
 * En cuál de los cuatro cajones que conoce `ComunidadScreen` cae la conversación.
 *
 * <blockquote><b>Corregido el 2026-09-22.</b> Soporte caía en <code>'direct'</code>, y el motivo
 * escrito acá era bueno: <i>"es el único cajón donde se ve. Devolver cualquier otra cosa dejaría el
 * chat de soporte invisible: el aprendiz no puede salirse de él, pero tampoco lo encontraría"</i>.
 * Dejó de valer porque la pestaña Tribu ahora tiene una sección propia —<b>Formación Renaser</b>—
 * que lista los tres grupos a los que la persona pertenece: el general, el de su mentor y el de
 * soporte. Con un cajón propio, soporte se ve MEJOR que antes: ya no compite con los 1 a 1.
 * </blockquote>
 *
 * Lo desconocido sigue cayendo en `'direct'`, y por el mismo motivo de siempre: es preferible una
 * fila genérica en la bandeja a una conversación que no aparece en ninguna parte.
 *
 * Lo que distingue soporte de un 1 a 1 tampoco se pierde en el resto: `mapearResumenConversacion`
 * decide nombre, subtítulo e ícono con `reconocerTipoChat`, que sabe la diferencia.
 */
export function mapearTipoConversacion(tipo: WireTipoConversacionRecibido): ChatConversation['type'] {
  const reconocido = reconocerTipoChat(tipo);
  if (reconocido === 'celula' || reconocido === 'global' || reconocido === 'soporte') {
    return reconocido;
  }
  return 'direct';
}

/* Recibe el tipo ABIERTO: un valor que este binario no conozca tiene que poder entrar y caer en
   el `default`, que lo pinta como texto. La burbuja igual dice que el mensaje no es compatible,
   porque de eso se encarga `textoPorTipo`. */
function mapearTipoMensaje(tipo: WireTipoMensajeRecibido): ChatMessageType {
  switch (tipo) {
    case 'AUDIO':
      return 'audio';
    case 'IMAGE':
      return 'image_grid';
    case 'VIDEO':
      return 'video';
    // TEXT y SYSTEM: se pintan como texto. Un SYSTEM con texto o imagen ni llega acá: es un
    // mensaje del programa y lo mapea `mapearMensajeDelPrograma` (2026-09-27).
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
    case 'TEXT':
      // Un TEXT sin texto no tiene nada que mostrar, y asi estaba antes.
      return undefined;
    default:
      /* Un tipo que este binario no conoce. Antes caia aca junto con TEXT y devolvia `undefined`,
         o sea una burbuja VACIA: la persona veia un hueco sin saber que le falta actualizar. Un
         texto honesto es mejor que un silencio. */
      return 'Mensaje no compatible. Actualiza la app para verlo.';
  }
}

/**
 * Quién firma los mensajes que manda el PROGRAMA (2026-09-27). Es el nombre con el que el backend
 * titula el chat de soporte (`ConversacionSoporteService.SUFIJO_SOPORTE`) y el de la sección de
 * grupos de Tribu: la bienvenida la da el programa, no la persona cuya cuenta la haya enviado.
 */
export const FIRMA_DEL_PROGRAMA = 'Formación Renaser';

/**
 * Si el adjunto de un mensaje es una imagen. Sin MIME se toma como imagen: lo único que el
 * programa adjunta hoy es la tarjeta de bienvenida (`image/png`).
 */
function adjuntoEsImagen(wire: Pick<WireMensaje, 'mediaMime'>): boolean {
  return !wire.mediaMime || wire.mediaMime.toLowerCase().startsWith('image/');
}

/**
 * Si el mensaje trae una imagen: con la URL firmada (historial, `GET .../messages`) o solo con la
 * ruta (el «último mensaje» de `GET /conversations`, que el servidor no firma a propósito).
 */
function traeImagen(wire: Pick<WireMensaje, 'mediaUrl' | 'mediaPath' | 'mediaMime'>): boolean {
  return (!!wire.mediaUrl || !!wire.mediaPath) && adjuntoEsImagen(wire);
}

/**
 * Un mensaje del PROGRAMA (2026-09-27): de sistema (`SYSTEM`, el `TipoMensaje.SISTEMA` del
 * backend) y con algo que mostrar — texto, imagen o las dos. Es la bienvenida del chat de soporte
 * desde que la manda el programa y no la cuenta de una persona.
 *
 * Uno de sistema VACÍO no entra: sigue como siempre, «Mensaje del sistema» (`textoPorTipo`).
 */
export function esMensajeDelPrograma(
  wire: Pick<WireMensaje, 'type' | 'text' | 'mediaUrl' | 'mediaPath' | 'mediaMime'>
): boolean {
  return wire.type === 'SYSTEM' && (!!wire.text?.trim() || traeImagen(wire));
}

/**
 * La burbuja de un mensaje del programa: siempre a la izquierda (`isMe` en `false` aunque el
 * servidor lo haya guardado a nombre de quien mira, por ejemplo la cuenta de staff que lo envía),
 * firmada «Formación Renaser» y sin el id del emisor, que no es de nadie en particular. La burbuja
 * le pone el fénix (`BurbujaDeMensaje`).
 */
function mapearMensajeDelPrograma(wire: WireMensaje): ChatMessage {
  const conImagen = traeImagen(wire);
  return {
    id: wire.id,
    sender: FIRMA_DEL_PROGRAMA,
    avatar: '',
    isMe: false,
    esDelPrograma: true,
    time: horaCorta(wire.createdAt),
    type: conImagen ? 'image_grid' : 'text',
    text: wire.text?.trim() || undefined,
    mediaUrl: conImagen ? wire.mediaUrl ?? undefined : undefined,
    // Imagen sin URL firmada: se rotula el adjunto, como en una foto de una persona.
    mediaList: conImagen && !wire.mediaUrl ? ['📷 Imagen adjunta'] : undefined,
    status: 'read',
    createdAt: wire.createdAt,
    senderAvatarUrl: null,
  };
}

/** `avatar` de `ChatMessage` no se lee en ningún lado del JSX de la burbuja (el diseño solo pinta
 * `sender`/`senderRole` para mensajes ajenos) — se deja en un valor neutro, no roto.
 *
 * `status` SÍ se lee desde el 2026-09-27 (D-208): es la marca de un mensaje propio, `'read'` (✓✓)
 * solo si el servidor dice `READ`; lo demás, incluso nada, es `'sent'` (✓). Ver `utils/lecturaDelChat.ts`.
 * > **Corregido 2026-09-27.** Decía que `status` no se leía y que el doble-check dependía solo de
 * > `isMe`, y el mapeo ponía `'read'` a todos: no había de dónde saber la lectura.
 *
 * Un emisor `null` (2026-09-27, ver `chatSchemas.emisorTolerante`) no rompe nada: el mensaje no es
 * de nadie de la sesión y sale como «Miembro Renaser» si tampoco trae nombre. */
export function mapearMensaje(wire: WireMensaje, actorId: string | null | undefined): ChatMessage {
  if (esMensajeDelPrograma(wire)) {
    return mapearMensajeDelPrograma(wire);
  }
  const esMio = !!actorId && !!wire.senderId && wire.senderId === actorId;
  return {
    id: wire.id,
    sender: wire.senderName?.trim() || (esMio ? 'Tú' : 'Miembro Renaser'),
    avatar: '',
    isMe: esMio,
    // «21:04», en 24 h como WhatsApp (antes «9:04 PM» o «Ayer», que dentro de la burbuja no
    // servía: el día ya lo dice el separador).
    time: horaCorta(wire.createdAt),
    type: mapearTipoMensaje(wire.type),
    /* Una foto que se puede mostrar lleva solo SU texto al pie: el rótulo «Imagen adjunta» de
       `textoPorTipo` quedaba escrito debajo de cada foto (2026-09-26). Sin URL se conserva,
       porque ahí no hay foto y el rótulo es lo único que se ve. */
    text: wire.type === 'IMAGE' && wire.mediaUrl ? wire.text?.trim() || undefined : textoPorTipo(wire),
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
    status: estadoDeEntrega(wire.status),
    createdAt: wire.createdAt,
    senderId: wire.senderId ?? undefined,
    senderAvatarUrl: wire.senderAvatarUrl ?? null,
  };
}

/**
 * Lo que dice la fila de la lista sobre el último mensaje (chat estilo WhatsApp, 2026-09-26):
 * vista previa («Tú: …», «📷 Foto», «🎤 Audio»), hora corta y la fecha con la que se ordena.
 *
 * Sale del mensaje del CABLE y no del ya mapeado: el mapeado le pone «Imagen adjunta» a una foto
 * sin texto, y la vista previa diría «📷 Imagen adjunta».
 *
 * Un mensaje del programa (2026-09-27) nunca dice «Tú: », y su imagen se lee «📷 Foto» aunque el
 * tipo sea `SYSTEM`.
 */
export function resumenDelUltimoMensaje(
  ultimo: WireMensaje | null,
  actorId: string | null | undefined,
  ahora: Date = new Date()
): Pick<ChatConversation, 'lastMessage' | 'lastTime' | 'lastMessageAt'> {
  if (!ultimo) {
    return { lastMessage: vistaPreviaDelMensaje(null), lastTime: '', lastMessageAt: null };
  }
  const delPrograma = esMensajeDelPrograma(ultimo);
  const tipo: ChatMessageType = delPrograma
    ? traeImagen(ultimo) ? 'image_grid' : 'text'
    : mapearTipoMensaje(ultimo.type);
  const conAdjunto = tipo === 'image_grid' || tipo === 'video' || tipo === 'audio';
  return {
    lastMessage: vistaPreviaDelMensaje({
      tipo,
      texto: conAdjunto ? ultimo.text : textoPorTipo(ultimo),
      esMio: !delPrograma && !!actorId && !!ultimo.senderId && ultimo.senderId === actorId,
    }),
    lastTime: horaDeLaLista(ultimo.createdAt, ahora),
    lastMessageAt: ultimo.createdAt,
  };
}

/**
 * «El otro» de un 1 a 1, con su rol SOLO si se conoce (`null` si no). Es `WireMiembro` con el rol
 * opcional: ese tipo lo exige, y exigirlo es lo que llevó a rellenarlo con un supuesto.
 */
type OtroParticipante = Omit<WireMiembro, 'role'> & { role: string | null };

/** El rol del directorio, si lo hay. Un rol vacío tampoco dice quién es. */
function rolConocido(miembro: WireMiembro | undefined): string | null {
  return miembro?.role?.trim() ? miembro.role : null;
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
): OtroParticipante | undefined {
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
      /* El rol no viaja en el resumen. Se toma del directorio SI está; si no, queda sin rol y el
         subtítulo cae en el genérico («1 a 1»). Un nombre correcto con subtítulo genérico es mejor
         que ningún nombre.
         > Corregido 2026-09-27: acá decía `?? 'TRAINEE'`. El comentario ya prometía el genérico,
         > pero el código ponía «Aprendiz» a cualquiera que el directorio no trajera —un mentor, el
         > staff—, y la info del contacto lo repetía bajo el nombre. */
      role: rolConocido(directorio[declarado]),
    };
  }
  if (declarado && directorio[declarado]) {
    return { ...directorio[declarado], role: rolConocido(directorio[declarado]) };
  }
  /* Sin el campo —backend viejo— se conserva la heurística de antes. Es peor, pero es lo que
     había, y quitarla dejaría SIN nombre también los casos que hoy sí lo resuelven. Un último
     mensaje sin emisor o del programa (2026-09-27) no dice quién es el otro. */
  const ultimo = resumen.lastMessage;
  if (!ultimo || !actorId || !ultimo.senderId || ultimo.senderId === actorId || esMensajeDelPrograma(ultimo)) {
    return undefined;
  }
  const delDirectorio = directorio[ultimo.senderId];
  return delDirectorio ? { ...delDirectorio, role: rolConocido(delDirectorio) } : undefined;
}

function construirTitulo(tipo: TipoChat, nombre: string | null, otro?: OtroParticipante): string {
  if (tipo === 'global') {
    return nombre?.trim() || 'Comunidad Global';
  }
  if (tipo === 'celula') {
    // La célula real (`community.Celula`) no se resuelve acá: `chat` solo expone `celulaId`
    // (UUID), sin nombre — `community` no está en el alcance de esta integración.
    return 'Mi Grupo';
  }
  if (tipo === 'soporte') {
    // Mismo camino que GLOBAL: el nombre lo manda el servidor en `ConversacionResponse.nombre` y
    // acá solo se le pone un respaldo. No se arma con el nombre de nadie a propósito — del otro
    // lado no hay una persona sino el staff entero (ADMIN / ALQUIMISTA), y cuál de ellos conteste
    // no debería cambiar el título de la conversación en la bandeja.
    return nombre?.trim() || 'Soporte Renaser';
  }
  if (tipo === 'desconocido') {
    // Un tipo que este binario no conoce. El servidor igual manda `nombre` para todo lo que no sea
    // un 1 a 1, así que en la práctica la fila se lee bien; el respaldo es para el caso peor.
    return nombre?.trim() || 'Conversación';
  }
  return otro?.fullName?.trim() || 'Conversación directa';
}

/** El subtítulo genérico de un 1 a 1 cuando se sabe con quién es pero no qué rol tiene. */
export const SUBTITULO_DE_UN_1_A_1_SIN_ROL = '1 a 1';

function construirSubtitulo(tipo: TipoChat, otro?: OtroParticipante): string {
  if (tipo === 'global') return 'Comunidad completa RENASER';
  if (tipo === 'celula') return 'Chat de tu grupo';
  if (tipo === 'soporte') return 'Soporte · Equipo Renaser';
  if (tipo === 'desconocido') return 'Conversación';
  if (!otro) return 'Conversación directa';
  // Sin rol conocido no se adivina uno: «1 a 1» a secas (2026-09-27).
  return otro.role ? `${traducirRol(otro.role)} · 1 a 1` : SUBTITULO_DE_UN_1_A_1_SIN_ROL;
}

export function mapearResumenConversacion(
  resumen: WireConversacionResumen,
  actorId: string | null | undefined,
  directorio: Record<string, WireMiembro>
): ChatConversation {
  /* Dos tipos, y no es redundancia: `tipoChat` es lo que la conversación ES (cinco valores
     posibles) y decide nombre, subtítulo e ícono; `tipoDePantalla` es en qué cajón de los tres que
     conoce `ComunidadScreen` entra. Un chat de soporte es `'soporte'` para lo primero y `'direct'`
     para lo segundo. */
  const tipoChat = reconocerTipoChat(resumen.conversation.type);
  const tipoDePantalla = mapearTipoConversacion(resumen.conversation.type);
  /* Solo un 1 a 1 de verdad tiene "el otro". En soporte del otro lado está el staff entero, así
     que buscar un único participante daría el nombre de quien haya escrito último — y el título de
     la conversación cambiaría según quién conteste. */
  const otro = tipoChat === 'direct' ? resolverOtroParticipante(resumen, actorId, directorio) : undefined;

  return {
    id: resumen.conversation.id,
    type: tipoDePantalla,
    /* Se conserva tal cual viene, sin resolverlo a un nombre: `chat` no conoce `community`. Quien
       necesite el nombre del grupo lo cruza contra `/me/cells` (D-142). */
    celulaId: resumen.conversation.celulaId,
    title: construirTitulo(tipoChat, resumen.conversation.nombre, otro),
    subtitle: construirSubtitulo(tipoChat, otro),
    avatar: AVATAR_POR_TIPO[tipoChat],
    ...resumenDelUltimoMensaje(resumen.lastMessage, actorId),
    createdAt: resumen.conversation.createdAt,
    // La foto del otro en un 1 a 1. Grupos y comunidad no traen imagen: usan el avatar del programa.
    avatarUrl: otro?.avatarUrl ?? null,
    // D-205: el soporte trae la ruta de SU foto (la tarjeta con el primer nombre del aprendiz). Se
    // pide con la sesión (`utils/fotoConSesion.ts`, antes `fotoDelSoporte.ts`); sin ella, la tarjeta
    // sin nombre de siempre.
    fotoPath: resumen.conversation.photoPath?.trim() || null,
    // El rol del otro en palabras, el mismo dato del subtítulo, para la info del contacto. `null`
    // si no se conoce: la info muestra entonces el genérico, nunca un rol supuesto.
    rolDelOtro: otro?.role ? traducirRol(otro.role) : null,
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
 *
 * Desde que soporte y los tipos desconocidos también llegan acá como `'direct'` (ver
 * `mapearTipoConversacion`), el guardia que los deja afuera es el segundo: solo se renombra la
 * conversación que quedó con el título genérico EXACTO `'Conversación directa'`, y esos dos casos
 * salen de `construirTitulo` con el suyo ('Soporte Renaser' / el `nombre` del servidor). Si algún
 * día se afloja esa comparación, un chat de soporte pasaría a llamarse como el último del staff que
 * contestó.
 *
 * Un mensaje del programa (2026-09-27) no es «el otro»: la conversación no se llama «Formación
 * Renaser» por tener uno.
 */
export function refinarTituloConMensajes(conversacion: ChatConversation, mensajes: ChatMessage[]): ChatConversation {
  if (conversacion.type !== 'direct' || conversacion.title !== 'Conversación directa') {
    return conversacion;
  }
  const deOtro = mensajes.find(m => !m.isMe && !m.esDelPrograma && m.sender && m.sender !== 'Miembro Renaser');
  if (!deOtro) {
    return conversacion;
  }
  return { ...conversacion, title: deOtro.sender };
}

/**
 * La conversación con su historial recién traído (`GET .../messages`, del más nuevo al más viejo):
 * los mensajes en el orden en que se pintan (del más viejo al más nuevo), el título refinado y,
 * desde el 2026-09-27, **el resumen del último mensaje al día**.
 *
 * Eso último es lo que ordena la lista de chats. Antes el resumen solo se actualizaba al MANDAR:
 * un mensaje que llegaba en vivo con la conversación abierta recargaba el historial, pero la fila
 * seguía con la vista previa, la hora y la fecha de antes, y la conversación no subía en la lista
 * aunque su último mensaje fuera el más nuevo de todos. Con la página vacía se deja lo que había.
 */
export function conversacionConHistorial(
  conversacion: ChatConversation,
  delMasNuevoAlMasViejo: readonly WireMensaje[],
  actorId: string | null | undefined,
  ahora: Date = new Date()
): ChatConversation {
  const mensajes = delMasNuevoAlMasViejo.map(m => mapearMensaje(m, actorId)).reverse();
  const conMensajes = refinarTituloConMensajes({ ...conversacion, messages: mensajes }, mensajes);
  const masNuevo = delMasNuevoAlMasViejo[0];
  return masNuevo ? { ...conMensajes, ...resumenDelUltimoMensaje(masNuevo, actorId, ahora) } : conMensajes;
}
