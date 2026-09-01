import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { MicroLabel, ScreenHeader, Placeholder } from '../components/ui';
import { Icon, IconName } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';
import { useAuth } from '../features/auth/context/AuthContext';
import { useWallFeed } from '../features/community/hooks/useWallFeed';
import * as wallApi from '../features/community/api/wallApi';
import { elegirYNormalizarFotoMuro, type FotoMuroNormalizada } from '../features/community/utils/normalizarImagen';
import { FotoMuro } from '../features/community/components/FotoMuro';
import { useCursos } from '../features/academy/hooks/useCursos';
import { CursoPortada } from '../features/academy/components/CursoPortada';
import { useLeccionDetalle } from '../features/academy/hooks/useLeccionDetalle';
import { LeccionVideoPlayer } from '../features/academy/components/LeccionVideoPlayer';
import { useChatConversaciones } from '../features/chat/hooks/useChatConversaciones';
import { ApiError, mensajeDeError } from '../services/http/apiClient';

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
  instructor: string;
  summary: string;
  progressPercent: number;
  totalModules: number;
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
  dislikes: number;
  userReaction?: 'like' | 'dislike' | null;
  timeAgo: string;
}

export interface PostItem {
  id: string;
  author: string;
  avatar: string;
  cell: string;
  dayStreak: number;
  timeAgo: string;
  tag?: string;
  text: string;
  // `url`/`mimeType`: la URL firmada real de S3 (`WallMedia`, backend) y su tipo MIME. Las agrega
  // `wallMappers.ts` al traducir la respuesta del feed — es lo que permite pintar la foto real en
  // vez del `title` como texto plano (ver `FotoMuro`, `features/community/components/`).
  media: { type: 'image' | 'video'; title: string; subtitle?: string; url: string; mimeType: string }[];
  likes: number;
  dislikes: number;
  userReaction?: 'like' | 'dislike' | null;
  comments: CommentItem[];
}

export interface ReactionUser {
  id: string;
  name: string;
  role: string;
  avatar: string;
  type: 'like' | 'dislike';
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
export type ChatMessageType = 'text' | 'audio' | 'image_grid' | 'video' | 'gif';

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
  gifTitle?: string;
  gifIcon?: string;
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
const INITIAL_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 't1',
    name: 'Carlos Méndez',
    role: 'CEO & Fundador Tecnológico',
    badge: '👑 GRADUADO GENERACIÓN 04',
    avatar: '👨‍💼',
    daysCompleted: 90,
    quote:
      '“Trabajaba 14 horas al día al borde del colapso. Gracias a los Bloques de Poder y el reseteo biológico de RENASER, reduje mi jornada a 6 horas y mi facturación se disparó un 140%.”',
    metrics: [
      { label: 'TIEMPO', value: '-50% Horas', isHighlight: true },
      { label: 'FACTURACIÓN', value: '+140% USD', isHighlight: true },
      { label: 'CONSISTENCIA', value: '98% Racha', isHighlight: true },
    ],
    videoDuration: '3 MIN',
  },
  {
    id: 't2',
    name: 'Dra. Valeria Ruiz',
    role: 'Directora Médica & Cirujana',
    badge: '👑 GRADUADA GENERACIÓN 05',
    avatar: '👩‍⚕️',
    daysCompleted: 90,
    quote:
      '“El hackeo de cortisol matutino y la respiración diafragmática me devolvieron la calma. Duermo 8 horas profundas y mi velocidad de respuesta clínica es inquebrantable.”',
    metrics: [
      { label: 'CALIDAD SUEÑO', value: '8 hrs Profundas', isHighlight: true },
      { label: 'CLARIDAD', value: '100% Sin Ansiedad', isHighlight: true },
    ],
    videoDuration: '4 MIN',
  },
];

const INITIAL_LEADERBOARD: LeaderboardUser[] = [
  { id: 'u1', rank: 1, name: 'María A.', cell: 'Célula 07', streakDays: 37, evidencePercent: 99, medal: 'gold' },
  { id: 'u2', rank: 2, name: 'Rodrigo V.', cell: 'Célula 03', streakDays: 36, evidencePercent: 96, medal: 'silver' },
  { id: 'u3', rank: 3, name: 'Esteban G.', cell: 'Célula 05', streakDays: 35, evidencePercent: 94, medal: 'bronze' },
  { id: 'u4', rank: 4, name: 'TÚ (Kelin Arango)', cell: 'Célula 07', streakDays: 37, evidencePercent: 94, isCurrentUser: true },
  { id: 'u5', rank: 5, name: 'Gabriel Ortiz', cell: 'Célula 02', streakDays: 34, evidencePercent: 91 },
  { id: 'u6', rank: 6, name: 'Sofía Andrade', cell: 'Célula 07', streakDays: 33, evidencePercent: 89 },
];

const REACTION_USERS_MOCK: ReactionUser[] = [
  { id: 'r1', name: 'Sebastián Arango (Mentor)', role: 'Mentor Principal', avatar: '🦅', type: 'like' },
  { id: 'r2', name: 'Carlos Méndez', role: 'Célula 04', avatar: '👨‍💼', type: 'like' },
  { id: 'r3', name: 'Dra. Valeria Ruiz', role: 'Célula 05', avatar: '👩‍⚕️', type: 'like' },
  { id: 'r4', name: 'Marcos V.', role: 'Célula 03', avatar: '👤', type: 'dislike' },
];

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
    cell: 'Célula 07',
    focus: 'Gestión Somática & Negocios de Alto Valor',
  },
  {
    id: 'm2',
    name: 'María Alejandra',
    role: 'Alumna de Alto Rendimiento',
    avatar: '👩‍💼',
    badge: 'ALUMNA',
    streakDays: 37,
    cell: 'Célula 07',
    focus: 'Bloque Deep Work 90m & Ventas',
  },
  {
    id: 'm3',
    name: 'Carlos Méndez',
    role: 'Graduado Generación 04',
    avatar: '👨‍💼',
    badge: 'GRADUADO',
    streakDays: 90,
    cell: 'Célula 04',
    focus: 'Bioquímica, Sueño Profundo & Flujo de Caja',
  },
  {
    id: 'm4',
    name: 'Dra. Valeria Ruiz',
    role: 'Directora Médica & Cirujana',
    avatar: '👩‍⚕️',
    badge: 'GRADUADA',
    streakDays: 90,
    cell: 'Célula 05',
    focus: 'Respiración Diafragmática & Regulación Cortisol',
  },
];

// `INITIAL_CONVERSATIONS` (mock) se retiró: las conversaciones salen del backend real vía
// `useChatConversaciones` (GET /api/v1/chat/conversations). `GROUP_MEMBERS` sigue mock (ver nota
// junto a su declaración, más arriba): el backend no expone los campos que ese roster necesita.

const GIF_OPTIONS = [
  { icon: '🔥', title: 'VICTORIA' },
  { icon: '👑', title: 'REY SOMÁTICO' },
  { icon: '💪', title: 'FUERZA' },
  { icon: '🧘', title: 'PAZ TOTAL' },
  { icon: '⚡', title: 'ENERGÍA' },
  { icon: '🎯', title: 'FOCO 100%' },
];

const SOPORTE: { icon: IconName; label: string }[] = [
  { icon: 'clock', label: 'Eventos &\nExperiencias' },
  { icon: 'stack', label: 'Recursos\nExclusivos' },
  { icon: 'user', label: 'Atención\nPersonalizada' },
];

const METRICAS = [
  { n: '12', label: 'Conversaciones\nesta semana' },
  { n: '3', label: 'Eventos\npróximos' },
  { n: '2', label: 'Mentorías\nprogramadas' },
];

