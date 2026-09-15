import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
} from 'react-native';
import { Alert } from '../components/Alerta';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { space } from '../theme/tokens';
import { ChatDelCurso } from '../features/renasia/components/ChatDelCurso';
import { useProgramaDia } from '../features/programa/hooks/useProgramaDia';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { useCelulaQueAcompano } from '../features/mentor/hooks/useCelulaQueAcompano';
import { useEsMentor } from '../features/mentor/hooks/useEsMentor';
import { AlumnoScreen } from '../features/mentor/screens/AlumnoScreen';
import { MiCelulaScreen } from '../features/mentor/screens/MiCelulaScreen';
import type { AlumnoConEstado } from '../features/mentor/types/mentor.types';
import { entradaAlGrupoVisible } from '../features/mentor/utils/entradaAlGrupo';
import { MicroLabel, ScreenHeader, AvatarPersona } from '../components/ui';
import { Icon, IconName } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';
import { useAuth } from '../features/auth/context/AuthContext';
import { useWallFeed } from '../features/community/hooks/useWallFeed';
import { useWallReactions } from '../features/community/hooks/useWallReactions';
import { useMiCelula } from '../features/community/hooks/useMiCelula';
import { useCategoriasMuro } from '../features/community/hooks/useCategoriasMuro';
import { PodioRanking, EntradaEscalonada } from '../features/community/components/PodioRanking';
import * as wallApi from '../features/community/api/wallApi';
import { elegirYNormalizarFotoMuro, type FotoMuroNormalizada } from '../features/community/utils/normalizarImagen';
import { FotoMuro } from '../features/community/components/FotoMuro';
import { PROPORCION_POR_DEFECTO } from '../features/community/utils/proporcionImagen';
import { avisarPostPublicado } from '../features/sparkie/events/avisoPrimerPost';
import { cerrarHabitoPostDiarioComunidad } from '../features/habits/api/postDiarioComunidad';
import { avisarPostDiarioCerrado } from '../features/habits/events/avisoPostDiarioCerrado';
import { ImageViewerModal, type ImageViewerItem } from '../features/community/components/ImageViewerModal';
import { SharePostSheet } from '../features/community/components/SharePostSheet';
import { useCursos } from '../features/academy/hooks/useCursos';
import { CursoPortada } from '../features/academy/components/CursoPortada';
import { useLeccionDetalle } from '../features/academy/hooks/useLeccionDetalle';
import { LeccionVideoPlayer } from '../features/academy/components/LeccionVideoPlayer';
import { useChatConversaciones } from '../features/chat/hooks/useChatConversaciones';
import { useEnvioMediaChat } from '../features/chat/hooks/useEnvioMediaChat';
import { BurbujaAudioChat } from '../features/chat/components/BurbujaAudioChat';
import { EvidenciaDesdeChatModal } from '../features/habits/components/EvidenciaDesdeChatModal';
import { mapearMensaje } from '../features/chat/api/chatMappers';
import { abrirConversacionDirecta } from '../features/chat/api/chatApi';
import type { WireMensaje } from '../features/chat/types/chat.types';
import { marcarChatMontado } from '../features/renasia/state/chatEnPantalla';
import { useRanking } from '../features/ranking/hooks/useRanking';
import { ApiError, mensajeDeError } from '../services/http/apiClient';
import { ESPACIO_PARA_LANZADOR } from '../features/renasia/components/RenasiaLauncher';

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
 * Los mismos cinco tipos que `tipo_mensaje` en la base, menos SISTEMA (que se pinta como texto).
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
}

