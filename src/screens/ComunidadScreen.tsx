import React, { useState, useMemo, useEffect, useCallback, useRef, useReducer } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Image,
  Share,
  KeyboardAvoidingView,
  FlatList,
  RefreshControl,
} from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { Alert } from '../components/Alerta';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { space } from '../theme/tokens';
import { ChatDelCurso } from '../features/renasia/components/ChatDelCurso';
import { useProgramaDia } from '../features/programa/hooks/useProgramaDia';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { useMedicionDePantalla } from '../hooks/useMedicionDePantalla';
import { useCelulaQueAcompano } from '../features/mentor/hooks/useCelulaQueAcompano';
import { useEsMentor } from '../features/mentor/hooks/useEsMentor';
import { AlumnoScreen } from '../features/mentor/screens/AlumnoScreen';
import { MiCelulaScreen } from '../features/mentor/screens/MiCelulaScreen';
import { alumnoDesdeLaInfo } from '../features/mentor/utils/alumnoDesdeLaInfo';
import { loQueTapaComunidad, SIN_VISTAS_DEL_MENTOR, vistasDelMentor } from '../features/mentor/utils/vistasDelMentor';
import { entradaAlGrupoVisible } from '../features/mentor/utils/entradaAlGrupo';
import { MicroLabel, ScreenHeader, AvatarPersona } from '../components/ui';
import { Icon, IconName } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';
import { useAuth } from '../features/auth/context/AuthContext';
import { useWallFeed } from '../features/community/hooks/useWallFeed';
import { useWallReactions } from '../features/community/hooks/useWallReactions';
import { useGruposDelAprendiz, useIntegrantesDelGrupo } from '../features/community/hooks/useGruposDelAprendiz';
import { useMiCelula } from '../features/community/hooks/useMiCelula';
import { TextoConEnlaces } from '../features/academy/components/TextoConEnlaces';
import { nombreVisibleDeGrupo } from '../features/community/utils/nombreDeGrupo';
import { decidirTarjetaDeTribu } from '../features/community/utils/tarjetaDeTribu';
import {
  botonDeInfoDelGrupo,
  conversacionDelGrupo,
  grupoDeLaCabecera,
} from '../features/community/utils/infoDesdeLaCabecera';
import { useCategoriasMuro } from '../features/community/hooks/useCategoriasMuro';
import {
  acumularRecursos,
  NINGUN_RECURSO,
  recursosQueNecesita,
  type RecursosPedidos,
} from '../features/community/utils/cargaPorSeccion';
import { PodioRanking, EntradaEscalonada } from '../features/community/components/PodioRanking';
import { FilaIntegrante, type IntegranteDeGrupo } from '../features/community/components/FilaIntegrante';
import * as wallApi from '../features/community/api/wallApi';
import { elegirYNormalizarFotoMuro, type FotoMuroNormalizada } from '../features/community/utils/normalizarImagen';
import {
  TarjetaPublicacionMuro,
  type AccionesPublicacion,
} from '../features/community/components/TarjetaPublicacionMuro';
import { avisarPostPublicado } from '../features/sparkie/events/avisoPrimerPost';
import { cerrarHabitoPostDiarioComunidad } from '../features/habits/api/postDiarioComunidad';
import { avisarPostDiarioCerrado } from '../features/habits/events/avisoPostDiarioCerrado';
import { ImageViewerModal, type ImageViewerItem } from '../features/community/components/ImageViewerModal';
import { SharePostSheet } from '../features/community/components/SharePostSheet';
import { useCursos } from '../features/academy/hooks/useCursos';
import { CursoPortada } from '../features/academy/components/CursoPortada';
import { useLeccionDetalle } from '../features/academy/hooks/useLeccionDetalle';
import { LeccionVideoPlayer } from '../features/academy/components/LeccionVideoPlayer';
import { leccionAnteriorPendiente } from '../features/academy/utils/progresionDeLecciones';
import { useChatConversaciones } from '../features/chat/hooks/useChatConversaciones';
import { useChatEnVivo } from '../features/chat/hooks/useChatEnVivo';
import { useEnvioMediaChat } from '../features/chat/hooks/useEnvioMediaChat';
import { BurbujaDeMensaje } from '../features/chat/components/BurbujaDeMensaje';
import { CabeceraDeChat } from '../features/chat/components/CabeceraDeChat';
import { coloresDelChat } from '../features/chat/components/coloresDelChat';
import { FilaDeConversacion } from '../features/chat/components/FilaDeConversacion';
import { SeparadorDeDia } from '../features/chat/components/SeparadorDeDia';
import { BotonBajarAlFinal } from '../features/chat/components/BotonBajarAlFinal';
import { InfoDelChat } from '../features/chat/components/InfoDelChat';
import { useBajadaDelChat } from '../features/chat/hooks/useBajadaDelChat';
import {
  elementosDeLaListaInvertida,
  integrantesDelChatDeGrupo,
  ordenarPorActividad,
  conElGlobalPrimero,
  subtituloDeLaCabecera,
  type ElementoDelChat,
} from '../features/chat/utils/formatoChat';
import { mostrarBotonBajar, posicionAMantener } from '../features/chat/utils/bajadaDelChat';
import { conLaFotoDeLaLista, pideReleerAlCerrarElChat } from '../features/chat/utils/refrescoDeLaLista';
import { avisoDelLargoDelMensaje, LARGO_MAXIMO_DEL_MENSAJE } from '../features/chat/utils/largoDelMensaje';
import { conLeidoHasta } from '../features/chat/utils/lecturaDelChat';
import {
  cifraDelChat,
  esAdministracionDeGrupos,
  integrantesDelChat,
  puedeCambiarLaFotoDelGrupo,
  subtituloDeLaInfo,
  tituloDeLaInfo,
  type IntegranteDeLaInfo,
} from '../features/chat/utils/infoDelChat';
import { irAPestana } from '../navigation/navegacionRef';
import { useParticipantesDelChat } from '../features/chat/hooks/useParticipantesDelChat';
import { conversacionAPantallaCompleta } from '../features/chat/utils/pantallaCompletaDelChat';
import { OPCIONES_CON_PESTANAS, OPCIONES_SIN_PESTANAS } from '../navigation/pestanasOcultas';
import { mapearMensaje, resumenDelUltimoMensaje } from '../features/chat/api/chatMappers';
import { abrirConversacionDirecta } from '../features/chat/api/chatApi';
import type { WireMensaje } from '../features/chat/types/chat.types';
import { marcarChatMontado } from '../features/renasia/state/chatEnPantalla';
import { useRanking } from '../features/ranking/hooks/useRanking';
import {
  entradasDeLaTabla,
  invitacionSinPosiciones,
  TABLAS_DE_RANKING,
  textoDeMiPuntaje,
  textoDelPuntaje,
  type ClaveDeTabla,
} from '../features/ranking/utils/tablasDeRanking';
import { ApiError, mensajeDeError } from '../services/http/apiClient';
import { ESPACIO_PARA_LANZADOR } from '../features/renasia/components/RenasiaLauncher';
import { SeccionEventos } from '../features/eventos/components/SeccionEventos';

// =========================================================================
// TIPOS: RECURSOS EXCLUSIVOS & CURSOS
// =========================================================================
export type ResourceType = 'video' | 'doc' | 'link' | 'text';

export interface LessonResource {
  id: string;
  type: ResourceType;
  title: string;
  meta: string;
  desc: string;
  content?: string;
  completed: boolean;
  // --- Campos reales del backend (`LeccionLiteResponse`/`LeccionResponse`, ver
  // `features/academy/types/academy.types.ts`), agregados para poder abrir el reproductor y
  // resolver el bloqueo por día sin tocar las 7 propiedades de arriba que ya consumía el diseño.
  // Opcionales: nada rompe si en algún momento vuelve a construirse un `LessonResource` sin ellos.
  videoTipo?: 'youtube' | 'storage' | null;
  videoUrl?: string | null;
  videoMiniaturaUrl?: string | null;
  videoDuracionMs?: number | null;
  /** `bloqueada_por_dia` — todavía no llega el día de programa que la desbloquea. */
  locked?: boolean;
  diaDesbloqueo?: number | null;
  diasFaltantes?: number;
}

export interface CourseSection {
  id: string;
  title: string;
  lessons: LessonResource[];
}

export interface CourseItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  progressPercent: number;
  /**
   * Cantidad de LECCIONES del curso (`totalResources` por herencia del nombre del diseño
   * original). Es lo unico que la tarjeta muestra desde 2026-09-07: antes decia
   * "N Modulos - M Recursos" y el dueño del proyecto pidio hablarle a la persona de lecciones,
   * que es la unidad con la que de verdad avanza. `totalModules` (cantidad de secciones) se
   * elimino junto con ese texto: nadie mas lo leia.
   */
  totalResources: number;
  sections: CourseSection[];
  // --- Campos agregados para portada real + catálogo con bloqueados (ver `academyMappers.ts`) ---
  /** `MiCursoResponse.portadaFirmada` — URL prefirmada de S3. `null`/`undefined` en cursos bloqueados (no viene firmada) o sin portada cargada; `CursoPortada` cae al degradado de siempre en ese caso. */
  coverUrl?: string | null;
  /** `CursoResponse.orden` — con qué se intercalan accesibles y bloqueados en una sola progresión (ver `useCursos`). */
  orden: number;
  /** `true` para los cursos de `GET /cursos/bloqueados`: todavía no se pueden abrir. */
  locked?: boolean;
  diaDesbloqueo?: number | null;
  diasFaltantes?: number;
}

// =========================================================================
// TIPOS: EVENTOS & EXPERIENCIAS (MURO, TESTIMONIOS, RANKING)
// =========================================================================
export interface CommentItem {
  id: string;
  author: string;
  avatar: string;
  role?: string;
  text: string;
  photoAttached?: string;
  likes: number;
  /** Única reacción posible desde que se retiró el dislike del producto. */
  userReaction?: 'like' | null;
  timeAgo: string;
}

export interface PostItem {
  id: string;
  author: string;
  avatar: string;
  cell: string;
  /**
   * Día de programa del autor CUANDO publicó. `null` = no corresponde mostrarlo.
   *
   * Antes se llamaba `dayStreak` (racha) y valía `0` siempre, escrito a mano en los dos mapeadores:
   * ni era una racha ni era un dato: el Muro entero decía "Día 0". Ahora viene de
   * `WallPostResponse.programDay`, que lo guarda al publicar (V51).
   */
  diaPrograma: number | null;
  timeAgo: string;
  tag?: string;
  text: string;
  // `url`/`mimeType`: la URL firmada real de S3 (`WallMedia`, backend) y su tipo MIME. Las agrega
  // `wallMappers.ts` al traducir la respuesta del feed — es lo que permite pintar la foto real en
  // vez del `title` como texto plano (ver `FotoMuro`, `features/community/components/`).
  media: { type: 'image' | 'video'; title: string; subtitle?: string; url: string; mimeType: string }[];
  likes: number;
  /**
   * Única reacción posible desde que se retiró el dislike del producto. Si esta persona había
   * dejado un `DISLIKE` antes del cambio, acá llega `null`: la reacción sigue guardada en el
   * backend pero ya no tiene forma de mostrarse ni de deshacerse desde la app (ver `wallMappers`).
   */
  userReaction?: 'like' | null;
  comments: CommentItem[];
  /**
   * `true` mientras la publicación existe solo en el teléfono y todavía está viajando a S3 y al
   * backend (UI optimista, ver `useWallFeed.publicarOptimista`). La tarjeta se dibuja igual que
   * cualquier otra —mismo JSX, mismos estilos— solo que atenuada, para que se note que falta
   * confirmar sin cambiar el diseño. Al confirmarse se reemplaza por la publicación real y el
   * campo desaparece; si falla, la tarjeta se quita.
   */
  pendiente?: boolean;
}

export interface ReactionUser {
  id: string;
  name: string;
  role: string;
  avatar: string;
  /**
   * Siempre `'like'`: el modal "quién reaccionó" solo lista los "me gusta" desde que se retiró el
   * dislike. Las filas `DISLIKE` que el backend todavía devuelva se descartan en
   * `useWallReactions`, para no mostrar a alguien con un pulgar arriba que nunca dio.
   */
  type: 'like';
}

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  badge: string;
  avatar: string;
  daysCompleted: number;
  quote: string;
  metrics: { label: string; value: string; isHighlight?: boolean }[];
  videoDuration: string;
}

export interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  cell: string;
  streakDays: number;
  evidencePercent: number;
  medal?: 'gold' | 'silver' | 'bronze';
  isCurrentUser?: boolean;
}

// =========================================================================
// TIPOS: ATENCIÓN PERSONALIZADA & CHATS (TIPO WHATSAPP)
// =========================================================================
/**
 * Los mismos cinco tipos que `tipo_mensaje` en la base, menos SISTEMA (que se pinta como texto, o
 * como foto si trae imagen; desde el 2026-09-27 el de sistema con contenido lleva además
 * `esDelPrograma`, ver `ChatMessage`).
 * `gif` se retiró: no existía del lado del backend — era una burbuja local con un emoji grande
 * que solo veía quien la mandaba y desaparecía al recargar. El chat ahora manda fotos y notas de
 * voz reales, que es lo que se esperaba de esos botones.
 */
export type ChatMessageType = 'text' | 'audio' | 'image_grid' | 'video';

/** "0:07", "1:24" — el cronómetro de la grabación en curso, sin depender de una librería. */
function formatearSegundos(segundos: number): string {
  const enteros = Math.max(0, Math.floor(segundos));
  return `${Math.floor(enteros / 60)}:${(enteros % 60).toString().padStart(2, '0')}`;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderRole?: string;
  avatar: string;
  isMe: boolean;
  time: string;
  type: ChatMessageType;
  text?: string;
  audioDuration?: string;
  mediaList?: string[];
  /** URL de lectura ya firmada del adjunto (`MensajeResponse.mediaUrl`). Es lo que se le pasa a
   * `<Image>` o al reproductor: la ruta cruda de S3 que se guarda en la base no se puede abrir. */
  mediaUrl?: string;
  status?: 'sent' | 'delivered' | 'read';
  /* Chat estilo WhatsApp (2026-09-26): la fecha real del mensaje, para los separadores de día y
     para agrupar tandas; y quién lo mandó, para el color del nombre en los grupos. Opcionales
     porque un mensaje armado a mano (el 1 a 1 local de `handleStartDirectChat`) no los tiene. */
  createdAt?: string;
  senderId?: string;
  senderAvatarUrl?: string | null;
  /* 2026-09-27: lo mandó el PROGRAMA y no una persona (mensaje de sistema con texto o imagen, como
     la bienvenida del soporte). Va a la izquierda, firmado «Formación Renaser» y con el fénix,
     aunque el servidor lo haya guardado a nombre de alguien. Ver `chatMappers.esMensajeDelPrograma`. */
  esDelPrograma?: boolean;
}

export interface ChatConversation {
  id: string;
  /* `'soporte'` se sumó el 2026-09-22: antes el mapper lo aplastaba a `'direct'` porque los
     Directos eran el único cajón donde se veía. Ahora la pestaña Tribu tiene la sección
     "Formación Renaser", que lista los tres grupos a los que la persona pertenece —general, el de
     su mentor y el de soporte—, así que soporte necesita distinguirse para caer ahí y no entre los
     1 a 1. Ver `chatMappers.mapearTipoConversacion`. */
  type: 'celula' | 'direct' | 'global' | 'soporte';
  /**
   * El grupo al que pertenece esta conversación, cuando es de grupo (D-142).
   *
   * El backend siempre lo mandó (`ConversacionResponse.celulaId`) y el mapper lo tiraba. Sin él, la
   * pantalla de info no tenía forma de saber QUÉ grupo estaba abierto y se armaba con `/me/cell`,
   * que responde siempre por el principal: abrir la info de cualquier grupo mostraba los
   * integrantes del general.
   */
  celulaId: string | null;
  title: string;
  subtitle: string;
  avatar: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  membersCount?: number;
  isOnline?: boolean;
  messages: ChatMessage[];
  /* Chat estilo WhatsApp (2026-09-26). Todo sale de `GET /chat/conversations`, que ya lo mandaba:
     la fecha del último mensaje (hora de la fila y orden de la lista), la de creación (orden de
     una conversación sin mensajes) y la foto del otro en un 1 a 1. `lastMessage` pasa a ser la
     vista previa ya armada («Tú: …», «📷 Foto»), ver `formatoChat.vistaPreviaDelMensaje`. */
  lastMessageAt?: string | null;
  createdAt?: string | null;
  avatarUrl?: string | null;
  /* 2026-09-27: en un 1 a 1, el rol del otro ya en palabras («Aprendiz», «Mentor»), el mismo dato
     con el que se arma `subtitle` («Aprendiz · 1 a 1»). La info del contacto lo muestra solo bajo
     el nombre. `null` si no se sabe quién es el otro. */
  rolDelOtro?: string | null;
  /* 2026-09-27 (D-205 del backend): en un chat de soporte, la ruta de su foto —la tarjeta de Canva
     con el primer nombre del aprendiz—, pedida con la sesión. `null` en lo demás. */
  fotoPath?: string | null;
}

export interface GroupMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  badge: string;
  streakDays: number;
  cell: string;
  focus: string;
}

// =========================================================================
// DATOS ESTÁTICOS: TESTIMONIOS Y RANKING
// =========================================================================
// El Muro (pestaña "muro") y "Recursos Exclusivos" (cursos/lecciones) ya no usan datos fijos:
// salen de `useWallFeed()`/`useCursos()`, contra el backend real. Testimonios y Ranking siguen
// con datos de mock — quedan fuera del alcance de esta integración.

// Antes había acá un REACTION_USERS_MOCK: el modal "Reacciones del post" ya usa datos reales
// (GET /api/v1/wall/{id}/reactions, ver useWallReactions) — quedaba muerto y se sacó, no
// oculto detrás de una bandera "por si acaso" (mismo criterio que el resto de esta integración:
// `wallApi.publicarEnMuro`, sección "Antes acá vivía un helper...").

// =========================================================================
// DATOS ESTÁTICOS: CHATS & INTEGRANTES DE CÉLULA (TIPO WHATSAPP)
// =========================================================================
/*
 * Acá vivía GROUP_MEMBERS: cinco personas inventadas —nombre, rol, emoji de avatar, racha de 90
 * días, grupo y "foco"— declaradas como si fueran el padrón. Se eliminó el 2026-09-22.
 *
 * Nadie las leía: la constante estaba declarada y ninguna vista la renderizaba. La nota que la
 * acompañaba explicaba bien por qué no se había cableado (el directorio real, GET /chat/members,
 * trae {id, fullName, avatarUrl, role} y no `badge`/`streakDays`/`cell`/`focus`), pero eso es un
 * argumento para NO tenerla, no para dejarla escrita: un dato falso que nadie muestra es un dato
 * falso esperando que alguien lo muestre por error.
 *
 * El tipo `GroupMember` SÍ queda: lo usan el perfil de integrante y `handleStartDirectChat`, que
 * trabajan con gente real que viene del servidor.
 */

// `INITIAL_CONVERSATIONS` (mock) se retiró: las conversaciones salen del backend real vía
// `useChatConversaciones` (GET /api/v1/chat/conversations). La lista de integrantes inventada se
// eliminó el 2026-09-22 (ver la nota
// junto a su declaración, más arriba): el backend no expone los campos que ese roster necesita.

/**
 * En qué sección de Comunidad está parada la pantalla. Todas son EXCLUYENTES entre sí: solo
 * una se pinta a la vez, y la fila de medallones de arriba es el único modo de cambiar de una a
 * otra (más los dos atajos que entran desde Training, ver los efectos de `route.params`).
 *
 * Es un único valor y no un booleano por sección a propósito (corregido 2026-09-05, E-116). Antes
 * había `inEventosExperiencias`, `inExclusiveResources` e `inAtencionPersonalizada` sueltos, y
 * cada camino de entrada prendía el suyo sin apagar los otros, así que quien tocaba primero el
 * hábito de Clase Diaria y después el de post en comunidad terminaba con el Muro y el catálogo de
 * Cursos apilados uno encima del otro en el mismo scroll. Con un solo valor ese estado no se puede
 * ni escribir.
 *
 * REDISEÑO 2026-09-07: antes eran cuatro (`inicio` | `eventos` | `recursos` | `atencion`) y
 * `inicio` era una portada desde la que había que entrar a un sub-módulo y, ya adentro, elegir una
 * pestaña — el Muro quedaba a dos toques de profundidad. Ahora están todas al mismo nivel,
 * arriba, y `muro` es la que abre. Lo que era una pestaña dentro de "Eventos & Experiencias"
 * (`muro`, `testimonios`, `ranking`) y lo que era una categoría de chat pasaron a ser secciones de
 * pleno derecho; "Recursos Exclusivos" pasó a llamarse `classroom`.
 *
 * REDISEÑO 2026-09-21 (autorizado por el dueño del producto): `celula` ("Grupo") y `miembros`
 * ("Miembros") se fusionaron en `tribu`. Eran dos pestañas para un solo trabajo —tu gente y dónde
 * le escribes— y encima se pisaban: la lista de "Directos" YA incluía los chats de grupo
 * (`filteredConversations`), así que la sección Grupo terminaba mostrando un subconjunto de lo que
 * Miembros mostraba al lado. De seis pasan a cinco.
 */
export type SeccionComunidad =
  | 'muro'
  | 'eventos'
  | 'classroom'
  | 'tribu'
  | 'ranking'
  | 'testimonios';

/**
 * Las secciones (seis desde el 2026-09-26, cuando se sumó Eventos), en el orden en que se pintan en la fila de medallones. Es la única fuente
 * de verdad de esa fila: agregar una sección es agregar una entrada acá y su bloque de contenido.
 *
 * Los tickets al mentor no están, y no es que se hayan movido: el apartado entero se retiró de la
 * app el 2026-09-07 a pedido del dueño del proyecto (ver la nota junto a `tieneGrupo`).
 */
const SECCIONES: { id: SeccionComunidad; icon: IconName; label: string }[] = [
  { id: 'muro', icon: 'chat', label: 'Muro' },
  /* 2026-09-26 (E-5, decisión del dueño): los eventos se ven sobre todo acá. Segunda, al lado del
     Muro, para que se vea sin deslizar la fila. Ver `features/eventos/components/SeccionEventos`. */
  { id: 'eventos', icon: 'calendar', label: 'Eventos' },
  { id: 'classroom', icon: 'stack', label: 'Classroom' },
  { id: 'tribu', icon: 'users', label: 'Tribu' },
  { id: 'ranking', icon: 'trophy', label: 'Ranking' },
  { id: 'testimonios', icon: 'star', label: 'Testimonios' },
];

/*
 * Acá vivía METRICAS, "el pulso de la tribu": "12 conversaciones esta semana · 3 eventos próximos ·
 * 2 mentorías programadas". Se eliminó el 2026-09-22, por decisión del dueño.
 *
 * Los tres números eran CONSTANTES escritas a mano. Ningún endpoint los calculaba: decían 12, 3 y 2
 * para todo el mundo, todos los días, desde el primer día. El 21 ya se les había bajado la voz —de
 * tres tarjetas con número de 22 px a un renglón de texto— con el argumento de que "la información
 * no se pierde, se le baja la voz". Pero no había información que bajar de voz: eran decorado.
 *
 * Mostrarle a alguien "2 mentorías programadas" cuando no tiene ninguna es peor que no mostrar
 * nada, porque va a buscarlas. La regla que queda: en esta pantalla no se pinta un número que no
 * venga del servidor.
 */

/** El aire entre dos publicaciones del Muro: el mismo `gap` que tenían dentro del `.map`. */
function SeparadorDePublicaciones() {
  return <View style={{ height: space.gap }} />;
}

/** Sin conversación abierta: la misma lista vacía siempre, para no recalcular nada en cada render. */
const SIN_MENSAJES: ChatMessage[] = [];

/** Desde cuántos integrantes la info del chat ofrece el buscador por nombre (D-222). */
const UMBRAL_DEL_BUSCADOR = 12;