export default function ComunidadScreen() {
  const { c, t } = useTheme();
  const { rs, isTablet, horizontalPadding } = useResponsive();
  const { user } = useAuth();
  const mentorPhoto = rs(50);
  const avatarSize = rs(42);
  const medallionSize = rs(40);
  // Nombre real de quien está usando la app, para las publicaciones y comentarios propios del
  // Muro — reemplaza el "Kelin Arango" fijo del mock por el dato de la sesión.
  const nombreUsuario = user?.name?.trim() || 'Tú';
  const primerNombreUsuario = nombreUsuario.split(' ')[0];

  // =========================================================================
  // ESTADOS DE NAVEGACIÓN
  // =========================================================================
  const [inExclusiveResources, setInExclusiveResources] = useState(false);
  // Se guarda el ID, no el objeto: `courses` (de `useCursos`) es la única fuente de verdad, así
  // que `selectedCourse` sale siempre DERIVADO más abajo. Si se guardara el objeto entero (como
  // hacía el mock) quedaría una copia vieja congelada en el momento del toque, y una acción
  // posterior (p.ej. completar una lección) no se reflejaría al volver a esa vista.
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [fullScreenLesson, setFullScreenLesson] = useState<LessonResource | null>(null);

  // Sub-módulo: Eventos & Experiencias
  const [inEventosExperiencias, setInEventosExperiencias] = useState(false);
  const [eventosTab, setEventosTab] = useState<'muro' | 'testimonios' | 'ranking'>('muro');

  // Sub-módulo: Atención Personalizada & Chats tipo WhatsApp — `conversations` sale del backend
  // real (GET /api/v1/chat/conversations) a través de `useChatConversaciones`; el historial de
  // cada una se pide recién al abrirla (ver `handleAbrirChat`), nunca en el listado.
  const [inAtencionPersonalizada, setInAtencionPersonalizada] = useState(false);
  const [chatCategory, setChatCategory] = useState<'celula' | 'miembros' | 'global'>('celula');
  const {
    conversations,
    setConversations,
    loading: conversacionesCargando,
    error: conversacionesError,
    mensajesCargando,
    abrirConversacion,
    enviarMensajeTexto: enviarMensajeChatRemoto,
  } = useChatConversaciones(user?.id ?? null);
  const [activeChat, setActiveChat] = useState<ChatConversation | null>(null);
  const [groupInfoVisible, setGroupInfoVisible] = useState(false);
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<GroupMember | null>(null);
  const [chatInputText, setChatInputText] = useState('');
  const [gifSelectorVisible, setGifSelectorVisible] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Estados del Muro Social — `posts` sale del backend real (GET /api/v1/wall) a través de
  // `useWallFeed`; `setPosts` queda expuesto para las interacciones que el backend todavía no
  // soporta (reacciones a comentarios, foto adjunta en un comentario) y que siguen siendo locales.
  const {
    posts,
    setPosts,
    loading: muroCargando,
    error: muroError,
    recargar: recargarMuro,
    reaccionar: reaccionarPublicacion,
    cargarComentarios,
    agregarComentario: agregarComentarioRemoto,
  } = useWallFeed();
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentPhotos, setCommentPhotos] = useState<Record<string, boolean>>({});

  // Estados de "Recursos Exclusivos" (cursos/lecciones) — `courses` sale del backend real
  // (GET /api/v1/cursos + GET /api/v1/cursos/{id}/secciones) a través de `useCursos`.
  const { courses, loading: cursosCargando, error: cursosError } = useCursos();
  const selectedCourse = selectedCourseId ? (courses.find(cu => cu.id === selectedCourseId) ?? null) : null;
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
  const [newPostTag, setNewPostTag] = useState('🔥 VICTORIA SOMÁTICA');
  // Fotos ya elegidas de la galería y normalizadas (`utils/normalizarImagen.ts`), listas para
  // subir a S3 al publicar. Arranca vacío: el backend exige al menos una (Publicacion.MEDIA_MIN
  // = 1), así que ya no tiene sentido precargar nombres de archivo falsos.
  const [attachedPhotos, setAttachedPhotos] = useState<FotoMuroNormalizada[]>([]);
  const [agregandoFoto, setAgregandoFoto] = useState(false);
  const [subiendoPublicacion, setSubiendoPublicacion] = useState(false);

  // Modal Quién dio Like/Dislike
  const [reactionsModalVisible, setReactionsModalVisible] = useState(false);
  const [reactionFilter, setReactionFilter] = useState<'all' | 'like' | 'dislike'>('all');

  // =========================================================================
  // GESTOS TÁCTILES DEL SISTEMA (BACKHANDLER)
  // =========================================================================
  useSystemBackHandler(() => {
    if (selectedMemberProfile !== null) {
      setSelectedMemberProfile(null);
      return true;
    }
    if (groupInfoVisible) {
      setGroupInfoVisible(false);
      return true;
    }
    if (gifSelectorVisible) {
      setGifSelectorVisible(false);
      return true;
    }
    if (activeChat !== null) {
      setActiveChat(null);
      return true;
    }
    if (inAtencionPersonalizada) {
      setInAtencionPersonalizada(false);
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
    if (inExclusiveResources) {
      setInExclusiveResources(false);
      return true;
    }
    if (inEventosExperiencias) {
      setInEventosExperiencias(false);
      return true;
    }
    return false;
  }, inAtencionPersonalizada || inEventosExperiencias || inExclusiveResources || selectedCourse !== null || fullScreenLesson !== null || createPostModalVisible || reactionsModalVisible || activeChat !== null || groupInfoVisible || selectedMemberProfile !== null);

  // =========================================================================
  // HANDLERS
  // =========================================================================
  const handleSoportePress = (label: string) => {
    if (label.includes('Atención')) {
      setInAtencionPersonalizada(true);
    } else if (label.includes('Eventos')) {
      setInEventosExperiencias(true);
    } else if (label.includes('Recursos')) {
      setInExclusiveResources(true);
    }
  };

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
   * pantalla (ver `handleSoportePress`/reacciones del Muro).
   */
  const handleAbrirLeccion = (lesson: LessonResource) => {
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
    setFullScreenLesson(lesson);
    // Se pide en paralelo, no antes: la pantalla ya se abrió con lo que había en el árbol
    // (título, tipo, meta) — el video/cuerpo real llegan un instante después sin bloquear la
    // navegación (ver `useLeccionDetalle`).
    cargarDetalleLeccion(lesson.id);
  };

  const handleAlternarLeccionCompletada = async (leccion: LessonResource) => {
    try {
      await alternarLeccionCompletada(leccion.id, !!leccion.completed);
      if (!leccion.completed) {
        Alert.alert('¡Excelente Progreso! 🦅', 'Lección completada y registrada en tu racha somática.');
      }
      setFullScreenLesson(null);
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
   * Audio/GIF/foto/video quedan SOLO local (como en el diseño original, sin backend detrás): no
   * existe endpoint de subida de medios para chat (a diferencia del Muro, `POST
   * /wall/media/upload-url`), así que no hay de dónde sacar un `mediaBucket`/`mediaPath` real —
   * inventarlo violaría el contrato. El texto SÍ es real, ver `handleEnviarTextoReal`.
   */
  const handleSendChatMessage = (
    type: ChatMessageType = 'text',
    extra?: { text?: string; mediaList?: string[]; gifTitle?: string; gifIcon?: string }
  ) => {
    if (!activeChat) return;
    if (type === 'text') {
      void handleEnviarTextoReal();
      return;
    }

    let newMsg: ChatMessage;
    const nowTime = 'Justo ahora';

    if (type === 'audio') {
      newMsg = {
        id: `msg_${Date.now()}`,
        sender: 'Kelin Arango',
        avatar: '🦅',
        isMe: true,
        time: nowTime,
        type: 'audio',
        audioDuration: '0:28',
        text: 'Nota de voz enviada',
        status: 'read',
      };
    } else if (type === 'gif') {
      newMsg = {
        id: `msg_${Date.now()}`,
        sender: 'Kelin Arango',
        avatar: '🦅',
        isMe: true,
        time: nowTime,
        type: 'gif',
        gifTitle: extra?.gifTitle || 'VICTORIA',
        gifIcon: extra?.gifIcon || '🔥',
        status: 'read',
      };
      setGifSelectorVisible(false);
    } else if (type === 'image_grid') {
      newMsg = {
        id: `msg_${Date.now()}`,
        sender: 'Kelin Arango',
        avatar: '🦅',
        isMe: true,
        time: nowTime,
        type: 'image_grid',
        text: extra?.text || 'Evidencia fotográfica adjunta',
        mediaList: extra?.mediaList || ['📷 Evidencia_1.png', '📷 Evidencia_2.png'],
        status: 'read',
      };
    } else {
      newMsg = {
        id: `msg_${Date.now()}`,
        sender: 'Kelin Arango',
        avatar: '🦅',
        isMe: true,
        time: nowTime,
        type: 'video',
        text: '▶ Video de sesión somática',
        status: 'read',
      };
    }

    const updated = {
      ...activeChat,
      messages: [...activeChat.messages, newMsg],
      lastMessage: newMsg.text || 'Elemento multimedia',
      lastTime: nowTime,
    };

    setActiveChat(updated);
    setConversations(prev => prev.map(cItem => (cItem.id === updated.id ? updated : cItem)));
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

  // Like/Dislike van contra el backend real (POST /api/v1/wall/{id}/react). El propio backend
  // hace el toggle (ReaccionarUseCase: tocar el mismo tipo lo saca, tocar el otro lo reemplaza) y
  // devuelve los conteos verdaderos, así que acá no hay aritmética que llevar a mano.
  const handleToggleLike = async (postId: string) => {
    try {
      await reaccionarPublicacion(postId, 'LIKE');
    } catch (error) {
      Alert.alert('No se pudo reaccionar', mensajeDeError(error, 'Intentá de nuevo en un momento.'));
    }
  };

  const handleToggleDislike = async (postId: string) => {
    try {
      await reaccionarPublicacion(postId, 'DISLIKE');
    } catch (error) {
      Alert.alert('No se pudo reaccionar', mensajeDeError(error, 'Intentá de nuevo en un momento.'));
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
  const handleCommentVote = (postId: string, commentId: string, type: 'like' | 'dislike') => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          const updatedComments: CommentItem[] = p.comments.map(cItem => {
            if (cItem.id === commentId) {
              const nextReaction: 'like' | 'dislike' | null =
                type === 'like'
                  ? cItem.userReaction === 'like'
                    ? null
                    : 'like'
                  : cItem.userReaction === 'dislike'
                  ? null
                  : 'dislike';

              return {
                ...cItem,
                likes:
                  type === 'like'
                    ? cItem.userReaction === 'like'
                      ? cItem.likes - 1
                      : cItem.likes + 1
                    : cItem.userReaction === 'like'
                    ? cItem.likes - 1
                    : cItem.likes,
                dislikes:
                  type === 'dislike'
                    ? cItem.userReaction === 'dislike'
                      ? cItem.dislikes - 1
                      : cItem.dislikes + 1
                    : cItem.userReaction === 'dislike'
                    ? cItem.dislikes - 1
                    : cItem.dislikes,
                userReaction: nextReaction,
              };
            }
            return cItem;
          });
          return { ...p, comments: updatedComments };
        }
        return p;
      })
    );
  };

  // Comentar va contra el backend real (POST /api/v1/wall/{postId}/comments). Ese endpoint solo
  // acepta texto (CreateWallCommentRequest exige @NotBlank): una foto sin texto no tiene forma de
  // guardarse todavía, así que se avisa en vez de fingir que se publicó.
  const handleAddComment = async (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) {
      if (commentPhotos[postId]) {
        Alert.alert(
          'Falta el texto',
          'Escribí algo para poder comentar. La foto se adjunta junto con el texto, no sola.'
        );
      }
      return;
    }

    try {
      await agregarComentarioRemoto(postId, text);
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setCommentPhotos(prev => ({ ...prev, [postId]: false }));
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

    setSubiendoPublicacion(true);
    try {
      // Tres pasos por foto, en orden (WallController: media/upload-url → PUT directo a S3 →
      // POST /wall con la URL ya subida). Se hace de a una: el backend no ofrece un batch, y el
      // límite (`@Size(max = 10)`) hace que el costo de no paralelizar sea despreciable.
      const media: { url: string; mimeType: string }[] = [];
      for (const foto of attachedPhotos) {
        const urlSubida = await wallApi.solicitarUrlSubidaMuro(foto.mimeType);
        if (wallApi.almacenamientoSinConfigurar(urlSubida.uploadUrl)) {
          // Bloqueante externo conocido (D-34): sin `STORAGE_PROVEEDOR=s3` configurado en el
          // servidor, `uploadUrl` es un marcador (`about:blank#pendiente-s3/...`), no una URL de
          // S3 real. No tiene sentido intentar el PUT — fallaría con un error de red críptico.
          throw new Error(
            'El almacenamiento de fotos (S3) todavía no está configurado en el servidor. Avisale al equipo técnico e intentá de nuevo más tarde.'
          );
        }
        await wallApi.subirImagenAS3(urlSubida.uploadUrl, foto.uri, foto.mimeType);
        media.push({ url: wallApi.urlPermanenteDesdeSubida(urlSubida.uploadUrl), mimeType: foto.mimeType });
      }

      await wallApi.publicarEnMuro(newPostText.trim(), media);
      await recargarMuro(); // trae la publicación real (con su id e reacciones desde el servidor)
      setNewPostText('');
      setAttachedPhotos([]);
      setCreatePostModalVisible(false);
      Alert.alert('¡Publicado con Éxito! 🦅', 'Tu victoria ha sido compartida con la tribu.');
    } catch (error) {
      Alert.alert('No se pudo publicar', mensajeDeFalloAlPublicar(error));
    } finally {
      setSubiendoPublicacion(false);
    }
  };

  const filteredReactions = REACTION_USERS_MOCK.filter(r => {
    if (reactionFilter === 'like') return r.type === 'like';
    if (reactionFilter === 'dislike') return r.type === 'dislike';
    return true;
  });

  const filteredConversations = conversations.filter(conv => {
    if (chatCategory === 'celula') return conv.type === 'celula';
    if (chatCategory === 'miembros') return conv.type === 'direct';
    if (chatCategory === 'global') return conv.type === 'global';
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="COMUNIDAD" right="info" />

      {/* ========================================================================= */}
      {/* VISTA 1: PANTALLA PRINCIPAL DE COMUNIDAD (DISEÑO ORIGINAL LIMPIO)         */}
      {/* ========================================================================= */}
      {!inExclusiveResources && !inEventosExperiencias && !inAtencionPersonalizada && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: isTablet ? 560 : undefined,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', paddingTop: 14 }}>
            <Text style={[t.sectionTitle, { color: c.text, lineHeight: 21, textAlign: 'center' }]}>
              TU TRIBU. TU SOPORTE.{"\n"}TU LEGADO.
            </Text>
          </View>

          <View style={{ paddingTop: 16 }}>
            <MicroLabel>MENTOR</MicroLabel>
            <View style={[styles.mentor, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              <Placeholder label="FOTO" style={{ width: mentorPhoto, height: mentorPhoto, borderRadius: mentorPhoto / 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[t.cardTitle, { color: c.textStrong }]}>Sebastián Arango</Text>
                <Text style={[t.small, { color: c.micro, marginTop: 2 }]}>Mentor de Alto Rendimiento</Text>
                <Text style={[t.small, { color: c.textSoft, marginTop: 6, fontStyle: 'italic', lineHeight: 18 }]}>
                  “Revisión de tu plan de esta semana.{"\n"}¿Agendamos tu llamada?”
                </Text>
              </View>
              <Icon name="chevron" size={12} color={c.chevron} />
            </View>
          </View>

          <View style={[styles.section, { borderTopColor: c.divider }]}>
            <MicroLabel>TRIBU PRIVADA</MicroLabel>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              {[0, 1, 2, 3].map(i => (
                <Placeholder key={i} style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }} />
              ))}
              <View style={[styles.more, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Text style={[t.small, { color: c.textSoft }]}>+12</Text>
              </View>
            </View>
          </View>

          {/* Sección TU SOPORTE (Los 3 Círculos Originales) */}
          <View style={[styles.section, { borderTopColor: c.divider }]}>
            <MicroLabel>TU SOPORTE</MicroLabel>
            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              {SOPORTE.map(s => (
                <Pressable
                  key={s.label}
                  onPress={() => handleSoportePress(s.label)}
                  style={{ flex: 1, alignItems: 'center', gap: 8 }}
                  hitSlop={6}
                >
                  <View
                    style={[
                      styles.medallion,
                      {
                        width: medallionSize,
                        height: medallionSize,
                        borderRadius: medallionSize / 2,
                        borderColor: s.label.includes('Atención') || s.label.includes('Eventos') || s.label.includes('Recursos') ? c.gold : c.border,
                        backgroundColor: s.label.includes('Atención') || s.label.includes('Eventos') || s.label.includes('Recursos') ? c.cardBgAlt : c.cardBg,
                      },
                    ]}
                  >
                    <Icon name={s.icon} size={rs(19)} color={c.gold} strokeWidth={1.05} />
                  </View>
                  <Text style={[t.micro, { color: c.textSoft, textAlign: 'center', letterSpacing: 0, fontSize: 9, lineHeight: 13 }]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.section, { borderTopColor: c.divider, flex: 1, justifyContent: 'flex-end', paddingBottom: 24 }]}>
            <MicroLabel>INTERACCIONES CLAVE</MicroLabel>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              {METRICAS.map(m => (
                <View key={m.n} style={[styles.metric, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                  <Text style={[t.metric, { color: c.textStrong, fontSize: 22 }]}>{m.n}</Text>
                  <Text style={[t.micro, { color: c.micro, letterSpacing: 0, fontSize: 9, textAlign: 'center', marginTop: 4, lineHeight: 13 }]}>
                    {m.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: SUB-MÓDULO: EVENTOS & EXPERIENCIAS (MURO, TESTIMONIOS, RANKING 3D)*/}
      {/* ========================================================================= */}
      {inEventosExperiencias && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: isTablet ? 560 : undefined,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar para volver a Comunidad */}
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable
              onPress={() => setInEventosExperiencias(false)}
              style={styles.backBtnRow}
              hitSlop={8}
            >
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A COMUNIDAD
              </Text>
            </Pressable>

            <View style={[styles.categoryPillBadge, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                EVENTOS & EXPERIENCIAS
              </Text>
            </View>
          </View>

          {/* Selector de las 3 Pestañas Principales */}
          <View style={[styles.tabsRow, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            <Pressable
              onPress={() => setEventosTab('muro')}
              style={[
                styles.tabBtn,
                eventosTab === 'muro' && { backgroundColor: c.gold },
              ]}
            >
              <Text
                style={[
                  t.micro,
                  {
                    color: eventosTab === 'muro' ? '#1E1B18' : c.textSoft,
                    fontWeight: '700',
                    fontSize: 10,
                  },
                ]}
              >
                📢 MURO
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setEventosTab('testimonios')}
              style={[
                styles.tabBtn,
                eventosTab === 'testimonios' && { backgroundColor: c.gold },
              ]}
            >
              <Text
                style={[
                  t.micro,
                  {
                    color: eventosTab === 'testimonios' ? '#1E1B18' : c.textSoft,
                    fontWeight: '700',
                    fontSize: 10,
                  },
                ]}
              >
                ⭐ TESTIMONIOS
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setEventosTab('ranking')}
              style={[
                styles.tabBtn,
                eventosTab === 'ranking' && { backgroundColor: c.gold },
              ]}
            >
              <Text
                style={[
                  t.micro,
                  {
                    color: eventosTab === 'ranking' ? '#1E1B18' : c.textSoft,
                    fontWeight: '700',
                    fontSize: 10,
                  },
                ]}
              >
                🏆 RANKING 3D
              </Text>
            </Pressable>
          </View>

          {/* PESTAÑA 1: MURO SOCIAL */}
          {eventosTab === 'muro' && (
            <View style={{ gap: 14, paddingTop: 10, paddingBottom: 28 }}>
              {/* Botón Ventana Externa de Publicación */}
              <Pressable
                onPress={() => setCreatePostModalVisible(true)}
                style={[styles.createPostBar, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={[styles.avatarCircle, { borderColor: c.gold, backgroundColor: c.bg }]}>
                    <Text style={{ fontSize: 13 }}>🦅</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.body, { color: c.textStrong, fontSize: 12.5, fontWeight: '600' }]}>
                      ¿Qué conquistaste hoy, {primerNombreUsuario}?
                    </Text>
                    <Text style={[t.micro, { color: c.gold, fontSize: 10 }]}>
                      Publicación sin límite de caracteres ›
                    </Text>
                  </View>
                </View>
                <View style={[styles.plusBadge, { backgroundColor: c.gold }]}>
                  <Text style={{ color: '#1E1B18', fontWeight: '900', fontSize: 14 }}>+</Text>
                </View>
              </Pressable>

              {/* Estados de carga/error del feed real — sin componentes nuevos, solo texto con
                  los mismos tokens que ya usa el resto de la pantalla. */}
              {muroCargando && posts.length === 0 && (
                <Text style={[t.micro, { color: c.textSoft, textAlign: 'center' }]}>
                  Cargando el muro...
                </Text>
              )}
              {muroError && (
                <Text style={[t.micro, { color: '#f28e8e', textAlign: 'center' }]}>{muroError}</Text>
              )}
              {!muroCargando && !muroError && posts.length === 0 && (
                <Text style={[t.micro, { color: c.textSoft, textAlign: 'center' }]}>
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
                    style={[styles.postCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
                  >
                    {/* Header del Post */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={[styles.avatarCircle, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                          <Text style={{ fontSize: 14 }}>{post.avatar}</Text>
                        </View>
                        <View>
                          <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>{post.author}</Text>
                          <Text style={[t.micro, { color: c.micro, fontSize: 9.5 }]}>
                            {post.cell} · {post.timeAgo}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.dayBadge, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
                        <Text style={[t.micro, { color: c.gold, fontSize: 9.5, fontWeight: '700' }]}>
                          Día {post.dayStreak}
                        </Text>
                      </View>
                    </View>

                    {/* Texto del Post con "Ver más..." */}
                    <View style={{ marginTop: 8 }}>
                      <Text
                        numberOfLines={isExpanded ? undefined : 3}
                        style={[t.body, { color: c.text, fontSize: 12.5, lineHeight: 18 }]}
                      >
                        {post.text}
                      </Text>
                      {post.text.length > 120 && (
                        <Pressable
                          onPress={() => setExpandedPosts(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                          style={{ marginTop: 2 }}
                        >
                          <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                            {isExpanded ? 'Ver menos' : 'Ver más...'}
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {/* Galería Autodetectada */}
                    {post.media.length > 0 && (
                      <View style={[styles.mediaGridContainer, { marginTop: 10 }]}>
                        {post.media.length === 1 ? (
                          <View style={[styles.mediaSingleBox, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
                            <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>
                              {post.media[0].title}
                            </Text>
                            {/* Overlay DESPUÉS del texto a propósito: si la foto carga, lo tapa; si es
                                video o falla, no dibuja nada y el texto de siempre queda visible. */}
                            <FotoMuro
                              url={post.media[0].url}
                              mimeType={post.media[0].mimeType}
                              radioBorde={12}
                              colorFondo={c.cardBgAlt}
                            />
                          </View>
                        ) : post.media.length === 2 ? (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {post.media.map((m, idx) => (
                              <View key={idx} style={[styles.mediaHalfBox, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
                                <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10 }]}>
                                  {m.title}
                                </Text>
                                <FotoMuro url={m.url} mimeType={m.mimeType} radioBorde={10} colorFondo={c.cardBgAlt} />
                              </View>
                            ))}
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', gap: 6, height: 130 }}>
                            <View style={[styles.mediaLargeLeft, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
                              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>
                                {post.media[0].title}
                              </Text>
                              <FotoMuro
                                url={post.media[0].url}
                                mimeType={post.media[0].mimeType}
                                radioBorde={10}
                                colorFondo={c.cardBgAlt}
                              />
                            </View>
                            <View style={{ flex: 1, gap: 6 }}>
                              {post.media.slice(1, 3).map((m, idx) => (
                                <View key={idx} style={[styles.mediaSmallRight, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
                                  <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                                    {m.title}
                                  </Text>
                                  <FotoMuro url={m.url} mimeType={m.mimeType} radioBorde={8} colorFondo={c.cardBgAlt} />
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Resumen de Reacciones */}
                    <View style={[styles.reactionsSummaryRow, { borderTopColor: c.divider }]}>
                      <Pressable
                        onPress={() => {
                          setReactionsModalVisible(true);
                          setReactionFilter('all');
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      >
                        <Text style={[styles.rxCountBadge, { color: '#70d2a0', backgroundColor: '#173429' }]}>
                          👍 {post.likes}
                        </Text>
                        <Text style={[styles.rxCountBadge, { color: '#f28e8e', backgroundColor: '#331a1a' }]}>
                          👎 {post.dislikes}
                        </Text>
                        <Text style={[t.micro, { color: c.gold, fontSize: 9.5 }]}>· Ver quién reaccionó ›</Text>
                      </Pressable>

                      <Pressable onPress={() => handleToggleComments(post.id)}>
                        <Text style={[t.micro, { color: c.textSoft, fontSize: 10 }]}>
                          {post.comments.length} Comentarios
                        </Text>
                      </Pressable>
                    </View>

                    {/* Botones Like / Dislike */}
                    <View style={[styles.actionButtonsRow, { borderTopColor: c.divider }]}>
                      <Pressable
                        onPress={() => handleToggleLike(post.id)}
                        style={[styles.actionBtn, post.userReaction === 'like' && { backgroundColor: c.cardBgAlt }]}
                      >
                        <Text style={{ fontSize: 14 }}>👍</Text>
                        <Text
                          style={[
                            t.micro,
                            {
                              color: post.userReaction === 'like' ? '#70d2a0' : c.textSoft,
                              fontWeight: '700',
                              fontSize: 10.5,
                            },
                          ]}
                        >
                          Like
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleToggleDislike(post.id)}
                        style={[styles.actionBtn, post.userReaction === 'dislike' && { backgroundColor: c.cardBgAlt }]}
                      >
                        <Text style={{ fontSize: 14 }}>👎</Text>
                        <Text
                          style={[
                            t.micro,
                            {
                              color: post.userReaction === 'dislike' ? '#f28e8e' : c.textSoft,
                              fontWeight: '700',
                              fontSize: 10.5,
                            },
                          ]}
                        >
                          Dislike
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleToggleComments(post.id)}
                        style={styles.actionBtn}
                      >
                        <Text style={{ fontSize: 13 }}>💬</Text>
                        <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                          Comentar
                        </Text>
                      </Pressable>
                    </View>

                    {/* Comentarios con Fotos */}
                    {commentsVisible && (
                      <View style={[styles.commentsSection, { borderTopColor: c.divider }]}>
                        {post.comments.map(cItem => (
                          <View key={cItem.id} style={[styles.commentCard, { backgroundColor: c.cardBgAlt }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[t.cardTitle, { color: c.gold, fontSize: 11.5 }]}>
                                {cItem.author} {cItem.role ? `(${cItem.role})` : ''}
                              </Text>
                              <Text style={[t.micro, { color: c.textSoft, fontSize: 9 }]}>{cItem.timeAgo}</Text>
                            </View>

                            <Text style={[t.body, { color: c.text, fontSize: 11.5, marginTop: 4, lineHeight: 16 }]}>
                              {cItem.text}
                            </Text>

                            {cItem.photoAttached && (
                              <View style={[styles.commentPhotoBox, { borderColor: c.gold, backgroundColor: c.bg }]}>
                                <Text style={[t.micro, { color: c.gold, fontSize: 9.5, fontWeight: '700' }]}>
                                  {cItem.photoAttached}
                                </Text>
                              </View>
                            )}

                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6, alignItems: 'center' }}>
                              <Pressable
                                onPress={() => handleCommentVote(post.id, cItem.id, 'like')}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                              >
                                <Text style={{ fontSize: 11 }}>👍</Text>
                                <Text style={[t.micro, { color: cItem.userReaction === 'like' ? '#70d2a0' : c.textSoft, fontSize: 9.5 }]}>
                                  {cItem.likes}
                                </Text>
                              </Pressable>

                              <Pressable
                                onPress={() => handleCommentVote(post.id, cItem.id, 'dislike')}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                              >
                                <Text style={{ fontSize: 11 }}>👎</Text>
                                <Text style={[t.micro, { color: cItem.userReaction === 'dislike' ? '#f28e8e' : c.textSoft, fontSize: 9.5 }]}>
                                  {cItem.dislikes}
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        ))}

                        {/* Input de Comentario */}
                        <View style={{ gap: 6, marginTop: 8 }}>
                          {commentPhotos[post.id] && (
                            <View style={[styles.commentPhotoPreview, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                              <Text style={[t.micro, { color: c.gold, fontSize: 9.5, fontWeight: '700' }]}>
                                📷 foto_adjunta.jpg
                              </Text>
                              <Pressable onPress={() => setCommentPhotos(prev => ({ ...prev, [post.id]: false }))}>
                                <Text style={{ color: '#f28e8e', fontWeight: 'bold', fontSize: 11 }}>✕</Text>
                              </Pressable>
                            </View>
                          )}

                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                            <Pressable
                              onPress={() => setCommentPhotos(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                              style={[styles.attachPhotoBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                            >
                              <Text style={{ fontSize: 14 }}>📷</Text>
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
                              <Text style={{ color: '#1E1B18', fontWeight: '800', fontSize: 11 }}>Enviar</Text>
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
          {eventosTab === 'testimonios' && (
            <View style={{ gap: 14, paddingTop: 10, paddingBottom: 28 }}>
              {INITIAL_TESTIMONIALS.map(item => (
                <View key={item.id} style={[styles.mediaLunaCard, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
                  <View style={[styles.mediaLunaGlow, { backgroundColor: c.cardBgAlt }]} />
                  <View style={styles.mediaLunaContent}>
                    <View style={[styles.avatarCrestLarge, { borderColor: c.gold, backgroundColor: c.bg }]}>
                      <Text style={{ fontSize: 24 }}>{item.avatar}</Text>
                    </View>
                    <View style={[styles.badgePill, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                      <Text style={[t.micro, { color: c.gold, fontSize: 8.5, fontWeight: '800' }]}>
                        {item.badge}
                      </Text>
                    </View>
                    <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 15, marginTop: 4 }]}>
                      {item.name}
                    </Text>
                    <Text style={[t.micro, { color: c.micro, fontSize: 10 }]}>{item.role}</Text>
                    <Text style={[t.body, { color: c.text, fontSize: 12.5, textAlign: 'center', fontStyle: 'italic', marginVertical: 8, lineHeight: 18 }]}>
                      {item.quote}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, width: '100%', marginVertical: 6 }}>
                      {item.metrics.map(m => (
                        <View key={m.label} style={[styles.metricDeltaBox, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                          <Text style={[t.micro, { color: c.textSoft, fontSize: 8.5, textAlign: 'center' }]}>
                            {m.label}
                          </Text>
                          <Text style={[t.metric, { color: '#70d2a0', fontSize: 13, textAlign: 'center' }]}>
                            {m.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <GoldButton
                      label={`▶ VER VIDEO TESTIMONIO (${item.videoDuration})`}
                      onPress={() => Alert.alert('Testimonio Somático', `Reproduciendo video HD de ${item.name}.`)}
                      style={{ width: '100%', marginTop: 6 }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* PESTAÑA 3: PODIO RANKING 3D */}
          {eventosTab === 'ranking' && (
            <View style={{ gap: 14, paddingTop: 10, paddingBottom: 28 }}>
              {/* PODIO 3D */}
              <View style={[styles.podium3DContainer, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                {/* #2 PLATA */}
                <View style={styles.podiumColumn}>
                  <View style={[styles.avatarMedal, { borderColor: '#E0E0E0', backgroundColor: '#2C2C2C' }]}>
                    <Text style={{ fontSize: 16 }}>🥈</Text>
                  </View>
                  <Text style={[t.cardTitle, { color: '#E0E0E0', fontSize: 11, marginTop: 4 }]}>
                    Rodrigo V.
                  </Text>
                  <Text style={[t.micro, { color: '#BDBDBD', fontSize: 9 }]}>36 Días</Text>
                  <LinearGradient
                    colors={['#8C8C8C', '#5C5C5C', '#3A3A3A']}
                    style={[styles.podiumBlock, { height: 95 }]}
                  >
                    <Text style={[styles.podiumRankNum, { color: '#FFF' }]}>2</Text>
                    <Text style={[t.micro, { color: '#E0E0E0', fontSize: 8.5, fontWeight: '800' }]}>PLATA</Text>
                  </LinearGradient>
                </View>

                {/* #1 ORO */}
                <View style={styles.podiumColumn}>
                  <View style={[styles.avatarMedal, { borderColor: c.gold, backgroundColor: '#3D3014' }]}>
                    <Text style={{ fontSize: 20 }}>👑</Text>
                  </View>
                  <Text style={[t.cardTitle, { color: c.gold, fontSize: 12, marginTop: 4, fontWeight: '800' }]}>
                    María A.
                  </Text>
                  <Text style={[t.micro, { color: c.gold, fontSize: 9.5, fontWeight: '700' }]}>🔥 37 Días</Text>
                  <LinearGradient
                    colors={['#FFE29F', '#E5C689', '#C09A4F', '#9C7A34']}
                    style={[styles.podiumBlock, { height: 130 }]}
                  >
                    <Text style={[styles.podiumRankNum, { color: '#1E1B18' }]}>1</Text>
                    <Text style={[t.micro, { color: '#1E1B18', fontSize: 9, fontWeight: '900' }]}>ORO LÍDER</Text>
                  </LinearGradient>
                </View>

                {/* #3 BRONCE */}
                <View style={styles.podiumColumn}>
                  <View style={[styles.avatarMedal, { borderColor: '#CD7F32', backgroundColor: '#2E1E14' }]}>
                    <Text style={{ fontSize: 16 }}>🥉</Text>
                  </View>
                  <Text style={[t.cardTitle, { color: '#E0A96D', fontSize: 11, marginTop: 4 }]}>
                    Esteban G.
                  </Text>
                  <Text style={[t.micro, { color: '#A89E8D', fontSize: 9 }]}>35 Días</Text>
                  <LinearGradient
                    colors={['#A86834', '#7A4820', '#4A2A10']}
                    style={[styles.podiumBlock, { height: 75 }]}
                  >
                    <Text style={[styles.podiumRankNum, { color: '#FFF' }]}>3</Text>
                    <Text style={[t.micro, { color: '#E0A96D', fontSize: 8.5, fontWeight: '800' }]}>BRONCE</Text>
                  </LinearGradient>
                </View>
              </View>

              {/* Tu Posición Personal */}
              <View style={[styles.myRankCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.rankCircleNumber, { backgroundColor: c.gold }]}>
                    <Text style={{ color: '#1E1B18', fontWeight: '900', fontSize: 12 }}>#4</Text>
                  </View>
                  <View>
                    <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 12.5 }]}>
                      Tu Posición (Kelin Arango)
                    </Text>
                    <Text style={[t.micro, { color: c.gold, fontSize: 9.5 }]}>
                      Célula 07 · 🔥 37 Días · 94% Evidencias
                    </Text>
                  </View>
                </View>
              </View>

              {/* Tabla de Clasificación General */}
              <View style={[styles.leaderboardList, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                {INITIAL_LEADERBOARD.map(u => (
                  <View
                    key={u.id}
                    style={[
                      styles.leaderboardRow,
                      { borderBottomColor: c.divider },
                      u.isCurrentUser && { backgroundColor: c.cardBgAlt },
                    ]}
                  >
                    <Text style={[t.micro, { color: u.medal ? c.gold : c.textSoft, fontWeight: '800', width: 24 }]}>
                      #{u.rank}
                    </Text>
                    <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 12, flex: 1 }]}>
                      {u.name}
                    </Text>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>
                      🔥 {u.streakDays}d
                    </Text>
                    <Text style={[t.micro, { color: '#70d2a0', fontWeight: '700', marginLeft: 8 }]}>
                      {u.evidencePercent}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: SUB-MÓDULO: RECURSOS EXCLUSIVOS & CATÁLOGO DE CURSOS              */}
      {/* ========================================================================= */}
      {inExclusiveResources && selectedCourse === null && fullScreenLesson === null && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: isTablet ? 560 : undefined,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable
              onPress={() => setInExclusiveResources(false)}
              style={styles.backBtnRow}
              hitSlop={8}
            >
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A COMUNIDAD
              </Text>
            </Pressable>

            <View style={[styles.categoryPillBadge, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                RECURSOS EXCLUSIVOS
              </Text>
            </View>
          </View>

          <View style={{ gap: 14, paddingTop: 10, paddingBottom: 28 }}>
            {/* Estados de carga/error/vacío del catálogo real — sin componentes nuevos, mismo
                patrón de texto plano que ya usa el Muro más arriba en esta pantalla. */}
            {cursosCargando && courses.length === 0 && (
              <Text style={[t.micro, { color: c.textSoft, textAlign: 'center' }]}>
                Cargando tus cursos...
              </Text>
            )}
            {cursosError && (
              <Text style={[t.micro, { color: '#f28e8e', textAlign: 'center' }]}>{cursosError}</Text>
            )}
            {!cursosCargando && !cursosError && courses.length === 0 && (
              <Text style={[t.micro, { color: c.textSoft, textAlign: 'center' }]}>
                Todavía no tenés cursos disponibles para tu día de programa.
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
                  <View style={[styles.courseCategoryBadge, { borderColor: c.gold, backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <Text style={[t.micro, { color: c.gold, fontSize: 8.5, fontWeight: '800' }]}>
                      {course.category}
                    </Text>
                  </View>
                  <Text style={[t.screenTitle, { color: '#FFFFFF', fontSize: 16, lineHeight: 21 }]}>
                    {course.title}
                  </Text>
                </View>

                <View style={{ padding: 14, gap: 8 }}>
                  <Text style={[t.micro, { color: c.micro }]}>
                    Instructor: <Text style={{ color: c.gold, fontWeight: '700' }}>{course.instructor}</Text>
                  </Text>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 12, lineHeight: 17 }]}>
                    {course.summary}
                  </Text>
                  <View style={{ gap: 4, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>
                        {course.totalModules} Módulos · {course.totalResources} Recursos
                      </Text>
                      <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                        {course.progressPercent}% Completado
                      </Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: c.divider }]}>
                      <View style={[styles.progressBarFill, { width: `${course.progressPercent}%`, backgroundColor: c.gold }]} />
                    </View>
                  </View>
                  <View style={[styles.exploreBtn, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 0.5 }]}>
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
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: isTablet ? 560 : undefined,
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
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A CURSOS
              </Text>
            </Pressable>
          </View>

          <View style={[styles.courseHeaderBox, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16 }]}>
              {selectedCourse.title}
            </Text>
            <Text style={[t.micro, { color: c.gold, marginTop: 4 }]}>
              Instructor: {selectedCourse.instructor}
            </Text>
          </View>

          <View style={{ gap: 14, marginTop: 14, paddingBottom: 28 }}>
            {selectedCourse.sections.map(section => (
              <View key={section.id} style={[styles.sectionCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 0.8 }]}>
                  {section.title}
                </Text>
                <View style={{ gap: 8, marginTop: 10 }}>
                  {section.lessons.map(lesson => (
                    <Pressable
                      key={lesson.id}
                      onPress={() => handleAbrirLeccion(lesson)}
                      style={[styles.lessonItemRow, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                    >
                      <View style={[styles.resourceTypeIcon, { borderColor: c.gold, backgroundColor: c.bg }]}>
                        <Text style={{ fontSize: 13 }}>
                          {lesson.type === 'video' ? '🎥' : lesson.type === 'doc' ? '📄' : lesson.type === 'link' ? '🔗' : '✍️'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 12.5 }]}>
                          {lesson.title}
                        </Text>
                        <Text style={[t.micro, { color: c.micro, fontSize: 9.5 }]}>{lesson.meta}</Text>
                      </View>
                      <Icon name="chevron" size={12} color={c.gold} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3.2: LECCIÓN A PANTALLA COMPLETA (VIDEO, DOC, LINK, ESCRITO)        */}
      {/* ========================================================================= */}
      {inExclusiveResources && leccionMostrada !== null && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: isTablet ? 560 : undefined,
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
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A LA SECCIÓN
              </Text>
            </Pressable>
          </View>

          <View style={[styles.lessonInfoCard, { borderColor: c.gold, backgroundColor: c.cardBg, marginTop: 10 }]}>
            <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16 }]}>
              {leccionMostrada.title}
            </Text>
            <Text style={[t.micro, { color: c.gold, marginTop: 4 }]}>
              {leccionMostrada.meta}
            </Text>
            {!!leccionMostrada.desc && (
              <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, marginTop: 8, lineHeight: 18 }]}>
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
              <Text style={[t.micro, { color: c.textSoft, marginTop: 12 }]}>Cargando lección...</Text>
            )}
            {errorDetalleLeccionPorId[leccionMostrada.id] && (
              <Text style={[t.micro, { color: '#f28e8e', marginTop: 12 }]}>
                {errorDetalleLeccionPorId[leccionMostrada.id]}
              </Text>
            )}

            {leccionMostrada.content && (
              <View style={{ marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: c.cardBgAlt, borderWidth: 1, borderColor: c.border }}>
                <Text style={[t.body, { color: c.text, fontSize: 13, lineHeight: 20 }]}>
                  {leccionMostrada.content}
                </Text>
              </View>
            )}

            <GoldButton
              label={leccionMostrada.completed ? '↺ QUITAR DE COMPLETADAS' : '✓ MARCAR LECCIÓN COMO COMPLETADA'}
              loading={actualizandoCompletado}
              onPress={() => handleAlternarLeccionCompletada(leccionMostrada)}
              style={{ width: '100%', marginTop: 16 }}
            />
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 4: SUB-MÓDULO: ATENCIÓN PERSONALIZADA & CHATS TIPO WHATSAPP         */}
      {/* ========================================================================= */}
      {inAtencionPersonalizada && activeChat === null && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: isTablet ? 560 : undefined,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar Volver a Comunidad */}
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable
              onPress={() => setInAtencionPersonalizada(false)}
              style={styles.backBtnRow}
              hitSlop={8}
            >
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A COMUNIDAD
              </Text>
            </Pressable>

            <View style={[styles.categoryPillBadge, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                ATENCIÓN & CHATS
              </Text>
            </View>
          </View>

          {/* Selector de las 3 Categorías de Chat (Global, Célula, Miembros 1 a 1) */}
          <View style={[styles.tabsRow, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            <Pressable
              onPress={() => setChatCategory('celula')}
              style={[styles.tabBtn, chatCategory === 'celula' && { backgroundColor: c.gold }]}
            >
              <Text style={[t.micro, { color: chatCategory === 'celula' ? '#1E1B18' : c.textSoft, fontWeight: '700', fontSize: 9.5 }]}>
                👥 CÉLULA
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setChatCategory('miembros')}
              style={[styles.tabBtn, chatCategory === 'miembros' && { backgroundColor: c.gold }]}
            >
              <Text style={[t.micro, { color: chatCategory === 'miembros' ? '#1E1B18' : c.textSoft, fontWeight: '700', fontSize: 9.5 }]}>
                💬 DIRECTOS
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setChatCategory('global')}
              style={[styles.tabBtn, chatCategory === 'global' && { backgroundColor: c.gold }]}
            >
              <Text style={[t.micro, { color: chatCategory === 'global' ? '#1E1B18' : c.textSoft, fontWeight: '700', fontSize: 9.5 }]}>
                🌐 GLOBAL
              </Text>
            </Pressable>
          </View>

          {/* Estados de carga/error del listado real — mismo criterio que el Muro (texto con los
              tokens que ya usa el resto de la pantalla, sin componentes nuevos). */}
          {conversacionesCargando && conversations.length === 0 && (
            <Text style={[t.micro, { color: c.textSoft, textAlign: 'center', marginTop: 16 }]}>
              Cargando tus conversaciones...
            </Text>
          )}
          {conversacionesError && (
            <Text style={[t.micro, { color: '#f28e8e', textAlign: 'center', marginTop: 16 }]}>
              {conversacionesError}
            </Text>
          )}
          {!conversacionesCargando && !conversacionesError && filteredConversations.length === 0 && (
            <Text style={[t.micro, { color: c.textSoft, textAlign: 'center', marginTop: 16 }]}>
              Todavía no tenés conversaciones acá.
            </Text>
          )}

          {/* Lista de Conversaciones Activas */}
          <View style={{ gap: 10, paddingTop: 12, paddingBottom: 28 }}>
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
                <View style={[styles.convAvatarBox, { borderColor: c.gold, backgroundColor: c.bg }]}>
                  <Text style={{ fontSize: 18 }}>{conv.avatar}</Text>
                  {conv.isOnline && <View style={styles.onlineBadgeDot} />}
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>{conv.title}</Text>
                    <Text style={[t.micro, { color: c.gold, fontSize: 9.5, fontWeight: '700' }]}>{conv.lastTime}</Text>
                  </View>
                  <Text numberOfLines={1} style={[t.body, { color: c.textSoft, fontSize: 11.5, marginTop: 2 }]}>
                    {conv.lastMessage}
                  </Text>
                  <Text style={[t.micro, { color: c.micro, fontSize: 9.5, marginTop: 1 }]}>
                    {conv.subtitle}
                  </Text>
                </View>

                {conv.unreadCount > 0 && (
                  <View style={[styles.unreadBadgePill, { backgroundColor: c.gold }]}>
                    <Text style={{ color: '#1E1B18', fontWeight: '900', fontSize: 9.5 }}>{conv.unreadCount}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 4.1: SALA DE CHAT ACTIVA (TIPO WHATSAPP)                            */}
      {/* ========================================================================= */}
      {inAtencionPersonalizada && activeChat !== null && !groupInfoVisible && (
        <View style={{ flex: 1 }}>
          {/* Header del Chat */}
          <View style={[styles.chatRoomHeader, { borderBottomColor: c.divider, backgroundColor: c.cardBg }]}>
            <Pressable onPress={() => setActiveChat(null)} hitSlop={8} style={{ paddingRight: 6 }}>
              <Icon name="arrowLeft" size={16} color={c.gold} />
            </Pressable>

            <Pressable
              onPress={() => setGroupInfoVisible(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}
            >
              <View style={[styles.avatarCircle, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                <Text style={{ fontSize: 14 }}>{activeChat.avatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>
                  {activeChat.title}
                </Text>
                <Text style={[t.micro, { color: '#70d2a0', fontSize: 9.5 }]}>
                  {activeChat.type === 'celula' ? '16 miembros · Toca para ver info ℹ️' : '● En línea'}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setGroupInfoVisible(true)}
              style={[styles.infoBtnPill, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}
            >
              <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 9.5 }]}>ℹ️ INFO</Text>
            </Pressable>
          </View>

          {/* Mensajes del Chat */}
          <ScrollView
            contentContainerStyle={{ padding: 12, gap: 10 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ alignItems: 'center', marginVertical: 4 }}>
              <Text style={[styles.dateDividerPill, { backgroundColor: c.cardBgAlt, color: c.gold, borderColor: c.border }]}>
                HOY · DÍA 37 DE VERDAD
              </Text>
            </View>

            {/* Historial real (GET .../messages) — mismo criterio de estados que el resto de la
                pantalla: con solo 3 conversaciones/5 mensajes en la base, el vacío es el caso
                común, no una excepción a cubrir "por si acaso". */}
            {mensajesCargando && activeChat.messages.length === 0 && (
              <Text style={[t.micro, { color: c.textSoft, textAlign: 'center' }]}>
                Cargando mensajes...
              </Text>
            )}
            {!mensajesCargando && activeChat.messages.length === 0 && (
              <Text style={[t.micro, { color: c.textSoft, textAlign: 'center' }]}>
                Todavía no hay mensajes. ¡Escribí el primero!
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
                  <Text style={[t.micro, { color: c.gold, fontSize: 9.5, fontWeight: '700', marginBottom: 2, paddingLeft: 4 }]}>
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
                    <Text style={[t.body, { color: c.text, fontSize: 12.5, lineHeight: 18 }]}>
                      {msg.text}
                    </Text>
                  </View>
                )}

                {/* Mensaje de Audio de Voz */}
                {msg.type === 'audio' && (
                  <View
                    style={[
                      styles.audioBubbleBox,
                      {
                        backgroundColor: msg.isMe ? c.cardBgAlt : c.cardBg,
                        borderColor: c.gold,
                      },
                    ]}
                  >
                    <Pressable
                      onPress={() => setPlayingAudioId(prev => (prev === msg.id ? null : msg.id))}
                      style={[styles.audioPlayBtn, { backgroundColor: c.gold }]}
                    >
                      <Text style={{ fontSize: 11, color: '#1E1B18', fontWeight: 'bold' }}>
                        {playingAudioId === msg.id ? '⏸' : '▶'}
                      </Text>
                    </Pressable>

                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
                        {[8, 14, 10, 16, 12, 14, 8, 12, 10].map((h, i) => (
                          <View
                            key={i}
                            style={{
                              width: 3,
                              height: h,
                              backgroundColor: playingAudioId === msg.id ? c.gold : c.border,
                              borderRadius: 1.5,
                            }}
                          />
                        ))}
                      </View>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 9 }]}>
                        {msg.audioDuration || '0:35'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Mensaje de Galería de Imágenes */}
                {msg.type === 'image_grid' && (
                  <View
                    style={[
                      styles.chatBubble,
                      {
                        backgroundColor: msg.isMe ? c.cardBgAlt : c.cardBg,
                        borderColor: c.gold,
                        gap: 6,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {msg.mediaList?.map((m, idx) => (
                        <View key={idx} style={[styles.chatMediaThumbnail, { borderColor: c.border, backgroundColor: c.bg }]}>
                          <Text style={[t.micro, { color: c.gold, fontSize: 9.5, fontWeight: '700' }]}>{m}</Text>
                        </View>
                      ))}
                    </View>
                    {msg.text && (
                      <Text style={[t.body, { color: c.text, fontSize: 12, marginTop: 2 }]}>{msg.text}</Text>
                    )}
                  </View>
                )}

                {/* Mensaje de GIF Somático */}
                {msg.type === 'gif' && (
                  <View
                    style={[
                      styles.chatBubble,
                      {
                        backgroundColor: '#1E1B18',
                        borderColor: c.gold,
                        alignItems: 'center',
                        padding: 12,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 32 }}>{msg.gifIcon}</Text>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 10, marginTop: 4 }]}>
                      {msg.gifTitle}
                    </Text>
                  </View>
                )}

                {/* Hora y Doble Check */}
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 2, paddingHorizontal: 4 }}>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 8.5 }]}>{msg.time}</Text>
                  {msg.isMe && <Text style={{ color: c.gold, fontSize: 9, fontWeight: 'bold' }}>✓✓</Text>}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Barra Inferior de Entrada (Tipo WhatsApp) */}
          <View style={[styles.chatInputBar, { borderTopColor: c.divider, backgroundColor: c.cardBg }]}>
            <Pressable
              onPress={() => setGifSelectorVisible(true)}
              style={[styles.mediaOptionBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: c.gold }}>GIF</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                handleSendChatMessage('image_grid', {
                  text: 'Evidencia fotográfica sellada',
                  mediaList: ['📷 Evidencia_1.jpg', '📷 Evidencia_2.jpg'],
                })
              }
              style={[styles.mediaOptionBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
            >
              <Text style={{ fontSize: 13 }}>📷</Text>
            </Pressable>

            <Pressable
              onPress={() => handleSendChatMessage('audio')}
              style={[styles.mediaOptionBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
            >
              <Text style={{ fontSize: 13 }}>🎙</Text>
            </Pressable>

            <TextInput
              value={chatInputText}
              onChangeText={setChatInputText}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={c.textSoft}
              style={[styles.textInputChat, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
            />

            <Pressable
              onPress={() => handleSendChatMessage('text')}
              style={[styles.sendBtnGold, { backgroundColor: c.gold }]}
            >
              <Text style={{ color: '#1E1B18', fontWeight: '900', fontSize: 13 }}>➤</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* VISTA 4.2: INFORMACIÓN DEL GRUPO / INTEGRANTES (TIPO WHATSAPP GROUP INFO) */}
      {/* ========================================================================= */}
      {inAtencionPersonalizada && groupInfoVisible && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: isTablet ? 560 : undefined,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable onPress={() => setGroupInfoVisible(false)} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER AL CHAT
              </Text>
            </Pressable>

            <View style={[styles.categoryPillBadge, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                INFO DEL GRUPO
              </Text>
            </View>
          </View>

          <View style={[styles.groupInfoHeaderCard, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <View style={[styles.groupLargeAvatar, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={{ fontSize: 28 }}>👥</Text>
            </View>
            <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16, marginTop: 6 }]}>
              Célula Fénix 07
            </Text>
            <Text style={[t.micro, { color: c.gold, marginTop: 2 }]}>
              16 Integrantes de la Tribu RENASER
            </Text>
            <Text style={[t.body, { color: c.textSoft, fontSize: 11.5, textAlign: 'center', marginTop: 6 }]}>
              Célula privada de aceleración somática. Cero quejas, dato puro y verdad biológica.
            </Text>
          </View>

          {/* LISTA DE INTEGRANTES */}
          <View style={{ gap: 8, marginTop: 14, paddingBottom: 28 }}>
            <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1 }]}>
              INTEGRANTES DE LA CÉLULA (16)
            </Text>

            {GROUP_MEMBERS.map(member => (
              <Pressable
                key={member.id}
                onPress={() => setSelectedMemberProfile(member)}
                style={[styles.memberRowCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.avatarCircle, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                    <Text style={{ fontSize: 14 }}>{member.avatar}</Text>
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 12.5 }]}>{member.name}</Text>
                      <View style={[styles.memberBadgePill, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                        <Text style={[t.micro, { color: c.gold, fontSize: 8.5, fontWeight: '800' }]}>
                          {member.badge}
                        </Text>
                      </View>
                    </View>
                    <Text style={[t.micro, { color: c.micro, fontSize: 9.5 }]}>{member.role}</Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => handleStartDirectChat(member)}
                  style={[styles.chat1a1Btn, { backgroundColor: c.gold }]}
                >
                  <Text style={{ color: '#1E1B18', fontWeight: '800', fontSize: 9.5 }}>💬 Chatear</Text>
                </Pressable>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SELECTOR DE GIFS SOMÁTICOS                                         */}
      {/* ========================================================================= */}
      <Modal
        visible={gifSelectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGifSelectorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.gifModalBox, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.divider, paddingBottom: 8 }}>
              <Text style={[t.cardTitle, { color: c.gold, fontSize: 12 }]}>GIFS SOMÁTICOS DE TRIBU</Text>
              <Pressable onPress={() => setGifSelectorVisible(false)}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>✕ Cerrar</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingTop: 10 }}>
              {GIF_OPTIONS.map((g, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSendChatMessage('gif', { gifTitle: g.title, gifIcon: g.icon })}
                  style={[styles.gifItemCard, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                >
                  <Text style={{ fontSize: 24 }}>{g.icon}</Text>
                  <Text style={[t.micro, { color: c.textStrong, fontWeight: '700', fontSize: 9 }]}>
                    {g.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: PERFIL DEL INTEGRANTE DE LA CÉLULA                                 */}
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
                <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1 }]}>
                  PERFIL DEL INTEGRANTE
                </Text>
                <Pressable onPress={() => setSelectedMemberProfile(null)}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>✕ Cerrar</Text>
                </Pressable>
              </View>

              <View style={[styles.profileAvatarLarge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                <Text style={{ fontSize: 32 }}>{selectedMemberProfile.avatar}</Text>
              </View>

              <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16, textAlign: 'center', marginTop: 4 }]}>
                {selectedMemberProfile.name}
              </Text>
              <Text style={[t.micro, { color: c.gold, textAlign: 'center', fontSize: 10.5 }]}>
                {selectedMemberProfile.role}
              </Text>

              <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8 }}>
                <View style={[styles.metricBoxItem, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 8.5, textAlign: 'center' }]}>RACHA</Text>
                  <Text style={[t.metric, { color: '#70d2a0', fontSize: 13, textAlign: 'center' }]}>
                    🔥 {selectedMemberProfile.streakDays} Días
                  </Text>
                </View>
                <View style={[styles.metricBoxItem, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 8.5, textAlign: 'center' }]}>CÉLULA</Text>
                  <Text style={[t.metric, { color: c.gold, fontSize: 13, textAlign: 'center' }]}>
                    {selectedMemberProfile.cell}
                  </Text>
                </View>
              </View>

              <View style={[styles.focusCard, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                <Text style={[t.micro, { color: c.textSoft, fontSize: 9 }]}>ENFOQUE PRINCIPAL:</Text>
                <Text style={[t.body, { color: c.textStrong, fontSize: 11.5, fontWeight: '600', marginTop: 2 }]}>
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
            <Pressable onPress={() => setCreatePostModalVisible(false)} hitSlop={8}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>✕ CANCELAR</Text>
            </Pressable>
            <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>NUEVA PUBLICACIÓN</Text>
            <Pressable
              onPress={handlePublishPost}
              disabled={subiendoPublicacion}
              style={[styles.publishHeaderBtn, { backgroundColor: c.gold }, subiendoPublicacion && { opacity: 0.6 }]}
            >
              <Text style={{ color: '#1E1B18', fontWeight: '900', fontSize: 11 }}>
                {subiendoPublicacion ? 'PUBLICANDO...' : 'PUBLICAR'}
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.avatarCircle, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                <Text style={{ fontSize: 14 }}>🦅</Text>
              </View>
              <View>
                <Text style={[t.cardTitle, { color: c.textStrong }]}>{nombreUsuario}</Text>
                <Text style={[t.micro, { color: c.gold, fontSize: 9.5 }]}>Célula 07 · Día 37</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {['🔥 VICTORIA SOMÁTICA', '⚡ ALTO RENDIMIENTO', '🧠 REFLEXIÓN'].map(tag => (
                <Pressable
                  key={tag}
                  onPress={() => setNewPostTag(tag)}
                  style={[
                    styles.tagSelectorPill,
                    { borderColor: c.border, backgroundColor: c.cardBgAlt },
                    newPostTag === tag && { borderColor: c.gold, backgroundColor: c.cardBg },
                  ]}
                >
                  <Text style={[t.micro, { color: newPostTag === tag ? c.gold : c.textSoft, fontWeight: '700', fontSize: 9.5 }]}>
                    {tag}
                  </Text>
                </Pressable>
              ))}
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

            <View style={{ gap: 8 }}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>FOTOS ADJUNTAS (AL MENOS UNA):</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {attachedPhotos.map((foto, idx) => (
                  <View
                    key={foto.uri}
                    style={[styles.attachedPhotoCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}
                  >
                    {/* Miniatura real de la foto ya normalizada — mismo chip del diseño original
                        (styles.attachedPhotoCard intacto), solo que ahora también muestra la
                        imagen elegida y no únicamente su nombre. */}
                    <Image source={{ uri: foto.uri }} style={{ width: 20, height: 20, borderRadius: 4 }} />
                    <Text style={[t.micro, { color: c.gold, fontSize: 9.5 }]} numberOfLines={1}>
                      {foto.nombre}
                    </Text>
                    <Pressable onPress={() => setAttachedPhotos(prev => prev.filter((_, i) => i !== idx))}>
                      <Text style={{ color: '#f28e8e', fontWeight: 'bold', fontSize: 12 }}>✕</Text>
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
                  <Text style={{ fontSize: 16 }}>➕</Text>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 9 }]}>
                    {agregandoFoto ? 'Abriendo...' : 'Agregar'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: QUIÉN DIO LIKE / DISLIKE                                           */}
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
              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>REACCIONES DEL POST</Text>
              <Pressable onPress={() => setReactionsModalVisible(false)}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>✕ Cerrar</Text>
              </Pressable>
            </View>

            <View style={[styles.tabsRow, { borderColor: c.border, backgroundColor: c.cardBgAlt, marginVertical: 10 }]}>
              <Pressable
                onPress={() => setReactionFilter('all')}
                style={[styles.tabBtn, reactionFilter === 'all' && { backgroundColor: c.gold }]}
              >
                <Text style={[t.micro, { color: reactionFilter === 'all' ? '#1E1B18' : c.textSoft, fontWeight: '700', fontSize: 9.5 }]}>
                  TODOS (4)
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setReactionFilter('like')}
                style={[styles.tabBtn, reactionFilter === 'like' && { backgroundColor: c.gold }]}
              >
                <Text style={[t.micro, { color: reactionFilter === 'like' ? '#1E1B18' : c.textSoft, fontWeight: '700', fontSize: 9.5 }]}>
                  👍 LIKES (3)
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setReactionFilter('dislike')}
                style={[styles.tabBtn, reactionFilter === 'dislike' && { backgroundColor: c.gold }]}
              >
                <Text style={[t.micro, { color: reactionFilter === 'dislike' ? '#1E1B18' : c.textSoft, fontWeight: '700', fontSize: 9.5 }]}>
                  👎 DISLIKES (1)
                </Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 220 }}>
              {filteredReactions.map(user => (
                <View key={user.id} style={[styles.reactionUserRow, { borderBottomColor: c.divider }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.avatarCircle, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                      <Text style={{ fontSize: 13 }}>{user.avatar}</Text>
                    </View>
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 12 }]}>{user.name}</Text>
                      <Text style={[t.micro, { color: c.micro, fontSize: 9 }]}>{user.role}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 16 }}>{user.type === 'like' ? '👍' : '👎'}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  mentor: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  section: {
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 14,
  },
  more: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallion: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  backBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryPillBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginTop: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createPostBar: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mediaGridContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaSingleBox: {
    height: 120,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaHalfBox: {
    flex: 1,
    height: 100,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaLargeLeft: {
    flex: 1.4,
    height: '100%',
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaSmallRight: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  rxCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 10.5,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
  },
  commentsSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  commentCard: {
    borderRadius: 12,
    padding: 10,
  },
  commentPhotoBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    marginTop: 4,
  },
  commentPhotoPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
  },
  attachPhotoBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  sendCommentBtn: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  podium3DContainer: {
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 220,
    marginTop: 6,
  },
  podiumColumn: {
    alignItems: 'center',
    flex: 1,
  },
  avatarMedal: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumBlock: {
    width: '88%',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  podiumRankNum: {
    fontSize: 22,
    fontWeight: '900',
  },
  myRankCard: {
    borderWidth: 1.2,
    borderRadius: 16,
    padding: 12,
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
    borderRadius: 18,
    overflow: 'hidden',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  courseCard: {
    borderWidth: 1.2,
    borderRadius: 18,
    overflow: 'hidden',
  },
  courseCoverHeader: {
    height: 100,
    padding: 12,
    justifyContent: 'space-between',
  },
  courseCategoryBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
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
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  courseHeaderBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  lessonItemRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resourceTypeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonInfoCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  chatConvCard: {
    borderWidth: 1.2,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  convAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
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
    backgroundColor: '#70d2a0',
    borderWidth: 1.5,
    borderColor: '#000',
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
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateDividerPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 8.5,
    fontWeight: '800',
  },
  messageBubbleWrapper: {
    maxWidth: '85%',
  },
  chatBubble: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
  },
  audioBubbleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    minWidth: 170,
  },
  audioPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatMediaThumbnail: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  mediaOptionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputChat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
  },
  sendBtnGold: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfoHeaderCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  groupLargeAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberRowCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberBadgePill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  chat1a1Btn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  gifModalBox: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
  },
  gifItemCard: {
    width: 80,
    height: 70,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagSelectorPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fullPostInput: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    fontSize: 13,
    lineHeight: 19,
  },
  attachedPhotoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addMorePhotoBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionsModalCard: {
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 16,
  },
  reactionUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
});