export interface ChatConversation {
  id: string;
  type: 'celula' | 'direct' | 'global';
  title: string;
  subtitle: string;
  avatar: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  membersCount?: number;
  isOnline?: boolean;
  messages: ChatMessage[];
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
// GROUP_MEMBERS queda en mock a propósito: el directorio real (GET /api/v1/chat/members) solo
// trae {id, fullName, avatarUrl, role} — no `badge`/`streakDays`/`cell`/`focus` ni un emoji de
// avatar (trae una URL de S3, y este diseño pinta el avatar como `<Text>`, no `<Image>`). Wirear
// esta lista con datos reales exigiría inventar esos campos o tocar el JSX del perfil/roster, las
// dos cosas prohibidas por el alcance de esta tarea — se deja documentado como pendiente.
const GROUP_MEMBERS: GroupMember[] = [
  {
    id: 'm1',
    name: 'Sebastián Arango',
    role: 'Mentor de Alto Rendimiento',
    avatar: '🦅',
    badge: 'MENTOR',
    streakDays: 90,
    cell: 'Grupo 07',
    focus: 'Gestión Somática & Negocios de Alto Valor',
  },
  {
    id: 'm2',
    name: 'María Alejandra',
    role: 'Alumna de Alto Rendimiento',
    avatar: '👩‍💼',
    badge: 'ALUMNA',
    streakDays: 37,
    cell: 'Grupo 07',
    focus: 'Bloque Deep Work 90m & Ventas',
  },
  {
    id: 'm3',
    name: 'Carlos Méndez',
    role: 'Graduado Generación 04',
    avatar: '👨‍💼',
    badge: 'GRADUADO',
    streakDays: 90,
    cell: 'Grupo 04',
    focus: 'Bioquímica, Sueño Profundo & Flujo de Caja',
  },
  {
    id: 'm4',
    name: 'Dra. Valeria Ruiz',
    role: 'Directora Médica & Cirujana',
    avatar: '👩‍⚕️',
    badge: 'GRADUADA',
    streakDays: 90,
    cell: 'Grupo 05',
    focus: 'Respiración Diafragmática & Regulación Cortisol',
  },
];

// `INITIAL_CONVERSATIONS` (mock) se retiró: las conversaciones salen del backend real vía
// `useChatConversaciones` (GET /api/v1/chat/conversations). `GROUP_MEMBERS` sigue mock (ver nota
// junto a su declaración, más arriba): el backend no expone los campos que ese roster necesita.

/**
 * En qué sección de Comunidad está parada la pantalla. Las seis son EXCLUYENTES entre sí: solo
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
 * pestaña — el Muro quedaba a dos toques de profundidad. Ahora las seis están al mismo nivel,
 * arriba, y `muro` es la que abre. Lo que era una pestaña dentro de "Eventos & Experiencias"
 * (`muro`, `testimonios`, `ranking`) y lo que era una categoría de chat (`celula`, `miembros`) son
 * secciones de pleno derecho; "Recursos Exclusivos" pasó a llamarse `classroom`.
 */
export type SeccionComunidad =
  | 'muro'
  | 'classroom'
  | 'celula'
  | 'miembros'
  | 'ranking'
  | 'testimonios';

/**
 * Las seis secciones, en el orden en que se pintan en la fila de medallones. Es la única fuente de
 * verdad de esa fila: agregar una sección es agregar una entrada acá y su bloque de contenido.
 *
 * Los tickets al mentor no están, y no es que se hayan movido: el apartado entero se retiró de la
 * app el 2026-09-07 a pedido del dueño del proyecto (ver la nota junto a `tieneGrupo`).
 */
const SECCIONES: { id: SeccionComunidad; icon: IconName; label: string }[] = [
  { id: 'muro', icon: 'chat', label: 'Muro' },
  { id: 'classroom', icon: 'stack', label: 'Classroom' },
  { id: 'celula', icon: 'users', label: 'Grupo' },
  { id: 'miembros', icon: 'user', label: 'Miembros' },
  { id: 'ranking', icon: 'trophy', label: 'Ranking' },
  { id: 'testimonios', icon: 'star', label: 'Testimonios' },
];

const METRICAS = [
  { n: '12', label: 'Conversaciones\nesta semana' },
  { n: '3', label: 'Eventos\npróximos' },
  { n: '2', label: 'Mentorías\nprogramadas' },
];

export default function ComunidadScreen() {
  const { c, t, mode } = useTheme();
  // D-99: el chat dentro de un curso le dice a Sparkie en que dia del programa va la persona.
  const { diaPrograma } = useProgramaDia();
  const isDark = mode === 'dark';
  const { rs, isTablet, horizontalPadding, contentMaxWidth } = useResponsive();
  const { user } = useAuth();
  const mentorPhoto = rs(50);
  const avatarSize = rs(42);
  const medallionSize = rs(40);
  // Nombre real de quien está usando la app, para las publicaciones y comentarios propios del
  // Muro — reemplaza el "Kelin Arango" fijo del mock por el dato de la sesión.
  const nombreUsuario = user?.name?.trim() || 'Tú';
  const primerNombreUsuario = nombreUsuario.split(' ')[0];

  // Mentor asignado + integrantes de la célula — datos reales (GET /api/v1/me/cell y
  // GET /api/v1/me/cell/members), usados en la vista principal (sección MENTOR / TRIBU PRIVADA).
  const {
    miCelula,
    miembros: companerosCelula,
    loading: celulaCargando,
    error: celulaError,
  } = useMiCelula();
  const tieneMentor = miCelula?.assigned === true && !!miCelula.mentorName;
  const mentorTitulo = celulaCargando
    ? 'Cargando tu mentor...'
    : celulaError
      ? 'No pudimos cargar tu mentor'
      : tieneMentor && miCelula?.assigned === true
        ? miCelula.mentorName!
        : 'Todavía no tienes un mentor asignado';
  const mentorSubtitulo = tieneMentor ? 'Mentor de tu grupo' : null;
  const mentorNota =
    celulaCargando || celulaError
      ? null
      : tieneMentor
        ? 'Escribile para coordinar tu próxima sesión.'
        : 'Te avisaremos apenas se te asigne uno.';
  const TRIBU_AVATARES_VISIBLES = 4;
  const tribuVisibles = companerosCelula.slice(0, TRIBU_AVATARES_VISIBLES);
  const tribuRestantes = Math.max(companerosCelula.length - TRIBU_AVATARES_VISIBLES, 0);

  /**
   * Los integrantes reales del grupo para la pantalla "INFO DEL GRUPO", que antes mostraba una
   * lista inventada (Sebastián Arango, María Alejandra…). El mentor va primero —sin botón de
   * chatear, porque `/me/cell` no trae su id de usuario, y sin id no hay DM—; después los
   * compañeros de `/me/cell/members`, que sí lo traen (`traineeId`).
   */
  const integrantesDelGrupo = useMemo(() => {
    const filas: { id: string; nombre: string; avatarUrl: string | null; badge: string | null; chateable: boolean }[] = [];
    if (miCelula?.assigned === true && miCelula.mentorName) {
      filas.push({ id: 'mentor', nombre: miCelula.mentorName, avatarUrl: miCelula.mentorAvatarUrl, badge: 'MENTOR', chateable: false });
    }
    for (const m of companerosCelula) {
      filas.push({ id: m.traineeId, nombre: m.fullName, avatarUrl: m.avatarUrl, badge: m.isSelf ? 'TÚ' : null, chateable: !m.isSelf });
    }
    return filas;
  }, [miCelula, companerosCelula]);
  const nombreDelGrupo = miCelula?.assigned === true ? miCelula.cellName : 'Tu grupo';
  const subtituloDelGrupo =
    miCelula?.assigned === true
      ? `${miCelula.memberCount} ${miCelula.memberCount === 1 ? 'integrante' : 'integrantes'} · Cohorte ${miCelula.cohortName}`
      : null;

  // =========================================================================
  // ESTADOS DE NAVEGACIÓN
  // =========================================================================
  // Única fuente de verdad de "en qué sección estoy" (ver `SeccionComunidad`). Nunca se escribe a
  // mano: se pasa siempre por `irASeccion`, que además limpia el sub-estado de la sección que se
  // deja.
  const [seccionActiva, setSeccionActiva] = useState<SeccionComunidad>('muro');

  /*
   * El grupo que acompaña un mentor se llega desde Hoy y también desde acá: son los dos lugares
   * donde alguien lo busca (RF-26). Es la MISMA pantalla, no una copia — si fueran dos, la
   * próxima corrección tocaría una sola y nadie se enteraría de la otra.
   *
   * El hook se activa solo para mentores: para el resto no hace ni una llamada.
   */
  const esMentor = useEsMentor();
  const celulaQueAcompano = useCelulaQueAcompano(esMentor);
  const [vistaMentor, setVistaMentor] = useState<'ninguna' | 'celula' | 'alumno'>('ninguna');
  const [alumnoAbierto, setAlumnoAbierto] = useState<AlumnoConEstado | null>(null);
  // Derivados, no estados: agrupan las secciones que comparten un mismo contenedor de scroll o un
  // mismo sub-estado. Nunca se pueden prender dos a la vez, porque salen todos de `seccionActiva`.
  const inExclusiveResources = seccionActiva === 'classroom';
  /**
   * Las tres que se pintan dentro del mismo `ScrollView` (el que hasta 2026-09-07 era el
   * sub-módulo "Eventos & Experiencias" con sus tres pestañas). Comparten contenedor y padding;
   * el contenido de cada una se elige más abajo con `seccionActiva`.
   */
  const enMuroTestimoniosORanking =
    seccionActiva === 'muro' || seccionActiva === 'testimonios' || seccionActiva === 'ranking';
  /**
   * Célula y Miembros comparten el listado de conversaciones, la sala de chat y la ficha del
   * grupo: lo único que cambia entre las dos es qué conversaciones se filtran y qué va arriba de
   * la lista.
   */
  const inChatsComunidad = seccionActiva === 'celula' || seccionActiva === 'miembros';
  // Se guarda el ID, no el objeto: `courses` (de `useCursos`) es la única fuente de verdad, así
  // que `selectedCourse` sale siempre DERIVADO más abajo. Si se guardara el objeto entero (como
  // hacía el mock) quedaría una copia vieja congelada en el momento del toque, y una acción
  // posterior (p.ej. completar una lección) no se reflejaría al volver a esa vista.
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [fullScreenLesson, setFullScreenLesson] = useState<LessonResource | null>(null);

  // Sub-módulo: Atención Personalizada & Chats tipo WhatsApp — `conversations` sale del backend
  // real (GET /api/v1/chat/conversations) a través de `useChatConversaciones`; el historial de
  // cada una se pide recién al abrirla (ver `handleAbrirChat`), nunca en el listado.
  /**
   * Qué se lista dentro de Miembros. La célula dejó de ser una opción acá porque pasó a ser su
   * propia sección: quedan las conversaciones uno a uno y el canal global.
   */
  const [miembrosTab, setMiembrosTab] = useState<'directos' | 'global'>('directos');
  const {
    conversations,
    setConversations,
    loading: conversacionesCargando,
    error: conversacionesError,
    mensajesCargando,
    // Lo usa la entrada desde "Escribirle": la conversación puede acabar de crearse.
    recargar: recargarConversaciones,
    abrirConversacion,
    enviarMensajeTexto: enviarMensajeChatRemoto,
    compartirPublicacionDelMuro: compartirPublicacionEnChat,
  } = useChatConversaciones(user?.id ?? null);
  const [activeChat, setActiveChat] = useState<ChatConversation | null>(null);
  const [groupInfoVisible, setGroupInfoVisible] = useState(false);
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<GroupMember | null>(null);

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
    // Célula y Miembros comparten la sala de chat abierta: pasar de una a otra no la cierra, salir
    // de las dos sí.
    if (seccion !== 'celula' && seccion !== 'miembros') {
      setActiveChat(null);
      setGroupInfoVisible(false);
    }
  }, []);
  const [chatInputText, setChatInputText] = useState('');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  /** Foto de chat abierta a pantalla completa; `null` si no hay ninguna. */
  const [fotoChatAmpliada, setFotoChatAmpliada] = useState<string | null>(null);

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
  } = useWallFeed();
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [postOffsets, setPostOffsets] = useState<Record<string, number>>({});
  const [publicacionPedida, setPublicacionPedida] = useState<string | null>(null);
  const [publicacionDestacada, setPublicacionDestacada] = useState<string | null>(null);
  const muroScrollRef = useRef<ScrollView | null>(null);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentPhotos, setCommentPhotos] = useState<Record<string, FotoMuroNormalizada | null>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const EMOJIS_RAPIDOS = ['🔥', '👏', '💪', '⚡', '❤️', '🦅', '🎯', '🙌'];

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
  const { courses, loading: cursosCargando, error: cursosError, recargar: recargarCursos } = useCursos();
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
  } = useCategoriasMuro();
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
  const { rankingData, loading: rankingCargando, error: rankingError } = useRanking();

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
  const [tipoRanking, setTipoRanking] = useState<'general' | 'coherencia' | 'liga'>('general');

  const apiRankingEntries = useMemo(() => {
    if (!rankingData) return [];
    if (tipoRanking === 'coherencia') return rankingData.coherenciaIndividual ?? [];
    if (tipoRanking === 'liga') return rankingData.liga ?? [];
    return rankingData.general ?? [];
  }, [rankingData, tipoRanking]);

  /** Qué mide cada tabla, en una línea. Sin esto, tres listas de números no se distinguen. */
  const TABLAS_DE_RANKING = [
    { clave: 'general' as const, titulo: 'General', explica: 'Hábitos, acciones y lecciones, todo junto' },
    { clave: 'coherencia' as const, titulo: 'Coherencia', explica: 'Acciones diarias cumplidas de tu semana' },
    { clave: 'liga' as const, titulo: 'Puntos', explica: 'Los puntos que fuiste sumando' },
  ];

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
      scoreText: `${item.puntaje} Pts`,
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
  }, [apiRankingEntries, user?.id, user?.name, nombreUsuario]);

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
        score: `${p.puntaje} Pts`,
      };
    }
    return null;
  }, [apiRankingEntries, user?.id, user?.name, nombreUsuario]);

  const podioTop2 = useMemo(() => {
    if (apiRankingEntries.length >= 2) {
      const p = apiRankingEntries[1];
      return {
        name:
          p.participanteId === user?.id ||
          (user?.name && p.fullName.toLowerCase().includes(user.name.toLowerCase()))
            ? `TÚ (${nombreUsuario})`
            : p.fullName,
        score: `${p.puntaje} Pts`,
      };
    }
    return null;
  }, [apiRankingEntries, user?.id, user?.name, nombreUsuario]);

  const podioTop3 = useMemo(() => {
    if (apiRankingEntries.length >= 3) {
      const p = apiRankingEntries[2];
      return {
        name:
          p.participanteId === user?.id ||
          (user?.name && p.fullName.toLowerCase().includes(user.name.toLowerCase()))
            ? `TÚ (${nombreUsuario})`
            : p.fullName,
        score: `${p.puntaje} Pts`,
      };
    }
    return null;
  }, [apiRankingEntries, user?.id, user?.name, nombreUsuario]);

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
        cellText: `${celulaNombre} · ⚡ ${found.puntaje} Pts de Coherencia`,
      };
    }
    // Sin posición todavía. El texto habla de lo que falta hacer y no de lo que falta en la base,
    // igual que la invitación del podio vacío: es el mismo momento del recorrido.
    return {
      rank: '-',
      cellText: `${celulaNombre} · Tu primer avance te pone en la tabla`,
    };
  }, [apiRankingEntries, rankingData?.celula?.cellName, user?.id, user?.name, miCelula]);

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
    if (inChatsComunidad) {
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
    // Cualquier sección que no sea el Muro vuelve al Muro, que es la que abre la pestaña. Estando
    // ya en el Muro se devuelve `false` a propósito: ahí el gesto le toca al sistema (salir de la
    // app), que es lo que la persona espera en la raíz de una pestaña.
    if (seccionActiva !== 'muro') {
      irASeccion('muro');
      return true;
    }
    return false;
  }, shareSheetPost !== null || seccionActiva !== 'muro' || selectedCourse !== null || fullScreenLesson !== null || createPostModalVisible || reactionsModalVisible || activeChat !== null || groupInfoVisible || selectedMemberProfile !== null || fotoChatAmpliada !== null);

  /**
   * Mientras la sala de chat esté abierta, se esconde el botón flotante del acompañante: se monta
   * justo encima de la barra de escribir y tapa el botón de enviar. Es la misma señal que ya usaba
   * `ChatDelCurso` (ver `renasia/state/chatEnPantalla.ts`), no un mecanismo nuevo.
   */
  useEffect(() => {
    if (!inChatsComunidad || activeChat === null || groupInfoVisible) return;
    return marcarChatMontado();
  }, [inChatsComunidad, activeChat, groupInfoVisible]);

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
   */
  const handleAbrirLeccion = (lesson: LessonResource, omitirProgresionSecuencial = false) => {
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
    const indexEnCurso = allCourseLessons.findIndex(l => l.id === lesson.id);
    if (!omitirProgresionSecuencial && indexEnCurso > 0) {
      const anterior = allCourseLessons[indexEnCurso - 1];
      const anteriorCompleta = esLeccionCompletada(anterior.id, indexEnCurso - 1);
      const estaCompleta = esLeccionCompletada(lesson.id, indexEnCurso);

      if (!anteriorCompleta && !estaCompleta) {
        Alert.alert(
          'Lección no disponible 🔒',
          `Para acceder a esta lección primero debes completar la lección anterior:\n\n"${anterior.title}"`
        );
        return;
      }
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

    irASeccion('miembros');
    setMiembrosTab('directos');
    setChatPedidoDeOtraPestana(id);
    // Recién creada, puede no estar en el listado: se pide de nuevo para que aparezca.
    void recargarConversaciones();
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

  useEffect(() => {
    if (!publicacionPedida || seccionActiva !== 'muro') return;
    if (!posts.some(post => post.id === publicacionPedida)) return;

    const offset = postOffsets[publicacionPedida];
    if (offset === undefined) return;

    requestAnimationFrame(() => {
      muroScrollRef.current?.scrollTo({ y: Math.max(offset - 12, 0), animated: true });
    });
    setPublicacionPedida(null);
  }, [postOffsets, posts, publicacionPedida, seccionActiva]);

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
          handleAbrirLeccion(nextLesson);
          Alert.alert(
            '¡Excelente Progreso! 🦅',
            `Lección completada con éxito. Avanzando a: "${nextLesson.title}".`
          );
        }
      }
    } catch (e) {
      Alert.alert('No se pudo actualizar', mensajeDeError(e, 'Intentá de nuevo en un momento.'));
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
      Alert.alert('No se pudo enviar', mensajeDeError(e, 'Intentá de nuevo en un momento.'));
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
        lastMessage: mensaje.text || 'Elemento multimedia',
        lastTime: mensaje.time,
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

  /**
   * Subir la evidencia de un hábito desde el chat (pedido del dueño, 2026-09-05).
   *
   * Es una acción SEPARADA del botón de foto de arriba, y a propósito: una foto de chat y una
   * evidencia sellada son cosas distintas — distinto bucket, distinta validación, distintas
   * consecuencias (la evidencia otorga puntos). Nunca se infiere que una foto normal "era" la
   * evidencia de algo; el aprendiz elige explícitamente qué hábito está evidenciando.
   */
  const [evidenciaVisible, setEvidenciaVisible] = useState(false);

  /**
   * Después de sellar la evidencia se manda un mensaje NORMAL de texto a la conversación, para
   * que quede constancia. Es un mensaje aparte y no un efecto de la subida: si falla, la
   * evidencia ya está registrada igual y no se le avisa de un error que no cambia nada — el
   * hábito quedó cerrado, que es lo que importaba.
   */
  const handleEvidenciaSubida = async (resultado: { tituloHabito: string; puntosOtorgados: number }) => {
    if (!activeChat) return;
    try {
      const actualizada = await enviarMensajeChatRemoto(
        activeChat,
        `Sube mi evidencia de "${resultado.tituloHabito}" (+${resultado.puntosOtorgados} pts).`,
      );
      setActiveChat(actualizada);
    } catch {
      // Silencio deliberado: ver el comentario de arriba.
    }
  };

  // Sigue local-only, sin backend: `GROUP_MEMBERS` es mock (ver nota junto a su declaración), así
  // que su `member.id` no es un UUID real — mandarlo a `POST /chat/conversations/direct` fallaría
  // o, peor, apuntaría a otro usuario real por coincidencia de id. Pendiente hasta que exista un
  // selector de integrantes respaldado por el directorio real (`GET /api/v1/chat/members`).
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
      irASeccion('miembros');
      setMiembrosTab('directos');
      setChatPedidoDeOtraPestana(conv.id);
      void recargarConversaciones();
    } catch {
      // Si falla, el usuario se queda donde estaba: no se inventa una conversacion local.
    }
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
      .catch(e => Alert.alert('No se pudo cargar el chat', mensajeDeError(e, 'Intentá de nuevo en un momento.')));
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
   * queda en Miembros, que es exactamente donde está su chat.
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
      Alert.alert('No se pudo reaccionar', mensajeDeError(error, 'Intentá de nuevo en un momento.'));
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
      Alert.alert('No se pudo comentar', mensajeDeError(error, 'Intentá de nuevo en un momento.'));
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
    const porDefecto = 'No pudimos publicar. Intentá de nuevo en un momento.';
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
   * Qué conversaciones se listan. Sale de la sección activa, no de un estado aparte: en Célula son
   * siempre las de la célula, y en Miembros las elige `miembrosTab`.
   */
  const filteredConversations = conversations.filter(conv => {
    if (seccionActiva === 'celula') return conv.type === 'celula';
    if (miembrosTab === 'global') return conv.type === 'global';
    // Directos: los 1-a-1 y TAMBIÉN el chat del grupo, para que no quede escondido solo en la
    // pestaña Grupo y se encuentre acá, donde la persona busca sus conversaciones (pedido del dueño).
    return conv.type === 'direct' || conv.type === 'celula';
  });

  /*
   * Las vistas del mentor toman la pantalla completa, igual que en Hoy: son otro contexto de
   * trabajo, no una tarjeta más dentro de Comunidad. Cada una registra su `useSystemBackHandler`,
   * así que el gesto del sistema las cierra paso a paso en vez de salir de la app.
   */
  if (esMentor && vistaMentor === 'alumno' && alumnoAbierto) {
    return (
      <AlumnoScreen
        alumno={alumnoAbierto}
        grupoId={celulaQueAcompano.vista?.celula.id ?? null}
        onVolver={() => setVistaMentor('celula')}
      />
    );
  }
  if (esMentor && vistaMentor === 'celula') {
    return (
      <MiCelulaScreen
        onSalir={() => setVistaMentor('ninguna')}
        onAbrirAlumno={alumno => {
          setAlumnoAbierto(alumno);
          setVistaMentor('alumno');
        }}
        vista={celulaQueAcompano.vista}
        cargando={celulaQueAcompano.cargando}
        fallo={celulaQueAcompano.fallo}
        detalle={celulaQueAcompano.detalle}
        recargar={celulaQueAcompano.recargar}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="COMUNIDAD" right="info" />

      {/* ========================================================================= */}
      {/* FILA DE SECCIONES: LAS SEIS, SIEMPRE A LA VISTA                           */}
      {/* ========================================================================= */}
      {/*
        REDISEÑO 2026-09-07. Antes acá vivía una portada ("TU TRIBU. TU SOPORTE. TU LEGADO.") con
        tres medallones que abrían sub-módulos, y recién adentro de cada uno había pestañas. El
        Muro —lo que la gente viene a ver— quedaba a dos toques y detrás de un nombre que no lo
        anunciaba. Ahora las seis secciones están acá arriba, siempre visibles, y el contenido de
        la elegida se pinta abajo: un solo toque para cualquiera de ellas.

        Los medallones son EXACTAMENTE los de la portada que reemplazan (`styles.medallion`, mismo
        tamaño `medallionSize`, mismo oro, misma tipografía micro) — se movieron de lugar y se les
        agregó el estado activo, no se rediseñaron.

        Scroll horizontal y no seis columnas repartidas: en un teléfono angosto seis medallones a
        `flex: 1` dejan las etiquetas partidas en tres renglones. Con scroll cada una entra en uno.
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

      {/* ========================================================================= */}
      {/* SECCIONES MURO, TESTIMONIOS Y RANKING (comparten contenedor de scroll)     */}
      {/* ========================================================================= */}
      {enMuroTestimoniosORanking && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          ref={muroScrollRef}
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
          {seccionActiva === 'muro' && (
            <View style={{ gap: space.gap, paddingTop: 10, paddingBottom: 28 }}>
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

              {/* Lista de Publicaciones */}
              {posts.map(post => {
                const isExpanded = expandedPosts[post.id];
                const commentsVisible = openComments[post.id];

                return (
                  <View
                    key={post.id}
                    onLayout={event => {
                      const y = event.nativeEvent.layout.y;
                      setPostOffsets(prev => (prev[post.id] === y ? prev : { ...prev, [post.id]: y }));
                    }}
                    style={[
                      styles.postCard,
                      {
                        borderColor: publicacionDestacada === post.id ? c.gold : c.border,
                        backgroundColor: c.cardBg,
                      },
                      // Único cambio visual del post optimista: atenuado mientras se confirma. Se
                      // suma como estilo al lado de los que ya estaban, sin tocar `styles.postCard`
                      // ni reestructurar el JSX de la tarjeta.
                      post.pendiente && { opacity: 0.55 },
                    ]}
                  >
                    {/* Header del Post */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={[styles.avatarCircle, { backgroundColor: c.goldWash }]}>
                          <Text style={{ fontSize: 14 }}>{post.avatar}</Text>
                        </View>
                        <View>
                          <Text style={[t.cardTitle, { color: c.textStrong }]}>{post.author}</Text>
                          <Text style={[t.small, { color: c.micro }]}>
                            {post.cell} · {post.timeAgo}
                          </Text>
                        </View>
                      </View>
                      {/* Sin día no hay insignia. Dibujar "Día 0" era peor que no dibujar nada. */}
                      {post.diaPrograma !== null ? (
                        <View style={[styles.dayBadge, { backgroundColor: c.goldWash }]}>
                          <Text style={[t.micro, { color: c.goldInk, fontSize: 11, fontFamily: 'Jost_700Bold' }]}>
                            Día {post.diaPrograma}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Texto del Post con "Ver más..." */}
                    <View style={{ marginTop: 8 }}>
                      <Text
                        numberOfLines={isExpanded ? undefined : 3}
                        style={[t.body, { color: c.text }]}
                      >
                        {post.text}
                      </Text>
                      {post.text.length > 120 && (
                        <Pressable
                          onPress={() => setExpandedPosts(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                          style={{ minHeight: 48, justifyContent: 'center' }}
                        >
                          <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                            {isExpanded ? 'Ver menos' : 'Ver más...'}
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {/* Galería Autodetectada */}
                    {post.media.length > 0 && (
                      <View style={[styles.mediaGridContainer, { marginTop: 10 }]}>
                        {post.media.length === 1 ? (
                          <Pressable
                            onPress={() => abrirVisorFotos(post, 0)}
                            style={[
                              styles.mediaSingleBox,
                              // La forma de la caja la da la foto, no un alto fijo: mientras no se
                              // sabe, cuadrada; al cargar, la proporción real que avisó `FotoMuro`.
                              { aspectRatio: proporcionesFoto[post.id] ?? PROPORCION_POR_DEFECTO },
                              { backgroundColor: c.placeholderA },
                            ]}
                          >
                            <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                              {post.media[0].title}
                            </Text>
                            {/* Overlay DESPUÉS del texto a propósito: si la foto carga, lo tapa; si es
                                video o falla, no dibuja nada y el texto de siempre queda visible. */}
                            <FotoMuro
                              url={post.media[0].url}
                              mimeType={post.media[0].mimeType}
                              radioBorde={12}
                              colorFondo={c.cardBgAlt}
                              ajuste="contain"
                              onProporcion={proporcion => recordarProporcion(post.id, proporcion)}
                            />
                          </Pressable>
                        ) : post.media.length === 2 ? (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {post.media.map((m, idx) => (
                              <Pressable
                                key={idx}
                                onPress={() => abrirVisorFotos(post, idx)}
                                style={[styles.mediaHalfBox, { backgroundColor: c.placeholderA }]}
                              >
                                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                                  {m.title}
                                </Text>
                                <FotoMuro url={m.url} mimeType={m.mimeType} radioBorde={10} colorFondo={c.cardBgAlt} />
                              </Pressable>
                            ))}
                          </View>
                        ) : (
                          // Mosaico de 3 o más: proporción en vez de alto fijo, para que crezca con
                          // el ancho de la tarjeta igual que en Instagram/Facebook. Con 130 px
                          // fijos las tres fotos quedaban en una tira demasiado baja.
                          <View style={{ flexDirection: 'row', gap: 6, aspectRatio: 1.5 }}>
                            <Pressable
                              onPress={() => abrirVisorFotos(post, 0)}
                              style={[styles.mediaLargeLeft, { backgroundColor: c.placeholderA }]}
                            >
                              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                                {post.media[0].title}
                              </Text>
                              <FotoMuro
                                url={post.media[0].url}
                                mimeType={post.media[0].mimeType}
                                radioBorde={10}
                                colorFondo={c.cardBgAlt}
                              />
                            </Pressable>
                            <View style={{ flex: 1, gap: 6 }}>
                              {post.media.slice(1, 3).map((m, idx) => (
                                <Pressable
                                  key={idx}
                                  onPress={() => abrirVisorFotos(post, idx + 1)}
                                  style={[styles.mediaSmallRight, { backgroundColor: c.placeholderA }]}
                                >
                                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                                    {m.title}
                                  </Text>
                                  <FotoMuro url={m.url} mimeType={m.mimeType} radioBorde={8} colorFondo={c.cardBgAlt} />
                                </Pressable>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Solo el recuento de comentarios. Las reacciones bajaron a la fila de
                        acciones, al MISMO nivel que Like, Comentar y Compartir. */}
                    <View style={styles.reactionsSummaryRow}>
                      <Pressable
                        onPress={() => handleToggleComments(post.id)}
                        hitSlop={8}
                        style={{ minHeight: 48, justifyContent: 'center' }}
                      >
                        <Text style={[t.small, { color: c.textSoft }]}>
                          {post.comments.length} Comentarios
                        </Text>
                      </Pressable>
                    </View>

                    {/* Botones de Acción: Like, Comentar, Compartir */}
                    <View style={[styles.actionButtonsRow, { borderTopColor: c.divider }]}>
                      <Pressable
                        onPress={() => handleToggleLike(post.id)}
                        accessibilityRole="button"
                        accessibilityLabel={post.userReaction === 'like' ? 'Quitar reaccion' : 'Reaccionar a la publicacion'}
                        accessibilityState={{ selected: post.userReaction === 'like' }}
                        style={({ pressed }) => [styles.actionBtn, pressed && { backgroundColor: c.goldWash }]}
                      >
                        <Icon
                          name="thumbsUp"
                          size={14}
                          color={post.userReaction === 'like' ? c.success : c.textSoft}
                        />
                        <Text
                          numberOfLines={1}
                          style={[
                            t.micro,
                            {
                              color: post.userReaction === 'like' ? c.success : c.textSoft,
                              fontFamily: 'Jost_700Bold',
                              fontSize: 10.5,
                            },
                          ]}
                        >
                          Like
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleToggleComments(post.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Ver y escribir comentarios"
                        style={({ pressed }) => [styles.actionBtn, pressed && { backgroundColor: c.goldWash }]}
                      >
                        <Icon name="chat" size={14} color={c.goldInk} />
                        <Text numberOfLines={1} style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 10.5 }]}>
                          Comentar
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleSharePost(post.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Compartir la publicacion"
                        style={({ pressed }) => [styles.actionBtn, pressed && { backgroundColor: c.goldWash }]}
                      >
                        <Icon name="share" size={14} color={c.textSoft} />
                        <Text numberOfLines={1} style={[t.micro, { color: c.textSoft, fontFamily: 'Jost_700Bold', fontSize: 10.5 }]}>
                          Compartir
                        </Text>
                      </Pressable>

                      {/* Las reacciones, a la derecha y en la MISMA fila que las tres acciones.
                          `marginLeft: 'auto'` las empuja al borde sin estirar los botones.
                          La chapa ES el botón: ya no hay un "Ver quién reaccionó ›" que lo
                          explique, así que lleva su propia etiqueta para el lector de pantalla. */}
                      <Pressable
                        onPress={() => {
                          setReactionsModalVisible(true);
                          void cargarReacciones(post.id);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={
                          post.likes === 1
                            ? 'Una reacción. Tocá para ver quién reaccionó'
                            : `${post.likes} reacciones. Tocá para ver quién reaccionó`
                        }
                        hitSlop={10}
                        style={styles.rxCountBotonFila}
                      >
                        <View style={[styles.rxCountBadge, { backgroundColor: c.successWash }]}>
                          <Icon name="thumbsUp" size={11} color={c.success} />
                          <Text style={[styles.rxCountTexto, { color: c.success }]}>{post.likes}</Text>
                        </View>
                      </Pressable>
                    </View>

                    {/* Comentarios con Fotos */}
                    {commentsVisible && (
                      <View style={[styles.commentsSection, { borderTopColor: c.divider }]}>
                        {post.comments.map(cItem => {
                          const isLong = cItem.text.length > 90;
                          const isExpanded = !!expandedComments[cItem.id];
                          const displayText = isLong && !isExpanded ? cItem.text.slice(0, 90) + '...' : cItem.text;

                          return (
                            <View key={cItem.id} style={[styles.commentCard, { backgroundColor: c.cardBgAlt }]}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={[t.cardTitle, { color: c.goldInk, fontSize: 14 }]}>
                                  {cItem.author} {cItem.role ? `(${cItem.role})` : ''}
                                </Text>
                                <Text style={[t.micro, { color: c.textSoft }]}>{cItem.timeAgo}</Text>
                              </View>

                              <Text style={[t.body, { color: c.text, marginTop: 6 }]}>
                                {displayText}
                              </Text>

                              {isLong && (
                                <Pressable
                                  onPress={() => setExpandedComments(prev => ({ ...prev, [cItem.id]: !prev[cItem.id] }))}
                                  hitSlop={6}
                                  style={{ minHeight: 48, justifyContent: 'center' }}
                                >
                                  <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                                    {isExpanded ? 'Ver menos' : 'Ver más...'}
                                  </Text>
                                </Pressable>
                              )}

                              {cItem.photoAttached && (
                                <Pressable
                                  onPress={() => {
                                    setImageViewerData({
                                      authorName: cItem.author,
                                      timeAgo: cItem.timeAgo,
                                      postText: cItem.text,
                                      images: [{ url: cItem.photoAttached! }],
                                      initialIndex: 0,
                                    });
                                    setImageViewerVisible(true);
                                  }}
                                  style={styles.commentPhotoBox}
                                >
                                  <Image
                                    source={{ uri: cItem.photoAttached }}
                                    style={styles.commentPhotoImage}
                                    resizeMode="cover"
                                  />
                                </Pressable>
                              )}

                              <View style={{ flexDirection: 'row', gap: 12, marginTop: 6, alignItems: 'center' }}>
                                <Pressable
                                  onPress={() => handleCommentVote(post.id, cItem.id)}
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 48 }}
                                >
                                  <Icon name="thumbsUp" size={13} color={c.success} />
                                  <Text style={[t.small, { color: cItem.userReaction === 'like' ? c.success : c.textSoft }]}>
                                    {cItem.likes}
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          );
                        })}

                        {/* Input de Comentario con Emojis y Foto Real */}
                        <View style={{ gap: 6, marginTop: 8 }}>
                          {/* Tira de Emojis Rápidos */}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 6 }}>
                            {EMOJIS_RAPIDOS.map(emoji => (
                              <Pressable
                                key={emoji}
                                onPress={() => setCommentInputs(prev => ({ ...prev, [post.id]: (prev[post.id] || '') + emoji }))}
                                hitSlop={4}
                                style={{ minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Text style={{ fontSize: 20 }}>{emoji}</Text>
                              </Pressable>
                            ))}
                          </View>

                          {/* Previsualización compacta de foto seleccionada */}
                          {commentPhotos[post.id] && (
                            <View style={[styles.commentPhotoPreview, { backgroundColor: c.goldWash, gap: 8 }]}>
                              <Image
                                source={{ uri: commentPhotos[post.id]!.uri }}
                                style={{ width: 38, height: 38, borderRadius: 6 }}
                                resizeMode="cover"
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                                  📷 Foto adjunta
                                </Text>
                                <Text style={[t.small, { color: c.textSoft }]}>
                                  Lista para enviar con tu comentario
                                </Text>
                              </View>
                              <Pressable
                                onPress={() => setCommentPhotos(prev => ({ ...prev, [post.id]: null }))}
                                hitSlop={6}
                                style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Icon name="close" size={14} color={c.danger} />
                              </Pressable>
                            </View>
                          )}

                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                            <Pressable
                              onPress={() => handlePickCommentPhoto(post.id)}
                              style={[styles.attachPhotoBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                              hitSlop={6}
                            >
                              <Icon name="camera" size={14} color={c.goldInk} />
                            </Pressable>

                            <TextInput
                              value={commentInputs[post.id] || ''}
                              onChangeText={val => setCommentInputs(prev => ({ ...prev, [post.id]: val }))}
                              placeholder="Escribe un comentario..."
                              placeholderTextColor={c.textSoft}
                              style={[styles.commentInput, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
                            />

                            <Pressable
                              onPress={() => handleAddComment(post.id)}
                              style={[styles.sendCommentBtn, { backgroundColor: c.gold }]}
                            >
                              <Text style={[t.small, { color: c.onGold, fontFamily: 'Jost_700Bold' }]}>Enviar</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

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
                      "podés ser el próximo" deja de ser cierto para el primer puesto. */}
                  {!podioTop1 && (
                    <View style={[styles.myRankCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                      <Text style={{ fontSize: 24, marginBottom: 8 }}>🏆</Text>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 18, lineHeight: 25 }]}>
                        Tú puedes ser el próximo líder del ranking
                      </Text>
                      <Text style={[t.body, { color: c.textSoft, marginTop: 10 }]}>
                        Todavía nadie sumó puntos en este corte diario. Se cuentan solos con tus
                        hábitos, tus rocas y tus lecciones: el primero que avance, encabeza.
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
            {!!leccionMostrada.desc && (
              <Text style={[t.body, { color: c.textSoft, marginTop: 10 }]}>
                {leccionMostrada.desc}
              </Text>
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

            {leccionMostrada.content && (
              <View style={{ marginTop: space.gapLg, padding: 14, borderRadius: space.radiusSm, backgroundColor: c.goldWash }}>
                <Text style={[t.body, { color: c.text }]}>
                  {leccionMostrada.content}
                </Text>
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
      {/* SECCIONES GRUPO Y MIEMBROS: CHATS TIPO WHATSAPP                          */}
      {/* ========================================================================= */}
      {inChatsComunidad && activeChat === null && (
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
          {/* ========================================================================= */}
          {/* SECCIÓN GRUPO: MENTOR, TRIBU, MÉTRICAS Y CHAT DEL GRUPO               */}
          {/* ========================================================================= */}
          {/*
            Acá aterrizó lo que antes era la portada de Comunidad. El dueño del proyecto lo pidió
            así: la tarjeta del mentor y los dos bloques de datos de la tribu se manejan dentro de
            Grupo, que es de lo que hablan.
          */}
          {seccionActiva === 'celula' && (
            <>
            {/* Para quien ACOMPAÑA. Va arriba de todo porque es lo que viene a hacer; el resto
                de Grupo —su mentor, su tribu, su chat— sigue igual para todos, incluido él.

                Misma condición que la tarjeta de Hoy, y por eso vive en una función y no acá:
                son las DOS entradas al mismo grupo (RF-26), y una que se esconda mientras la
                otra no sería peor que las dos vacías. */}
            {entradaAlGrupoVisible({ esMentor, rol: user?.role, fallo: celulaQueAcompano.fallo }) ? (
              <View style={styles.section}>
                <MicroLabel>Acompañamiento</MicroLabel>
                <Pressable
                  onPress={() => setVistaMentor('celula')}
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

            <View style={styles.section}>
              <MicroLabel>Mentor</MicroLabel>
              <View style={[styles.mentor, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <AvatarPersona
                  nombre={tieneMentor && miCelula?.assigned === true ? miCelula.mentorName : null}
                  avatarUrl={tieneMentor && miCelula?.assigned === true ? miCelula.mentorAvatarUrl : null}
                  size={mentorPhoto}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[t.cardTitle, { color: c.textStrong }]}>{mentorTitulo}</Text>
                  {mentorSubtitulo && (
                    <Text style={[t.small, { color: c.micro, marginTop: 2 }]}>{mentorSubtitulo}</Text>
                  )}
                  {mentorNota && (
                    <Text style={[t.small, { color: c.textSoft, marginTop: 6, fontStyle: 'italic', lineHeight: 18 }]}>
                      {mentorNota}
                    </Text>
                  )}
                </View>
                <Icon name="chevron" size={12} color={c.chevron} />
              </View>
            </View>

            <View style={styles.section}>
              <MicroLabel>Tribu privada</MicroLabel>
              {celulaCargando && companerosCelula.length === 0 && (
                <Text style={[t.body, { color: c.textSoft, marginTop: 12 }]}>Cargando tu tribu...</Text>
              )}
              {!celulaCargando && !celulaError && companerosCelula.length === 0 && (
                <Text style={[t.body, { color: c.textSoft, marginTop: 12 }]}>
                  Todavía no tienes integrantes en tu grupo.
                </Text>
              )}
              {companerosCelula.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  {tribuVisibles.map(m => (
                    <AvatarPersona
                      key={m.traineeId}
                      nombre={m.fullName}
                      avatarUrl={m.avatarUrl}
                      size={avatarSize}
                    />
                  ))}
                  {tribuRestantes > 0 && (
                    <View style={[styles.more, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: c.goldWash }]}>
                      <Text style={[t.small, styles.cifras, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>+{tribuRestantes}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={[styles.section, { paddingBottom: 24 }]}>
              <MicroLabel>Interacciones clave</MicroLabel>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                {METRICAS.map(m => (
                  <View key={m.n} style={[styles.metric, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                    <Text style={[t.metric, { color: c.textStrong, fontSize: 22 }]}>{m.n}</Text>
                    <Text style={[t.micro, { color: c.micro, letterSpacing: 0, fontSize: 10.5, textAlign: 'center', marginTop: 4, lineHeight: 13 }]}>
                      {m.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

              <View style={styles.section}>
                <MicroLabel>Chat de tu grupo</MicroLabel>
              </View>
            </>
          )}

          {/* ========================================================================= */}
          {/* SECCIÓN MIEMBROS: CONVERSACIONES UNO A UNO Y CANAL GLOBAL                 */}
          {/* ========================================================================= */}
          {/*
            El selector perdió la opción "GRUPO" porque el grupo pasó a ser su propia sección
            (con su propio medallón arriba). Las otras dos categorías que ya existían —directos y
            global— se quedaron acá, que es donde la persona busca a alguien puntual.
          */}
          {seccionActiva === 'miembros' && (
            <View style={[styles.tabsRow, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              <Pressable
                onPress={() => setMiembrosTab('directos')}
                style={[styles.tabBtn, miembrosTab === 'directos' && { backgroundColor: c.gold }]}
              >
                <Text style={[t.small, { color: miembrosTab === 'directos' ? c.onGold : c.textSoft, fontFamily: 'Jost_700Bold' }]}>
                  💬 DIRECTOS
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setMiembrosTab('global')}
                style={[styles.tabBtn, miembrosTab === 'global' && { backgroundColor: c.gold }]}
              >
                <Text style={[t.small, { color: miembrosTab === 'global' ? c.onGold : c.textSoft, fontFamily: 'Jost_700Bold' }]}>
                  🌐 GLOBAL
                </Text>
              </Pressable>
            </View>
          )}

          {/* ========================================================================= */}
          {/* LISTADO DE CONVERSACIONES — COMPARTIDO POR GRUPO Y MIEMBROS              */}
          {/* ========================================================================= */}
          {/*
            Un solo listado para las dos secciones, no dos copias: lo único que cambia entre ellas
            es el filtro, y eso ya lo resuelve `filteredConversations` leyendo `seccionActiva`.
          */}
          <>
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
              {!conversacionesCargando && !conversacionesError && filteredConversations.length === 0 && (
                <Text style={[t.body, { color: c.textSoft, marginTop: space.gapLg }]}>
                  Todavía no tienes conversaciones acá.
                </Text>
              )}

              {/* Lista de Conversaciones Activas */}
              <View style={{ gap: space.gap, paddingTop: space.gap, paddingBottom: 28 }}>
                {filteredConversations.map(conv => (
                  <Pressable
                    key={conv.id}
                    onPress={() => handleAbrirChat(conv)}
                    style={[
                      styles.chatConvCard,
                      {
                        borderColor: conv.type === 'celula' ? c.gold : c.border,
                        backgroundColor: conv.type === 'celula' ? c.cardBgAlt : c.cardBg,
                      },
                    ]}
                  >
                    <View style={[styles.convAvatarBox, { backgroundColor: c.goldWash }]}>
                      <Text style={{ fontSize: 18 }}>{conv.avatar}</Text>
                      {conv.isOnline && (
                        <View style={[styles.onlineBadgeDot, { backgroundColor: c.success, borderColor: c.cardBg }]} />
                      )}
                    </View>

                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <Text numberOfLines={1} style={[t.cardTitle, { color: c.textStrong, flex: 1 }]}>{conv.title}</Text>
                        <Text style={[t.small, styles.cifras, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>{conv.lastTime}</Text>
                      </View>
                      <Text numberOfLines={1} style={[t.body, { color: c.textSoft }]}>
                        {conv.lastMessage}
                      </Text>
                      <Text style={[t.small, { color: c.micro, fontSize: 12.5 }]}>
                        {conv.subtitle}
                      </Text>
                    </View>

                    {conv.unreadCount > 0 && (
                      <View style={[styles.unreadBadgePill, { backgroundColor: c.gold }]}>
                        <Text style={[t.micro, styles.cifras, { color: c.onGold, fontFamily: 'Jost_700Bold' }]}>{conv.unreadCount}</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 4.1: SALA DE CHAT ACTIVA (TIPO WHATSAPP)                            */}
      {/* ========================================================================= */}
      {inChatsComunidad && activeChat !== null && !groupInfoVisible && (
        <View style={{ flex: 1 }}>
          {/* Header del Chat */}
          <View style={[styles.chatRoomHeader, { borderBottomColor: c.divider, backgroundColor: c.cardBg }]}>
            <Pressable onPress={() => setActiveChat(null)} hitSlop={8} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center' }}>
              <Icon name="arrowLeft" size={16} color={c.goldInk} />
            </Pressable>

            <Pressable
              onPress={() => setGroupInfoVisible(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minHeight: 48 }}
            >
              <View style={[styles.avatarCircle, { backgroundColor: c.goldWash }]}>
                <Text style={{ fontSize: 14 }}>{activeChat.avatar}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text numberOfLines={1} style={[t.cardTitle, { color: c.textStrong }]}>
                  {activeChat.title}
                </Text>
                <Text style={[t.small, { color: c.success, fontSize: 12.5 }]}>
                  {activeChat.type === 'celula' ? '16 miembros · Toca para ver info ℹ️' : '● En línea'}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setGroupInfoVisible(true)}
              style={[styles.infoBtnPill, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
            >
              <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>ℹ️ INFO</Text>
            </Pressable>
          </View>

          {/* Mensajes del Chat */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 14, gap: space.gap }}
            showsVerticalScrollIndicator={false}
          >
            {/* Historial real (GET .../messages) — mismo criterio de estados que el resto de la
                pantalla: con solo 3 conversaciones/5 mensajes en la base, el vacío es el caso
                común, no una excepción a cubrir "por si acaso". */}
            {mensajesCargando && activeChat.messages.length === 0 && (
              <Text style={[t.body, { color: c.textSoft }]}>
                Cargando mensajes...
              </Text>
            )}
            {!mensajesCargando && activeChat.messages.length === 0 && (
              <Text style={[t.body, { color: c.textSoft }]}>
                Todavía no hay mensajes. ¡Escribe el primero!
              </Text>
            )}

            {activeChat.messages.map(msg => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubbleWrapper,
                  msg.isMe ? { alignSelf: 'flex-end', alignItems: 'flex-end' } : { alignSelf: 'flex-start', alignItems: 'flex-start' },
                ]}
              >
                {!msg.isMe && (
                  <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold', marginBottom: 3, paddingLeft: 4 }]}>
                    {msg.sender} {msg.senderRole ? `(${msg.senderRole})` : ''}
                  </Text>
                )}

                {/* Mensaje de Texto */}
                {msg.type === 'text' && (
                  <View
                    style={[
                      styles.chatBubble,
                      {
                        backgroundColor: msg.isMe ? c.cardBgAlt : c.cardBg,
                        borderColor: msg.isMe ? c.gold : c.border,
                      },
                    ]}
                  >
                    <Text style={[t.body, { color: c.text }]}>
                      {msg.text}
                    </Text>
                  </View>
                )}

                {/*
                  Nota de voz. `mediaUrl` es la URL firmada que devuelve el backend; sin ella
                  (mensajes viejos, o un adjunto que no se pudo firmar) se muestra la burbuja
                  apagada en vez de un botón que no haría nada al tocarlo.
                */}
                {msg.type === 'audio' && (
                  msg.mediaUrl ? (
                    <BurbujaAudioChat
                      uri={msg.mediaUrl}
                      duracion={msg.audioDuration}
                      esMio={msg.isMe}
                      colores={c}
                      estilos={{ caja: styles.audioBubbleBox, boton: styles.audioPlayBtn }}
                      activo={playingAudioId === msg.id}
                      alActivar={() => setPlayingAudioId(msg.id)}
                    />
                  ) : (
                    <View
                      style={[
                        styles.audioBubbleBox,
                        { backgroundColor: msg.isMe ? c.cardBgAlt : c.cardBg, borderColor: c.border },
                      ]}
                    >
                      <View style={[styles.audioPlayBtn, { backgroundColor: c.border }]}>
                        <Text style={{ fontSize: 11, color: c.textSoft }}>▶</Text>
                      </View>
                      <Text style={[t.small, { color: c.textSoft, flex: 1 }]}>
                        Audio no disponible
                      </Text>
                    </View>
                  )
                )}

                {/*
                  Foto. Antes acá se pintaba un recuadro con el NOMBRE del archivo dentro
                  ("📷 Evidencia_1.jpg"): no había ninguna imagen que mostrar, porque el backend
                  devolvía la clave del objeto en S3 y no una URL que se pudiera abrir. Ahora
                  viene `mediaUrl` ya firmada y se muestra la foto. El recuadro con texto queda
                  solo como respaldo para los mensajes viejos, que sí tienen ese contenido.
                */}
                {msg.type === 'image_grid' && (
                  <View
                    style={[
                      styles.chatBubble,
                      {
                        backgroundColor: msg.isMe ? c.cardBgAlt : c.cardBg,
                        borderColor: msg.isMe ? c.gold : c.border,
                        gap: 6,
                      },
                    ]}
                  >
                    {msg.mediaUrl ? (
                      <Pressable onPress={() => setFotoChatAmpliada(msg.mediaUrl ?? null)}>
                        <Image
                          source={{ uri: msg.mediaUrl }}
                          style={styles.chatFoto}
                          resizeMode="cover"
                          accessibilityLabel="Foto enviada por chat"
                        />
                      </Pressable>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {msg.mediaList?.map((m, idx) => (
                          <View key={idx} style={[styles.chatMediaThumbnail, { backgroundColor: c.divider }]}>
                            <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>{m}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {msg.text && (
                      <Text style={[t.body, { color: c.text, marginTop: 4 }]}>{msg.text}</Text>
                    )}
                  </View>
                )}

                {/* Hora y Doble Check */}
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 2, paddingHorizontal: 4 }}>
                  <Text style={[t.micro, styles.cifras, { color: c.textSoft }]}>{msg.time}</Text>
                  {msg.isMe && <Text style={{ color: c.goldInk, fontSize: 10.5, fontFamily: 'Jost_700Bold' }}>✓✓</Text>}
                </View>
              </View>
            ))}
          </ScrollView>

          {/*
            Barra de escribir, con la gramática de WhatsApp: mientras se graba, la barra entera
            pasa a ser el estado de la grabación (cronómetro corriendo y un solo botón para
            cortar y enviar) en vez de seguir mostrando controles que en ese momento no hacen
            nada. Es lo que separa "grabar" de "escribir" sin explicárselo a nadie.
          */}
          <View style={[styles.chatInputBar, { borderTopColor: c.divider, backgroundColor: c.cardBg }]}>
            {grabando ? (
              <>
                <View style={[styles.grabandoPunto, { backgroundColor: c.danger }]} />
                <Text style={[t.body, styles.cifras, { color: c.text, flex: 1 }]}>
                  Grabando… {formatearSegundos(segundosGrabados)}
                </Text>
                <Pressable
                  onPress={() => void alternarGrabacion()}
                  style={[styles.sendBtnGold, { backgroundColor: c.gold }]}
                  accessibilityLabel="Terminar y enviar la nota de voz"
                >
                  <Text style={{ color: c.onGold, fontFamily: 'Jost_700Bold', fontSize: 17 }}>➤</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={handleAdjuntarFoto}
                  disabled={enviandoMedia}
                  style={[styles.mediaOptionBtn, {
                    backgroundColor: c.goldWash,
                    opacity: enviandoMedia ? 0.4 : 1,
                  }]}
                  accessibilityLabel="Enviar una foto"
                >
                  <Icon name="camera" size={18} color={c.goldInk} />
                </Pressable>

                {/* Acción aparte del botón de foto: acá la imagen se sella como EVIDENCIA de un
                    hábito (otro endpoint, otro bucket, otorga puntos), no como una foto de chat. */}
                <Pressable
                  onPress={() => setEvidenciaVisible(true)}
                  disabled={enviandoMedia}
                  style={[styles.mediaOptionBtn, {
                    backgroundColor: c.successWash,
                    opacity: enviandoMedia ? 0.4 : 1,
                  }]}
                  accessibilityLabel="Subir evidencia de un hábito"
                >
                  <Icon name="checkCircle" size={18} color={c.success} />
                </Pressable>

                <TextInput
                  value={chatInputText}
                  onChangeText={setChatInputText}
                  placeholder="Escribe un mensaje..."
                  placeholderTextColor={c.textSoft}
                  style={[styles.textInputChat, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
                />

                {/*
                  Un solo botón a la derecha, como en WhatsApp: micrófono cuando no hay nada
                  escrito, flecha de enviar en cuanto hay texto. Así el gesto de mandar es
                  siempre el mismo y no hay dos botones compitiendo por el mismo lugar.
                */}
                {chatInputText.trim() ? (
                  <Pressable
                    onPress={() => void handleEnviarTextoReal()}
                    style={[styles.sendBtnGold, { backgroundColor: c.gold }]}
                    accessibilityLabel="Enviar mensaje"
                  >
                    <Text style={{ color: c.onGold, fontFamily: 'Jost_700Bold', fontSize: 17 }}>➤</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => void alternarGrabacion()}
                    disabled={enviandoMedia}
                    style={[styles.sendBtnGold, {
                      backgroundColor: c.gold,
                      opacity: enviandoMedia ? 0.4 : 1,
                    }]}
                    accessibilityLabel="Grabar una nota de voz"
                  >
                    <Icon name="volume" size={18} color={c.onGold} />
                  </Pressable>
                )}
              </>
            )}
          </View>

          {/* Subir la evidencia de un hábito desde el chat. Vive dentro de la vista de
              conversación porque solo tiene sentido con un chat abierto: al terminar deja un
              mensaje aparte en ESTA conversación. */}
          <EvidenciaDesdeChatModal
            visible={evidenciaVisible}
            onCerrar={() => setEvidenciaVisible(false)}
            onSubida={handleEvidenciaSubida}
          />
        </View>
      )}

      {/* ========================================================================= */}
      {/* VISTA 4.2: INFORMACIÓN DEL GRUPO / INTEGRANTES (TIPO WHATSAPP GROUP INFO) */}
      {/* ========================================================================= */}
      {inChatsComunidad && groupInfoVisible && (
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
            <Pressable onPress={() => setGroupInfoVisible(false)} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.goldInk} />
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                VOLVER AL CHAT
              </Text>
            </Pressable>

            <View style={[styles.categoryPillBadge, { backgroundColor: c.goldWash }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                INFO DEL GRUPO
              </Text>
            </View>
          </View>

          <View style={[styles.groupInfoHeaderCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            <View style={[styles.groupLargeAvatar, { backgroundColor: c.goldWash }]}>
              <Icon name="users" size={28} color={c.goldInk} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 22, lineHeight: 28 }]}>
                {nombreDelGrupo}
              </Text>
              {subtituloDelGrupo && (
                <Text style={[t.small, { color: c.goldInk }]}>
                  {subtituloDelGrupo}
                </Text>
              )}
            </View>
          </View>

          {/* LISTA DE INTEGRANTES */}
          <View style={{ gap: space.gap, marginTop: space.gapLg, paddingBottom: 28 }}>
            <Text style={[t.micro, styles.cifras, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
              INTEGRANTES DEL GRUPO ({integrantesDelGrupo.length})
            </Text>

            {integrantesDelGrupo.length === 0 && (
              <Text style={[t.body, { color: c.textSoft }]}>
                Todavía no hay integrantes en tu grupo.
              </Text>
            )}

            {integrantesDelGrupo.map(m => (
              <View
                key={m.id}
                style={[styles.memberRowCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, flexShrink: 1 }}>
                  <AvatarPersona nombre={m.nombre} avatarUrl={m.avatarUrl} size={38} />
                  <View style={{ flexShrink: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 15 }]} numberOfLines={1}>
                        {m.nombre}
                      </Text>
                      {m.badge && (
                        <View style={[styles.memberBadgePill, { backgroundColor: c.goldWash }]}>
                          <Text style={[t.micro, { color: c.goldInk, fontSize: 10.5, fontFamily: 'Jost_700Bold' }]}>
                            {m.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {m.chateable && (
                  <Pressable
                    onPress={() => void abrirDMConIntegrante(m.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Chatear con ${m.nombre}`}
                    style={[styles.chat1a1Btn, { backgroundColor: c.gold }]}
                  >
                    <Text style={[t.small, { color: c.onGold, fontFamily: 'Jost_700Bold' }]}>💬 Chatear</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
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
            <Pressable onPress={() => setCreatePostModalVisible(false)} hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="close" size={14} color={c.goldInk} />
                <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>CANCELAR</Text>
              </View>
            </Pressable>
            <Text style={[t.cardTitle, { color: c.textStrong }]}>NUEVA PUBLICACIÓN</Text>
            <Pressable
              onPress={handlePublishPost}
              disabled={subiendoPublicacion}
              style={[styles.publishHeaderBtn, { backgroundColor: c.gold }, subiendoPublicacion && { opacity: 0.6 }]}
            >
              <Text style={[t.small, { color: c.onGold, fontFamily: 'Jost_700Bold' }]}>
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
              <View style={{ gap: 3 }}>
                <Text style={[t.cardTitle, { color: c.textStrong }]}>{nombreUsuario}</Text>
                <Text style={[t.small, { color: c.goldInk }]}>Grupo 07 · Día 37</Text>
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
  mentor: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  /* Sin la línea de arriba: el aire separa igual de bien y esta pantalla tenía reglas
     horizontales en cada junta. Lo que antes hacía el filete ahora lo hace `gapLg`. */
  section: {
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
  metric: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
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
  /* Sin borde: es un rótulo, no un control. El lavado dorado alcanza para separarlo del fondo. */
  categoryPillBadge: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  /* El control segmentado (DIRECTOS / GLOBAL) conserva su borde: es el contorno del control
     entero, no una caja decorativa. Las pestañas de adentro no tienen ninguno. */
  tabsRow: {
    flexDirection: 'row',
    borderRadius: space.radius,
    borderWidth: 1,
    padding: 4,
    marginTop: 10,
  },
  tabBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: space.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  /* El contenedor externo de una publicación: su borde se queda. Lo que se fue son los trece
     bordes que vivían adentro. */
  postCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadge: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mediaGridContainer: {
    borderRadius: space.radiusSm,
    overflow: 'hidden',
  },
  // SIN `height`: el alto sale del `aspectRatio` que se pasa en línea con la proporción real de la
  // foto (ver `proporcionesFoto` en esta pantalla). El `height: 120` que había acá era la causa de
  // que toda foto vertical apareciera recortada.
  /* Los cuatro recuadros de foto perdieron el borde: lo que tienen adentro es una imagen, que ya
     define su propia forma. Un contorno alrededor de una foto, dentro de una tarjeta que también
     tiene contorno, son dos marcos para una sola imagen. */
  mediaSingleBox: {
    width: '100%',
    borderRadius: space.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Dos fotos: una al lado de la otra y cuadradas, como el mosaico de Instagram. Antes eran de
  // 100 px de alto con el ancho de media tarjeta, o sea apaisadas a la fuerza.
  mediaHalfBox: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: space.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sin `height: '100%'`: la fila que lo contiene ya no tiene alto en píxeles sino `aspectRatio`,
  // y un porcentaje contra un alto derivado es justo el caso frágil de Yoga. El estirado vertical
  // lo da el `alignItems: 'stretch'` que la fila trae por defecto.
  mediaLargeLeft: {
    flex: 1.4,
    borderRadius: space.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaSmallRight: {
    flex: 1,
    borderRadius: space.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Una publicación llegaba a tener tres filetes horizontales seguidos: resumen de reacciones,
     fila de acciones y comentarios. Se quedan los dos últimos, que separan cosas distintas; este
     iba 8 px encima de otro y sólo agregaba ruido. Lo reemplaza el aire. */
  reactionsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  rxCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: space.radiusSm,
  },
  rxCountTexto: {
    fontSize: 10.5,
    fontFamily: 'Jost_700Bold',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    /* Alineadas a la IZQUIERDA, no repartidas. Con `flex: 1` en cada botón la fila se estiraba de
       borde a borde y "Like" quedaba pegado al margen, lejos del pulgar en un teléfono de 360 px.
       Agrupadas a la izquierda, las tres caen dentro del arco natural del dedo. */
    justifyContent: 'flex-start',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  actionBtn: {
    /* Sin `flex: 1`: cada botón mide lo que su contenido. `flexShrink` evita que los tres juntos
       desborden en 360 px, que es el ancho de referencia (AGENTS.md §2). */
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    /* 48px minimos (AGENTS.md 4): con `paddingVertical: 6` la fila medía ~26 y era la accion
       mas usada del Muro. `flexShrink` en la etiqueta evita que "Compartir" empuje la fila. */
    minHeight: 48,
    gap: 5,
    paddingVertical: 6,
    /* 8, no 4 ni 12. Sin `flex: 1` el respiro lateral es lo único que separa "Like" de
       "Comentar", así que 4 los pegaba. Pero con 12 los tres botones sumaban 280 px y llenaban
       justo la tarjeta de 281: quedaban agrupados a la izquierda y no se notaba, porque no
       sobraba sitio. Con 8 sobran ~25 px a la derecha y el agrupamiento SE VE. */
    paddingHorizontal: 8,
    borderRadius: space.radiusSm,
  },
  rxCountBotonFila: {
    /* Empuja la chapa al borde derecho sin estirar los botones, que siguen agrupados a la
       izquierda. Misma altura de toque que ellos. */
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingLeft: 8,
  },
  commentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: space.gap,
  },
  commentCard: {
    borderRadius: space.radiusSm,
    padding: 12,
  },
  commentPhotoBox: {
    borderRadius: space.radiusSm,
    marginTop: 8,
    overflow: 'hidden',
    maxWidth: 220,
  },
  commentPhotoImage: {
    width: '100%',
    height: 130,
    borderRadius: space.radiusSm,
  },
  commentPhotoPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: space.radiusSm,
    padding: 8,
  },
  /* El clip y el botón de enviar son los dos controles de la fila de comentario: conservan su
     forma, pero pasan de 34 y ~30 px de alto a 48 (AGENTS.md §4). */
  attachPhotoBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Era `fontSize: 12`: por debajo del mínimo de input de AGENTS.md §4 (14–15.5). */
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: space.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    fontSize: 15,
  },
  sendCommentBtn: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 14,
    minHeight: 48,
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
  chatConvCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  /* Perdió su contorno: vivía dentro del borde de la fila. El anillo del punto de "en línea"
     (`onlineBadgeDot`) SÍ se queda, porque no es decoración: es el recorte que separa el punto
     del avatar, y va pintado del color del fondo. */
  convAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  unreadBadgePill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatRoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoBtnPill: {
    borderWidth: 1,
    borderRadius: space.radiusSm,
    paddingHorizontal: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDividerPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 10.5,
    fontFamily: 'Jost_700Bold',
  },
  messageBubbleWrapper: {
    maxWidth: '85%',
  },
  /* La burbuja conserva su borde: es un contenedor externo dentro de la lista de mensajes, y en
     modo claro `cardBg` y el fondo de pantalla son casi el mismo color, así que sin la línea la
     burbuja desaparecería. Lo que se fue es el borde del recuadro de adjunto que lleva adentro. */
  chatBubble: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: 12,
  },
  audioBubbleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: space.radius,
    padding: 12,
    minWidth: 170,
  },
  audioPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** El punto que late al lado del cronómetro mientras se graba. */
  grabandoPunto: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  /** Foto recibida por chat. Alto fijo y `cover`: una tira de fotos de alturas distintas hace
   * saltar el scroll cada vez que carga una, y es lo que evita WhatsApp con el mismo recurso. */
  chatFoto: {
    width: 200,
    height: 200,
    borderRadius: 12,
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
  chatMediaThumbnail: {
    borderRadius: space.radiusSm,
    padding: 10,
    alignItems: 'center',
  },
  /* Los tres botones de la barra pasan de 32/34 px a 48 (AGENTS.md §4). Para que el campo de
     escribir no se quede sin ancho en un teléfono de 360 px, el respiro entre ellos baja de 6 a 4
     y el lateral de la barra de 10 a 8: se recuperan 10 px de los ~44 que cuesta agrandarlos. */
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  mediaOptionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputChat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: space.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    fontSize: 15,
  },
  sendBtnGold: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Alineado a la izquierda: el nombre del grupo y su bajada son texto que se lee. */
  groupInfoHeaderCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  groupLargeAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberRowCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: 14,
    minHeight: 48,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberBadgePill: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chat1a1Btn: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  publishHeaderBtn: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 16,
    minHeight: 48,
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