export default function ComunidadScreen() {
  const { c, t, mode } = useTheme();
  // D-99: el chat dentro de un curso le dice a Sparkie en que dia del programa va la persona.
  const { diaPrograma } = useProgramaDia();
  const isDark = mode === 'dark';
  const { rs, isTablet, horizontalPadding, contentMaxWidth } = useResponsive();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const mentorPhoto = rs(50);
  const avatarSize = rs(42);
  const medallionSize = rs(40);
  // Nombre real de quien está usando la app, para las publicaciones y comentarios propios del
  // Muro — reemplaza el "Kelin Arango" fijo del mock por el dato de la sesión.
  const nombreUsuario = user?.name?.trim() || 'Tú';
  const primerNombreUsuario = nombreUsuario.split(' ')[0];

  /*
   * Qué recursos ya se pidieron (V-3, retroalimentación del 26/09/2026). Al abrir, solo el Muro y
   * `/home`; el resto se pide la primera vez que se abre su sección, el compositor o la hoja de
   * compartir, y queda pedido. Se ACUMULA más abajo, junto a `shareSheetPost`, porque depende de
   * estados que se declaran después; acá arriba solo se lee. Ver `utils/cargaPorSeccion.ts`.
   */
  const [recursosPedidos, setRecursosPedidos] = useState<RecursosPedidos>(NINGUN_RECURSO);

  // Mentor asignado + integrantes de la célula — datos reales (GET /api/v1/me/cell y
  // GET /api/v1/me/cell/members), usados en la vista principal (sección MENTOR / TRIBU PRIVADA).
  const {
    miCelula,
    miembros: companerosCelula,
    loading: celulaCargando,
    error: celulaError,
  } = useMiCelula(recursosPedidos.celula);
  /* Todos los grupos de la persona, para poder responder por el que tenga abierto y no siempre por
     el principal (D-142). `useMiCelula` sigue alimentando la sección MENTOR / TRIBU de la pantalla
     principal, que habla de UN grupo y para eso es correcto. */
  const { grupos, cargandoGrupos } = useGruposDelAprendiz(recursosPedidos.grupos);

  /*
   * La tarjeta «Tu tribu» (corregido 2026-09-26). Antes salía SOLO de `useMiCelula`, que a un
   * mentor le responde «no eres aprendiz de ningún grupo»: veía «Todavía no tienes un mentor
   * asignado» y «Todavía no tienes integrantes» debajo de su propio grupo. Ahora, si la persona no
   * es aprendiz de un grupo, la tarjeta usa sus grupos de `/me/cells` y los integrantes de ESE
   * grupo; y el bloque del mentor solo se muestra a aprendices. Ver `utils/tarjetaDeTribu.ts`.
   */
  const [grupoDeTribuElegido, setGrupoDeTribuElegido] = useState<string | null>(null);
  const tarjetaDeTribu = useMemo(
    () =>
      decidirTarjetaDeTribu({
        rol: user?.role,
        miCelula,
        grupos,
        gruposCargando: cargandoGrupos,
        grupoElegidoId: grupoDeTribuElegido,
      }),
    [user?.role, miCelula, grupos, cargandoGrupos, grupoDeTribuElegido]
  );
  const celulaDeLaTarjeta = tarjetaDeTribu.grupo.fuente === 'mis-grupos' ? tarjetaDeTribu.grupo.celula : null;
  const {
    integrantes: integrantesDeLaTarjeta,
    cargando: integrantesDeLaTarjetaCargando,
    error: integrantesDeLaTarjetaError,
  } = useIntegrantesDelGrupo(celulaDeLaTarjeta?.cellId ?? null);
  /* La gente, el estado de carga y el error de la tarjeta, vengan de donde vengan. */
  const companerosDeLaTarjeta = celulaDeLaTarjeta ? integrantesDeLaTarjeta : companerosCelula;
  /* Sin grupo resuelto todavía y sin error de `/me/cell`: sigue cargando. Con error, se dice. */
  const tarjetaEsperando = tarjetaDeTribu.grupo.fuente === 'cargando' && !celulaError;
  const tribuCargando = celulaDeLaTarjeta ? integrantesDeLaTarjetaCargando : tarjetaEsperando || celulaCargando;
  const tribuError = celulaDeLaTarjeta ? integrantesDeLaTarjetaError : celulaError;
  const mentorCargando = !celulaDeLaTarjeta && (tarjetaEsperando || celulaCargando);
  const mentorError = celulaDeLaTarjeta ? null : celulaError;
  const mentorDeLaTarjeta = celulaDeLaTarjeta
    ? { nombre: celulaDeLaTarjeta.mentorName, avatarUrl: celulaDeLaTarjeta.mentorAvatarUrl }
    : miCelula?.assigned === true
      ? { nombre: miCelula.mentorName, avatarUrl: miCelula.mentorAvatarUrl }
      : { nombre: null, avatarUrl: null };

  const tieneMentor = !!mentorDeLaTarjeta.nombre;
  const mentorTitulo = mentorCargando
    ? 'Cargando tu mentor...'
    : mentorError
      ? 'No pudimos cargar tu mentor'
      : tieneMentor
        ? mentorDeLaTarjeta.nombre!
        : 'Todavía no tienes un mentor asignado';
  const mentorSubtitulo = tieneMentor ? 'Mentor de tu grupo' : null;
  const mentorNota =
    mentorCargando || mentorError
      ? null
      : tieneMentor
        ? 'Escríbele para coordinar tu próxima sesión.'
        : 'Te avisaremos apenas se te asigne uno.';
  const TRIBU_AVATARES_VISIBLES = 4;
  const tribuVisibles = companerosDeLaTarjeta.slice(0, TRIBU_AVATARES_VISIBLES);
  const tribuRestantes = Math.max(companerosDeLaTarjeta.length - TRIBU_AVATARES_VISIBLES, 0);

  /* Estas dos viven acá arriba, y no con el resto del estado de navegación, porque el bloque de
     abajo las lee: `const` no se puede usar antes de su declaración. */
  const [activeChat, setActiveChat] = useState<ChatConversation | null>(null);
  const [groupInfoVisible, setGroupInfoVisible] = useState(false);

  /**
   * El grupo cuya info está abierta — el de la conversación, no "mi grupo" (D-142).
   *
   * BUG ENCONTRADO 2026-09-17: la pantalla "INFO DEL GRUPO" se armaba entera con `useMiCelula`,
   * que responde por el grupo que nombra `participantes_programa.celula_id`. Esa columna es UNA y
   * el alta adicional no la mueve (D-139), así que abrir la info de CUALQUIER grupo mostraba el
   * nombre, el mentor y los integrantes del principal —el "general"—. El chat de al lado sí traía
   * a la gente correcta, porque se reconcilia contra el historial de asignaciones: dos fuentes
   * distintas en la misma pantalla, y la de la derecha mentía.
   *
   * Ahora sale de `/me/cells`, cruzando por el `celulaId` que la conversación siempre trajo y el
   * mapeador tiraba. Si no se puede resolver —conversación que no es de grupo, o lista todavía
   * cargando— se cae a `miCelula`, que es lo que había y sigue siendo correcto cuando hay uno solo.
   */
  /**
   * El nombre con el que se muestra una conversación.
   *
   * Los chats de grupo llegaban todos titulados `'Mi Grupo'`: el módulo `chat` del backend solo
   * conoce el `celulaId` y no el nombre del grupo, así que el mapeador le pone ese texto fijo. Con
   * un grupo por persona no se notaba; con varios, la bandeja mostraba dos filas idénticas y no
   * había forma de saber cuál era cuál. Acá se resuelve contra `/me/cells`, que sí trae el nombre.
   *
   * Si no se puede resolver se deja el título que vino: es genérico, pero nunca es el de otro grupo.
   */
  const nombreVisibleDeConversacion = useCallback(
    (conversacion: ChatConversation) => nombreVisibleDeGrupo(conversacion, grupos),
    [grupos]
  );

  const celulaIdAbierto = activeChat?.celulaId ?? null;
  const grupoAbierto = useMemo(
    () => grupos.find(g => g.cellId === celulaIdAbierto) ?? null,
    [grupos, celulaIdAbierto]
  );
  /* D-222 (pedido del dueño: «debe de salir para todos»). Los integrantes de la info son los de ESA
     conversación y salen de `GET /chat/conversations/{id}/participants`, con la misma regla de quién ve el
     chat: sirve al aprendiz, al mentor, al Admin y al Alquimista, y a la comunidad y al soporte, no solo a los
     grupos. Se piden recién al abrir la info, no al abrir el chat, y un 1 a 1 no la lleva (ya muestra a la otra
     persona arriba). */
  const [busquedaDeIntegrantes, setBusquedaDeIntegrantes] = useState('');
  const conversacionDeLaInfo = groupInfoVisible && activeChat && activeChat.type !== 'direct' ? activeChat.id : null;
  useEffect(() => {
    setBusquedaDeIntegrantes('');
  }, [conversacionDeLaInfo]);
  const participantesDeLaInfo = useParticipantesDelChat(conversacionDeLaInfo, busquedaDeIntegrantes);

  /**
   * Las filas de la lista de integrantes. El mentor va primero —sin botón de chatear, porque el
   * grupo no trae su id de usuario, y sin id no hay DM—; después los compañeros, que sí lo traen.
   *
   * Sirve a los DOS lugares donde se lista gente, y sin ramas nuevas: dentro de una sala de chat
   * `grupoAbierto` apunta al grupo de esa conversación (ficha "INFO DEL GRUPO"), y en la pestaña
   * Tribu —donde nunca hay chat abierto, así que `grupoAbierto` es `null`— cae sola al grupo
   * principal de `useMiCelula`, que es exactamente el que describe la tarjeta de la tribu.
   *
   * > **Corregido 2026-09-27.** La info del chat ya no usa estas filas: se rediseñó al estilo de
   * > WhatsApp y arma las suyas con `filasDeLaInfo` (mismas fuentes, con «Mentor» / «Aprendiz» /
   * > «Tú»). Estas quedan para el desplegable de integrantes de la tarjeta de Tribu.
   */
  const integrantesDelGrupo = useMemo(() => {
    const filas: IntegranteDeGrupo[] = [];
    /* Sin chat abierto cae al grupo de la tarjeta de Tribu (corregido 2026-09-26: antes caía
       siempre a `useMiCelula`, vacío para un mentor). */
    /* Con un chat de grupo abierto manda SU `celulaId`: los integrantes se piden por ese id aunque
       `/me/cells` todavía no lo haya resuelto, en vez de caer a los de otro grupo. */
    const mentorNombre = celulaIdAbierto ? grupoAbierto?.mentorName ?? null : mentorDeLaTarjeta.nombre;
    const mentorAvatar = celulaIdAbierto ? grupoAbierto?.mentorAvatarUrl ?? null : mentorDeLaTarjeta.avatarUrl;
    if (mentorNombre) {
      filas.push({ id: 'mentor', nombre: mentorNombre, avatarUrl: mentorAvatar, badge: 'MENTOR', chateable: false });
    }
    for (const m of celulaIdAbierto ? [] : companerosDeLaTarjeta) {
      filas.push({ id: m.traineeId, nombre: m.fullName, avatarUrl: m.avatarUrl, badge: m.isSelf ? 'TÚ' : null, chateable: !m.isSelf });
    }
    return filas;
  }, [celulaIdAbierto, grupoAbierto, mentorDeLaTarjeta.nombre, mentorDeLaTarjeta.avatarUrl, companerosDeLaTarjeta]);
  /* Corregido 2026-09-26: sin `grupoAbierto` caía a `miCelula`, que puede ser OTRO grupo (y para
     un mentor, ninguno). Ahora cae al nombre visible de la conversación abierta. */
  /* Corregido 2026-09-29 (D-221): con un chat abierto manda su nombre visible (el del servidor,
     «Luisa y sus aprendices»), el mismo de la lista y la cabecera; el de la célula solo si no hay chat. */
  const nombreDelGrupo = activeChat
    ? nombreVisibleDeConversacion(activeChat)
    : grupoAbierto
      ? grupoAbierto.cellName
      : 'Tu grupo';
  /* La info del grupo abierto, al estilo WhatsApp (2026-09-27): el mentor primero, después «Tú» y
     el resto por nombre, cada uno con su marca. La cifra es la MISMA que dice la cabecera del chat
     (aprendices + mentor, `integrantesDelChatDeGrupo`). Ver `chat/utils/infoDelChat.ts`.
     D-206: cada uno con la ruta de su tarjeta con nombre, y el mentor con su id, que contra el de la
     sesión le dice «Tú» al mentor que mira su propio grupo. */
  const filasDeLaInfo = useMemo(
    () => integrantesDelChat({ participantes: participantesDeLaInfo.filas, tipo: activeChat?.type ?? 'global', miRol: user?.role }),
    [participantesDeLaInfo.filas, activeChat?.type, user?.role]
  );
  const cifraDeLaInfo = cifraDelChat(participantesDeLaInfo.totalSinBuscar ?? participantesDeLaInfo.total, grupoAbierto);

  /**
   * La firma que acompaña al nombre en el compositor del Muro.
   *
   * BUG ENCONTRADO 2026-09-17: decía `"Grupo 07 · Día 37"` **escrito a mano** en el JSX. Le
   * mostraba ese texto a todo el mundo: a quien todavía no tiene grupo asignado (la mayoría, ver
   * el WARN de "no hay grupo de recepción vigente") y a quien todavía no arrancó el programa
   * (`diaPrograma === 0`, que es el estado normal entre elegir el Día 1 y que llegue esa fecha).
   * O sea que la primera publicación de alguien salía firmada con un grupo y un día que no eran
   * los suyos.
   *
   * Las dos mitades son independientes y cada una puede faltar: se arma con las que haya y, si no
   * hay ninguna, la línea no se pinta. Nunca se inventa un grupo ni un día.
   */
  const firmaDePublicacion = [
    miCelula?.assigned === true ? miCelula.cellName : null,
    diaPrograma > 0 ? `Día ${diaPrograma}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  /* Acá vivía `subtituloDelGrupo` («N integrantes · Cohorte X») de la info vieja, que contaba solo
     a los aprendices. Se retiró el 2026-09-27: la info nueva dice «Grupo · N integrantes» con la
     cifra de la cabecera (`cifraDeLaInfo`) y la cohorte en su propia línea. */

  /* Nombre y resumen de MI grupo, para la tarjeta de la pestaña Tribu. Se derivan solo de
     `miCelula` y no de `nombreDelGrupo`, que mira primero al grupo de la conversación abierta:
     la tarjeta habla siempre del grupo principal, tenga o no un chat abierto detrás. */
  const grupoDeMiTribu = celulaDeLaTarjeta ?? (miCelula?.assigned === true ? miCelula : null);
  const nombreDeMiTribu = grupoDeMiTribu ? grupoDeMiTribu.cellName : null;
  const resumenDeMiTribu = grupoDeMiTribu
    ? `${grupoDeMiTribu.memberCount} ${grupoDeMiTribu.memberCount === 1 ? 'integrante' : 'integrantes'} · Cohorte ${grupoDeMiTribu.cohortName}`
    : null;

  // =========================================================================
  // ESTADOS DE NAVEGACIÓN
  // =========================================================================
  // Única fuente de verdad de "en qué sección estoy" (ver `SeccionComunidad`). Nunca se escribe a
  // mano: se pasa siempre por `irASeccion`, que además limpia el sub-estado de la sección que se
  // deja.
  const [seccionActiva, setSeccionActiva] = useState<SeccionComunidad>('muro');
  /* Eventos (E-5): el evento que pidió un aviso (`/eventos/{id}`) y el «atrás» de su sección, que
     vuelve del detalle o del formulario a la lista antes de dejar la sección. */
  const [eventoPedido, setEventoPedido] = useState<string | null>(null);
  const eventosVolverRef = useRef<(() => boolean) | null>(null);
  const eventoPedidoAtendido = useCallback(() => setEventoPedido(null), []);

  /*
   * El grupo que acompaña un mentor se llega desde Hoy y también desde acá: son los dos lugares
   * donde alguien lo busca (RF-26). Es la MISMA pantalla, no una copia — si fueran dos, la
   * próxima corrección tocaría una sola y nadie se enteraría de la otra.
   *
   * El hook se activa solo para mentores: para el resto no hace ni una llamada.
   */
  const esMentor = useEsMentor();
  // Solo para mentores, y recién cuando abren Tribu, que es donde está la entrada a su grupo.
  const celulaQueAcompano = useCelulaQueAcompano(esMentor && recursosPedidos.grupoQueAcompano);
  /* Las vistas del mentor que TAPAN Comunidad: «Mi grupo», su ficha y la ficha abierta desde la info
     del chat de SU grupo (D-207, con el id de ese grupo: el mentor puede acompañar varios y «Mi grupo»
     muestra uno). Van juntas en un reductor para despejarlas todas al pedir un chat (E-341). */
  const [vistas, despacharVista] = useReducer(vistasDelMentor, SIN_VISTAS_DEL_MENTOR);
  // Derivados, no estados: agrupan las secciones que comparten un mismo contenedor de scroll o un
  // mismo sub-estado. Nunca se pueden prender dos a la vez, porque salen todos de `seccionActiva`.
  const inExclusiveResources = seccionActiva === 'classroom';
  /* Acá vivía `enMuroTestimoniosORanking`: las tres secciones compartían un mismo `ScrollView`.
     Desde el 26/09/2026 (V-4) el Muro es una `FlatList` propia y Testimonios y Ranking siguen
     juntos en su `ScrollView`; cada bloque pregunta por `seccionActiva` directamente. */
  /**
   * La pestaña Tribu: la tarjeta de tu gente, el listado de conversaciones, la sala de chat y la
   * ficha del grupo. Hasta el 2026-09-21 eran dos secciones (`celula` y `miembros`) que ya
   * compartían las tres últimas cosas; ahora es una sola y esta constante queda como el nombre
   * legible de "estoy en Tribu" para las cuatro vistas que la componen.
   */
  const enTribu = seccionActiva === 'tribu';
  // Se guarda el ID, no el objeto: `courses` (de `useCursos`) es la única fuente de verdad, así
  // que `selectedCourse` sale siempre DERIVADO más abajo. Si se guardara el objeto entero (como
  // hacía el mock) quedaría una copia vieja congelada en el momento del toque, y una acción
  // posterior (p.ej. completar una lección) no se reflejaría al volver a esa vista.
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [fullScreenLesson, setFullScreenLesson] = useState<LessonResource | null>(null);

  // Sub-módulo: Atención Personalizada & Chats tipo WhatsApp — `conversations` sale del backend
  // real (GET /api/v1/chat/conversations) a través de `useChatConversaciones`; el historial de
  // cada una se pide recién al abrirla (ver `handleAbrirChat`), nunca en el listado.
  /* Acá vivía `tribuTab`, el conmutador DIRECTOS | GLOBAL de la bandeja. Se eliminó el
     2026-09-22 junto con el conmutador: la pestaña Tribu ya no elige QUÉ lista se ve, muestra las
     dos —los grupos de Formación Renaser arriba, los 1 a 1 abajo—, así que no hay nada que
     conmutar ni un estado que recordar entre visitas. Ver AGENTS.md §1. */

  /**
   * Si el desplegable de integrantes de la tarjeta de la tribu está abierto.
   *
   * Arranca cerrado a propósito: quien entra a Tribu viene casi siempre a escribirle a alguien, y
   * la lista completa de la gente del grupo es una consulta ocasional. Dejarla siempre desplegada
   * empuja la bandeja de conversaciones fuera de la primera pantalla, que es justo lo que este
   * rediseño vino a evitar. El gesto de volver atrás del sistema la cierra antes de salir de la
   * sección (AGENTS.md §6, ver `useSystemBackHandler` más abajo).
   */
  const [integrantesAbiertos, setIntegrantesAbiertos] = useState(false);
  const {
    conversations,
    setConversations,
    loading: conversacionesCargando,
    refrescando: conversacionesRefrescando,
    error: conversacionesError,
    mensajesCargando,
    // Lo usan la entrada desde "Escribirle" (la conversación puede acabar de crearse) y, desde el
    // 2026-09-27, los refrescos de la lista: al volver de un chat, al volver a la pestaña o a
    // Tribu y deslizando (ver el bloque «LA LISTA DE CHATS SE REFRESCA SOLA», más abajo).
    recargar: recargarConversaciones,
    abrirConversacion,
    enviarMensajeTexto: enviarMensajeChatRemoto,
    compartirPublicacionDelMuro: compartirPublicacionEnChat,
  } = useChatConversaciones(user?.id ?? null, recursosPedidos.conversaciones);
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<GroupMember | null>(null);
  /* D-212: la foto propia de un grupo cambia sin que cambie la conversación. Al releer la lista llega otro
     `fotoPath` (otro `?v=`) y la conversación abierta —cabecera e info— lo toma; si no cambió, queda la
     misma y no se vuelve a dibujar. */
  useEffect(() => {
    setActiveChat(abierta => (abierta ? conLaFotoDeLaLista(abierta, conversations) : abierta));
  }, [conversations]);

  /**
   * Único camino para cambiar de sección. Además de mover `seccionActiva`, limpia el sub-estado de
   * las secciones que se dejan atrás.
   *
   * Esa limpieza importa por lo mismo que existe `SeccionComunidad`: navegando a mano el botón
   * "atrás" ya va cerrando el sub-estado de a un nivel por vez (lección → curso → sección), así
   * que al salir queda todo en `null` solo. Los atajos que entran desde Training se saltean esos
   * pasos, y sin la limpieza alguien que dejó una lección abierta a pantalla completa volvía a
   * caer dentro de ESA lección la próxima vez que entraba a Recursos por su cuenta.
   *
   * Ojo con el orden al entrar a `classroom` desde un atajo: `irASeccion('classroom')` NO toca
   * `selectedCourseId`/`fullScreenLesson` (el `if` de abajo lo excluye), justamente para que el
   * `setSelectedCourseId(...)` que viene después en el mismo efecto no se pise.
   */
  const irASeccion = useCallback((seccion: SeccionComunidad) => {
    setSeccionActiva(seccion);
    if (seccion !== 'classroom') {
      setFullScreenLesson(null);
      setSelectedCourseId(null);
    }
    // Salir de Tribu cierra lo que quedó abierto adentro: la sala de chat, la ficha del grupo y
    // el desplegable de integrantes. Volver a entrar la deja como recién llegado.
    if (seccion !== 'tribu') {
      setActiveChat(null);
      setGroupInfoVisible(false);
      setIntegrantesAbiertos(false);
    }
  }, []);
  const [chatInputText, setChatInputText] = useState('');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  /** Foto de chat abierta a pantalla completa; `null` si no hay ninguna. */
  const [fotoChatAmpliada, setFotoChatAmpliada] = useState<string | null>(null);
  /* Chat estilo WhatsApp (2026-09-26): la lista de mensajes abre en lo último, y los colores de
     fondo y burbujas salen del tema (dorado suave / crema), no del verde de WhatsApp. */
  const paletaDelChat = useMemo(() => coloresDelChat(c, isDark), [c, isDark]);

  /**
   * La conversación abierta, en vivo (2026-09-17).
   *
   * Hasta acá la app conversaba SOLO por REST: un mensaje entrante no aparecía hasta salir y
   * volver a entrar, y el "● En línea" del encabezado era un texto fijo que se le mostraba a
   * cualquiera. El backend ya tenía el canal armado —`/ws` con STOMP y Redis, hecho para
   * "reemplazar el polling" según su propio javadoc— y ningún cliente lo abría.
   *
   * Al llegar un mensaje de otro se recarga el historial por el camino de siempre
   * (`abrirConversacion`) en vez de pintar el payload del empuje: ese payload es liviano a
   * propósito y no trae la URL firmada de una foto ni el nombre de quien escribe, así que
   * pintarlo directo dejaría burbujas incompletas. El socket avisa; la fuente de verdad sigue
   * siendo el GET.
   *
   * Desde el 2026-09-27 (D-208 del backend) también trae `leidoHasta`, la marca del último aviso de
   * lectura: los mensajes propios escritos hasta ahí pasan de ✓ a ✓✓ sin recargar (abajo, en
   * `mensajesDelChat`). Está acá arriba, y no más abajo como antes, porque esa lista la necesita.
   * En la comunidad no hay ✓✓.
   */
  const { enLinea: participantesEnLinea, leidoHasta } = useChatEnVivo({
    conversacionId: activeChat?.id ?? null,
    miUsuarioId: user?.id,
    alLlegarMensaje: () => {
      if (!activeChat) return;
      abrirConversacion(activeChat)
        .then(actualizada => setActiveChat(actualizada))
        // Si la recarga falla se queda lo que ya estaba en pantalla: un mensaje que no se ve
        // es mejor que una conversación que se vacía por un error de red.
        .catch(() => undefined);
    },
    confirmaLectura: activeChat?.type !== 'global',
  });

  /* La conversación abierta es una lista INVERTIDA (2026-09-27): abre en el último mensaje sin
     pedirlo y crece hacia arriba. `useBajadaDelChat` decide cuándo bajar sola y cuándo mostrar
     «↓» con los nuevos (`chat/utils/bajadaDelChat.ts`). Su clave es `null` mientras la lista no
     está a la vista —con la info abierta encima—: al volver, arranca otra vez en el final. */
  const mensajesDelChat = useMemo(
    () => conLeidoHasta(activeChat?.messages ?? SIN_MENSAJES, leidoHasta),
    [activeChat?.messages, leidoHasta]
  );
  const bajadaDelChat = useBajadaDelChat(
    enTribu && activeChat !== null && !groupInfoVisible ? activeChat.id : null,
    mensajesDelChat
  );
  const elementosDelChat = useMemo(() => elementosDeLaListaInvertida(mensajesDelChat, new Date()), [mensajesDelChat]);
  const chatEsDeGrupo = activeChat !== null && activeChat.type !== 'direct';
  const renderElementoDelChat = useCallback(
    ({ item }: ListRenderItemInfo<ElementoDelChat<ChatMessage>>) =>
      item.tipo === 'dia' ? (
        <SeparadorDeDia etiqueta={item.etiqueta} colores={paletaDelChat} />
      ) : (
        <BurbujaDeMensaje
          mensaje={item.mensaje}
          enGrupo={chatEsDeGrupo}
          primeroDeLaTanda={item.primeroDeLaTanda}
          ultimoDeLaTanda={item.ultimoDeLaTanda}
          colores={paletaDelChat}
          audioActivo={playingAudioId === item.mensaje.id}
          alActivarAudio={() => setPlayingAudioId(item.mensaje.id)}
          onAbrirFoto={setFotoChatAmpliada}
        />
      ),
    [chatEsDeGrupo, paletaDelChat, playingAudioId]
  );

  // Estados del Muro Social — `posts` sale del backend real (GET /api/v1/wall) a través de
  // `useWallFeed`; `setPosts` queda expuesto para las interacciones que el backend todavía no
  // soporta (reacciones a comentarios, foto adjunta en un comentario) y que siguen siendo locales.
  const {
    posts,
    setPosts,
    loading: muroCargando,
    error: muroError,
    // `recargar` ya no se desestructura acá: la carga inicial la dispara el propio hook y publicar
    // ya no recarga el feed entero (inserta la publicación nueva). El hook lo sigue exponiendo
    // para el día que haya un "deslizar para refrescar", que hoy la pantalla no tiene.
    reaccionar: reaccionarPublicacion,
    cargarComentarios,
    agregarComentario: agregarComentarioRemoto,
    publicarOptimista,
    cargarMas: cargarMasPublicaciones,
    cargandoMas: muroCargandoMas,
    hayMas: hayMasPublicaciones,
  } = useWallFeed();
  // Solo en desarrollo: pedidos al montar y tiempo hasta ver el Muro (V-3, 26/09/2026).
  useMedicionDePantalla('Muro', !muroCargando);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

  /**
   * La vista de lección vuelve arriba cada vez que cambia de lección.
   *
   * BUG ENCONTRADO 2026-09-18: al marcar una lección como completada, la app avanza sola a la
   * siguiente (`handleAlternarLeccionCompletada`). Pero el `ScrollView` conserva su posición, y el
   * botón de completar está AL FONDO — así que la lección nueva aparecía ya desplazada hasta el
   * final. Se veía el pie de una lección que nunca se empezó a leer, y daba la impresión de que el
   * botón no había hecho nada. No era del backend: la lección sí cambiaba.
   */
  const leccionScrollRef = useRef<ScrollView | null>(null);

  /**
   * Lazy loading del Muro: la página siguiente se pide al acercarse al final.
   *
   * > **Corregido el 26/09/2026 (V-4).** Acá decía que el Muro era un `ScrollView` con `.map` y no
   * > una `FlatList` porque convertirlo era "grande y arriesgado", y que quedaba como el siguiente
   * > paso. Ese paso se dio: con decenas de publicaciones el `.map` montaba todas y el `onLayout`
   * > de cada una re-renderizaba la pantalla. Ahora es `onEndReached` de la `FlatList`.
   */
  const alLlegarAlFinalDelMuro = useCallback(() => {
    if (!hayMasPublicaciones) return;
    void cargarMasPublicaciones();
  }, [hayMasPublicaciones, cargarMasPublicaciones]);
  const [publicacionPedida, setPublicacionPedida] = useState<string | null>(null);
  const [publicacionDestacada, setPublicacionDestacada] = useState<string | null>(null);
  const muroListaRef = useRef<FlatList<PostItem> | null>(null);
  /** Reintentos de `scrollToIndex` hacia la publicación pedida, para no quedar en un bucle. */
  const intentosScrollAPublicacion = useRef(0);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentPhotos, setCommentPhotos] = useState<Record<string, FotoMuroNormalizada | null>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const handlePickCommentPhoto = async (postId: string) => {
    try {
      const foto = await elegirYNormalizarFotoMuro();
      if (foto) {
        setCommentPhotos(prev => ({ ...prev, [postId]: foto }));
      }
    } catch {
      Alert.alert('Foto', 'No se pudo seleccionar la foto.');
    }
  };

  // Estados de "Recursos Exclusivos" (cursos/lecciones) — `courses` sale del backend real
  // (GET /api/v1/cursos + GET /api/v1/cursos/{id}/secciones) a través de `useCursos`.
  const navigation = useNavigation();
  const route = useRoute();
  const { courses, loading: cursosCargando, error: cursosError, recargar: recargarCursos } = useCursos(
    recursosPedidos.cursos
  );
  const selectedCourse = selectedCourseId ? (courses.find(cu => cu.id === selectedCourseId) ?? null) : null;
  const [expandedCourseSummaries, setExpandedCourseSummaries] = useState<Record<string, boolean>>({});

  // Cálculo lineal ordenado de todas las lecciones del curso para navegación fluida
  const allCourseLessons: LessonResource[] = useMemo(() => {
    if (!selectedCourse) return [];
    return selectedCourse.sections.flatMap(section => section.lessons);
  }, [selectedCourse]);

  const currentLessonIndex = useMemo(() => {
    if (!fullScreenLesson) return -1;
    return allCourseLessons.findIndex(l => l.id === fullScreenLesson.id);
  }, [allCourseLessons, fullScreenLesson]);

  const nextLesson: LessonResource | null = useMemo(() => {
    if (currentLessonIndex < 0 || currentLessonIndex >= allCourseLessons.length - 1) return null;
    return allCourseLessons[currentLessonIndex + 1];
  }, [allCourseLessons, currentLessonIndex]);

  const prevLesson: LessonResource | null = useMemo(() => {
    if (currentLessonIndex <= 0) return null;
    return allCourseLessons[currentLessonIndex - 1];
  }, [allCourseLessons, currentLessonIndex]);

  const isLastLesson = currentLessonIndex >= 0 && currentLessonIndex === allCourseLessons.length - 1;

  // Persistencia local de lecciones completadas para sincronía visual en catálogo y detalle
  const claveStorageCompletadas = `renaser.academy.lecciones_completadas.${user?.id || 'anon'}`;
  const [completadasLocal, setCompletadasLocal] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let montado = true;
    AsyncStorage.getItem(claveStorageCompletadas)
      .then(raw => {
        if (raw && montado) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              setCompletadasLocal(parsed);
            }
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      montado = false;
    };
  }, [claveStorageCompletadas]);

  const esLeccionCompletada = (leccionId: string, indexGlobal?: number): boolean => {
    if (completadasLocal[leccionId] === false) return false;
    if (completadasLocal[leccionId] === true) return true;
    if (detalleLeccionPorId[leccionId]?.completed === true) return true;
    if (selectedCourse && typeof indexGlobal === 'number' && allCourseLessons.length > 0) {
      const totalCompletadasBackend = Math.round((selectedCourse.progressPercent / 100) * allCourseLessons.length);
      if (indexGlobal < totalCompletadasBackend) {
        return true;
      }
    }
    return false;
  };

  const obtenerProgresoCurso = (course: CourseItem): number => {
    const lecciones = course.sections.flatMap(s => s.lessons);
    if (lecciones.length === 0) return course.progressPercent;
    const completadas = lecciones.filter((l, idx) => esLeccionCompletada(l.id, idx)).length;
    const porcLocal = Math.round((completadas / lecciones.length) * 100);
    return Math.min(100, Math.max(course.progressPercent, porcLocal));
  };

  // Detalle real de la lección abierta (video_url, cuerpo, recursos) — se pide aparte, recién al
  // tocar una lección, ver `handleAbrirLeccion` más abajo.
  const {
    detallePorId: detalleLeccionPorId,
    cargandoId: cargandoDetalleLeccionId,
    errorPorId: errorDetalleLeccionPorId,
    actualizando: actualizandoCompletado,
    cargarDetalle: cargarDetalleLeccion,
    alternarCompletada: alternarLeccionCompletada,
  } = useLeccionDetalle();
  // La lección que de verdad se pinta en pantalla: lo que ya había en el árbol (título, tipo,
  // bloqueo) combinado con lo que trajo el detalle real, apenas llega — sin esperar la red para
  // abrir la pantalla.
  const leccionMostrada: LessonResource | null = fullScreenLesson
    ? { ...fullScreenLesson, ...detalleLeccionPorId[fullScreenLesson.id] }
    : null;

  /* Vuelve arriba al cambiar de lección. Depende del id y no del objeto: `leccionMostrada` se
     reconstruye en cada render al fusionar el detalle que llega por red, así que con el objeto como
     dependencia esto se dispararía también mientras la persona está leyendo. */
  useEffect(() => {
    if (leccionMostrada?.id) {
      leccionScrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [leccionMostrada?.id]);

  // Ventana Externa de Publicación a Pantalla Completa
  const [createPostModalVisible, setCreatePostModalVisible] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  /**
   * Clave de la categoría elegida (`REVELACIONES`, `AGRADECIMIENTO`, …) o `null` si la persona no
   * eligió ninguna — `category` es opcional en `POST /api/v1/wall`, así que "sin categoría" es una
   * publicación perfectamente válida y es lo que se guarda si no se toca ninguna pastilla.
   *
   * Se guarda la CLAVE, no el texto visible: el texto (emoji + etiqueta) lo puede cambiar un
   * administrador desde el panel cuando quiera, la clave es la identidad y es lo único que el
   * backend acepta (`categorias_muro.clave`, `PublicacionMuroService.publicar` valida que exista).
   *
   * Antes acá vivía `newPostTag`, con `'🔥 VICTORIA SOMÁTICA'` de valor inicial y otras dos
   * pastillas escritas a mano más abajo. Ninguna de las tres existe en el catálogo del backend, y
   * además el valor **nunca se mandaba al publicar** — se elegía una etiqueta que no iba a ningún
   * lado. Ver `useCategoriasMuro`.
   */
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const {
    categorias: categoriasMuro,
    cargando: cargandoCategoriasMuro,
    error: errorCategoriasMuro,
    recargar: recargarCategoriasMuro,
  } = useCategoriasMuro(recursosPedidos.categorias);
  // Fotos ya elegidas de la galería y normalizadas (`utils/normalizarImagen.ts`), listas para
  // subir a S3 al publicar. Arranca vacío: el backend exige al menos una (Publicacion.MEDIA_MIN
  // = 1), así que ya no tiene sentido precargar nombres de archivo falsos.
  const [attachedPhotos, setAttachedPhotos] = useState<FotoMuroNormalizada[]>([]);
  const [agregandoFoto, setAgregandoFoto] = useState(false);
  const [subiendoPublicacion, setSubiendoPublicacion] = useState(false);

  // Proporción real (ancho ÷ alto) de la foto de cada publicación que tiene UNA sola, indexada por
  // id de publicación. El feed no manda el tamaño de la foto (`WallMedia` es solo `url` +
  // `mimeType`), así que se descubre al cargarla: cada `FotoMuro` avisa por `onProporcion` y acá
  // se guarda para que la caja adopte esa forma en vez del alto fijo que recortaba la foto.
  // Ver `features/community/utils/proporcionImagen.ts`.
  const [proporcionesFoto, setProporcionesFoto] = useState<Record<string, number>>({});
  const recordarProporcion = useCallback((postId: string, proporcion: number) => {
    setProporcionesFoto(prev =>
      // Se ignora el aviso repetido con el mismo valor: `onLoad` vuelve a dispararse en cada
      // remonte de la lista y un `setState` por foto visible en cada scroll es re-render de balde.
      prev[postId] === proporcion ? prev : { ...prev, [postId]: proporcion }
    );
  }, []);

  // Modal Quién reaccionó — datos reales (GET /api/v1/wall/{id}/reactions), pedidos al
  // abrir el modal (ver el `onPress` que lo abre, más abajo).
  const [reactionsModalVisible, setReactionsModalVisible] = useState(false);
  const {
    reacciones: reactionUsers,
    cargando: cargandoReacciones,
    error: errorReacciones,
    cargarReacciones,
  } = useWallReactions();

  // Visor de Fotos a Pantalla Completa estilo Facebook / X
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerData, setImageViewerData] = useState<{
    postId?: string;
    images: ImageViewerItem[];
    initialIndex: number;
    authorName?: string;
    timeAgo?: string;
    postText?: string;
  }>({
    postId: '',
    images: [],
    initialIndex: 0,
    authorName: '',
    timeAgo: '',
    postText: '',
  });

  const abrirVisorFotos = useCallback((post: PostItem, indexSeleccionado: number = 0) => {
    const items: ImageViewerItem[] = post.media
      .filter(m => !m.mimeType?.startsWith('video/'))
      .map(m => ({
        url: m.url,
        mimeType: m.mimeType,
        title: m.title,
      }));

    if (items.length === 0) return;

    setImageViewerData({
      postId: post.id,
      images: items,
      initialIndex: Math.min(indexSeleccionado, items.length - 1),
      authorName: post.author,
      timeAgo: post.timeAgo,
      postText: post.text,
    });
    setImageViewerVisible(true);
  }, []);

  // Modal / Bottom Sheet de Compartir Publicación (Feed y Visor)
  const [shareSheetPost, setShareSheetPost] = useState<PostItem | null>(null);

  /* Acumula lo que pide lo que está en pantalla (V-3). Es el patrón de React de "ajustar el estado
     durante el render": si hay algo nuevo, React vuelve a renderizar en el acto, antes de pintar,
     y los hooks de arriba ya reciben su `activo` en verdadero. Si no hay nada nuevo,
     `acumularRecursos` devuelve el mismo objeto y no pasa nada. */
  const recursosAcumulados = acumularRecursos(
    recursosPedidos,
    recursosQueNecesita({
      seccion: seccionActiva,
      componiendo: createPostModalVisible,
      compartiendo: shareSheetPost !== null || imageViewerVisible,
    })
  );
  if (recursosAcumulados !== recursosPedidos) {
    setRecursosPedidos(recursosAcumulados);
  }

  /**
   * Pertenece a una célula CON mentor asignado. Lo lee el compositor del Muro para saber si puede
   * ofrecer compartir en la célula.
   *
   * Acá vivían además los tickets al mentor (estado del formulario, `useTicketsMentor`, listado y
   * modal de alta). Se retiraron enteros el 2026-09-07 a pedido del dueño del proyecto: el
   * apartado ya no va en la app. No quedó escondido detrás de una bandera ni comentado "por si
   * acaso" — mismo criterio que el resto de esta pantalla. El backend y el hook
   * (`features/tickets`) siguen ahí intactos para el día que se quiera volver a colgar.
   */
  const tieneGrupo = miCelula?.assigned === true && tieneMentor;

  // Sub-módulo: Ranking Real del Backend
  const { rankingData, loading: rankingCargando, error: rankingError } = useRanking(recursosPedidos.ranking);

  /**
   * Qué tabla se está mirando. El backend manda las TRES en la misma respuesta
   * (`general`, `coherenciaIndividual`, `liga`), así que cambiar de una a otra no cuesta una
   * llamada más: ya están acá.
   *
   * > **Corregido el 2026-09-15.** Antes esto tomaba "la primera lista que no viniera vacía",
   * > en el orden general → coherencia → liga. Como `general` casi siempre tiene datos, las
   * > otras dos **no se veían nunca**: el ranking por coherencia existía en el servidor, se
   * > calculaba y se guardaba, y ninguna pantalla lo mostraba.
   */
  const [tipoRanking, setTipoRanking] = useState<ClaveDeTabla>('general');

  const apiRankingEntries = useMemo(() => entradasDeLaTabla(rankingData, tipoRanking), [rankingData, tipoRanking]);

  /**
   * Qué mide cada tabla, en una línea. Sin esto, dos listas de números no se distinguen.
   *
   * > **La tabla de "Puntos" (la liga) se retiró el 2026-09-15**, por decisión del dueño: iba a
   * > ordenar por el hábito de correr, y ese hábito —`KILÓMETROS DIARIOS`— está desactivado en
   * > producción y sin clave de sistema, así que la tabla no medía lo que decía medir. El backend
   * > la sigue calculando y guardando en el corte (`TipoRanking.LEAGUE`): lo que se quita es la
   * > pestaña, no el dato, así que volver a mostrarla es agregar una línea acá.
   *
   * > **Corregido 2026-09-29 (D-226).** El hábito de correr ya existe (`DAILY_KM`, activo para todos)
   * > y tiene su propia tabla, «Kilómetros»: km acumulados desde el Día 1, no la liga de puntos (que
   * > sigue sin pestaña). Las pestañas viven ahora en `features/ranking/utils/tablasDeRanking`.
   */

  // Entradas de Ranking 100% de la API (cero datos inventados)
  const rankingList = useMemo(() => {
    return apiRankingEntries.map(item => ({
      id: item.participanteId,
      rank: item.posicion,
      name:
        item.participanteId === user?.id ||
        (user?.name && item.fullName.toLowerCase().includes(user.name.toLowerCase()))
          ? `TÚ (${nombreUsuario})`
          : item.fullName,
      scoreText: textoDelPuntaje(tipoRanking, item.puntaje),
      medal:
        item.posicion === 1
          ? ('gold' as const)
          : item.posicion === 2
          ? ('silver' as const)
          : item.posicion === 3
          ? ('bronze' as const)
          : undefined,
      isCurrentUser:
        item.participanteId === user?.id ||
        (user?.name && item.fullName.toLowerCase().includes(user.name.toLowerCase())),
    }));
  }, [apiRankingEntries, tipoRanking, user?.id, user?.name, nombreUsuario]);

  // Podio Top 3 100% Real de la API (null si no hay datos)
  const podioTop1 = useMemo(() => {
    if (apiRankingEntries.length >= 1) {
      const p = apiRankingEntries[0];
      return {
        name:
          p.participanteId === user?.id ||
          (user?.name && p.fullName.toLowerCase().includes(user.name.toLowerCase()))
            ? `TÚ (${nombreUsuario})`
            : p.fullName,
        score: textoDelPuntaje(tipoRanking, p.puntaje),
      };
    }
    return null;
  }, [apiRankingEntries, tipoRanking, user?.id, user?.name, nombreUsuario]);

  const podioTop2 = useMemo(() => {
    if (apiRankingEntries.length >= 2) {
      const p = apiRankingEntries[1];
      return {
        name:
          p.participanteId === user?.id ||
          (user?.name && p.fullName.toLowerCase().includes(user.name.toLowerCase()))
            ? `TÚ (${nombreUsuario})`
            : p.fullName,
        score: textoDelPuntaje(tipoRanking, p.puntaje),
      };
    }
    return null;
  }, [apiRankingEntries, tipoRanking, user?.id, user?.name, nombreUsuario]);

  const podioTop3 = useMemo(() => {
    if (apiRankingEntries.length >= 3) {
      const p = apiRankingEntries[2];
      return {
        name:
          p.participanteId === user?.id ||
          (user?.name && p.fullName.toLowerCase().includes(user.name.toLowerCase()))
            ? `TÚ (${nombreUsuario})`
            : p.fullName,
        score: textoDelPuntaje(tipoRanking, p.puntaje),
      };
    }
    return null;
  }, [apiRankingEntries, tipoRanking, user?.id, user?.name, nombreUsuario]);

  // Posición del usuario autenticado actual desde la API
  const userRankEntry = useMemo(() => {
    const found = apiRankingEntries.find(
      p =>
        p.participanteId === user?.id ||
        (user?.name && p.fullName.toLowerCase().includes(user.name.toLowerCase()))
    );
    const celulaNombre =
      rankingData?.celula?.cellName ||
      (miCelula?.assigned === true ? miCelula.cellName : null) ||
      'Comunidad Renaser';
    if (found) {
      return {
        rank: `${found.posicion}`,
        cellText: `${celulaNombre} · ${textoDeMiPuntaje(tipoRanking, found.puntaje)}`,
      };
    }
    // Sin posición todavía. El texto habla de lo que falta hacer y no de lo que falta en la base,
    // igual que la invitación del podio vacío: es el mismo momento del recorrido.
    return {
      rank: '-',
      cellText: `${celulaNombre} · Tu primer avance te pone en la tabla`,
    };
  }, [apiRankingEntries, rankingData?.celula?.cellName, tipoRanking, user?.id, user?.name, miCelula]);

  // =========================================================================
  // GESTOS TÁCTILES DEL SISTEMA (BACKHANDLER)
  // =========================================================================
  useSystemBackHandler(() => {
    if (shareSheetPost !== null) {
      setShareSheetPost(null);
      return true;
    }
    if (selectedMemberProfile !== null) {
      setSelectedMemberProfile(null);
      return true;
    }
    if (fotoChatAmpliada) {
      setFotoChatAmpliada(null);
      return true;
    }
    if (groupInfoVisible) {
      setGroupInfoVisible(false);
      return true;
    }
    if (activeChat !== null) {
      setActiveChat(null);
      return true;
    }
    // El desplegable de integrantes es un nivel más adentro de la pestaña Tribu: el gesto lo
    // cierra antes de considerar salir de la sección (AGENTS.md §6).
    if (integrantesAbiertos) {
      setIntegrantesAbiertos(false);
      return true;
    }
    if (enTribu) {
      irASeccion('muro');
      return true;
    }
    if (reactionsModalVisible) {
      setReactionsModalVisible(false);
      return true;
    }
    if (createPostModalVisible) {
      setCreatePostModalVisible(false);
      return true;
    }
    if (fullScreenLesson !== null) {
      setFullScreenLesson(null);
      return true;
    }
    if (selectedCourse !== null) {
      setSelectedCourseId(null);
      return true;
    }
    // Dentro de Eventos, el detalle, el formulario y la agenda vuelven primero a la lista.
    if (seccionActiva === 'eventos' && eventosVolverRef.current?.()) {
      return true;
    }
    // Cualquier sección que no sea el Muro vuelve al Muro, que es la que abre la pestaña. Estando
    // ya en el Muro se devuelve `false` a propósito: ahí el gesto le toca al sistema (salir de la
    // app), que es lo que la persona espera en la raíz de una pestaña.
    if (seccionActiva !== 'muro') {
      irASeccion('muro');
      return true;
    }
    return false;
  }, shareSheetPost !== null || seccionActiva !== 'muro' || selectedCourse !== null || fullScreenLesson !== null || createPostModalVisible || reactionsModalVisible || activeChat !== null || groupInfoVisible || selectedMemberProfile !== null || fotoChatAmpliada !== null || integrantesAbiertos);

  /**
   * Mientras la sala de chat esté abierta, se esconde el botón flotante del acompañante: se monta
   * justo encima de la barra de escribir y tapa el botón de enviar. Es la misma señal que ya usaba
   * `ChatDelCurso` (ver `renasia/state/chatEnPantalla.ts`), no un mecanismo nuevo.
   *
   * Desde el 2026-09-27 también con la info del chat abierta: es parte de la conversación a
   * pantalla completa, y el flotante caía encima del ícono de chat de la última persona de la lista.
   */
  useEffect(() => {
    if (!enTribu || activeChat === null) return;
    return marcarChatMontado();
  }, [enTribu, activeChat]);

  /**
   * Conversación a pantalla completa, como WhatsApp (2026-09-26): sin cabecera «COMUNIDAD», sin
   * fila de secciones y sin la barra de pestañas de abajo. Al cerrarla (flecha o «atrás» de
   * Android, que ya la cierran arriba en `useSystemBackHandler`) la barra vuelve; y si la pantalla
   * se desmonta con la conversación abierta, la limpieza también la devuelve.
   */
  const pantallaCompleta = conversacionAPantallaCompleta({ enTribu, hayConversacionAbierta: activeChat !== null });
  useEffect(() => {
    if (!pantallaCompleta) return;
    navigation.setOptions(OPCIONES_SIN_PESTANAS);
    return () => navigation.setOptions(OPCIONES_CON_PESTANAS);
  }, [pantallaCompleta, navigation]);

  // =========================================================================
  // HANDLERS
  // =========================================================================
  /**
   * Abre un curso del catálogo (ahora completo — ver `useCursos`). Si es uno de los que todavía
   * no se desbloquearon por día de programa (`GET /cursos/bloqueados`, `course.locked`) no
   * navega: mismo criterio que `handleAbrirLeccion` de abajo — se avisa con `Alert.alert` en vez
   * de inventar una pantalla/modal nueva para "por qué está bloqueado".
   */
  const handleAbrirCurso = (course: CourseItem) => {
    if (course.locked) {
      const faltan = course.diasFaltantes ?? 0;
      Alert.alert(
        'Curso bloqueado 🔒',
        faltan > 0
          ? `Se desbloquea en ${faltan} día${faltan === 1 ? '' : 's'} más de tu programa (día ${course.diaDesbloqueo}).`
          : 'Todavía no está disponible para tu día de programa.'
      );
      return;
    }
    setSelectedCourseId(course.id);
  };

  /**
   * Abre una lección. Si está bloqueada por día de programa (`bloqueada_por_dia`, heredada de la
   * sección — ver javadoc de `Leccion` en el backend) no navega: el diseño no tiene ningún
   * indicador visual de "candado" para una lección puntual dentro de un curso ya accesible, así
   * que en vez de inventar esa UI se avisa con el mismo `Alert.alert` que ya usa el resto de la
   * pantalla (ver `handleAbrirCurso` acá arriba y las reacciones del Muro).
   *
   * `leccionRecienCompletadaId`: la lección que el servidor acaba de dar por completada en este
   * mismo toque (ver `handleAlternarLeccionCompletada`). La regla secuencial la cuenta como
   * completada aunque el estado de la pantalla todavía no se haya enterado (TRB-04).
   */
  const handleAbrirLeccion = (
    lesson: LessonResource,
    omitirProgresionSecuencial = false,
    leccionRecienCompletadaId?: string
  ) => {
    if (lesson.locked) {
      const faltan = lesson.diasFaltantes ?? 0;
      Alert.alert(
        'Lección bloqueada 🔒',
        faltan > 0
          ? `Se desbloquea en ${faltan} día${faltan === 1 ? '' : 's'} más de tu programa.`
          : 'Todavía no está disponible para tu día de programa.'
      );
      return;
    }

    // Regla de progresión secuencial: no saltarse lecciones.
    //
    // `omitirProgresionSecuencial` la saltea SOLO para la Clase Diaria (ver el efecto de entrada
    // desde otra pestaña). El motivo no es de comodidad: esa lección la elige el BACKEND a partir
    // del día de programa, y ese día avanza con el calendario haya o no completado el aprendiz la
    // clase de ayer. Exigirle además "primero completá la anterior" dejaba el hábito de Clase
    // Diaria imposible de cerrar apenas alguien se saltaba un solo día: el día avanza, la lección
    // de hoy cambia, y la anterior sigue sin completarse. Las dos reglas se contradecían; para la
    // Clase Diaria manda el día de programa.
    const anterior = omitirProgresionSecuencial
      ? null
      : leccionAnteriorPendiente(allCourseLessons, lesson.id, esLeccionCompletada, leccionRecienCompletadaId);
    if (anterior) {
      Alert.alert(
        'Lección no disponible 🔒',
        `Para acceder a esta lección primero debes completar la lección anterior:\n\n"${anterior.title}"`
      );
      return;
    }

    setFullScreenLesson(lesson);
    // Se pide en paralelo, no antes: la pantalla ya se abrió con lo que había en el árbol
    // (título, tipo, meta) — el video/cuerpo real llegan un instante después sin bloquear la
    // navegación (ver `useLeccionDetalle`).
    cargarDetalleLeccion(lesson.id);
  };

  // -------------------------------------------------------------------------------------------
  // ENTRADA DESDE OTRA PESTAÑA — hoy la usa la Clase Diaria desde Training
  // -------------------------------------------------------------------------------------------
  // Training necesita "llevar a la lección del día". El reproductor vive acá dentro, y esta
  // pantalla no tiene rutas propias (el navegador es un tab navigator plano, sin stack), así que
  // el punto de entrada son parámetros de ruta sobre la pestaña `Comunidad`.
  //
  // Se sigue entrando por `handleAbrirLeccion` —la lección se abre por el mismo camino que si la
  // persona hubiera navegado a mano— pero SIN la regla de progresión secuencial.
  //
  // Corregido 2026-09-05. Acá decía que tampoco se salteaba el secuencial, porque "sería
  // inventarle una excepción a la Clase Diaria que nadie pidió". La excepción sí hacía falta, y
  // el dueño del proyecto la pidió: la Clase Diaria la elige el backend por día de programa, que
  // avanza con el calendario haya o no completado el aprendiz la clase de ayer. Con el gate
  // secuencial puesto, quien se saltaba un día tocaba el hábito, comía un
  // "Lección no disponible 🔒" y ya no podía cerrar el hábito nunca más. El bloqueo por
  // día de programa (`lesson.locked`) SÍ se mantiene: ese lo decide el backend.
  const [leccionPedidaDeOtraPestana, setLeccionPedidaDeOtraPestana] = useState<
    { cursoId: string; leccionId: string } | null
  >(null);

  /**
   * Chat pedido desde otra pantalla: hoy, el botón "Escribirle" de la ficha del aprendiz.
   *
   * Se guarda el id y NO se abre en el acto porque la conversación puede acabar de crearse y no
   * estar todavía en `conversations` — `POST /chat/conversations/direct` la devuelve, pero el
   * listado de esta pantalla se cargó antes. El efecto de más abajo la abre en cuanto aparece.
   */
  const [chatPedidoDeOtraPestana, setChatPedidoDeOtraPestana] = useState<string | null>(null);

  useEffect(() => {
    const params = route.params as
      | { abrirCursoId?: string; abrirLeccionId?: string }
      | undefined;
    if (!params?.abrirCursoId || !params?.abrirLeccionId) return;

    // `irASeccion` y no `setSeccionActiva`: apaga la sección que estuviera abierta. Entrar acá
    // dejando prendida otra sección pintaba el Muro y el catálogo de Cursos apilados en el mismo
    // scroll (E-116).
    irASeccion('classroom');
    setSelectedCourseId(params.abrirCursoId);
    setLeccionPedidaDeOtraPestana({
      cursoId: params.abrirCursoId,
      leccionId: params.abrirLeccionId,
    });
    // Se consumen una sola vez: sin esto, volver a esta pestaña reabriría la misma lección.
    // El tab navigator no está tipado (no hay `ParamList`), así que `setParams` no acepta claves
    // conocidas. Mismo cast que ya usa `HoyScreen` para navegar entre pestañas.
    (navigation as any).setParams({ abrirCursoId: undefined, abrirLeccionId: undefined });
  }, [route.params, navigation]);

  /**
   * Tercera entrada desde afuera: "Escribirle" en la ficha de un aprendiz abre el chat PRIVADO
   * con esa persona. Misma forma que las otras dos — parámetro de pestaña, consumido una vez.
   */
  useEffect(() => {
    const params = route.params as { abrirChatConversacionId?: string } | undefined;
    const id = params?.abrirChatConversacionId;
    if (!id) return;

    irASeccion('tribu');
    /* El pedido suele venir del «Escribirle» de una ficha: se cierra todo lo que tapa Comunidad
       («Mi grupo», su ficha, la ficha desde la info) y la info, o el chat pedido quedaría detrás.
       E-341: antes no se cerraban «Mi grupo» ni su ficha, y el botón parecía no hacer nada. */
    despacharVista({ tipo: 'pedir-un-chat' });
    setGroupInfoVisible(false);
    setChatPedidoDeOtraPestana(id);
    // Recién creada, puede no estar en el listado: se pide de nuevo para que aparezca. `forzar`:
    // una lectura que ya estuviera en vuelo salió antes de crearla y no la traería.
    void recargarConversaciones({ forzar: true });
    (navigation as any).setParams({ abrirChatConversacionId: undefined });
  }, [route.params, navigation, recargarConversaciones]);

  /**
   * Segunda entrada desde afuera, con la misma forma que la de arriba: el arranque guiado
   * (`features/sparkie`) manda al aprendiz recién llegado a escribir su primer post.
   *
   * Deja la pantalla exactamente donde la dejaría alguien navegando a mano — sección Muro →
   * botón de publicar — en vez de saltarse pasos: si mañana el Muro cambia de reglas, este atajo
   * las hereda solas.
   */
  useEffect(() => {
    const params = route.params as { abrirComposerMuro?: boolean } | undefined;
    if (!params?.abrirComposerMuro) return;

    // Misma razón que el atajo de la Clase Diaria de arriba: `irASeccion` apaga Classroom si el
    // aprendiz venía de ahí. Este era el camino con el que el dueño del proyecto encontró el bug
    // — tocaba el hábito de Clase Diaria y después el de post en comunidad, y le quedaban las dos
    // secciones una encima de la otra (E-116).
    irASeccion('muro');
    setCreatePostModalVisible(true);
    // Se consume una sola vez, igual que `abrirCursoId`: sin esto, volver a esta pestaña
    // reabriría el composer aunque la persona lo hubiera cerrado a propósito.
    (navigation as any).setParams({ abrirComposerMuro: undefined });
  }, [route.params, navigation]);

  /**
   * Entrada desde un aviso de evento (`/eventos/{id}`, E-5): la deja `AbridorDeEventos`, que vive
   * por encima del navegador. Misma forma que las otras entradas: parámetro consumido una vez.
   */
  useEffect(() => {
    const params = route.params as { abrirEventoId?: string } | undefined;
    const id = params?.abrirEventoId;
    if (!id) return;
    irASeccion('eventos');
    setEventoPedido(id);
    (navigation as any).setParams({ abrirEventoId: undefined });
  }, [route.params, navigation, irASeccion]);

  /**
   * Entrada desde Hoy al post exacto. Se consume el parámetro una sola vez, pero se conserva el
   * id en estado hasta que el feed y el layout de esa tarjeta estén listos para desplazar el
   * ScrollView. Así el enlace funciona aunque Comunidad todavía esté esperando el GET /wall.
   */
  useEffect(() => {
    const params = route.params as { abrirPublicacionId?: string } | undefined;
    const postId = params?.abrirPublicacionId;
    if (!postId) return;

    irASeccion('muro');
    setPublicacionPedida(postId);
    setPublicacionDestacada(postId);
    setExpandedPosts(prev => ({ ...prev, [postId]: true }));
    (navigation as any).setParams({ abrirPublicacionId: undefined });
  }, [route.params, navigation, irASeccion]);

  /* Lleva la lista hasta la publicación pedida desde Hoy. Antes se esperaba a que su tarjeta
     informara su `y` por `onLayout`; con la `FlatList` alcanza con su índice, y si todavía no está
     medida, `alFallarScrollAPublicacion` se acerca y reintenta. */
  useEffect(() => {
    if (!publicacionPedida || seccionActiva !== 'muro') return;
    const indice = posts.findIndex(post => post.id === publicacionPedida);
    if (indice < 0) return;

    intentosScrollAPublicacion.current = 0;
    requestAnimationFrame(() => {
      muroListaRef.current?.scrollToIndex({ index: indice, animated: true, viewOffset: 12 });
    });
    setPublicacionPedida(null);
  }, [posts, publicacionPedida, seccionActiva]);

  const alFallarScrollAPublicacion = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      const lista = muroListaRef.current;
      if (!lista || intentosScrollAPublicacion.current >= 5) return;
      intentosScrollAPublicacion.current += 1;
      // Se salta cerca con el alto promedio (eso monta esas tarjetas) y se reintenta exacto.
      lista.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
      setTimeout(() => {
        muroListaRef.current?.scrollToIndex({ index: info.index, animated: true, viewOffset: 12 });
      }, 120);
    },
    []
  );

  useEffect(() => {
    if (!leccionPedidaDeOtraPestana) return;
    // El árbol del curso llega asincrónico (`useCursos` → secciones): se espera a que la lección
    // exista en `allCourseLessons` en vez de abrir con un objeto armado a mano, que no tendría ni
    // el video ni el estado de bloqueo. Si nunca aparece, la persona queda en el detalle del curso
    // — un final razonable, no una pantalla rota.
    if (selectedCourseId !== leccionPedidaDeOtraPestana.cursoId) return;
    const leccion = allCourseLessons.find(l => l.id === leccionPedidaDeOtraPestana.leccionId);
    if (!leccion) return;

    setLeccionPedidaDeOtraPestana(null);
    // `true` = sin la regla de progresión secuencial (ver `handleAbrirLeccion`). El bloqueo por
    // día de programa SÍ se mantiene: ese lo decide el backend y es el que de verdad ordena el
    // curso; el secuencial era una regla que solo vivía en el cliente.
    handleAbrirLeccion(leccion, true);
    // `handleAbrirLeccion` se recrea en cada render y no se incluye a propósito: el efecto ya se
    // desarma solo limpiando `leccionPedidaDeOtraPestana` antes de llamarla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leccionPedidaDeOtraPestana, selectedCourseId, allCourseLessons]);

  const handleAlternarLeccionCompletada = async (leccion: LessonResource) => {
    try {
      const indexActual = allCourseLessons.findIndex(l => l.id === leccion.id);
      const estabaCompleta = esLeccionCompletada(leccion.id, indexActual >= 0 ? indexActual : undefined);
      await alternarLeccionCompletada(leccion.id, estabaCompleta);

      // Sincronizar persistencia local
      const nuevoEstado = { ...completadasLocal, [leccion.id]: !estabaCompleta };
      setCompletadasLocal(nuevoEstado);
      void AsyncStorage.setItem(claveStorageCompletadas, JSON.stringify(nuevoEstado)).catch(() => {});
      void recargarCursos();

      if (estabaCompleta) {
        Alert.alert('Lección actualizada', 'La lección se ha marcado como pendiente.');
        return;
      }

      // La lección fue completada con éxito
      if (isLastLesson || !nextLesson) {
        // Última lección del curso -> llevar al panel general donde están todos los cursos (Req 4)
        setFullScreenLesson(null);
        setSelectedCourseId(null);
        Alert.alert(
          '¡Curso Completado! 🏆🦅',
          '¡Felicitaciones! Has completado todas las lecciones del curso y finalizado tu recorrido.'
        );
      } else {
        // Lección intermedia -> avanzar a la siguiente lección sucesivamente (Req 3)
        if (nextLesson.locked) {
          const faltan = nextLesson.diasFaltantes ?? 0;
          Alert.alert(
            '¡Excelente Progreso! 🦅',
            `Lección completada con éxito.\n\nLa siguiente lección ("${nextLesson.title}") se desbloqueará en ${
              faltan > 0 ? `${faltan} día${faltan === 1 ? '' : 's'}` : 'tu próximo día de programa'
            }.`
          );
        } else {
          // Con `leccion.id`: la anterior de la siguiente es ESTA, que el servidor acaba de dar por
          // completada. El estado de la pantalla recién se entera en el próximo render; sin esto la
          // regla secuencial la leía pendiente, avisaba «Lección no disponible 🔒» nombrándola a
          // ella y no abría la siguiente (TRB-04, e2e web del 2026-09-27).
          handleAbrirLeccion(nextLesson, false, leccion.id);
          Alert.alert(
            '¡Excelente Progreso! 🦅',
            `Lección completada con éxito. Avanzando a: "${nextLesson.title}".`
          );
        }
      }
    } catch (e) {
      Alert.alert('No se pudo actualizar', mensajeDeError(e, 'Intenta de nuevo en un momento.'));
    }
  };

  /**
   * Único tipo que el backend puede persistir de verdad: `POST .../messages` con `type: 'TEXT'`
   * (ver `chatApi.enviarMensajeTexto`). El mensaje que se agrega al historial es el que devuelve
   * el servidor (con su `id`/`createdAt` reales), no uno optimista armado acá — si la request
   * falla, se devuelve el texto al input en vez de dejarlo perdido.
   */
  const handleEnviarTextoReal = async () => {
    if (!activeChat) return;
    const texto = chatInputText.trim();
    if (!texto) return;
    setChatInputText('');
    try {
      const actualizada = await enviarMensajeChatRemoto(activeChat, texto);
      setActiveChat(actualizada);
    } catch (e) {
      Alert.alert('No se pudo enviar', mensajeDeError(e, 'Intenta de nuevo en un momento.'));
      setChatInputText(texto);
    }
  };

  /**
   * Un mensaje recién creado por el backend entra a la conversación abierta y al resumen de la
   * lista. Se usa para foto y audio; el texto tiene su propio camino (`handleEnviarTextoReal`),
   * que ya venía resuelto.
   *
   * <p>Antes acá vivía un `handleSendChatMessage` que, para todo lo que no fuera texto, fabricaba
   * una burbuja local con contenido inventado ("Evidencia_1.jpg", "0:28", emisor "Kelin Arango")
   * y la agregaba a la pantalla sin hablar con nadie: se veía enviado, no llegaba a ningún lado y
   * desaparecía al recargar. No era un defecto del cliente — el backend era el único módulo sin
   * endpoint de subida, y esto era el parche. Con `POST /conversations/{id}/media/upload-url` ya
   * no hace falta parche.
   */
  const agregarMensajeEnviado = useCallback((wire: WireMensaje) => {
    const mensaje = mapearMensaje(wire, user?.id ?? null);
    setActiveChat(prev => {
      if (!prev) return prev;
      const actualizada = {
        ...prev,
        messages: [...prev.messages, mensaje],
        ...resumenDelUltimoMensaje(wire, user?.id ?? null),
      };
      setConversations(anteriores =>
        anteriores.map(cItem => (cItem.id === actualizada.id ? actualizada : cItem)));
      return actualizada;
    });
  }, [user?.id]);

  const {
    enviando: enviandoMedia,
    grabando,
    segundosGrabados,
    enviarFoto,
    alternarGrabacion,
  } = useEnvioMediaChat(activeChat?.id ?? null, agregarMensajeEnviado);

  /**
   * La cámara y la galería son dos permisos distintos y dos intenciones distintas, así que se
   * pregunta en vez de elegir por la persona — igual que hace WhatsApp con el clip.
   */
  const handleAdjuntarFoto = () => {
    if (enviandoMedia || grabando) return;
    Alert.alert('Enviar una foto', '¿De dónde la sacamos?', [
      { text: 'Cámara', onPress: () => void enviarFoto('camara') },
      { text: 'Galería', onPress: () => void enviarFoto('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  /* Acá vivían `evidenciaVisible` y `handleEvidenciaSubida`, el atajo para subir la evidencia de
     un hábito DESDE el chat (2026-09-05). Se quitó el 2026-09-29 a pedido del dueño junto con su
     botón (el círculo verde con ✓ de la barra de escribir). La evidencia se sigue subiendo desde
     Hoy, Hábitos y RenasIA (`RegistroConFotoModal` / `EvidenciaHabitoModal`), que es donde vive;
     `EvidenciaDesdeChatModal` quedó en `features/habits` y desde el 2026-09-29 es
     `ElegirHabitoParaFotoModal`, que usa «+ Subir Foto» de Yo. */

  // Abre el 1 a 1 buscando por NOMBRE entre las conversaciones que ya existen, y no por id: los
  // integrantes que llegan acá salen del roster real, pero este camino nunca mandó un id a
  // `POST /chat/conversations/direct`. Pendiente cablearlo contra `GET /api/v1/chat/members`
  // cuando exista un selector de integrantes de verdad.
  const handleStartDirectChat = (member: GroupMember) => {
    setSelectedMemberProfile(null);
    setGroupInfoVisible(false);

    const existing = conversations.find(cItem => cItem.title === member.name);
    if (existing) {
      setActiveChat(existing);
    } else {
      const newConv: ChatConversation = {
        id: `conv_${member.id}`,
        type: 'direct',
        // Un 1 a 1 no pertenece a ningun grupo.
        celulaId: null,
        title: member.name,
        subtitle: `${member.role} · 1 a 1`,
        avatar: member.avatar,
        lastMessage: 'Inicia tu conversación con este integrante',
        lastTime: 'Ahora',
        unreadCount: 0,
        messages: [],
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveChat(newConv);
    }
  };

  /**
   * DM REAL con un integrante del grupo, por su id de usuario. Abre (o reutiliza) la
   * conversacion en el backend (`abrirConversacionDirecta`) y la muestra con el MISMO mecanismo
   * que ya usa la navegacion entre pestanas: dejar el id "pedido" y recargar el listado. Sin
   * conversaciones fabricadas a mano.
   */
  const abrirDMConIntegrante = async (usuarioId: string) => {
    setGroupInfoVisible(false);
    try {
      const conv = await abrirConversacionDirecta(usuarioId);
      irASeccion('tribu');
      setChatPedidoDeOtraPestana(conv.id);
      // `forzar`: puede estar recién creada, y una lectura en vuelo no la traería.
      void recargarConversaciones({ forzar: true });
    } catch (e) {
      /* Si falla, el usuario se queda donde estaba: no se inventa una conversacion local. Quién puede
         escribirle a quién lo decide el servidor (cuentas activas, G-4); desde D-207 se dice su
         respuesta en vez de quedarse quieto. Antes el toque no hacía nada y no se sabía por qué. */
      Alert.alert('No se pudo abrir el chat', mensajeDeError(e, 'Inténtalo de nuevo en un momento.'));
    }
  };

  /**
   * D-207: «Ver ficha» desde la info del grupo abre la MISMA ficha que «Mi grupo» (`AlumnoScreen`), con
   * el id del grupo de la conversación. El botón solo aparece cuando quien mira es el mentor de ese
   * grupo (`infoDelChat.abreFicha`); quién puede ver la ficha lo sigue decidiendo el servidor.
   */
  const abrirFichaDesdeLaInfo = (integrante: IntegranteDeLaInfo) => {
    if (!integrante.usuarioId) return;
    /* D-222: el ADMIN/ALQUIMISTA abre la ficha de administración (la de Personas), que sirve a cualquier
       aprendiz, esté o no en un grupo: se pide a Hoy, que es donde vive Administración. */
    if (esAdministracionDeGrupos(user?.role)) {
      setGroupInfoVisible(false);
      irAPestana('Hoy', { abrirFichaAprendiz: { id: integrante.usuarioId, fullName: integrante.nombreCompleto } });
      return;
    }
    if (!celulaIdAbierto) return;
    const vista = celulaQueAcompano.vista;
    despacharVista({
      tipo: 'abrir-ficha-desde-la-info',
      alumno: alumnoDesdeLaInfo(
        { usuarioId: integrante.usuarioId, nombre: integrante.nombreCompleto },
        celulaIdAbierto,
        vista ? { grupoId: vista.celula.id, alumnos: vista.todos } : null
      ),
      grupoId: celulaIdAbierto,
    });
  };

  /**
   * Abre una conversación real: entra de inmediato con lo que ya había en el listado (sin
   * esperar la red, mismo criterio que `handleAbrirLeccion`) y trae el historial real
   * (`GET .../messages`) + marca como leída un instante después — ver `useChatConversaciones.
   * abrirConversacion`. Si falla, se queda en la conversación igual (con lo que ya tenía) y se
   * avisa con el mismo `Alert` que usa el resto de la pantalla.
   */
  const handleAbrirChat = (conversacion: ChatConversation) => {
    setActiveChat(conversacion);
    abrirConversacion(conversacion)
      .then(actualizada => setActiveChat(actualizada))
      .catch(e => Alert.alert('No se pudo cargar el chat', mensajeDeError(e, 'Inténtalo de nuevo en un momento.')));
  };

  /**
   * Abre el chat que pidió otra pantalla, en cuanto el listado lo tenga.
   *
   * Va DESPUÉS de `handleAbrirChat` a propósito: reutiliza exactamente el mismo camino que un
   * toque en la lista —entrar con lo que hay y traer el historial detrás—, en vez de repetir esa
   * lógica con una variante que tarde o temprano se desincroniza.
   *
   * Si la conversación no está todavía, no hace nada y espera al siguiente render: `recargar()`
   * ya salió a buscarla. No se reintenta ni se pone un temporizador — si nunca llega, la persona
   * queda en Tribu, que es exactamente donde está su chat.
   */
  useEffect(() => {
    if (!chatPedidoDeOtraPestana) return;
    const conversacion = conversations.find(c => c.id === chatPedidoDeOtraPestana);
    if (!conversacion) return;
    setChatPedidoDeOtraPestana(null);
    handleAbrirChat(conversacion);
    // `handleAbrirChat` se redefine en cada render y meterlo como dependencia dispararía el
    // efecto en bucle. Lo que decide es el par (id pedido, listado), que sí está declarado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatPedidoDeOtraPestana, conversations]);

  /**
   * La ⓘ de la cabecera abre la info de tu grupo (28/09, corrige E-409). Mismo camino que un toque en
   * la bandeja y luego en la ⓘ del chat: se va a Tribu, se abre el chat del grupo en cuanto la
   * bandeja lo tenga (`handleAbrirChat`) y encima su info. Si ese chat nunca llega, la persona queda
   * en Tribu, que es donde está. Ver `utils/infoDesdeLaCabecera.ts`.
   */
  const [infoDelGrupoPedida, setInfoDelGrupoPedida] = useState<string | null>(null);
  const botonDeInfo = botonDeInfoDelGrupo(grupoDeLaCabecera(grupos, grupoDeTribuElegido), grupoId => {
    irASeccion('tribu');
    setInfoDelGrupoPedida(grupoId);
  });
  useEffect(() => {
    if (!infoDelGrupoPedida) return;
    // Si se fue de Tribu antes de que llegara el chat, el pedido se olvida: no se abre a sus espaldas.
    if (!enTribu) {
      setInfoDelGrupoPedida(null);
      return;
    }
    const conversacion = conversacionDelGrupo(conversations, infoDelGrupoPedida);
    if (!conversacion) return;
    setInfoDelGrupoPedida(null);
    handleAbrirChat(conversacion);
    setGroupInfoVisible(true);
    // Igual que el efecto de arriba: `handleAbrirChat` se redefine en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infoDelGrupoPedida, conversations, enTribu]);

  /*
   * LA LISTA DE CHATS SE REFRESCA SOLA (2026-09-27, «tipo WhatsApp»). Antes se pedía una vez, al
   * entrar a Tribu por primera vez, y el orden por último mensaje y los no leídos se quedaban
   * viejos. Ahora se relee `GET /api/v1/chat/conversations`:
   * - al volver de una conversación a la lista;
   * - al volver a la pestaña Comunidad estando en Tribu, y al volver a Tribu desde otra sección;
   * - deslizando la lista hacia abajo (el `RefreshControl` de Tribu).
   * En silencio si ya hay lista, con un solo pedido para los disparos que caen juntos y sin que una
   * respuesta vieja pise a una nueva (`useChatConversaciones.recargar`). No hay refresco EN VIVO de
   * la lista: el backend solo publica por conversación (`/topic/conversaciones/{id}`), no tiene un
   * destino por persona que avise de un mensaje en otro chat.
   */
  const idDelChatAbierto = activeChat?.id ?? null;
  const chatAbiertoAntes = useRef<string | null>(idDelChatAbierto);
  useEffect(() => {
    const anterior = chatAbiertoAntes.current;
    chatAbiertoAntes.current = idDelChatAbierto;
    if (enTribu && pideReleerAlCerrarElChat(anterior, idDelChatAbierto)) void recargarConversaciones();
  }, [enTribu, idDelChatAbierto, recargarConversaciones]);

  useFocusEffect(
    useCallback(() => {
      if (enTribu) void recargarConversaciones();
    }, [enTribu, recargarConversaciones])
  );


  // El "me gusta" va contra el backend real (POST /api/v1/wall/{id}/react). El propio backend
  // hace el toggle (ReaccionarUseCase: tocar el mismo tipo lo saca) y devuelve los conteos
  // verdaderos, así que acá no hay aritmética que llevar a mano.
  //
  // Ya no existe el dislike: el cliente pidió sacarlo del producto. El backend sigue aceptando
  // `DISLIKE` (el enum no se tocó), pero ninguna pantalla lo manda. Ver el informe de este cambio
  // para las reacciones negativas que quedaron guardadas de antes.
  const handleToggleLike = async (postId: string) => {
    try {
      await reaccionarPublicacion(postId, 'LIKE');
    } catch (error) {
      Alert.alert('No se pudo reaccionar', mensajeDeError(error, 'Intenta de nuevo en un momento.'));
    }
  };

  const handleSharePost = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    setShareSheetPost(post);
  };

  const handleShareExternal = async (post: PostItem) => {
    try {
      const shareUrl = post.media[0]?.url || '';
      const textToShare = post.text ? `"${post.text}"` : '';
      const byAuthor = post.author ? `Publicado por ${post.author} en Renaser` : 'Comunidad Renaser';

      await Share.share({
        title: 'Renaser Muro',
        message: `${byAuthor}\n${textToShare}\n${shareUrl ? `\nVer foto: ${shareUrl}` : ''}`.trim(),
      });
    } catch {
      // Diálogo cancelado
    }
  };

  /**
   * Compartir una publicación DENTRO de la app va por un endpoint propio del backend
   * (`POST /chat/conversations/{id}/messages/share-wall-post`), al que solo se le manda el id de
   * la publicación.
   *
   * Antes el mensaje se armaba acá, a mano: `📌 [Compartido del Muro por <autor>]`, el texto de la
   * publicación, y una línea `📷 Ver foto: <post.media[0].url>`. El problema es esa URL: es la
   * firma de S3 con la que el feed pinta la foto, y viene con `X-Amz-Expires=900`. O sea que la
   * foto compartida moría a los QUINCE minutos y el enlace roto quedaba guardado para siempre en
   * la conversación — el mismo defecto que E-79 ya dejó anotado. Ahora el servidor arma el texto y
   * adjunta la foto como media real (`mediaBucket`/`mediaPath`), que se vuelve a firmar en cada
   * lectura, igual que cualquier foto de chat.
   *
   * `handleShareExternal` sigue mandando la URL firmada a propósito y no es una inconsistencia:
   * ahí se comparte HACIA AFUERA con el `Share` del sistema, donde no hay historial nuestro que se
   * rompa y un enlace que caduca es lo correcto — es justamente lo que evita que la foto de un
   * aprendiz quede accesible para siempre fuera de la tribu.
   */
  const handleShareToConversation = async (post: PostItem, conv: ChatConversation) => {
    try {
      await compartirPublicacionEnChat(conv, post.id);
      Alert.alert(
        '¡Publicación Compartida! 🦅',
        `Se ha compartido con éxito en "${conv.title}".`
      );
    } catch (e) {
      Alert.alert('No se pudo compartir', mensajeDeError(e, 'Intenta de nuevo en un momento.'));
    }
  };

  // El feed (GET /api/v1/wall) no trae comentarios, solo `commentCount`: se piden recién al
  // abrir la sección, una sola vez por post (useWallFeed ya evita repetir el pedido).
  const handleToggleComments = (postId: string) => {
    setOpenComments(prev => {
      const abriendo = !prev[postId];
      if (abriendo) {
        void cargarComentarios(postId);
      }
      return { ...prev, [postId]: abriendo };
    });
  };

  // El backend NO tiene reacciones a comentarios (solo a publicaciones — ver ReaccionarUseCase);
  // esto queda como interacción visual local, sin persistir, hasta que exista ese endpoint.
  //
  // Sin dislike, el voto de un comentario es un simple interruptor: si ya estaba puesto se saca,
  // y si no, se pone. Por eso ya no recibe el tipo de reacción como parámetro.
  const handleCommentVote = (postId: string, commentId: string) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id !== postId) return p;
        const updatedComments: CommentItem[] = p.comments.map(cItem => {
          if (cItem.id !== commentId) return cItem;
          const yaLeGustaba = cItem.userReaction === 'like';
          return {
            ...cItem,
            likes: yaLeGustaba ? cItem.likes - 1 : cItem.likes + 1,
            userReaction: yaLeGustaba ? null : 'like',
          };
        });
        return { ...p, comments: updatedComments };
      })
    );
  };

  // Comentar va contra el backend real (POST /api/v1/wall/{postId}/comments). Ese endpoint solo
  // acepta texto (CreateWallCommentRequest exige @NotBlank): una foto sin texto no tiene forma de
  // guardarse todavía, así que se avisa en vez de fingir que se publicó.
  const handleAddComment = async (postId: string, textParam?: string, photoUriParam?: string) => {
    const text = (textParam ?? commentInputs[postId] ?? '').trim();
    const photoUri = photoUriParam ?? commentPhotos[postId]?.uri;
    if (!text) {
      if (photoUri) {
        Alert.alert(
          'Falta el texto',
          'Escribe algo para poder comentar. La foto se adjunta junto con el texto, no sola.'
        );
      }
      return;
    }

    try {
      await agregarComentarioRemoto(postId, text, photoUri);
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setCommentPhotos(prev => ({ ...prev, [postId]: null }));
    } catch (error) {
      Alert.alert('No se pudo comentar', mensajeDeError(error, 'Intenta de nuevo en un momento.'));
    }
  };

  // Agrega una foto de la galería al borrador: pide permiso, abre el selector, normaliza
  // (orientación EXIF + tamaño + compresión — `utils/normalizarImagen.ts`) y recién ahí la suma
  // al estado. `agregandoFoto` evita dobles taps mientras el selector nativo está abierto.
  const handleAgregarFoto = async () => {
    if (agregandoFoto) return;
    setAgregandoFoto(true);
    try {
      const foto = await elegirYNormalizarFotoMuro();
      if (foto) {
        setAttachedPhotos(prev => [...prev, foto]);
      }
    } finally {
      setAgregandoFoto(false);
    }
  };

  // `error instanceof ApiError` cubre las dos llamadas reales al backend (pedir la URL de subida,
  // publicar). Lo que NO es `ApiError` son los `Error` que este mismo handler lanza a mano (foto
  // sin subir por S3 sin configurar, PUT a S3 fallido) — esos ya traen un mensaje específico y
  // accionable, así que se muestran tal cual en vez de pisarlos con el genérico de
  // `mensajeDeError`.
  const mensajeDeFalloAlPublicar = (error: unknown): string => {
    const porDefecto = 'No pudimos publicar. Intenta de nuevo en un momento.';
    if (error instanceof ApiError) {
      return mensajeDeError(error, porDefecto);
    }
    return error instanceof Error && error.message ? error.message : porDefecto;
  };

  /**
   * Pide el cierre del hábito de post diario y, solo si de verdad se cerró recién, se lo dice a la
   * persona. El aviso es lo que el dueño del proyecto pidió que cerrara el flujo: *"luego que
   * salga un mensaje su habito de post en comunidad se completo con exito"*.
   *
   * Nunca lanza (ver `cerrarHabitoPostDiarioComunidad`): publicar ya salió bien y un fallo al
   * cerrar el hábito no puede terminar mostrando "No se pudo publicar".
   */
  const avisarSiSeCerroElHabitoDePostDiario = async () => {
    const resultado = await cerrarHabitoPostDiarioComunidad();
    if (resultado !== 'completado') return;
    // Training muestra la tarjeta del hábito y carga una sola vez al montarse: sin este aviso, la
    // persona lee "completado" acá y vuelve a encontrar la tarjeta sin tildar.
    avisarPostDiarioCerrado();
    Alert.alert(
      '¡Hábito completado! 🦅',
      'Tu hábito "Post diario en comunidad" se completó con éxito.'
    );
  };

  const handlePublishPost = async () => {
    if (!newPostText.trim()) {
      Alert.alert('Campo requerido', 'Por favor escribe tu reflexión o experiencia antes de publicar.');
      return;
    }
    // El backend exige al menos un archivo por publicación (`Publicacion.MEDIA_MIN = 1` — "una
    // publicación sin foto rompe la retícula"). Se corta acá, con el motivo a la vista, en vez de
    // dejar que el backend responda con un 400 genérico.
    if (attachedPhotos.length === 0) {
      Alert.alert('Falta una foto', 'Esta publicación necesita al menos una foto para poder compartirse en el Muro.');
      return;
    }
    if (subiendoPublicacion) return;

    // El modal se cierra YA y la publicación aparece en el muro en el mismo gesto: la subida a S3
    // y el POST siguen en segundo plano (ver `useWallFeed.publicarOptimista`). Antes esto esperaba
    // los tres viajes de red y ADEMÁS recargaba el feed entero antes de dejar cerrar — segundos de
    // pantalla trabada con el botón en "PUBLICANDO...".
    const texto = newPostText.trim();
    const fotos = attachedPhotos;
    // La categoría viaja igual que el texto y las fotos: se limpia al cerrar y se devuelve al
    // compositor si la publicación falla, para no obligar a volver a elegirla.
    const categoria = categoriaSeleccionada;
    setNewPostText('');
    setAttachedPhotos([]);
    setCategoriaSeleccionada(null);
    setCreatePostModalVisible(false);

    setSubiendoPublicacion(true);
    try {
      await publicarOptimista(texto, fotos, nombreUsuario, categoria);
      // El arranque guiado espera este momento para pasar al Pacto. Se avisa DESPUÉS del `await`,
      // con la publicación ya confirmada por el backend, y nunca en el `catch`: un post que falló
      // y se revirtió no es un primer post. El aviso solo adelanta lo que igual se confirma contra
      // `GET /wall/mine` (ver `sparkie/events/avisoPrimerPost.ts`).
      avisarPostPublicado();
      // El hábito "POST DIARIO EN COMUNIDAD" se cierra ACÁ, con la publicación ya confirmada.
      // Antes no se cerraba en ningún lado: el backend solo tenía la mitad guardiana de la regla
      // (rechaza `/complete` si no publicaste) y nadie disparaba la otra mitad, así que el hábito
      // quedaba pendiente hasta que el cron lo expiraba (E-117). No se pone en el `catch` por lo
      // mismo que `avisarPostPublicado`: un post que falló y se revirtió no cierra nada.
      void avisarSiSeCerroElHabitoDePostDiario();
    } catch (error) {
      // El post optimista ya se quitó del muro (rollback dentro del hook). Se devuelve el borrador
      // al modal para que la persona no tenga que volver a escribirlo ni a elegir la foto: perder
      // lo escrito por un fallo de red es peor que la espera que acabamos de sacar.
      setNewPostText(texto);
      setAttachedPhotos(fotos);
      setCategoriaSeleccionada(categoria);
      setCreatePostModalVisible(true);
      Alert.alert('No se pudo publicar', mensajeDeFalloAlPublicar(error));
    } finally {
      setSubiendoPublicacion(false);
    }
  };

  /**
   * Qué conversaciones se listan. Ahora lo decide solo el conmutador, porque hay una sola sección.
   *
   * Nada se perdió al fusionar Grupo con Miembros: la rama de la sección Grupo listaba
   * `type === 'celula'`, y "Directos" ya listaba `'direct' + 'celula'` —o sea, un SUPERCONJUNTO de
   * aquella—. Los chats de grupo siguen exactamente donde estaban para quien los buscaba en
   * Directos, y dejaron de aparecer dos veces en dos pestañas distintas.
   *
   * `'direct'` es además el único cajón donde se ve un chat de soporte (ver
   * `chatMappers.mapearTipoConversacion`): sacarlo de acá lo dejaría invisible.
   */
  /* REDISEÑO 2026-09-22 (autorizado por el dueño, ver AGENTS.md §1). Acá vivía
     `filteredConversations`, que leía un conmutador DIRECTOS | GLOBAL y devolvía
     `'direct' + 'celula'` en un cajón y `'global'` en el otro. Los grupos quedaban repartidos
     entre las dos pestañas y el de soporte escondido entre los 1 a 1.

     Ahora son dos listas fijas, sin conmutador: arriba los GRUPOS a los que la persona
     pertenece —el general, el de su mentor y el de soporte—, y abajo los DIRECTOS. El orden de
     los grupos es el de `ORDEN_GRUPOS` y no el que devuelva el servidor: es una lista de tres
     elementos que la persona va a mirar todos los días, así que tiene que estar siempre en el
     mismo lugar. Los directos sí conservan el orden del servidor, que es por actividad. */
  /* Corregido 2026-09-26 (chat estilo WhatsApp, pedido del dueño): acá decía que el orden de los
     grupos era FIJO (`ORDEN_GRUPOS = ['global', 'celula', 'soporte']`) y que los directos seguían
     el del servidor. Ahora las dos listas van por el último mensaje, lo más reciente arriba, como
     WhatsApp; las dos secciones siguen separadas (grupos y soporte arriba, 1 a 1 abajo). */
  const TIPOS_DE_FORMACION: ChatConversation['type'][] = ['global', 'celula', 'soporte'];
  /* 2026-09-29, pedido del dueño: «Formación Renaser Global» va SIEMPRE primero y el resto de los
     grupos sigue por el último mensaje. Importa sobre todo al Admin y al Alquimista, que ven todos
     los grupos; para los demás roles no cambia nada visible más que fijar el general arriba. */
  const gruposDeFormacion = conElGlobalPrimero(
    ordenarPorActividad(conversations.filter(conv => TIPOS_DE_FORMACION.includes(conv.type))),
  );
  const directos = ordenarPorActividad(conversations.filter(conv => conv.type === 'direct'));
  /* «Ahora» para las horas de la lista («21:04», «Ayer», «lun»): se toma en cada render, que es
     cuando la lista cambia. */
  const ahoraDeLaLista = new Date();

  /*
   * Lo que cada tarjeta del Muro le pide a la pantalla, en UN objeto que no cambia nunca (V-4).
   * Si cambiara en cada render, `memo` de `TarjetaPublicacionMuro` no serviría de nada: todas las
   * tarjetas se volverían a dibujar con cada "Like". Cada función reenvía a la versión MÁS NUEVA
   * del manejador (`accionesVigentes`), así que no se queda con estado viejo.
   */
  const accionesVigentes = useRef<AccionesPublicacion | null>(null);
  accionesVigentes.current = {
    alternarExpandida: postId => setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] })),
    alternarComentarios: handleToggleComments,
    alternarLike: postId => void handleToggleLike(postId),
    compartir: handleSharePost,
    verReacciones: postId => {
      setReactionsModalVisible(true);
      void cargarReacciones(postId);
    },
    abrirFotos: abrirVisorFotos,
    recordarProporcion,
    alternarComentarioExpandido: comentarioId =>
      setExpandedComments(prev => ({ ...prev, [comentarioId]: !prev[comentarioId] })),
    abrirFotoDeComentario: comentario => {
      setImageViewerData({
        authorName: comentario.author,
        timeAgo: comentario.timeAgo,
        postText: comentario.text,
        images: [{ url: comentario.photoAttached! }],
        initialIndex: 0,
      });
      setImageViewerVisible(true);
    },
    votarComentario: handleCommentVote,
    agregarEmoji: (postId, emoji) =>
      setCommentInputs(prev => ({ ...prev, [postId]: (prev[postId] || '') + emoji })),
    quitarFotoComentario: postId => setCommentPhotos(prev => ({ ...prev, [postId]: null })),
    elegirFotoComentario: postId => void handlePickCommentPhoto(postId),
    escribirComentario: (postId, texto) => setCommentInputs(prev => ({ ...prev, [postId]: texto })),
    enviarComentario: postId => void handleAddComment(postId),
  };
  const accionesPublicacion = useMemo<AccionesPublicacion>(
    () => ({
      alternarExpandida: id => accionesVigentes.current!.alternarExpandida(id),
      alternarComentarios: id => accionesVigentes.current!.alternarComentarios(id),
      alternarLike: id => accionesVigentes.current!.alternarLike(id),
      compartir: id => accionesVigentes.current!.compartir(id),
      verReacciones: id => accionesVigentes.current!.verReacciones(id),
      abrirFotos: (post, indice) => accionesVigentes.current!.abrirFotos(post, indice),
      recordarProporcion: (id, proporcion) => accionesVigentes.current!.recordarProporcion(id, proporcion),
      alternarComentarioExpandido: id => accionesVigentes.current!.alternarComentarioExpandido(id),
      abrirFotoDeComentario: comentario => accionesVigentes.current!.abrirFotoDeComentario(comentario),
      votarComentario: (id, comentarioId) => accionesVigentes.current!.votarComentario(id, comentarioId),
      agregarEmoji: (id, emoji) => accionesVigentes.current!.agregarEmoji(id, emoji),
      quitarFotoComentario: id => accionesVigentes.current!.quitarFotoComentario(id),
      elegirFotoComentario: id => accionesVigentes.current!.elegirFotoComentario(id),
      escribirComentario: (id, texto) => accionesVigentes.current!.escribirComentario(id, texto),
      enviarComentario: id => accionesVigentes.current!.enviarComentario(id),
    }),
    []
  );

  const renderPublicacion = useCallback(
    ({ item }: ListRenderItemInfo<PostItem>) => (
      <TarjetaPublicacionMuro
        post={item}
        expandida={!!expandedPosts[item.id]}
        comentariosAbiertos={!!openComments[item.id]}
        destacada={publicacionDestacada === item.id}
        proporcion={proporcionesFoto[item.id]}
        textoComentario={commentInputs[item.id] || ''}
        fotoComentario={commentPhotos[item.id]}
        comentariosExpandidos={expandedComments}
        acciones={accionesPublicacion}
      />
    ),
    [
      expandedPosts,
      openComments,
      publicacionDestacada,
      proporcionesFoto,
      commentInputs,
      commentPhotos,
      expandedComments,
      accionesPublicacion,
    ]
  );

  /* Si esta persona ACOMPAÑA un grupo. Se calcula acá y no dentro del JSX porque la pestaña Tribu
     lo pregunta dos veces: para pintar la entrada al grupo que acompaña y para saber si la
     tarjeta de la tribu es el primer bloque de la pantalla (y entonces lleva menos aire arriba). */
  const veLaEntradaAlGrupoQueAcompana = entradaAlGrupoVisible({
    esMentor,
    rol: user?.role,
    fallo: celulaQueAcompano.fallo,
  });

  /*
   * Las vistas del mentor toman la pantalla completa, igual que en Hoy: son otro contexto de
   * trabajo, no una tarjeta más dentro de Comunidad. Cada una registra su `useSystemBackHandler`,
   * así que el gesto del sistema las cierra paso a paso en vez de salir de la app.
   */
  const loQueTapa = loQueTapaComunidad(vistas, esMentor);
  if (loQueTapa === 'ficha-desde-la-info' && vistas.fichaDesdeLaInfo) {
    return (
      <AlumnoScreen
        alumno={vistas.fichaDesdeLaInfo.alumno}
        grupoId={vistas.fichaDesdeLaInfo.grupoId}
        onVolver={() => despacharVista({ tipo: 'volver-a-la-info' })}
      />
    );
  }
  if (loQueTapa === 'ficha-de-mi-grupo' && vistas.alumnoAbierto) {
    return (
      <AlumnoScreen
        alumno={vistas.alumnoAbierto}
        grupoId={celulaQueAcompano.vista?.celula.id ?? null}
        onVolver={() => despacharVista({ tipo: 'volver-a-mi-grupo' })}
      />
    );
  }
  if (loQueTapa === 'mi-grupo') {
    return (
      <MiCelulaScreen
        onSalir={() => despacharVista({ tipo: 'salir-de-mi-grupo' })}
        onAbrirAlumno={alumno => despacharVista({ tipo: 'abrir-ficha', alumno })}
        vista={celulaQueAcompano.vista}
        cargando={celulaQueAcompano.cargando}
        fallo={celulaQueAcompano.fallo}
        detalle={celulaQueAcompano.detalle}
        recargar={celulaQueAcompano.recargar}
      />
    );
  }

  return (
    /*
      BUG 2026-09-26 — «franja blanca» entre la barra de escribir y la barra de pestañas. Este
      `SafeAreaView` iba con los cuatro bordes, así que ponía `paddingBottom = insets.bottom` (la
      barra de gestos) pintado de `c.bg`; y la barra de pestañas, que se dibuja DEBAJO de la
      pantalla, ya reserva ese mismo inset (`TabBar`: `paddingBottom: max(insets.bottom, 14)`). El
      inset se pagaba dos veces, y el primero quedaba a la vista como una franja de otro color que el
      fondo del chat. Ahora el borde de abajo no se aplica acá: con la barra de pestañas visible lo
      pone ella, y en una conversación (sin barra) lo pinta el relleno del final con el color del chat.
    */
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.bg }}>
      {/* La ⓘ abre la info de tu grupo; sin grupo no se dibuja (E-409). */}
      {!pantallaCompleta && <ScreenHeader title="COMUNIDAD" {...botonDeInfo} />}

      {/* ========================================================================= */}
      {/* FILA DE SECCIONES: LAS CINCO, SIEMPRE A LA VISTA                          */}
      {/* ========================================================================= */}
      {/*
        REDISEÑO 2026-09-07. Antes acá vivía una portada ("TU TRIBU. TU SOPORTE. TU LEGADO.") con
        tres medallones que abrían sub-módulos, y recién adentro de cada uno había pestañas. El
        Muro —lo que la gente viene a ver— quedaba a dos toques y detrás de un nombre que no lo
        anunciaba. Ahora las cinco secciones están acá arriba, siempre visibles, y el contenido de
        la elegida se pinta abajo: un solo toque para cualquiera de ellas.

        Los medallones son EXACTAMENTE los de la portada que reemplazan (`styles.medallion`, mismo
        tamaño `medallionSize`, mismo oro, misma tipografía micro) — se movieron de lugar y se les
        agregó el estado activo, no se rediseñaron.

        Scroll horizontal y no cinco columnas repartidas: en un teléfono angosto cinco medallones
        a `flex: 1` dejan las etiquetas partidas en varios renglones. Con scroll cada una entra en
        uno, y la fila sigue sirviendo si mañana vuelve a haber seis.
      */}
      {/*
        Se esconde en las tres vistas que se toman la pantalla entera y traen su propio "atrás":
        la lección a pantalla completa, la sala de chat y la ficha del grupo. Ahí la fila no sirve
        para navegar —tocar otra sección haría abandonar lo que se está leyendo o escribiendo— y
        encima le come sesenta píxeles de alto a un reproductor de video o a un teclado abierto.
      */}
      {fullScreenLesson === null && activeChat === null && !groupInfoVisible && (
      <View style={[styles.seccionesBar, { borderBottomColor: c.divider }]}>
        {/* El lema de la casa. Estaba en la portada que se retiró y se conserva acá, en un solo
            renglón: es la voz de la marca, no un adorno de esa pantalla en particular. */}
        <Text
          style={[
            t.micro,
            { color: c.textSoft, textAlign: 'center', fontSize: 11, letterSpacing: 1.4, marginBottom: 10 },
          ]}
        >
          TU TRIBU. TU SOPORTE. TU LEGADO.
        </Text>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: horizontalPadding, gap: 12, alignItems: 'flex-start' }}
        >
          {SECCIONES.map(s => {
            const activa = seccionActiva === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => irASeccion(s.id)}
                hitSlop={6}
                style={{ alignItems: 'center', gap: 6, width: medallionSize + 26 }}
              >
                <View
                  style={[
                    styles.medallion,
                    {
                      width: medallionSize,
                      height: medallionSize,
                      borderRadius: medallionSize / 2,
                      borderColor: c.gold,
                      borderWidth: activa ? 1.6 : 1,
                      backgroundColor: activa ? c.gold : c.cardBgAlt,
                    },
                  ]}
                >
                  <Icon name={s.icon} size={rs(18)} color={activa ? '#1E1B18' : c.goldInk} strokeWidth={1.15} />
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    t.micro,
                    {
                      color: activa ? c.goldInk : c.textSoft,
                      textAlign: 'center',
                      letterSpacing: 0,
                      fontSize: 11,
                      fontFamily: activa ? 'Jost_700Bold' : 'Jost_400Regular',
                    },
                  ]}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      )}

      {/*
        MURO: una `FlatList` desde el 26/09/2026 (V-4). Antes compartía un `ScrollView` con
        Testimonios y Ranking y pintaba TODAS las publicaciones con `.map`; cada tarjeta avisaba su
        posición con `onLayout` → `setPostOffsets`, que re-renderizaba la pantalla entera una vez
        por publicación. Esa posición existía solo para llegar a la publicación que se abre desde
        Hoy: ahora eso lo hace `scrollToIndex` (ver `publicacionPedida`). La paginación pasó de
        `onScroll` + `estaCercaDelFinal` a `onEndReached`, que es lo mismo sin medir a mano.
      */}
      {seccionActiva === 'muro' && (
        <FlatList
          ref={muroListaRef}
          data={posts}
          keyExtractor={post => post.id}
          renderItem={renderPublicacion}
          ListHeaderComponent={
            <View style={{ gap: space.gap, paddingTop: 10, marginBottom: space.gap }}>
              {/* Botón Ventana Externa de Publicación */}
              <Pressable
                onPress={() => setCreatePostModalVisible(true)}
                style={[styles.createPostBar, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={[styles.avatarCircle, { backgroundColor: c.goldWash }]}>
                    <Text style={{ fontSize: 13 }}>🦅</Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[t.body, { color: c.textStrong, fontFamily: 'Jost_500Medium' }]}>
                      ¿Qué conquistaste hoy, {primerNombreUsuario}?
                    </Text>
                    {/* Era 10 px: por debajo del mínimo de micro-etiqueta, y es la línea que
                        explica qué pasa al tocar la barra. */}
                    <Text style={[t.small, { color: c.goldInk }]}>
                      Publicación sin límite de caracteres ›
                    </Text>
                  </View>
                </View>
                <View style={[styles.plusBadge, { backgroundColor: c.gold }]}>
                  <Text style={{ color: c.onGold, fontFamily: 'Jost_700Bold', fontSize: 16 }}>+</Text>
                </View>
              </Pressable>

              {/* Estados de carga/error del feed real — sin componentes nuevos, solo texto con
                  los mismos tokens que ya usa el resto de la pantalla. */}
              {muroCargando && posts.length === 0 && (
                <Text style={[t.body, { color: c.textSoft }]}>
                  Cargando el muro...
                </Text>
              )}
              {muroError && (
                <Text style={[t.body, { color: c.danger }]}>{muroError}</Text>
              )}
              {!muroCargando && !muroError && posts.length === 0 && (
                <Text style={[t.body, { color: c.textSoft }]}>
                  Todavía no hay publicaciones. ¡Sé el primero en compartir tu victoria!
                </Text>
              )}
            </View>
          }
          ItemSeparatorComponent={SeparadorDePublicaciones}
          ListFooterComponent={
            <View style={{ paddingTop: space.gap, paddingBottom: 28 }}>
              {/* Pie del lazy loading. Los dos mensajes son distintos a propósito: "trayendo más"
                  dice que hay que esperar, y "llegaste al final" cierra la lista para que nadie se
                  quede tirando hacia abajo de un muro que ya no tiene nada. El segundo solo se
                  muestra si de verdad había algo: un muro vacío ya tiene su propio mensaje. */}
              {muroCargandoMas && (
                <Text style={[t.small, { color: c.textSoft, textAlign: 'center', paddingVertical: 12 }]}>
                  Trayendo más publicaciones…
                </Text>
              )}
              {!muroCargandoMas && !hayMasPublicaciones && posts.length > 0 && (
                <Text style={[t.small, { color: c.textSoft, textAlign: 'center', paddingVertical: 12 }]}>
                  Llegaste al final del muro.
                </Text>
              )}
            </View>
          }
          onEndReached={alLlegarAlFinalDelMuro}
          // Pantalla y media antes del final, el mismo margen que tenía `MARGEN_PARA_PEDIR_MAS`:
          // las publicaciones nuevas ya están cuando la persona llega abajo.
          onEndReachedThreshold={1.5}
          onScrollToIndexFailed={alFallarScrollAPublicacion}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={9}
          // Sin recorte nativo de vistas: en Android deja en blanco fotos y cajas de comentario
          // al volver a subir. La virtualización ya la da `windowSize`.
          removeClippedSubviews={false}
        />
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN EVENTOS (2026-09-26, E-5 a E-8)                                   */}
      {/* ========================================================================= */}
      {/* El `ScrollView` es de la sección desde el arreglo del 26/09 (la lista no se refrescaba): su
          pull-to-refresh necesita el estado de la lectura. Mismo estilo de contenido que antes. */}
      {seccionActiva === 'eventos' && (
        <SeccionEventos
          userId={user?.id ?? null}
          rol={user?.role}
          eventoPedido={eventoPedido}
          onEventoPedidoAtendido={eventoPedidoAtendido}
          volverRef={eventosVolverRef}
          estiloDelContenido={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
              paddingTop: 14,
            },
          ]}
        />
      )}

      {/* ========================================================================= */}
      {/* SECCIONES TESTIMONIOS Y RANKING (comparten contenedor de scroll)          */}
      {/* ========================================================================= */}
      {(seccionActiva === 'testimonios' || seccionActiva === 'ranking') && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* PESTAÑA 2: TESTIMONIOS EN MEDIA LUNA */}
          {seccionActiva === 'testimonios' && (
            <View style={{ gap: space.gap, paddingTop: 10, paddingBottom: 28 }}>
              {/*
                PROXIMAMENTE (2026-09-05, decision del dueno del proyecto): "no hay verdaderos".

                Aca habia dos testimonios INVENTADOS presentados como reales, con nombre y
                apellido, profesion ("CEO & Fundador Tecnologico", "Directora Medica & Cirujana"),
                insignia de generacion, cifras de resultado ("+140% USD", "-50% Horas",
                "100% Sin Ansiedad") y un boton de "VER VIDEO TESTIMONIO" que no existia. Un
                testimonio falso atribuido a una persona con nombre no es contenido de relleno:
                es una afirmacion sobre resultados de un producto real.

                Se borraron los datos, no solo el render — mismo criterio que INITIAL_HABITS y que
                las guias de audio de TrainingScreen: si las cadenas quedan en el archivo, alguien
                las vuelve a colgar de una pantalla.

                El backend YA tiene testimonios (`TestimonioResponse`), pero el movil todavia no
                los pide. Cuando se conecten, esto pasa a ser la lista real con su estado vacio.
              */}
              <View style={[styles.mediaLunaCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <View style={styles.mediaLunaContent}>
                  <View style={[styles.badgePill, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                    <Text style={[t.micro, { color: c.goldInk, fontSize: 10.5, fontFamily: 'Jost_700Bold' }]}>
                      PRÓXIMAMENTE
                    </Text>
                  </View>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 16, marginTop: 10 }]}>
                    Historias de la tribu
                  </Text>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' }]}>
                    Todavía no hay testimonios publicados. Cuando los primeros graduados compartan
                    su historia, van a aparecer acá.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* PESTAÑA 3: PODIO RANKING */}
          {seccionActiva === 'ranking' && (
            <View style={{ gap: space.gap, paddingTop: 10, paddingBottom: 28 }}>
              {/*
                El podio se pinta SIEMPRE, con puntos o sin ellos (decisión del dueño del proyecto,
                2026-09-07). Antes, un corte sin posiciones dejaba la sección con una tarjeta gris
                que decía "Ranking Oficial en Espera de Puntos" y explicaba que el backend todavía
                no había registrado nada: la primera vez que alguien entraba al Ranking —que es
                justo cuando hay que engancharlo— se encontraba con un aviso de sistema.

                Ahora el escenario está armado desde el primer día y los tres lugares se muestran
                libres. `PodioRanking` sabe pintar cada puesto vacío (ver ahí); acá solo se decide
                cuándo mostrarlo, que es siempre salvo mientras se está cargando por primera vez —
                mostrar un podio vacío que un segundo después se llena sería mentirle a quien mira.
              */}
              {/* Qué tabla se mira. Las tres vienen en la misma respuesta del backend, así que
                  cambiar de una a otra no pide nada al servidor. Antes solo se veía la general:
                  la de coherencia se calculaba, se guardaba, y no la mostraba ninguna pantalla. */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {TABLAS_DE_RANKING.map(tabla => {
                  const activa = tipoRanking === tabla.clave;
                  return (
                    <Pressable
                      key={tabla.clave}
                      onPress={() => setTipoRanking(tabla.clave)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: activa }}
                      accessibilityLabel={`${tabla.titulo}: ${tabla.explica}`}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        paddingHorizontal: 6,
                        borderRadius: space.radius,
                        borderWidth: 1,
                        borderColor: activa ? c.gold : c.border,
                        backgroundColor: activa ? c.goldWash : 'transparent',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={[
                          t.micro,
                          {
                            color: activa ? c.goldInk : c.textSoft,
                            fontFamily: activa ? 'Jost_700Bold' : 'Jost_500Medium',
                          },
                        ]}
                      >
                        {tabla.titulo}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {/* Qué mide la tabla que se está mirando: tres listas de números sin rótulo no se
                  distinguen entre sí. */}
              <Text style={[t.small, { color: c.textSoft, marginBottom: 12 }]}>
                {TABLAS_DE_RANKING.find(tabla => tabla.clave === tipoRanking)?.explica}
              </Text>

              {rankingCargando && !podioTop1 ? (
                <View style={[styles.myRankCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                  <Text style={{ fontSize: 26, marginBottom: 8 }}>🏆</Text>
                  <Text style={[t.cardTitle, { color: c.textStrong }]}>
                    Cargando el ranking oficial...
                  </Text>
                </View>
              ) : (
                <>
                  {/* Podio de honor, en 3D y animado (ver `PodioRanking`). Lo que había acá era
                      este mismo podio pero plano y quieto: mismos colores, mismos altos, mismas
                      medallas. Se movió a su propio componente para que la animación viva junto al
                      dibujo y no le sume estado a esta pantalla, que ya es larga. */}
                  <PodioRanking
                    top1={podioTop1}
                    top2={podioTop2}
                    top3={podioTop3}
                    activo={seccionActiva === 'ranking'}
                  />

                  {/* La invitación reemplaza al aviso de sistema que había antes. Dice lo mismo que
                      hay que decir —todavía no hay posiciones en este corte, y de dónde salen los
                      puntos— pero desde lo que la persona puede hacer, no desde lo que al servidor
                      le falta. Solo aparece con el podio entero vacío: con un líder ya puesto,
                      "puedes ser el próximo" deja de ser cierto para el primer puesto. */}
                  {!podioTop1 && (
                    <View style={[styles.myRankCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                      <Text style={{ fontSize: 24, marginBottom: 8 }}>🏆</Text>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 18, lineHeight: 25 }]}>
                        Tú puedes ser el próximo líder del ranking
                      </Text>
                      <Text style={[t.body, { color: c.textSoft, marginTop: 10 }]}>
                        {invitacionSinPosiciones(tipoRanking)}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Tu Posición Personal Con Datos Reales del Usuario */}
              <View style={[styles.myRankCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.rankCircleNumber, { backgroundColor: c.gold }]}>
                    {/* Sin posición se pinta una raya sola: el "#-" que salía antes se leía como
                        un dato roto, no como un lugar todavía sin ocupar. */}
                    <Text style={[t.micro, styles.cifras, { color: c.onGold, fontFamily: 'Jost_700Bold' }]}>
                      {userRankEntry.rank === '-' ? '—' : `#${userRankEntry.rank}`}
                    </Text>
                  </View>
                  {/* Eran tres textos de 11 px con la familia escrita a mano. Pasan a los tokens,
                      que ya traen las cifras tabulares, y a tamaño de lectura. */}
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[t.cardTitle, styles.cifras, { color: c.textStrong, fontSize: 15, fontFamily: 'Jost_700Bold' }]}>
                      Tu Posición ({nombreUsuario})
                    </Text>
                    <Text style={[t.small, styles.cifras, { color: c.goldInk }]}>
                      {userRankEntry.cellText}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Tabla de Clasificación General */}
              {rankingList.length > 0 && (
                <View style={[styles.leaderboardList, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                  {/* Las filas entran escalonadas detrás del podio (ver `EntradaEscalonada`): la
                      tabla se lee de arriba hacia abajo, que es el orden en el que importa. */}
                  {rankingList.map((u, indice) => (
                    <EntradaEscalonada
                      key={u.id}
                      indice={indice}
                      activo={seccionActiva === 'ranking'}
                      style={[
                        styles.leaderboardRow,
                        { borderBottomColor: c.divider },
                        u.isCurrentUser && { backgroundColor: c.cardBgAlt },
                      ]}
                    >
                      <Text style={[t.small, styles.cifras, { color: u.medal ? c.goldInk : c.textSoft, fontFamily: 'Jost_700Bold', width: 34 }]}>
                        #{u.rank}
                      </Text>
                      <Text style={[t.body, { color: c.textStrong, fontFamily: u.isCurrentUser ? 'Jost_700Bold' : 'Jost_400Regular', flex: 1 }]}>
                        {u.name}
                      </Text>
                      <Text style={[t.small, styles.cifras, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                        ⚡ {u.scoreText}
                      </Text>
                    </EntradaEscalonada>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN CLASSROOM: CATÁLOGO DE CURSOS                                     */}
      {/* ========================================================================= */}
      {inExclusiveResources && selectedCourse === null && fullScreenLesson === null && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: space.gap, paddingTop: 10, paddingBottom: 28 }}>
            {/* Estados de carga/error/vacío del catálogo real — sin componentes nuevos, mismo
                patrón de texto plano que ya usa el Muro más arriba en esta pantalla. */}
            {cursosCargando && courses.length === 0 && (
              <Text style={[t.body, { color: c.textSoft }]}>
                Cargando tus cursos...
              </Text>
            )}
            {cursosError && (
              <Text style={[t.body, { color: c.danger }]}>{cursosError}</Text>
            )}
            {!cursosCargando && !cursosError && courses.length === 0 && (
              <Text style={[t.body, { color: c.textSoft }]}>
                Todavía no tienes cursos disponibles para tu día de programa.
              </Text>
            )}
            {courses.map(course => (
              <Pressable
                key={course.id}
                onPress={() => handleAbrirCurso(course)}
                style={[
                  styles.courseCard,
                  { borderColor: c.border, backgroundColor: c.cardBg },
                  // Mismo valor que ya usa `YoScreen.tsx` para `stage.locked` (opacidad reducida,
                  // sin colores/bordes/íconos nuevos) — la tarjeta entera se atenúa para marcar
                  // que todavía no se puede abrir.
                  course.locked && { opacity: 0.5 },
                ]}
              >
                {/* Antes: `LinearGradient` opaco haciendo de portada de relleno (sin `<Image>`).
                    Ahora: `View` con el mismo alto/padding de siempre (`courseCoverHeader`,
                    intacto), y `CursoPortada` pintando la foto real como fondo absoluto detrás
                    del badge y el título — que siguen siendo los mismos hijos de siempre, en el
                    mismo orden, sin tocar su estilo. */}
                <View style={styles.courseCoverHeader}>
                  <CursoPortada url={course.coverUrl} />
                  <View style={[styles.courseCategoryBadge, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                    <Text style={[t.micro, { color: c.goldInk, fontSize: 10.5, fontFamily: 'Jost_700Bold' }]}>
                      {course.category}
                    </Text>
                  </View>
                  <Text style={[t.screenTitle, { color: '#FFFFFF', fontSize: 16.5, lineHeight: 22 }]} numberOfLines={2}>
                    {course.title}
                  </Text>
                </View>

                <View style={{ padding: space.cardPad, gap: 10 }}>
                  {!!course.summary && (
                    <View>
                      <Text
                        style={[t.body, { color: c.textSoft }]}
                        numberOfLines={expandedCourseSummaries[course.id] ? undefined : 2}
                      >
                        {course.summary}
                      </Text>
                      {course.summary.length > 80 && (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            setExpandedCourseSummaries(prev => ({
                              ...prev,
                              [course.id]: !prev[course.id],
                            }));
                          }}
                          hitSlop={8}
                          style={{ alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' }}
                        >
                          <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                            {expandedCourseSummaries[course.id] ? 'Ver menos ▲' : 'Ver más... ▼'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                  <View style={{ gap: 4, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[t.small, styles.cifras, { color: c.textSoft, fontSize: 12.5 }]}>
                        {course.totalResources} {course.totalResources === 1 ? 'Lección' : 'Lecciones'}
                      </Text>
                      <Text style={[t.small, styles.cifras, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12.5 }]}>
                        {obtenerProgresoCurso(course)}% Completado
                      </Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: c.divider }]}>
                      <View style={[styles.progressBarFill, { width: `${obtenerProgresoCurso(course)}%`, backgroundColor: c.gold }]} />
                    </View>
                  </View>
                  <View style={[styles.exploreBtn, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                    <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 0.5 }]}>
                      EXPLORAR CONTENIDO ›
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3.1: DETALLE DEL CURSO (SECCIONES Y RECURSOS)                       */}
      {/* ========================================================================= */}
      {inExclusiveResources && selectedCourse !== null && fullScreenLesson === null && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable
              onPress={() => setSelectedCourseId(null)}
              style={styles.backBtnRow}
              hitSlop={8}
            >
              <Icon name="arrowLeft" size={14} color={c.goldInk} />
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                VOLVER A CURSOS
              </Text>
            </Pressable>
          </View>

          <View style={[styles.courseHeaderBox, { borderColor: c.border, backgroundColor: c.cardBg, overflow: 'hidden' }]}>
            {selectedCourse.coverUrl ? (
              <View style={{ height: 140, marginHorizontal: -space.cardPad, marginTop: -space.cardPad, marginBottom: 14, overflow: 'hidden' }}>
                <CursoPortada url={selectedCourse.coverUrl} />
              </View>
            ) : null}
            <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 22, lineHeight: 28 }]}>
              {selectedCourse.title}
            </Text>
            {!!selectedCourse.summary && (
              <View style={{ marginTop: 8 }}>
                <Text
                  style={[t.body, { color: c.textSoft }]}
                  numberOfLines={expandedCourseSummaries[selectedCourse.id] ? undefined : 2}
                >
                  {selectedCourse.summary}
                </Text>
                {selectedCourse.summary.length > 80 && (
                  <Pressable
                    onPress={() =>
                      setExpandedCourseSummaries(prev => ({
                        ...prev,
                        [selectedCourse.id]: !prev[selectedCourse.id],
                      }))
                    }
                    hitSlop={8}
                    style={{ alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' }}
                  >
                    <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                      {expandedCourseSummaries[selectedCourse.id] ? 'Ver menos ▲' : 'Ver más... ▼'}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          <View style={{ gap: space.gapLg, marginTop: space.gapLg, paddingBottom: 28 }}>
            {selectedCourse.sections.map(section => (
              <View key={section.id} style={styles.sectionCard}>
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 0.8 }]}>
                  {section.title}
                </Text>
                <View style={{ gap: 10 }}>
                  {section.lessons.map(lesson => {
                    const globalIdx = allCourseLessons.findIndex(l => l.id === lesson.id);
                    const completada = esLeccionCompletada(lesson.id, globalIdx >= 0 ? globalIdx : undefined);
                    const anteriorCompleta = globalIdx > 0 ? esLeccionCompletada(allCourseLessons[globalIdx - 1].id, globalIdx - 1) : true;
                    const bloqueadaPorSecuencia = globalIdx > 0 && !anteriorCompleta && !completada;
                    const bloqueada = !!lesson.locked || bloqueadaPorSecuencia;

                    return (
                      <Pressable
                        key={lesson.id}
                        onPress={() => handleAbrirLeccion(lesson)}
                        style={[
                          styles.lessonItemRow,
                          {
                            borderColor: completada ? c.gold : c.border,
                            backgroundColor: completada
                              ? (c.goldWash)
                              : c.cardBgAlt,
                          },
                          bloqueada && { opacity: 0.5 },
                        ]}
                      >
                        <View
                          style={[
                            styles.resourceTypeIcon,
                            { backgroundColor: completada ? c.goldWash : c.divider },
                          ]}
                        >
                          <Text style={{ fontSize: 15 }}>
                            {bloqueada
                              ? '🔒'
                              : lesson.type === 'video'
                              ? '🎥'
                              : lesson.type === 'doc'
                              ? '📄'
                              : lesson.type === 'link'
                              ? '🔗'
                              : '✍️'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              t.cardTitle,
                              {
                                color: completada ? c.goldInk : c.textStrong,
                                fontSize: 15,
                                fontFamily: completada ? 'Jost_700Bold' : 'Jost_500Medium',
                              },
                            ]}
                          >
                            {lesson.title}
                          </Text>
                          <Text style={[t.small, { color: completada ? c.goldInk : c.micro, fontSize: 12.5 }]}>
                            {completada ? '✓ Completada' : lesson.meta}
                          </Text>
                        </View>
                        {completada ? (
                          <View style={[styles.completedBadgePill, { backgroundColor: c.goldWash }]}>
                            <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                              ✓ HECHO
                            </Text>
                          </View>
                        ) : bloqueada ? (
                          <Icon name="lock" size={13} color={c.textSoft} />
                        ) : (
                          <Icon name="chevron" size={12} color={c.goldInk} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {/* D-99: preguntarle a Sparkie sobre ESTE curso, al pie de la lista de lecciones. */}
          <ChatDelCurso cursoId={selectedCourse.id} cursoTitulo={selectedCourse.title} diaPrograma={diaPrograma} />
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3.2: LECCIÓN A PANTALLA COMPLETA (VIDEO, DOC, LINK, ESCRITO)        */}
      {/* ========================================================================= */}
      {inExclusiveResources && leccionMostrada !== null && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          ref={leccionScrollRef}
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable
              onPress={() => setFullScreenLesson(null)}
              style={styles.backBtnRow}
              hitSlop={8}
            >
              <Icon name="arrowLeft" size={14} color={c.goldInk} />
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                VOLVER A LA SECCIÓN
              </Text>
            </Pressable>
          </View>

          <View style={[styles.lessonInfoCard, { borderColor: c.border, backgroundColor: c.cardBg, marginTop: 10 }]}>
            <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 22, lineHeight: 28 }]}>
              {leccionMostrada.title}
            </Text>
            <Text style={[t.small, { color: c.goldInk, marginTop: 6 }]}>
              {leccionMostrada.meta}
            </Text>
            {/* Con los enlaces tocables: el cuerpo de una lección puede traer el link de un
                formulario, y como texto plano no había forma de abrirlo desde un teléfono. */}
            {!!leccionMostrada.desc && (
              <TextoConEnlaces
                texto={leccionMostrada.desc}
                style={[t.body, { color: c.textSoft, marginTop: 10 }]}
              />
            )}

            {/* Reproductor — nuevo, el diseño original no tenía ninguno (ver
                `LeccionVideoPlayer.tsx`). Se monta solo cuando la lección tiene video real; el
                WebView adentro solo se crea recién al tocar "reproducir". `key` fuerza un
                componente nuevo por lección, así el estado de reproducción no se arrastra de una
                lección a la siguiente. */}
            {!!leccionMostrada.videoUrl && (
              <View style={{ marginTop: 14 }}>
                <LeccionVideoPlayer
                  key={leccionMostrada.id}
                  videoTipo={leccionMostrada.videoTipo}
                  videoUrl={leccionMostrada.videoUrl}
                  videoMiniaturaUrl={leccionMostrada.videoMiniaturaUrl}
                  videoDuracionMs={leccionMostrada.videoDuracionMs}
                />
              </View>
            )}

            {/* Estados de carga/error del detalle real — mismo patrón de texto plano que el resto
                de la pantalla, sin componentes nuevos. */}
            {cargandoDetalleLeccionId === leccionMostrada.id && (
              <Text style={[t.body, { color: c.textSoft, marginTop: 14 }]}>Cargando lección...</Text>
            )}
            {errorDetalleLeccionPorId[leccionMostrada.id] && (
              <Text style={[t.body, { color: c.danger, marginTop: 14 }]}>
                {errorDetalleLeccionPorId[leccionMostrada.id]}
              </Text>
            )}

            {/* `content` es el cuerpo LARGO de la lección — el que trae el link del formulario — y
                `desc` el resumen corto de arriba. Los dos se pintan por separado, así que enlazar
                solo `desc` (2026-09-18) dejó el caso real sin arreglar: el enlace que la persona
                necesita tocar vive acá. */}
            {leccionMostrada.content && (
              <View style={{ marginTop: space.gapLg, padding: 14, borderRadius: space.radiusSm, backgroundColor: c.goldWash }}>
                <TextoConEnlaces texto={leccionMostrada.content} style={[t.body, { color: c.text }]} />
              </View>
            )}

            <GoldButton
              label={esLeccionCompletada(leccionMostrada.id, currentLessonIndex) ? '↺ QUITAR DE COMPLETADAS' : '✓ MARCAR LECCIÓN COMO COMPLETADA'}
              loading={actualizandoCompletado}
              onPress={() => handleAlternarLeccionCompletada(leccionMostrada)}
              style={{ width: '100%', marginTop: space.gapLg }}
            />

            {/* Fila de navegación sucesiva entre lecciones (Req 3 y 4) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
              {prevLesson ? (
                <Pressable
                  onPress={() => handleAbrirLeccion(prevLesson)}
                  style={[styles.exploreBtn, { flex: 1, borderColor: c.border, backgroundColor: c.cardBgAlt, paddingVertical: 10 }]}
                  hitSlop={6}
                >
                  <Text style={[t.micro, { color: c.textSoft, fontFamily: 'Jost_700Bold' }]}>
                    ‹ ANTERIOR
                  </Text>
                </Pressable>
              ) : (
                <View style={{ flex: 1 }} />
              )}

              {allCourseLessons.length > 0 && (
                <Text style={[t.small, styles.cifras, { color: c.micro, textAlign: 'center' }]}>
                  {currentLessonIndex + 1} / {allCourseLessons.length}
                </Text>
              )}

              {nextLesson ? (
                <Pressable
                  onPress={() => {
                    const estaCompleta = esLeccionCompletada(leccionMostrada.id, currentLessonIndex);
                    if (!estaCompleta) {
                      Alert.alert(
                        'Lección pendiente 🔒',
                        'Para poder avanzar debes marcar esta lección como completada.'
                      );
                      return;
                    }
                    handleAbrirLeccion(nextLesson);
                  }}
                  style={[
                    styles.exploreBtn,
                    {
                      flex: 1,
                      borderColor: esLeccionCompletada(leccionMostrada.id, currentLessonIndex) ? c.gold : c.border,
                      backgroundColor: c.cardBgAlt,
                      paddingVertical: 10,
                      opacity: esLeccionCompletada(leccionMostrada.id, currentLessonIndex) ? 1 : 0.6,
                    },
                  ]}
                  hitSlop={6}
                >
                  <Text
                    style={[
                      t.micro,
                      {
                        color: esLeccionCompletada(leccionMostrada.id, currentLessonIndex) ? c.goldInk : c.textSoft,
                        fontFamily: 'Jost_700Bold',
                      },
                    ]}
                  >
                    {esLeccionCompletada(leccionMostrada.id, currentLessonIndex) ? 'SIGUIENTE ›' : 'SIGUIENTE 🔒'}
                  </Text>
                </Pressable>
              ) : isLastLesson ? (
                <Pressable
                  onPress={() => {
                    const estaCompleta = esLeccionCompletada(leccionMostrada.id, currentLessonIndex);
                    if (!estaCompleta) {
                      Alert.alert(
                        'Última lección pendiente 🔒',
                        'Debes marcar la última lección como completada para finalizar el curso.'
                      );
                      return;
                    }
                    setFullScreenLesson(null);
                    setSelectedCourseId(null);
                  }}
                  style={[
                    styles.exploreBtn,
                    {
                      flex: 1,
                      borderColor: esLeccionCompletada(leccionMostrada.id, currentLessonIndex) ? c.gold : c.border,
                      backgroundColor: esLeccionCompletada(leccionMostrada.id, currentLessonIndex)
                        ? c.goldWash
                        : c.cardBgAlt,
                      paddingVertical: 10,
                      opacity: esLeccionCompletada(leccionMostrada.id, currentLessonIndex) ? 1 : 0.6,
                    },
                  ]}
                  hitSlop={6}
                >
                  <Text
                    style={[
                      t.micro,
                      {
                        color: esLeccionCompletada(leccionMostrada.id, currentLessonIndex) ? c.goldInk : c.textSoft,
                        fontFamily: 'Jost_700Bold',
                      },
                    ]}
                  >
                    {esLeccionCompletada(leccionMostrada.id, currentLessonIndex) ? 'FINALIZAR ›' : 'FINALIZAR 🔒'}
                  </Text>
                </Pressable>
              ) : (
                <View style={{ flex: 1 }} />
              )}
            </View>
          </View>

          {/* D-99: preguntarle a Sparkie sobre ESTA leccion, al pie, despues del contenido. */}
          <ChatDelCurso
            cursoId={selectedCourse?.id ?? null}
            cursoTitulo={selectedCourse?.title ?? 'este curso'}
            leccionTitulo={leccionMostrada.title}
            diaPrograma={diaPrograma}
          />
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA TRIBU: PRIMERO QUIÉNES SON, DESPUÉS DÓNDE LES HABLAS              */}
      {/* ========================================================================= */}
      {/*
        REDISEÑO 2026-09-21, autorizado por el dueño del producto: acá vivían DOS pestañas, "Grupo"
        y "Miembros", y se fusionaron en esta.

        El orden no es el de antes apilado. Quien entra a Tribu viene a una de dos cosas, y están
        separadas en ese orden:

          1. QUIÉNES SON MI TRIBU — el mentor y los integrantes. Es una consulta, no una tarea: se
             mira al principio y de vez en cuando. Por eso es UNA tarjeta compacta y no tres
             secciones con rótulo propio (mentor / tribu privada / interacciones), que era lo que
             empujaba la bandeja fuera de la primera pantalla.
          2. DÓNDE HABLO CON ELLOS — el conmutador y la bandeja de conversaciones. Es lo que de
             verdad se hace acá todos los días, así que arranca visible sin tener que desplazar.

        Lo que se fue a segundo plano, y por qué:
          · La lista completa de integrantes pasó a abrirse BAJO DEMANDA desde la tarjeta. Antes no
            existía en esta pantalla: había cuatro avatares y un "+N" que no llevaba a ningún lado,
            y para ver quién más estaba había que entrar a un chat de grupo y abrir su ficha.
          · Las tres tarjetas de "Interacciones clave" se fueron del todo el 2026-09-22: eran
            números constantes escritos a mano, sin endpoint detrás. Ver la nota donde vivía
            `METRICAS`.
          · El rótulo "Chat de tu grupo" con su lista aparte desapareció, y no se perdió nada: los
            chats de grupo salen en la sección "Formación Renaser", junto al general y al de
            soporte. Eran la misma lista dos veces, una en cada pestaña.
      */}
      {enTribu && activeChat === null && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
          /* Deslizar hacia abajo relee la lista de chats (2026-09-27): orden y no leídos al día. */
          refreshControl={
            <RefreshControl
              refreshing={conversacionesRefrescando}
              onRefresh={() => void recargarConversaciones({ deslizando: true })}
              tintColor={c.goldInk}
              colors={[c.goldInk]}
            />
          }
        >
          {/* -------------------------------------------------------------------------------
              PARA QUIEN ACOMPAÑA. Va arriba de todo porque es lo que ese perfil viene a hacer;
              el resto de la pestaña —su mentor, su tribu, sus chats— sigue igual para él.

              Misma condición que la tarjeta de Hoy, y por eso vive en una función y no acá: son
              las DOS entradas al mismo grupo (RF-26), y una que se esconda mientras la otra no
              sería peor que las dos vacías.
          ------------------------------------------------------------------------------- */}
          {veLaEntradaAlGrupoQueAcompana ? (
            <View style={styles.tribuBloqueInicial}>
              <MicroLabel>Acompañamiento</MicroLabel>
              <Pressable
                onPress={() => despacharVista({ tipo: 'abrir-mi-grupo' })}
                accessibilityRole="button"
                accessibilityLabel="Abrir el grupo que acompañas"
                style={[styles.entradaMentor, { borderColor: c.goldInk, backgroundColor: c.goldWash }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[t.cardTitle, { color: c.textStrong }]} numberOfLines={1}>
                    {celulaQueAcompano.vista?.celula.nombre ?? 'Mi grupo'}
                  </Text>
                  <Text style={[t.small, { color: c.textSoft, marginTop: 2 }]}>
                    {celulaQueAcompano.cargando
                      ? 'Cargando…'
                      : celulaQueAcompano.vista
                        ? `${celulaQueAcompano.vista.resumen.total} ${
                            celulaQueAcompano.vista.resumen.total === 1 ? 'aprendiz' : 'aprendices'
                          }`
                        : 'Ver el grupo que acompañas'}
                  </Text>
                </View>
                <Icon name="chevron" size={16} color={c.goldInk} />
              </Pressable>
            </View>
          ) : null}

          {/* -------------------------------------------------------------------------------
              1. QUIÉNES SON TU TRIBU — una sola tarjeta: mentor arriba, grupo en el medio, pulso
              al pie. Las tres cosas describen al mismo sujeto, así que se leen como un objeto y
              no como tres bloques sueltos con rótulo propio.
          ------------------------------------------------------------------------------- */}
          <View
            style={[
              styles.tribuCard,
              veLaEntradaAlGrupoQueAcompana ? styles.tribuCardConEntradaArriba : styles.tribuBloqueInicial,
              { borderColor: c.border, backgroundColor: c.cardBg },
            ]}
          >
            {/* MENTOR. Sin chevron: no lleva a ninguna parte —el grupo no trae el id de usuario
                del mentor, así que no hay DM que abrir— y una flecha que no responde al toque es
                peor que no tenerla. Escribirle se hace por el chat del grupo, que ahora está en
                esta misma pantalla, unos centímetros más abajo. */}
            {/* Solo para aprendices (2026-09-26): a un mentor o al staff «Todavía no tienes un
                mentor asignado» le decía algo falso sobre sí mismo. */}
            {tarjetaDeTribu.mostrarMentor && (
            <>
            <View style={styles.tribuMentor}>
              <AvatarPersona
                nombre={mentorDeLaTarjeta.nombre}
                avatarUrl={mentorDeLaTarjeta.avatarUrl}
                size={mentorPhoto}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[t.cardTitle, { color: c.textStrong }]}>{mentorTitulo}</Text>
                {mentorSubtitulo && (
                  <Text style={[t.small, { color: c.micro, marginTop: 2 }]}>{mentorSubtitulo}</Text>
                )}
                {mentorNota && (
                  <Text style={[t.small, { color: c.textSoft, marginTop: 6, lineHeight: 18 }]}>
                    {mentorNota}
                  </Text>
                )}
              </View>
            </View>

            <View style={[styles.tribuFilete, { backgroundColor: c.divider }]} />
            </>
            )}

            {/* Quien está en varios grupos sin ser aprendiz de ninguno (un mentor que acompaña
                dos) elige de cuál ver la gente. Con uno solo, no aparece nada. */}
            {celulaDeLaTarjeta && grupos.length > 1 && (
              <View style={styles.tribuSelectorGrupos}>
                {grupos.map(g => {
                  const elegido = g.cellId === celulaDeLaTarjeta.cellId;
                  return (
                    <Pressable
                      key={g.cellId}
                      onPress={() => setGrupoDeTribuElegido(g.cellId)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: elegido }}
                      accessibilityLabel={`Ver los integrantes de ${g.cellName}`}
                      style={[
                        styles.tribuChipGrupo,
                        { borderColor: elegido ? c.goldInk : c.border, backgroundColor: elegido ? c.goldWash : c.cardBg },
                      ]}
                    >
                      <Text numberOfLines={1} style={[t.body, { color: elegido ? c.goldInk : c.textSoft, fontFamily: 'Jost_500Medium' }]}>
                        {g.cellName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* GRUPO + INTEGRANTES. Toda la fila es el interruptor del desplegable, no solo el
                "VER TODOS": el área pulsable es de más de 48 px de alto y ocupa el ancho entero
                (AGENTS.md §4). Los avatares van en su propio renglón con `flexWrap` para que en
                una pantalla de 320 px no empujen el rótulo fuera de la tarjeta. */}
            <Pressable
              onPress={() => setIntegrantesAbiertos(abiertos => !abiertos)}
              disabled={integrantesDelGrupo.length === 0}
              accessibilityRole="button"
              accessibilityState={{
                expanded: integrantesAbiertos,
                disabled: integrantesDelGrupo.length === 0,
              }}
              accessibilityLabel={
                integrantesAbiertos ? 'Ocultar los integrantes de tu tribu' : 'Ver los integrantes de tu tribu'
              }
              style={styles.tribuGrupo}
            >
              <View style={styles.tribuGrupoTitulo}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[t.cardTitle, { color: c.textStrong }]}>
                    {nombreDeMiTribu ?? 'Tu tribu'}
                  </Text>
                  {resumenDeMiTribu && (
                    <Text style={[t.small, { color: c.textSoft, marginTop: 2 }]}>{resumenDeMiTribu}</Text>
                  )}
                </View>

                {integrantesDelGrupo.length > 0 && (
                  <View style={styles.tribuVerTodos}>
                    <Text
                      numberOfLines={1}
                      style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 0.8 }]}
                    >
                      {integrantesAbiertos ? 'OCULTAR' : 'VER TODOS'}
                    </Text>
                    {/* El ícono `chevron` apunta a la derecha: girado 90° baja (cerrado, "se
                        abre hacia abajo") y −90° sube (abierto, "se cierra"). */}
                    <View style={{ transform: [{ rotate: integrantesAbiertos ? '-90deg' : '90deg' }] }}>
                      <Icon name="chevron" size={14} color={c.goldInk} />
                    </View>
                  </View>
                )}
              </View>

              {tribuCargando && companerosDeLaTarjeta.length === 0 && (
                <Text style={[t.small, { color: c.textSoft, marginTop: 8 }]}>Cargando tu tribu...</Text>
              )}
              {!tribuCargando && tribuError && companerosDeLaTarjeta.length === 0 && (
                <Text style={[t.small, { color: c.danger, marginTop: 8 }]}>{tribuError}</Text>
              )}
              {!tribuCargando && !tribuError && companerosDeLaTarjeta.length === 0 && (
                <Text style={[t.small, { color: c.textSoft, marginTop: 8 }]}>
                  {tarjetaDeTribu.grupo.fuente === 'ninguno'
                    ? 'Todavía no estás en ningún grupo.'
                    : 'Todavía no tienes integrantes en tu grupo.'}
                </Text>
              )}
              {companerosDeLaTarjeta.length > 0 && (
                <View style={styles.tribuAvatares}>
                  {tribuVisibles.map(m => (
                    <AvatarPersona key={m.traineeId} nombre={m.fullName} avatarUrl={m.avatarUrl} size={avatarSize} />
                  ))}
                  {tribuRestantes > 0 && (
                    <View
                      style={[
                        styles.more,
                        {
                          width: avatarSize,
                          height: avatarSize,
                          borderRadius: avatarSize / 2,
                          backgroundColor: c.goldWash,
                        },
                      ]}
                    >
                      <Text style={[t.small, styles.cifras, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                        +{tribuRestantes}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          </View>

          {/* -------------------------------------------------------------------------------
              INTEGRANTES, BAJO DEMANDA. Fuera de la tarjeta a propósito: cada fila ya es una
              tarjeta con su borde, y meterlas dentro de otra deja dos contornos anidados, que es
              precisamente la sensación de "recargado" que este rediseño vino a sacar.

              Renglón `FilaIntegrante` con la fuente `integrantesDelGrupo`: acá, sin chat abierto,
              esa lista cae sola al grupo principal. (Hasta el 2026-09-27 la info del grupo de una
              sala de chat usaba el mismo renglón; desde el rediseño al estilo WhatsApp tiene el
              suyo, `FilaDeIntegranteDelChat`. Este desplegable no cambió.)
          ------------------------------------------------------------------------------- */}
          {integrantesAbiertos && (
            <View style={styles.tribuIntegrantes}>
              <Text
                style={[
                  t.micro,
                  styles.cifras,
                  { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 },
                ]}
              >
                INTEGRANTES ({integrantesDelGrupo.length})
              </Text>

              {tribuCargando && integrantesDelGrupo.length === 0 && (
                <Text style={[t.body, { color: c.textSoft }]}>Cargando integrantes…</Text>
              )}
              {!tribuCargando && tribuError && (
                <Text style={[t.body, { color: c.danger }]}>{tribuError}</Text>
              )}

              {integrantesDelGrupo.map(m => (
                <FilaIntegrante
                  key={m.id}
                  integrante={m}
                  onChatear={usuarioId => void abrirDMConIntegrante(usuarioId)}
                />
              ))}
            </View>
          )}

          {/* -------------------------------------------------------------------------------
              2. DÓNDE HABLAS CON ELLOS. El conmutador es el mismo de siempre —directos y global,
              los mismos dos valores y el mismo filtro—; solo perdió los emojis, que obligaban a
              encoger el texto para que "💬 DIRECTOS" entrara en media fila. Sin ellos la palabra
              entra entera y se lee a tamaño completo.
          ------------------------------------------------------------------------------- */}
          <View style={styles.tribuConversaciones}>
            <MicroLabel>Formación Renaser</MicroLabel>

            {/* Los grupos a los que la persona PERTENECE: el general, el de su mentor y el de
                soporte.
                > Corregido 2026-09-26. Decía que se pintaban con `entradaMentor` (fila dorada con
                > chevron) en orden fijo, como «tres destinos». El dueño pidió la lista estilo
                > WhatsApp: ahora son filas de chat, ordenadas por el último mensaje, y el sello
                > del avatar distingue grupo y soporte.

                No hay estado vacío por grupo: si el servidor no devolvió uno, esa fila no existe.
                Inventar una fila apagada "Soporte (no disponible)" sería prometer un lugar al que
                no se puede entrar. */}
            {gruposDeFormacion.length === 0 && !conversacionesCargando && !conversacionesError && (
              <Text style={[t.body, { color: c.textSoft, marginTop: space.gap }]}>
                Todavía no estás en ningún grupo.
              </Text>
            )}
            {/* Filas estilo WhatsApp (2026-09-26): avatar del programa, último mensaje, hora y
                no leídos. Abren el chat por el mismo camino de siempre (`handleAbrirChat`). */}
            <View style={{ marginTop: 6 }}>
              {gruposDeFormacion.map(grupo => (
                <FilaDeConversacion
                  key={grupo.id}
                  conversacion={grupo}
                  titulo={nombreVisibleDeConversacion(grupo)}
                  ahora={ahoraDeLaLista}
                  onPress={() => handleAbrirChat(grupo)}
                />
              ))}
            </View>
          </View>

          <View style={styles.tribuConversaciones}>
            <MicroLabel>Directos</MicroLabel>
          </View>

          {/* ========================================================================= */}
          {/* BANDEJA DE CONVERSACIONES                                                */}
          {/* ========================================================================= */}
          {/*
            Corregido el 2026-09-22: acá decía «un solo listado […]: lo que elige qué se ve es
            `filteredConversations` leyendo el conmutador de arriba». Ya no hay conmutador. Son dos
            listas a la vez —los grupos arriba, los 1 a 1 acá— y este bloque es el segundo. La
            navegación a cada conversación (`handleAbrirChat`) no cambió, y es la misma que usan
            las filas de grupo de arriba.
          */}
          {/* Estados de carga/error del listado real — mismo criterio que el Muro (texto con los
              tokens que ya usa el resto de la pantalla, sin componentes nuevos). */}
          {conversacionesCargando && conversations.length === 0 && (
            <Text style={[t.body, { color: c.textSoft, marginTop: space.gapLg }]}>
              Cargando tus conversaciones...
            </Text>
          )}
          {conversacionesError && (
            <Text style={[t.body, { color: c.danger, marginTop: space.gapLg }]}>
              {conversacionesError}
            </Text>
          )}
          {!conversacionesCargando && !conversacionesError && directos.length === 0 && (
            <Text style={[t.body, { color: c.textSoft, marginTop: space.gapLg }]}>
              Todavía no tienes conversaciones uno a uno.
            </Text>
          )}

          {/* Los 1 a 1. Los grupos ya salieron arriba, en Formación Renaser. */}
          <View style={{ paddingTop: 6, paddingBottom: 28 }}>
            {directos.map(conv => (
              <FilaDeConversacion
                key={conv.id}
                conversacion={conv}
                titulo={nombreVisibleDeConversacion(conv)}
                ahora={ahoraDeLaLista}
                onPress={() => handleAbrirChat(conv)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 4.1: SALA DE CHAT ACTIVA (TIPO WHATSAPP)                            */}
      {/* ========================================================================= */}
      {enTribu && activeChat !== null && !groupInfoVisible && (
        /*
          BUG ENCONTRADO 2026-09-17: al tocar el campo de texto, el teclado tapaba la barra de
          escritura entera — no se veía ni lo que se estaba escribiendo ni el botón de enviar.
          Acá había un `<View style={{ flex: 1 }}>` pelado, contando con que Android encogiera la
          ventana (`softwareKeyboardLayoutMode: "resize"`, que es el valor por omisión de Expo).
          Desde que el modo edge-to-edge es obligatorio en Android (SDK 54+) la ventana YA NO se
          encoge: la app sigue dibujando debajo del teclado, así que todo lo que está al pie
          —barra de escritura y barra de pestañas— queda fuera de la vista.

          `behavior="padding"` se corrige solo y por eso va en las dos plataformas: React Native
          calcula el alto que hace falta como `fondo de esta vista − borde superior del teclado`,
          de modo que en un dispositivo donde la ventana SÍ se encoja el resultado da 0 y no
          agrega nada. No hay riesgo de levantar el composer de más.

          `keyboardVerticalOffset={insets.top}`: el alto lo mide contra su padre (el SafeAreaView),
          cuyo origen ya está por debajo del inset de arriba, mientras que la posición del teclado
          viene en coordenadas de pantalla. Sin compensar esa diferencia la barra quedaba justo
          esos píxeles por debajo del borde del teclado — medio tapada.
        */
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: paletaDelChat.fondo }}
          behavior="padding"
          keyboardVerticalOffset={insets.top}
        >
          {/* Cabecera estilo WhatsApp (2026-09-26): avatar, nombre y «Grupo · N integrantes» /
              «Aprendiz · 1 a 1» / «En línea». Tocarla abre la info (en un grupo, sus integrantes).

              El «En línea» de un 1 a 1 es un dato: sale de `useChatEnVivo`, que lo pregunta al
              abrir (`GET .../presence`) y lo mantiene por el socket; `participantesEnLinea` ya
              excluye a uno mismo. No se dice «última vez»: esa columna nadie la escribe.

              El número de integrantes sale del grupo de ESTA conversación (`/me/cells` cruzado por
              `celulaId`, D-142) y cuenta a todos los de la conversación, mentor incluido
              (`integrantesDelChatDeGrupo`); si todavía no se resolvió no se inventa una cifra.
              > Corregido 2026-09-26: decía que `memberCount` «incluye a los mentores». No: son
              > solo los aprendices vigentes, y un mentor leía «0 integrantes» en su propio grupo. */}
          <CabeceraDeChat
            tipo={activeChat.type}
            titulo={nombreVisibleDeConversacion(activeChat)}
            subtitulo={subtituloDeLaCabecera({
              tipo: activeChat.type,
              integrantes: integrantesDelChatDeGrupo(grupoAbierto),
              subtitulo: activeChat.subtitle,
            })}
            enLinea={activeChat.type === 'direct' && participantesEnLinea.size > 0}
            avatarUrl={activeChat.avatarUrl}
            fotoPath={activeChat.fotoPath}
            onVolver={() => setActiveChat(null)}
            onAbrirInfo={() => setGroupInfoVisible(true)}
          />

          {/* Mensajes estilo WhatsApp (2026-09-26): separadores de día, tandas del mismo
              remitente (cola solo en la primera, nombre en color en los grupos) y la hora dentro
              de la burbuja.

              LISTA INVERTIDA (2026-09-27). En el emulador, el grupo «Fénix» (~12 mensajes, varios
              largos) abría ARRIBA, en «Ayer» y las primeras bienvenidas, y no bajaba nunca. Era un
              `ScrollView` que dependía de que el `scrollToEnd` de `onContentSizeChange` llegara
              después de medir todo (lo más probable: corrió con la medida vieja y nada lo repitió;
              ver `formatoChat.elementosDeLaListaInvertida`). Invertida, el desplazamiento 0 ES
              el último mensaje: abre ahí sin pedirlo, y lo que crece después de medirse —un texto
              largo, una foto que carga— crece hacia arriba sin mover el final. Quien está abajo ve
              aparecer lo nuevo sin que nada se desplace; a quien subió a leer lo deja quieto
              `maintainVisibleContentPosition`, puesto SOLO mientras está arriba
              (`posicionAMantener`). El «↓» con los nuevos y la bajada al mandar uno propio los
              decide `useBajadaDelChat`. */}
          <View style={styles.chatMensajes}>
            <FlatList
              key={activeChat.id}
              ref={bajadaDelChat.listaRef}
              inverted
              data={elementosDelChat}
              keyExtractor={elemento => elemento.clave}
              renderItem={renderElementoDelChat}
              extraData={playingAudioId}
              keyboardShouldPersistTaps="handled"
              style={{ backgroundColor: paletaDelChat.fondo }}
              contentContainerStyle={styles.chatMensajesContenido}
              onScroll={bajadaDelChat.alDesplazarse}
              scrollEventThrottle={64}
              maintainVisibleContentPosition={posicionAMantener(bajadaDelChat.estado)}
              removeClippedSubviews={false}
              initialNumToRender={20}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={[styles.chatAviso, { color: c.textSoft }]}>
                  {mensajesCargando ? 'Cargando mensajes...' : 'Todavía no hay mensajes. ¡Escribe el primero!'}
                </Text>
              }
            />
            {mostrarBotonBajar(bajadaDelChat.estado) && (
              <BotonBajarAlFinal
                nuevosSinVer={bajadaDelChat.estado.nuevosSinVer}
                onPress={bajadaDelChat.bajarAlFinal}
              />
            )}
          </View>

          {/*
            Barra de escribir, con la gramática de WhatsApp: mientras se graba, la barra entera
            pasa a ser el estado de la grabación (cronómetro corriendo y un solo botón para
            cortar y enviar) en vez de seguir mostrando controles que en ese momento no hacen
            nada. Es lo que separa "grabar" de "escribir" sin explicárselo a nadie.
          */}
          {/* Barra estilo WhatsApp (2026-09-26): un campo redondeado con los adjuntos adentro
              —cámara/galería— y afuera un solo botón redondo que es micrófono sin texto y enviar
              con texto. Hasta el 2026-09-29 adentro estaba también el círculo verde con ✓ para
              subir la evidencia de un hábito; se quitó a pedido del dueño. */}
          {!grabando && avisoDelLargoDelMensaje(chatInputText) ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.chatAviso, { color: c.textSoft, backgroundColor: paletaDelChat.fondo, paddingVertical: 4 }]}
            >
              {avisoDelLargoDelMensaje(chatInputText)}
            </Text>
          ) : null}
          <View style={[styles.chatInputBar, { backgroundColor: paletaDelChat.fondo }]}>
            <View style={[styles.chatCampo, { backgroundColor: paletaDelChat.ajena, borderColor: c.border }]}>
              {grabando ? (
                <View style={styles.chatGrabando}>
                  <View style={[styles.grabandoPunto, { backgroundColor: c.danger }]} />
                  <Text style={[styles.chatTextoCampo, styles.cifras, { color: c.text }]}>
                    Grabando… {formatearSegundos(segundosGrabados)}
                  </Text>
                </View>
              ) : (
                <>
                  <TextInput
                    value={chatInputText}
                    onChangeText={setChatInputText}
                    placeholder="Mensaje"
                    placeholderTextColor={c.textSoft}
                    multiline
                    // E-374 (D-215): el mismo tope que el servidor; cerca del tope, el aviso de abajo.
                    maxLength={LARGO_MAXIMO_DEL_MENSAJE}
                    style={[styles.chatTextoCampo, styles.textInputChat, { color: c.text }]}
                    accessibilityLabel="Escribe un mensaje"
                  />
                  <Pressable
                    onPress={handleAdjuntarFoto}
                    disabled={enviandoMedia}
                    hitSlop={4}
                    style={[styles.mediaOptionBtn, { opacity: enviandoMedia ? 0.4 : 1 }]}
                    accessibilityLabel="Enviar una foto"
                  >
                    <Icon name="camera" size={22} color={c.goldInk} />
                  </Pressable>
                </>
              )}
            </View>

            {grabando ? (
              <Pressable
                onPress={() => void alternarGrabacion()}
                style={[styles.sendBtnGold, { backgroundColor: c.gold }]}
                accessibilityLabel="Terminar y enviar la nota de voz"
              >
                <Icon name="send" size={22} color={c.onGold} />
              </Pressable>
            ) : chatInputText.trim() ? (
              <Pressable
                onPress={() => void handleEnviarTextoReal()}
                style={[styles.sendBtnGold, { backgroundColor: c.gold }]}
                accessibilityLabel="Enviar mensaje"
              >
                <Icon name="send" size={22} color={c.onGold} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => void alternarGrabacion()}
                disabled={enviandoMedia}
                style={[styles.sendBtnGold, { backgroundColor: c.gold, opacity: enviandoMedia ? 0.4 : 1 }]}
                accessibilityLabel="Grabar una nota de voz"
              >
                <Icon name="mic" size={22} color={c.onGold} />
              </Pressable>
            )}
          </View>

        </KeyboardAvoidingView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 4.2: INFO DEL CHAT (TIPO WHATSAPP)                                  */}
      {/* ========================================================================= */}
      {/* Rediseño del 2026-09-27, pedido del dueño («si le doy en el círculo, ver la info del grupo
          tipo WhatsApp»): avatar grande, nombre grande, «Grupo · N integrantes» / «Chat de
          soporte» / el rol del otro, y en los grupos la sección «N integrantes» con el mentor
          primero y la marca de cada uno. A pantalla completa como el chat: sin «COMUNIDAD», sin la
          fila de secciones ni la barra de pestañas (`pantallaCompleta` sigue en pie porque hay
          conversación abierta); ← y el «atrás» de Android vuelven al chat.

          Se conserva lo corregido el 2026-09-26: la info de un chat que NO es de grupo muestra lo
          suyo y la lista de integrantes es solo de los grupos. Tocar a un compañero abre su 1 a 1
          con la misma acción que tenía el botón «Chatear» de antes (`abrirDMConIntegrante`). */}
      {enTribu && groupInfoVisible && activeChat && (
        <InfoDelChat
          tipo={activeChat.type}
          titulo={tituloDeLaInfo(activeChat.type)}
          nombre={activeChat.type === 'celula' ? nombreDelGrupo : nombreVisibleDeConversacion(activeChat)}
          avatarUrl={activeChat.avatarUrl}
          fotoPath={activeChat.fotoPath}
          subtitulo={subtituloDeLaInfo({
            tipo: activeChat.type,
            integrantes: cifraDeLaInfo,
            rolDelOtro: activeChat.rolDelOtro,
            subtitulo: activeChat.subtitle,
          })}
          detalle={activeChat.type === 'celula' && grupoAbierto?.cohortName ? `Cohorte ${grupoAbierto.cohortName}` : null}
          integrantes={
            activeChat.type === 'direct'
              ? null
              : {
                  filas: filasDeLaInfo,
                  cifra: cifraDeLaInfo,
                  cargando: participantesDeLaInfo.cargando,
                  error: participantesDeLaInfo.error,
                  hayMas: participantesDeLaInfo.hayMas,
                  cargandoMas: participantesDeLaInfo.cargandoMas,
                  onVerMas: participantesDeLaInfo.verMas,
                  busqueda: busquedaDeIntegrantes,
                  // El buscador solo cuando son varios (la comunidad): en un grupo de cinco estorba.
                  onBuscar: (participantesDeLaInfo.totalSinBuscar ?? 0) > UMBRAL_DEL_BUSCADOR ? setBusquedaDeIntegrantes : undefined,
                }
          }
          onVolver={() => setGroupInfoVisible(false)}
          onAbrirChatCon={usuarioId => void abrirDMConIntegrante(usuarioId)}
          onVerFicha={abrirFichaDesdeLaInfo}
          fotoDelGrupo={
            activeChat.type === 'celula' &&
            celulaIdAbierto &&
            puedeCambiarLaFotoDelGrupo({ mentorId: grupoAbierto?.mentorId, yoId: user?.id, miRol: user?.role })
              ? {
                  grupoId: celulaIdAbierto,
                  tieneFotoPropia: !!activeChat.fotoPath,
                  // La lista relee y trae la ruta nueva (otro `?v=`); la abierta la toma de ahí.
                  onCambiada: () => void recargarConversaciones({ forzar: true }),
                }
              : null
          }
        />
      )}

      {/* Sin barra de pestañas (conversación a pantalla completa), el inset de abajo —la barra de
          gestos o de tres botones— lo pinta este relleno con el fondo de lo que está a la vista, en
          vez de dejar la barra de escribir debajo de la del sistema. Con el teclado abierto queda
          detrás del teclado: el `KeyboardAvoidingView` mide desde su propio borde, que está encima. */}
      {pantallaCompleta && insets.bottom > 0 && (
        <View style={{ height: insets.bottom, backgroundColor: groupInfoVisible ? c.bg : paletaDelChat.fondo }} />
      )}

      {/* ========================================================================= */}
      {/* MODAL: FOTO DE CHAT A PANTALLA COMPLETA                                   */}
      {/* ========================================================================= */}
      {/*
        Modal propio y no `ImageViewerModal`: aquél es del Muro y arrastra reacciones, comentarios
        y `postId`, nada de lo cual existe en un mensaje de chat. Acá alcanza con ver la foto
        grande y cerrar, que es exactamente lo que hace WhatsApp.
      */}
      <Modal
        visible={fotoChatAmpliada !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFotoChatAmpliada(null)}
      >
        <Pressable style={styles.visorFotoFondo} onPress={() => setFotoChatAmpliada(null)}>
          {fotoChatAmpliada && (
            <Image
              source={{ uri: fotoChatAmpliada }}
              style={styles.visorFotoImagen}
              resizeMode="contain"
              accessibilityLabel="Foto del chat a pantalla completa"
            />
          )}
        </Pressable>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: PERFIL DEL INTEGRANTE DEL GRUPO                                 */}
      {/* ========================================================================= */}
      <Modal
        visible={selectedMemberProfile !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMemberProfile(null)}
      >
        <View style={styles.modalOverlay}>
          {selectedMemberProfile && (
            <View style={[styles.profileModalCard, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.divider, paddingBottom: 8 }}>
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                  PERFIL DEL INTEGRANTE
                </Text>
                <Pressable onPress={() => setSelectedMemberProfile(null)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Icon name="close" size={12} color={c.goldInk} />
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>Cerrar</Text>
              </View>
                </Pressable>
              </View>

              <View style={[styles.profileAvatarLarge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                <Text style={{ fontSize: 32 }}>{selectedMemberProfile.avatar}</Text>
              </View>

              <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16, textAlign: 'center', marginTop: 4 }]}>
                {selectedMemberProfile.name}
              </Text>
              <Text style={[t.micro, { color: c.goldInk, textAlign: 'center', fontSize: 10.5 }]}>
                {selectedMemberProfile.role}
              </Text>

              <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8 }}>
                <View style={[styles.metricBoxItem, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5, textAlign: 'center' }]}>RACHA</Text>
                  <Text style={[t.metric, { color: c.success, fontSize: 13, textAlign: 'center' }]}>
                    🔥 {selectedMemberProfile.streakDays} Días
                  </Text>
                </View>
                <View style={[styles.metricBoxItem, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5, textAlign: 'center' }]}>GRUPO</Text>
                  <Text style={[t.metric, { color: c.goldInk, fontSize: 13, textAlign: 'center' }]}>
                    {selectedMemberProfile.cell}
                  </Text>
                </View>
              </View>

              <View style={[styles.focusCard, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>ENFOQUE PRINCIPAL:</Text>
                <Text style={[t.body, { color: c.textStrong, fontSize: 11.5, fontFamily: 'Jost_500Medium', marginTop: 2 }]}>
                  {selectedMemberProfile.focus}
                </Text>
              </View>

              <GoldButton
                label="💬 ENVIAR MENSAJE DIRECTO 1 A 1"
                onPress={() => handleStartDirectChat(selectedMemberProfile)}
                style={{ width: '100%', marginTop: 10 }}
              />
            </View>
          )}
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: VENTANA EXTERNA DE PUBLICACIÓN A PANTALLA COMPLETA                */}
      {/* ========================================================================= */}
      <Modal
        visible={createPostModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setCreatePostModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <View style={[styles.modalHeaderBar, { borderBottomColor: c.divider }]}>
            {/*
              Los tres elementos sumaban más que el ancho de la pantalla en móviles de 360 dp (o
              con la letra del sistema agrandada): el título se montaba sobre "CANCELAR" y
              "PUBLICAR" se cortaba contra el borde. Ahora los dos botones se quedan con su ancho
              (`flexShrink: 0`) y el título se lleva el sobrante, achicándose hasta caber en una
              sola línea.
            */}
            <Pressable
              onPress={() => setCreatePostModalVisible(false)}
              hitSlop={8}
              style={{ minHeight: 48, justifyContent: 'center', flexShrink: 0 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="close" size={14} color={c.goldInk} />
                <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>CANCELAR</Text>
              </View>
            </Pressable>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[t.cardTitle, { color: c.textStrong, flex: 1, minWidth: 0, textAlign: 'center' }]}
            >
              NUEVA PUBLICACIÓN
            </Text>
            <Pressable
              onPress={handlePublishPost}
              disabled={subiendoPublicacion}
              style={[styles.publishHeaderBtn, { backgroundColor: c.gold }, subiendoPublicacion && { opacity: 0.6 }]}
            >
              <Text numberOfLines={1} style={[t.small, { color: c.onGold, fontFamily: 'Jost_700Bold' }]}>
                {subiendoPublicacion ? 'PUBLICANDO...' : 'PUBLICAR'}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.cardPad, gap: space.gapLg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.avatarCircle, { backgroundColor: c.goldWash }]}>
                <Text style={{ fontSize: 14 }}>🦅</Text>
              </View>
              <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[t.cardTitle, { color: c.textStrong }]}>{nombreUsuario}</Text>
                {firmaDePublicacion ? (
                  <Text numberOfLines={1} style={[t.small, { color: c.goldInk }]}>{firmaDePublicacion}</Text>
                ) : null}
              </View>
            </View>

            {/* Categorías del catálogo del servidor (`GET /api/v1/wall/categories`), no una lista
                escrita a mano: el administrador las da de alta y les cambia emoji/nombre desde el
                panel, y eso tiene que llegar a la app sin publicar una versión nueva.
                Elegir una es OPCIONAL — `category` es opcional en el backend — así que ninguna
                viene preseleccionada y volver a tocar la elegida la desmarca. Los tres estados de
                red se resuelven acá abajo y en ninguno el compositor queda inutilizable: sin
                catálogo se publica igual, sin categoría. */}
            <View style={{ gap: 6 }}>
              {cargandoCategoriasMuro && categoriasMuro.length === 0 && (
                <Text style={[t.small, { color: c.textSoft }]}>CARGANDO CATEGORÍAS...</Text>
              )}

              {!cargandoCategoriasMuro && errorCategoriasMuro && categoriasMuro.length === 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={[t.body, { color: c.textSoft, flexShrink: 1 }]}>
                    No pudimos cargar las categorías. Puedes publicar igual, sin categoría.
                  </Text>
                  <Pressable
                    onPress={() => void recargarCategoriasMuro()}
                    hitSlop={8}
                    style={[styles.tagSelectorPill, { borderColor: c.gold, backgroundColor: c.cardBg }]}
                  >
                    <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>REINTENTAR</Text>
                  </Pressable>
                </View>
              )}

              {!cargandoCategoriasMuro && !errorCategoriasMuro && categoriasMuro.length === 0 && (
                <Text style={[t.body, { color: c.textSoft }]}>
                  Todavía no hay categorías configuradas. Tu publicación se guarda igual.
                </Text>
              )}

              {categoriasMuro.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {categoriasMuro.map(categoria => {
                    const elegida = categoriaSeleccionada === categoria.key;
                    return (
                      <Pressable
                        key={categoria.key}
                        onPress={() => setCategoriaSeleccionada(elegida ? null : categoria.key)}
                        style={[
                          styles.tagSelectorPill,
                          { borderColor: c.border, backgroundColor: c.cardBgAlt },
                          elegida && { borderColor: c.gold, backgroundColor: c.cardBg },
                        ]}
                      >
                        <Text style={[t.small, { color: elegida ? c.goldInk : c.textSoft, fontFamily: 'Jost_700Bold' }]}>
                          {`${categoria.emoji} ${categoria.label.toUpperCase()}`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <TextInput
              value={newPostText}
              onChangeText={setNewPostText}
              placeholder="Escribe tu reflexión, victoria o experiencia de hoy (sin límite de caracteres)..."
              placeholderTextColor={c.textSoft}
              multiline
              textAlignVertical="top"
              style={[styles.fullPostInput, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
            />

            <View style={{ gap: 10 }}>
              <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>FOTOS ADJUNTAS (AL MENOS UNA):</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {attachedPhotos.map((foto, idx) => (
                  <View
                    key={foto.uri}
                    style={[styles.attachedPhotoCard, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                  >
                    {/* Miniatura real de la foto ya normalizada — mismo chip del diseño original
                        (styles.attachedPhotoCard intacto), solo que ahora también muestra la
                        imagen elegida y no únicamente su nombre. */}
                    <Image source={{ uri: foto.uri }} style={{ width: 24, height: 24, borderRadius: 6 }} />
                    <Text style={[t.small, { color: c.goldInk }]} numberOfLines={1}>
                      {foto.nombre}
                    </Text>
                    <Pressable
                      onPress={() => setAttachedPhotos(prev => prev.filter((_, i) => i !== idx))}
                      hitSlop={8}
                      style={{ minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="close" size={14} color={c.danger} />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={handleAgregarFoto}
                  disabled={agregandoFoto}
                  style={[
                    styles.addMorePhotoBtn,
                    { borderColor: c.border, backgroundColor: c.cardBg },
                    agregandoFoto && { opacity: 0.6 },
                  ]}
                >
                  <Icon name="plus" size={16} color={c.textSoft} />
                  <Text style={[t.small, { color: c.textSoft }]}>
                    {agregandoFoto ? 'Abriendo...' : 'Agregar'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: QUIÉN REACCIONÓ (solo "me gusta")                                  */}
      {/* ========================================================================= */}
      <Modal
        visible={reactionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReactionsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.reactionsModalCard, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.divider, paddingBottom: 10 }}>
              <Text style={[t.cardTitle, { color: c.textStrong }]}>REACCIONES DEL POST</Text>
              <Pressable onPress={() => setReactionsModalVisible(false)} hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="close" size={14} color={c.goldInk} />
                  <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>Cerrar</Text>
                </View>
              </Pressable>
            </View>

            {/* Sin pestañas de filtro: con el dislike retirado del producto queda un solo tipo de
                reacción, así que "TODOS / LIKES / DISLIKES" filtraba entre una opción y ella
                misma. En su lugar, el conteo directo de quiénes dieron "me gusta". */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 12 }}>
              <Icon name="thumbsUp" size={14} color={c.textSoft} />
              <Text style={[t.small, styles.cifras, { color: c.textSoft }]}>
                {reactionUsers.length} me gusta
              </Text>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
              {/* Mismos tokens que los estados del feed real (muroCargando/muroError/lista vacía,
                  más arriba en esta pantalla) — ningún componente nuevo, solo texto. */}
              {cargandoReacciones && (
                <Text style={[t.body, { color: c.textSoft, paddingVertical: 14 }]}>
                  Cargando reacciones...
                </Text>
              )}
              {!cargandoReacciones && errorReacciones && (
                <Text style={[t.body, { color: c.danger, paddingVertical: 14 }]}>
                  {errorReacciones}
                </Text>
              )}
              {!cargandoReacciones && !errorReacciones && reactionUsers.length === 0 && (
                <Text style={[t.body, { color: c.textSoft, paddingVertical: 14 }]}>
                  Todavía nadie reaccionó a esta publicación.
                </Text>
              )}
              {!cargandoReacciones && !errorReacciones && reactionUsers.length > 0 && reactionUsers.map(user => (
                <View key={user.id} style={[styles.reactionUserRow, { borderBottomColor: c.divider }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.avatarCircle, { backgroundColor: c.goldWash }]}>
                      <Text style={{ fontSize: 13 }}>{user.avatar}</Text>
                    </View>
                    <View style={{ gap: 2 }}>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 15 }]}>{user.name}</Text>
                      <Text style={[t.small, { color: c.micro }]}>{user.role}</Text>
                    </View>
                  </View>
                  <Icon name="thumbsUp" size={16} color={c.goldInk} />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Visor de Fotos a Pantalla Completa estilo Facebook / X */}
      {(() => {
        const activeViewerPost = posts.find(p => p.id === imageViewerData.postId) || null;
        return (
          <ImageViewerModal
            visible={imageViewerVisible}
            onClose={() => setImageViewerVisible(false)}
            images={imageViewerData.images}
            initialIndex={imageViewerData.initialIndex}
            authorName={activeViewerPost?.author || imageViewerData.authorName}
            timeAgo={activeViewerPost?.timeAgo || imageViewerData.timeAgo}
            postText={activeViewerPost?.text || imageViewerData.postText}
            postId={activeViewerPost?.id}
            likes={activeViewerPost?.likes}
            userReaction={activeViewerPost?.userReaction}
            comments={activeViewerPost?.comments}
            onToggleLike={handleToggleLike}
            onVerReacciones={pid => {
              setReactionsModalVisible(true);
              void cargarReacciones(pid);
            }}
            onCommentVote={handleCommentVote}
            onAddComment={(pid, txt, photoUri) => handleAddComment(pid, txt, photoUri)}
            onShare={handleSharePost}
            conversations={conversations}
            tieneCelula={tieneGrupo}
            onShareToConversation={async conv => {
              if (activeViewerPost) {
                await handleShareToConversation(activeViewerPost, conv);
              }
            }}
          />
        );
      })()}

      {/* Modal de Compartir para Publicaciones del Feed */}
      {shareSheetPost && (
        <Modal
          visible={!!shareSheetPost}
          transparent
          animationType="fade"
          onRequestClose={() => setShareSheetPost(null)}
        >
          <Pressable
            style={styles.shareModalBackdrop}
            onPress={() => setShareSheetPost(null)}
          >
            <Pressable style={{ width: '100%' }} onPress={e => e.stopPropagation()}>
              <SharePostSheet
                post={shareSheetPost}
                conversations={conversations}
                tieneCelula={tieneGrupo}
                onClose={() => setShareSheetPost(null)}
                onShareExternal={() => handleShareExternal(shareSheetPost)}
                onShareToConversation={async conv => {
                  await handleShareToConversation(shareSheetPost, conv);
                  setShareSheetPost(null);
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

/**
 * Pasada de limpieza visual del 2026-09-14, la misma que ya se hizo en Hoy, Plan, Training y Yo.
 *
 * **La regla de los bordes.** Un `borderWidth` se queda sólo si el elemento es un **contenedor
 * externo** (se apoya en el fondo de la pantalla) o una **afordancia** (un campo, un botón, una
 * opción que se selecciona). Todo borde que vivía DENTRO de otro borde se fue. Esta pantalla era
 * la peor del repo en eso: una publicación del Muro llegaba a tener trece descendientes con borde
 * propio, y la lista de lecciones apilaba tres niveles (tarjeta de sección → fila de lección →
 * cuadrito del ícono).
 *
 * **Por qué a veces cambia el fondo al quitar un borde.** En modo claro `bg` (#FCFBF9) y `cardBg`
 * (#FDFCFA) son casi el mismo color: lo que dibuja una caja es su BORDE, no su fondo. Así que lo
 * que pierde la línea y tiene que seguir viéndose pasa a `goldWash` o `divider`. Lo que no
 * necesita verse como caja (los recuadros detrás de una foto) se queda sin nada.
 *
 * **Radios.** Contenedor `space.radius` (20), interno `space.radiusSm` (12). Había dieciocho
 * valores distintos entre 2.5 y 24.
 *
 * **Alturas.** Todo lo pulsable llega a 48 px (AGENTS.md §4). Había pestañas de 28, píldoras de
 * categoría de 25 y botones de la barra de chat de 32.
 */
const styles = StyleSheet.create({
  chatAviso: {
    fontFamily: 'Jost_400Regular',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  /* La lista de mensajes y, encima, el botón «↓» (2026-09-27). */
  chatMensajes: {
    flex: 1,
  },
  chatMensajesContenido: {
    paddingVertical: 10,
    flexGrow: 1,
  },
  tribuSelectorGrupos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tribuChipGrupo: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    maxWidth: '100%',
  },
  // 56 px de alto: entrada principal, pulsable sin apuntar (AGENTS.md §4).
  entradaMentor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: space.radius,
    borderWidth: 1,
    marginTop: 8,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: space.screenX,
    paddingBottom: ESPACIO_PARA_LANZADOR,
  },
  /** Cifras que cambian en pantalla: ancho de dígito fijo para que nada salte (AGENTS.md §4). */
  cifras: { fontVariant: ['tabular-nums'] },
  /* ----------------------------------------------------------------------------------------
     PESTAÑA TRIBU (rediseño 2026-09-21). Reemplazan a `section` (el rótulo + bloque que repetían
     Mentor / Tribu privada / Interacciones clave), a `mentor` (la tarjeta del mentor, que ahora
     es la primera fila de la tarjeta de la tribu) y a `metric` (las tres cajas con número, hoy
     una línea de texto).
     ---------------------------------------------------------------------------------------- */
  /** El primer bloque de la pestaña: menos aire arriba que entre bloques (`gapLg` son 28). */
  tribuBloqueInicial: {
    marginTop: 14,
  },
  tribuCardConEntradaArriba: {
    marginTop: space.gapLg,
  },
  /** La tarjeta única de "quiénes son tu tribu": mentor, grupo y pulso. */
  tribuCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
  },
  tribuMentor: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  /** Filete interno de la tarjeta. Separa las tres zonas sin abrir tres tarjetas. */
  tribuFilete: {
    height: 1,
    marginVertical: 14,
  },
  /* Interruptor del desplegable de integrantes: toda la fila. `minHeight` por si algún día el
     grupo no tiene nombre ni resumen y queda solo el rótulo (AGENTS.md §4, 48 px). */
  tribuGrupo: {
    minHeight: 48,
    justifyContent: 'center',
  },
  tribuGrupoTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  /* No se encoge: el nombre del grupo, que sí puede, es el que cede el ancho. */
  tribuVerTodos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  /* `flexWrap`: con cuatro avatares, el "+N" y la letra del sistema en grande, en una pantalla de
     320 px la fila no entra de una sola línea (AGENTS.md §2, cero desbordamientos). */
  tribuAvatares: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  /** El desplegable de integrantes, fuera de la tarjeta: cada fila trae su propio borde. */
  tribuIntegrantes: {
    gap: space.gap,
    marginTop: space.gap,
  },
  tribuConversaciones: {
    marginTop: space.gapLg,
  },
  /* El "+N" del desborde de avatares: es un disco, no una caja. Sin borde, con lavado dorado
     para que se distinga del fondo también en modo claro. */
  more: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallion: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * Franja de la fila de secciones. Va FUERA de los `ScrollView` de contenido a propósito: es lo
   * que la deja fija mientras el Muro (o el catálogo, o el ranking) scrollea debajo.
   */
  seccionesBar: {
    borderBottomWidth: 1,
    paddingTop: 4,
    paddingBottom: 10,
  },
  detailTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  /** 48 px: es el "volver" de todas las sub-vistas y medía 14 de alto. */
  backBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
    paddingRight: 8,
  },
  /* Acá vivía `categoryPillBadge`, la píldora «INFO DEL GRUPO» de la info vieja. Se fue el
     2026-09-27 con el rediseño al estilo WhatsApp (`chat/components/InfoDelChat.tsx`). */
  /* Acá vivían `tabsRow` y `tabBtn`, el control segmentado DIRECTOS / GLOBAL de la pestaña
     Tribu. Se eliminaron el 2026-09-22 con el conmutador: no quedó un solo uso en esta pantalla.
     (`LoginScreen` tiene sus propios `tabBtn`/`tabBtnActive`, que no son estos.) */
  createPostBar: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  plusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaLunaCard: {
    borderWidth: 1.5,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaLunaGlow: {
    position: 'absolute',
    top: -50,
    left: '15%',
    right: '15%',
    height: 100,
    borderRadius: 50,
    opacity: 0.25,
  },
  mediaLunaContent: {
    padding: 16,
    alignItems: 'center',
  },
  avatarCrestLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  metricDeltaBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
  },
  // Los estilos del podio (`podium3DContainer`, `podiumColumn`, `avatarMedal`, `podiumBlock`,
  // `podiumRankNum`) se mudaron con él a `features/community/components/PodioRanking.tsx`.
  myRankCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
  },
  rankCircleNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardList: {
    borderWidth: 1,
    borderRadius: space.radius,
    overflow: 'hidden',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    borderBottomWidth: 1,
  },
  courseCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    overflow: 'hidden',
  },
  courseCoverHeader: {
    height: 185,
    padding: 14,
    justifyContent: 'space-between',
  },
  courseCategoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: space.radiusSm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  progressBarBg: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  exploreBtn: {
    borderWidth: 1,
    borderRadius: space.radiusSm,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  courseHeaderBox: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
    marginTop: 10,
  },
  /* Este era el peor anidamiento del archivo: tarjeta de sección (borde) que contenía filas de
     lección (borde) que contenían el cuadrito del ícono (borde) y la chapa "HECHO" (borde). De
     los cuatro se queda UNO, el de la fila de lección, porque es lo que se toca. El título de la
     sección pasa a ser un encabezado sobre la lista, sin caja: el orden lo da la tipografía. */
  sectionCard: {
    gap: 12,
  },
  lessonItemRow: {
    borderWidth: 1,
    borderRadius: space.radiusSm,
    padding: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resourceTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: space.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadgePill: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonInfoCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
  },
  dateDividerPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 10.5,
    fontFamily: 'Jost_700Bold',
  },
  /** El punto que late al lado del cronómetro mientras se graba. */
  grabandoPunto: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  visorFotoFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visorFotoImagen: {
    width: '100%',
    height: '80%',
  },
  /* Barra de escribir estilo WhatsApp (2026-09-26). Los botones siguen en ≥ 44–52 px de toque
     (AGENTS.md §4); los adjuntos viven dentro del campo para que el texto tenga todo el ancho. */
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  /* El campo redondeado de WhatsApp: el texto crece hasta ~5 renglones y los adjuntos quedan
     adentro, a la derecha. */
  chatCampo: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 16,
    paddingRight: 2,
  },
  chatGrabando: {
    flex: 1,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatTextoCampo: {
    fontFamily: 'Jost_400Regular',
    fontSize: 17,
  },
  mediaOptionBtn: {
    width: 44,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputChat: {
    flex: 1,
    minHeight: 50,
    maxHeight: 130,
    paddingTop: 13,
    paddingBottom: 13,
    textAlignVertical: 'center',
  },
  sendBtnGold: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Acá vivía `groupInfoHeaderCard`, la tarjeta de la info vieja del grupo. Se fue el 2026-09-27
     con el rediseño al estilo WhatsApp: la cabecera grande vive en `InfoDelChat`. */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  profileModalCard: {
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
  },
  profileAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  metricBoxItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
  },
  focusCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  modalHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  publishHeaderBtn: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 14,
    minHeight: 48,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Las categorías son opciones que se eligen, así que conservan el borde. Lo que cambia es el
     alto: 25 px era la mitad del mínimo, y son la única forma de etiquetar una publicación. */
  tagSelectorPill: {
    borderWidth: 1,
    borderRadius: space.radiusSm,
    paddingHorizontal: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  /* Era `fontSize: 13`: el campo donde se escribe la publicación entera, por debajo del mínimo
     de input de AGENTS.md §4. */
  fullPostInput: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
    fontSize: 15,
    lineHeight: 22,
  },
  attachedPhotoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: space.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
  },
  addMorePhotoBtn: {
    borderWidth: 1,
    borderRadius: space.radiusSm,
    paddingHorizontal: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionsModalCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
  },
  reactionUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 48,
    borderBottomWidth: 1,
  },
  shareModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
});
