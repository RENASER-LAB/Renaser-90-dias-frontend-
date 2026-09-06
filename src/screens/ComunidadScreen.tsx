import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { ChatDelCurso } from '../features/renasia/components/ChatDelCurso';
import { useProgramaDia } from '../features/programa/hooks/useProgramaDia';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { MicroLabel, ScreenHeader, Placeholder } from '../components/ui';
import { Icon, IconName } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';
import { useAuth } from '../features/auth/context/AuthContext';
import { useWallFeed } from '../features/community/hooks/useWallFeed';
import { useWallReactions } from '../features/community/hooks/useWallReactions';
import { useMiCelula } from '../features/community/hooks/useMiCelula';
import * as wallApi from '../features/community/api/wallApi';
import { elegirYNormalizarFotoMuro, type FotoMuroNormalizada } from '../features/community/utils/normalizarImagen';
import { FotoMuro } from '../features/community/components/FotoMuro';
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
import type { WireMensaje } from '../features/chat/types/chat.types';
import { marcarChatMontado } from '../features/renasia/state/chatEnPantalla';
import { useTicketsMentor } from '../features/tickets/hooks/useTicketsMentor';
import { useRanking } from '../features/ranking/hooks/useRanking';
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

const SOPORTE: { icon: IconName; label: string }[] = [
  { icon: 'clock', label: 'Eventos &\nExperiencias' },
  { icon: 'stack', label: 'Recursos\nExclusivos' },
  { icon: 'user', label: 'Entorno\nRenaser' },
];

const METRICAS = [
  { n: '12', label: 'Conversaciones\nesta semana' },
  { n: '3', label: 'Eventos\npróximos' },
  { n: '2', label: 'Mentorías\nprogramadas' },
];

/**
 * En qué sección de Comunidad está parada la pantalla. Las cuatro son EXCLUYENTES entre sí: solo
 * una se pinta a la vez.
 *
 * Es un único valor y no tres booleanos a propósito (corregido 2026-09-05, E-116). Antes había
 * `inEventosExperiencias`, `inExclusiveResources` e `inAtencionPersonalizada` sueltos, y cada
 * camino de entrada prendía el suyo sin apagar los otros. Los dos atajos que entran desde la
 * pestaña Training (`abrirCursoId`/`abrirLeccionId` de la Clase Diaria, y `abrirComposerMuro` del
 * hábito de post en comunidad) hacían justamente eso, así que quien tocaba primero un hábito y
 * después el otro terminaba con el Muro y el catálogo de Cursos apilados uno encima del otro en
 * el mismo scroll. Con un solo valor ese estado no se puede ni escribir.
 */
type SeccionComunidad = 'inicio' | 'eventos' | 'recursos' | 'atencion';

export default function ComunidadScreen() {
  const { c, t, mode } = useTheme();
  // D-99: el chat dentro de un curso le dice a Sparkie en que dia del programa va la persona.
  const { diaPrograma } = useProgramaDia();
  const isDark = mode === 'dark';
  const { rs, isTablet, horizontalPadding } = useResponsive();
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
  const mentorSubtitulo = tieneMentor ? 'Mentor de tu célula' : null;
  const mentorNota =
    celulaCargando || celulaError
      ? null
      : tieneMentor
        ? 'Escribile para coordinar tu próxima sesión.'
        : 'Te avisaremos apenas se te asigne uno.';
  const TRIBU_AVATARES_VISIBLES = 4;
  const tribuVisibles = companerosCelula.slice(0, TRIBU_AVATARES_VISIBLES);
  const tribuRestantes = Math.max(companerosCelula.length - TRIBU_AVATARES_VISIBLES, 0);

  // =========================================================================
  // ESTADOS DE NAVEGACIÓN
  // =========================================================================
  // Única fuente de verdad de "en qué sección estoy" (ver `SeccionComunidad`). Nunca se escribe a
  // mano: se pasa siempre por `irASeccion`, que además limpia el sub-estado de la sección que se
  // deja.
  const [seccionActiva, setSeccionActiva] = useState<SeccionComunidad>('inicio');
  // Derivados, no estados. Se mantienen con el mismo nombre que tenían cuando eran `useState`
  // para que las ~15 condiciones de render y el manejador del botón "atrás" sigan leyéndose igual;
  // lo que cambió es que ya no se pueden prender dos a la vez.
  const inExclusiveResources = seccionActiva === 'recursos';
  const inEventosExperiencias = seccionActiva === 'eventos';
  const inAtencionPersonalizada = seccionActiva === 'atencion';
  // Se guarda el ID, no el objeto: `courses` (de `useCursos`) es la única fuente de verdad, así
  // que `selectedCourse` sale siempre DERIVADO más abajo. Si se guardara el objeto entero (como
  // hacía el mock) quedaría una copia vieja congelada en el momento del toque, y una acción
  // posterior (p.ej. completar una lección) no se reflejaría al volver a esa vista.
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [fullScreenLesson, setFullScreenLesson] = useState<LessonResource | null>(null);

  // Sub-módulo: Eventos & Experiencias
  const [eventosTab, setEventosTab] = useState<'muro' | 'testimonios' | 'ranking'>('muro');

  // Sub-módulo: Atención Personalizada & Chats tipo WhatsApp — `conversations` sale del backend
  // real (GET /api/v1/chat/conversations) a través de `useChatConversaciones`; el historial de
  // cada una se pide recién al abrirla (ver `handleAbrirChat`), nunca en el listado.
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
   * Ojo con el orden al entrar a `recursos` desde un atajo: `irASeccion('recursos')` NO toca
   * `selectedCourseId`/`fullScreenLesson` (el `if` de abajo lo excluye), justamente para que el
   * `setSelectedCourseId(...)` que viene después en el mismo efecto no se pise.
   */
  const irASeccion = useCallback((seccion: SeccionComunidad) => {
    setSeccionActiva(seccion);
    if (seccion !== 'recursos') {
      setFullScreenLesson(null);
      setSelectedCourseId(null);
    }
    if (seccion !== 'atencion') {
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
  const [newPostTag, setNewPostTag] = useState('🔥 VICTORIA SOMÁTICA');
  // Fotos ya elegidas de la galería y normalizadas (`utils/normalizarImagen.ts`), listas para
  // subir a S3 al publicar. Arranca vacío: el backend exige al menos una (Publicacion.MEDIA_MIN
  // = 1), así que ya no tiene sentido precargar nombres de archivo falsos.
  const [attachedPhotos, setAttachedPhotos] = useState<FotoMuroNormalizada[]>([]);
  const [agregandoFoto, setAgregandoFoto] = useState(false);
  const [subiendoPublicacion, setSubiendoPublicacion] = useState(false);

  // Modal Quién dio Like/Dislike — datos reales (GET /api/v1/wall/{id}/reactions), pedidos al
  // abrir el modal (ver el `onPress` que lo abre, más abajo).
  const [reactionsModalVisible, setReactionsModalVisible] = useState(false);
  const [reactionFilter, setReactionFilter] = useState<'all' | 'like' | 'dislike'>('all');
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

  // Sub-módulo: Entorno Renaser (Tickets al Mentor y Chats de Comunidad)
  const tieneGrupo = miCelula?.assigned === true && tieneMentor;
  const [entornoTab, setEntornoTab] = useState<'tickets' | 'chats'>('tickets');
  const [modalNuevoTicketVisible, setModalNuevoTicketVisible] = useState(false);
  const [ticketBloqueo, setTicketBloqueo] = useState('');
  const [ticketSoluciones, setTicketSoluciones] = useState('');
  const [ticketImpactoSmart, setTicketImpactoSmart] = useState('');

  const {
    tickets: ticketsMentor,
    loading: ticketsCargando,
    error: ticketsError,
    creando: ticketCreando,
    crearTicket: enviarTicketMentor,
    recargar: recargarTickets,
  } = useTicketsMentor(inAtencionPersonalizada);

  // Sub-módulo: Ranking Real del Backend
  const { rankingData, loading: rankingCargando, error: rankingError } = useRanking();

  // Obtener lista 100% real de la API (general, coherencia o liga)
  const apiRankingEntries = useMemo(() => {
    if (!rankingData) return [];
    if (rankingData.general && rankingData.general.length > 0) return rankingData.general;
    if (rankingData.coherenciaIndividual && rankingData.coherenciaIndividual.length > 0) return rankingData.coherenciaIndividual;
    if (rankingData.liga && rankingData.liga.length > 0) return rankingData.liga;
    return [];
  }, [rankingData]);

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
    return {
      rank: '-',
      cellText: `${celulaNombre} · Sin puntajes en este corte del ranking`,
    };
  }, [apiRankingEntries, rankingData?.celula?.cellName, user?.id, user?.name, miCelula]);

  const handleEnviarTicket = async () => {
    if (!ticketBloqueo.trim() || !ticketSoluciones.trim() || !ticketImpactoSmart.trim()) {
      Alert.alert(
        'Campos requeridos',
        'Por favor responde a las 3 preguntas clave para que tu mentor pueda orientarte adecuadamente.'
      );
      return;
    }

    try {
      await enviarTicketMentor({
        blockDescription: ticketBloqueo.trim(),
        attemptedSolutions: ticketSoluciones.trim(),
        smartGoalImpact: ticketImpactoSmart.trim(),
      });
      setTicketBloqueo('');
      setTicketSoluciones('');
      setTicketImpactoSmart('');
      setModalNuevoTicketVisible(false);
      Alert.alert(
        '¡Ticket Enviado! 🎫🦅',
        'Tu mentor asignado ha recibido tu consulta estructurada y te responderá en este mismo espacio.'
      );
    } catch (e) {
      Alert.alert('No se pudo enviar el ticket', mensajeDeError(e, 'Intenta de nuevo en un momento.'));
    }
  };

  // =========================================================================
  // GESTOS TÁCTILES DEL SISTEMA (BACKHANDLER)
  // =========================================================================
  useSystemBackHandler(() => {
    if (shareSheetPost !== null) {
      setShareSheetPost(null);
      return true;
    }
    if (modalNuevoTicketVisible) {
      setModalNuevoTicketVisible(false);
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
    if (inAtencionPersonalizada) {
      irASeccion('inicio');
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
      irASeccion('inicio');
      return true;
    }
    if (inEventosExperiencias) {
      irASeccion('inicio');
      return true;
    }
    return false;
  }, shareSheetPost !== null || modalNuevoTicketVisible || inAtencionPersonalizada || inEventosExperiencias || inExclusiveResources || selectedCourse !== null || fullScreenLesson !== null || createPostModalVisible || reactionsModalVisible || activeChat !== null || groupInfoVisible || selectedMemberProfile !== null || fotoChatAmpliada !== null);

  /**
   * Mientras la sala de chat esté abierta, se esconde el botón flotante del acompañante: se monta
   * justo encima de la barra de escribir y tapa el botón de enviar. Es la misma señal que ya usaba
   * `ChatDelCurso` (ver `renasia/state/chatEnPantalla.ts`), no un mecanismo nuevo.
   */
  useEffect(() => {
    if (!inAtencionPersonalizada || activeChat === null || groupInfoVisible) return;
    return marcarChatMontado();
  }, [inAtencionPersonalizada, activeChat, groupInfoVisible]);

  // =========================================================================
  // HANDLERS
  // =========================================================================
  const handleSoportePress = (label: string) => {
    if (label.includes('Entorno') || label.includes('Atención')) {
      irASeccion('atencion');
    } else if (label.includes('Eventos')) {
      irASeccion('eventos');
    } else if (label.includes('Recursos')) {
      irASeccion('recursos');
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

  useEffect(() => {
    const params = route.params as
      | { abrirCursoId?: string; abrirLeccionId?: string }
      | undefined;
    if (!params?.abrirCursoId || !params?.abrirLeccionId) return;

    // `irASeccion` y no `setSeccionActiva`: apaga la sección que estuviera abierta. Entrar acá
    // dejando prendida "Eventos & Experiencias" pintaba el Muro y el catálogo de Cursos apilados
    // en el mismo scroll (E-116).
    irASeccion('recursos');
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
   * Segunda entrada desde afuera, con la misma forma que la de arriba: el arranque guiado
   * (`features/sparkie`) manda al aprendiz recién llegado a escribir su primer post.
   *
   * Deja la pantalla exactamente donde la dejaría alguien navegando a mano — Eventos y
   * Experiencias → pestaña "muro" → botón de publicar — en vez de saltarse pasos: si mañana el
   * Muro cambia de reglas, este atajo las hereda solas.
   */
  useEffect(() => {
    const params = route.params as { abrirComposerMuro?: boolean } | undefined;
    if (!params?.abrirComposerMuro) return;

    // Misma razón que el atajo de la Clase Diaria de arriba: `irASeccion` apaga "Recursos
    // Exclusivos" si el aprendiz venía de ahí. Este era el camino con el que el dueño del proyecto
    // encontró el bug — tocaba el hábito de Clase Diaria y después el de post en comunidad, y le
    // quedaban las dos secciones una encima de la otra (E-116).
    irASeccion('eventos');
    setEventosTab('muro');
    setCreatePostModalVisible(true);
    // Se consume una sola vez, igual que `abrirCursoId`: sin esto, volver a esta pestaña
    // reabriría el composer aunque la persona lo hubiera cerrado a propósito.
    (navigation as any).setParams({ abrirComposerMuro: undefined });
  }, [route.params, navigation]);

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
        `Subí mi evidencia de "${resultado.tituloHabito}" (+${resultado.puntosOtorgados} pts).`,
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

  const handleShareToConversation = async (post: PostItem, conv: ChatConversation) => {
    try {
      const autor = post.author ? post.author : 'Comunidad Renaser';
      const texto = post.text ? `"${post.text}"` : '';
      const foto = post.media && post.media[0]?.url ? post.media[0].url : '';

      let mensaje = `📌 [Compartido del Muro por ${autor}]`;
      if (texto) mensaje += `\n${texto}`;
      if (foto) mensaje += `\n📷 Ver foto: ${foto}`;

      await enviarMensajeChatRemoto(conv, mensaje);
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
    setNewPostText('');
    setAttachedPhotos([]);
    setCreatePostModalVisible(false);

    setSubiendoPublicacion(true);
    try {
      await publicarOptimista(texto, fotos, nombreUsuario);
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
      setCreatePostModalVisible(true);
      Alert.alert('No se pudo publicar', mensajeDeFalloAlPublicar(error));
    } finally {
      setSubiendoPublicacion(false);
    }
  };

  const likesReactions = reactionUsers.filter(r => r.type === 'like');
  const dislikesReactions = reactionUsers.filter(r => r.type === 'dislike');
  const filteredReactions =
    reactionFilter === 'like' ? likesReactions : reactionFilter === 'dislike' ? dislikesReactions : reactionUsers;

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
      {seccionActiva === 'inicio' && (
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

          <View style={[styles.section, { borderTopColor: c.divider }]}>
            <MicroLabel>TRIBU PRIVADA</MicroLabel>
            {celulaCargando && companerosCelula.length === 0 && (
              <Text style={[t.micro, { color: c.textSoft, marginTop: 10 }]}>Cargando tu tribu...</Text>
            )}
            {!celulaCargando && !celulaError && companerosCelula.length === 0 && (
              <Text style={[t.micro, { color: c.textSoft, marginTop: 10 }]}>
                Todavía no tenés integrantes en tu célula.
              </Text>
            )}
            {companerosCelula.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                {tribuVisibles.map(m => (
                  <Placeholder
                    key={m.traineeId}
                    style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
                  />
                ))}
                {tribuRestantes > 0 && (
                  <View style={[styles.more, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, borderColor: c.border, backgroundColor: c.cardBg }]}>
                    <Text style={[t.small, { color: c.textSoft }]}>+{tribuRestantes}</Text>
                  </View>
                )}
              </View>
            )}
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
                        borderColor: s.label.includes('Entorno') || s.label.includes('Atención') || s.label.includes('Eventos') || s.label.includes('Recursos') ? c.gold : c.border,
                        backgroundColor: s.label.includes('Entorno') || s.label.includes('Atención') || s.label.includes('Eventos') || s.label.includes('Recursos') ? c.cardBgAlt : c.cardBg,
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
              onPress={() => irASeccion('inicio')}
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
                    fontFamily: 'Arial',
                    fontSize: 11,
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
                    fontFamily: 'Arial',
                    fontSize: 11,
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
                    fontFamily: 'Arial',
                    fontSize: 11,
                  },
                ]}
              >
                🏆 RANKING
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
                    style={[
                      styles.postCard,
                      { borderColor: c.border, backgroundColor: c.cardBg },
                      // Único cambio visual del post optimista: atenuado mientras se confirma. Se
                      // suma como estilo al lado de los que ya estaban, sin tocar `styles.postCard`
                      // ni reestructurar el JSX de la tarjeta.
                      post.pendiente && { opacity: 0.55 },
                    ]}
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
                          <Pressable
                            onPress={() => abrirVisorFotos(post, 0)}
                            style={[styles.mediaSingleBox, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}
                          >
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
                          </Pressable>
                        ) : post.media.length === 2 ? (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {post.media.map((m, idx) => (
                              <Pressable
                                key={idx}
                                onPress={() => abrirVisorFotos(post, idx)}
                                style={[styles.mediaHalfBox, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}
                              >
                                <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10 }]}>
                                  {m.title}
                                </Text>
                                <FotoMuro url={m.url} mimeType={m.mimeType} radioBorde={10} colorFondo={c.cardBgAlt} />
                              </Pressable>
                            ))}
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', gap: 6, height: 130 }}>
                            <Pressable
                              onPress={() => abrirVisorFotos(post, 0)}
                              style={[styles.mediaLargeLeft, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}
                            >
                              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>
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
                                  style={[styles.mediaSmallRight, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}
                                >
                                  <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
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

                    {/* Resumen de Reacciones */}
                    <View style={[styles.reactionsSummaryRow, { borderTopColor: c.divider }]}>
                      <Pressable
                        onPress={() => {
                          setReactionsModalVisible(true);
                          setReactionFilter('all');
                          void cargarReacciones(post.id);
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

                    {/* Botones de Acción: Like, Dislike, Comentar, Compartir */}
                    <View style={[styles.actionButtonsRow, { borderTopColor: c.divider }]}>
                      <Pressable
                        onPress={() => handleToggleLike(post.id)}
                        style={styles.actionBtn}
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
                        style={styles.actionBtn}
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

                      <Pressable
                        onPress={() => handleSharePost(post.id)}
                        style={styles.actionBtn}
                      >
                        <Text style={{ fontSize: 13 }}>↗️</Text>
                        <Text style={[t.micro, { color: c.textSoft, fontWeight: '700', fontSize: 10.5 }]}>
                          Compartir
                        </Text>
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
                                <Text style={[t.cardTitle, { color: c.gold, fontSize: 11.5 }]}>
                                  {cItem.author} {cItem.role ? `(${cItem.role})` : ''}
                                </Text>
                                <Text style={[t.micro, { color: c.textSoft, fontSize: 9 }]}>{cItem.timeAgo}</Text>
                              </View>

                              <Text style={[t.body, { color: c.text, fontSize: 11.5, marginTop: 4, lineHeight: 16 }]}>
                                {displayText}
                              </Text>

                              {isLong && (
                                <Pressable
                                  onPress={() => setExpandedComments(prev => ({ ...prev, [cItem.id]: !prev[cItem.id] }))}
                                  hitSlop={6}
                                  style={{ marginTop: 2 }}
                                >
                                  <Text style={[t.micro, { color: c.gold, fontSize: 9.5, fontWeight: '700' }]}>
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
                                  style={[styles.commentPhotoBox, { borderColor: c.gold }]}
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
                                style={{ padding: 4 }}
                              >
                                <Text style={{ fontSize: 14 }}>{emoji}</Text>
                              </Pressable>
                            ))}
                          </View>

                          {/* Previsualización compacta de foto seleccionada */}
                          {commentPhotos[post.id] && (
                            <View style={[styles.commentPhotoPreview, { borderColor: c.gold, backgroundColor: c.cardBgAlt, flexDirection: 'row', alignItems: 'center', padding: 6, gap: 8 }]}>
                              <Image
                                source={{ uri: commentPhotos[post.id]!.uri }}
                                style={{ width: 38, height: 38, borderRadius: 6 }}
                                resizeMode="cover"
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={[t.micro, { color: c.gold, fontSize: 10, fontWeight: '700' }]}>
                                  📷 Foto adjunta
                                </Text>
                                <Text style={[t.micro, { color: c.textSoft, fontSize: 8.5 }]}>
                                  Lista para enviar con tu comentario
                                </Text>
                              </View>
                              <Pressable
                                onPress={() => setCommentPhotos(prev => ({ ...prev, [post.id]: null }))}
                                hitSlop={6}
                              >
                                <Text style={{ color: '#f28e8e', fontWeight: 'bold', fontSize: 12 }}>✕</Text>
                              </Pressable>
                            </View>
                          )}

                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                            <Pressable
                              onPress={() => handlePickCommentPhoto(post.id)}
                              style={[styles.attachPhotoBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                              hitSlop={6}
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
                    <Text style={[t.micro, { color: c.gold, fontSize: 8.5, fontWeight: '800' }]}>
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
          {eventosTab === 'ranking' && (
            <View style={{ gap: 14, paddingTop: 10, paddingBottom: 28 }}>
              {podioTop1 ? (
                /* PODIO DE HONOR */
                <View style={[styles.podium3DContainer, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                  {/* #2 PLATA */}
                  <View style={styles.podiumColumn}>
                    <View style={[styles.avatarMedal, { borderColor: '#E0E0E0', backgroundColor: '#2C2C2C' }]}>
                      <Text style={{ fontSize: 16 }}>🥈</Text>
                    </View>
                    <Text numberOfLines={1} style={{ color: '#E0E0E0', fontFamily: 'Arial', fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                      {podioTop2?.name || '-'}
                    </Text>
                    <Text style={{ color: '#BDBDBD', fontFamily: 'Arial', fontSize: 11 }}>{podioTop2?.score || '0 Pts'}</Text>
                    <LinearGradient
                      colors={['#8C8C8C', '#5C5C5C', '#3A3A3A']}
                      style={[styles.podiumBlock, { height: 95 }]}
                    >
                      <Text style={[styles.podiumRankNum, { color: '#FFF' }]}>2</Text>
                      <Text style={{ color: '#E0E0E0', fontFamily: 'Arial', fontSize: 11, fontWeight: '800' }}>PLATA</Text>
                    </LinearGradient>
                  </View>

                  {/* #1 ORO */}
                  <View style={styles.podiumColumn}>
                    <View style={[styles.avatarMedal, { borderColor: c.gold, backgroundColor: '#3D3014' }]}>
                      <Text style={{ fontSize: 20 }}>👑</Text>
                    </View>
                    <Text numberOfLines={1} style={{ color: c.gold, fontFamily: 'Arial', fontSize: 11, fontWeight: '800', marginTop: 4 }}>
                      {podioTop1.name}
                    </Text>
                    <Text style={{ color: c.gold, fontFamily: 'Arial', fontSize: 11, fontWeight: '700' }}>🔥 {podioTop1.score}</Text>
                    <LinearGradient
                      colors={['#FFE29F', '#E5C689', '#C09A4F', '#9C7A34']}
                      style={[styles.podiumBlock, { height: 130 }]}
                    >
                      <Text style={[styles.podiumRankNum, { color: '#1E1B18' }]}>1</Text>
                      <Text style={{ color: '#1E1B18', fontFamily: 'Arial', fontSize: 11, fontWeight: '900' }}>ORO LÍDER</Text>
                    </LinearGradient>
                  </View>

                  {/* #3 BRONCE */}
                  <View style={styles.podiumColumn}>
                    <View style={[styles.avatarMedal, { borderColor: '#CD7F32', backgroundColor: '#2E1E14' }]}>
                      <Text style={{ fontSize: 16 }}>🥉</Text>
                    </View>
                    <Text numberOfLines={1} style={{ color: '#E0A96D', fontFamily: 'Arial', fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                      {podioTop3?.name || '-'}
                    </Text>
                    <Text style={{ color: '#A89E8D', fontFamily: 'Arial', fontSize: 11 }}>{podioTop3?.score || '0 Pts'}</Text>
                    <LinearGradient
                      colors={['#A86834', '#7A4820', '#4A2A10']}
                      style={[styles.podiumBlock, { height: 75 }]}
                    >
                      <Text style={[styles.podiumRankNum, { color: '#FFF' }]}>3</Text>
                      <Text style={{ color: '#E0A96D', fontFamily: 'Arial', fontSize: 11, fontWeight: '800' }}>BRONCE</Text>
                    </LinearGradient>
                  </View>
                </View>
              ) : (
                <View style={[styles.myRankCard, { borderColor: c.border, backgroundColor: c.cardBg, alignItems: 'center', paddingVertical: 20 }]}>
                  <Text style={{ fontSize: 26, marginBottom: 8 }}>🏆</Text>
                  <Text style={{ color: c.textStrong, fontFamily: 'Arial', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                    {rankingCargando ? 'Cargando ranking oficial...' : 'Ranking Oficial en Espera de Puntos'}
                  </Text>
                  <Text style={{ color: c.textSoft, fontFamily: 'Arial', fontSize: 11, textAlign: 'center', marginTop: 4, paddingHorizontal: 16, lineHeight: 16 }}>
                    {rankingCargando
                      ? 'Conectando con el servidor...'
                      : 'El backend aún no ha registrado posiciones en este corte diario. Los puntos se calculan automáticamente con el avance de hábitos, rocas y lecciones de la tribu.'}
                  </Text>
                </View>
              )}

              {/* Tu Posición Personal Con Datos Reales del Usuario */}
              <View style={[styles.myRankCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.rankCircleNumber, { backgroundColor: c.gold }]}>
                    <Text style={{ color: '#1E1B18', fontFamily: 'Arial', fontWeight: '900', fontSize: 11 }}>#{userRankEntry.rank}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.textStrong, fontFamily: 'Arial', fontSize: 11, fontWeight: '700' }}>
                      Tu Posición ({nombreUsuario})
                    </Text>
                    <Text style={{ color: c.gold, fontFamily: 'Arial', fontSize: 11, marginTop: 2 }}>
                      {userRankEntry.cellText}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Tabla de Clasificación General */}
              {rankingList.length > 0 && (
                <View style={[styles.leaderboardList, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                  {rankingList.map(u => (
                    <View
                      key={u.id}
                      style={[
                        styles.leaderboardRow,
                        { borderBottomColor: c.divider },
                        u.isCurrentUser && { backgroundColor: c.cardBgAlt },
                      ]}
                    >
                      <Text style={{ color: u.medal ? c.gold : c.textSoft, fontFamily: 'Arial', fontWeight: '800', fontSize: 11, width: 28 }}>
                        #{u.rank}
                      </Text>
                      <Text style={{ color: c.textStrong, fontFamily: 'Arial', fontSize: 11, fontWeight: u.isCurrentUser ? '700' : '400', flex: 1 }}>
                        {u.name}
                      </Text>
                      <Text style={{ color: c.gold, fontFamily: 'Arial', fontWeight: '700', fontSize: 11 }}>
                        ⚡ {u.scoreText}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
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
              onPress={() => irASeccion('inicio')}
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
                  <View style={[styles.courseCategoryBadge, { borderColor: c.gold, backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                    <Text style={[t.micro, { color: c.gold, fontSize: 8.5, fontWeight: '800' }]}>
                      {course.category}
                    </Text>
                  </View>
                  <Text style={[t.screenTitle, { color: '#FFFFFF', fontSize: 16.5, lineHeight: 22 }]} numberOfLines={2}>
                    {course.title}
                  </Text>
                </View>

                <View style={{ padding: 14, gap: 8 }}>
                  <Text style={[t.micro, { color: c.micro }]}>
                    Instructor: <Text style={{ color: c.gold, fontWeight: '700' }}>{course.instructor}</Text>
                  </Text>
                  {!!course.summary && (
                    <View>
                      <Text
                        style={[t.body, { color: c.textSoft, fontSize: 12, lineHeight: 17 }]}
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
                          style={{ alignSelf: 'flex-start', marginTop: 4 }}
                        >
                          <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>
                            {expandedCourseSummaries[course.id] ? 'Ver menos ▲' : 'Ver más... ▼'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                  <View style={{ gap: 4, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>
                        {course.totalModules} Módulos · {course.totalResources} Recursos
                      </Text>
                      <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                        {obtenerProgresoCurso(course)}% Completado
                      </Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: c.divider }]}>
                      <View style={[styles.progressBarFill, { width: `${obtenerProgresoCurso(course)}%`, backgroundColor: c.gold }]} />
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

          <View style={[styles.courseHeaderBox, { borderColor: c.gold, backgroundColor: c.cardBg, overflow: 'hidden' }]}>
            {selectedCourse.coverUrl ? (
              <View style={{ height: 140, marginHorizontal: -14, marginTop: -14, marginBottom: 12, overflow: 'hidden' }}>
                <CursoPortada url={selectedCourse.coverUrl} />
              </View>
            ) : null}
            <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16 }]}>
              {selectedCourse.title}
            </Text>
            <Text style={[t.micro, { color: c.gold, marginTop: 4 }]}>
              Instructor: {selectedCourse.instructor}
            </Text>
            {!!selectedCourse.summary && (
              <View style={{ marginTop: 8 }}>
                <Text
                  style={[t.body, { color: c.textSoft, fontSize: 12, lineHeight: 17 }]}
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
                    style={{ alignSelf: 'flex-start', marginTop: 4 }}
                  >
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>
                      {expandedCourseSummaries[selectedCourse.id] ? 'Ver menos ▲' : 'Ver más... ▼'}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          <View style={{ gap: 14, marginTop: 14, paddingBottom: 28 }}>
            {selectedCourse.sections.map(section => (
              <View key={section.id} style={[styles.sectionCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 0.8 }]}>
                  {section.title}
                </Text>
                <View style={{ gap: 8, marginTop: 10 }}>
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
                              ? (isDark ? 'rgba(212,160,23,0.12)' : 'rgba(212,160,23,0.08)')
                              : c.cardBgAlt,
                          },
                          bloqueada && { opacity: 0.5 },
                        ]}
                      >
                        <View
                          style={[
                            styles.resourceTypeIcon,
                            {
                              borderColor: completada ? c.gold : c.border,
                              backgroundColor: completada ? 'rgba(212,160,23,0.18)' : c.bg,
                            },
                          ]}
                        >
                          <Text style={{ fontSize: 13 }}>
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
                                color: completada ? c.gold : c.textStrong,
                                fontSize: 12.5,
                                fontWeight: completada ? '700' : '600',
                              },
                            ]}
                          >
                            {lesson.title}
                          </Text>
                          <Text style={[t.micro, { color: completada ? c.gold : c.micro, fontSize: 9.5 }]}>
                            {completada ? '✓ Completada' : lesson.meta}
                          </Text>
                        </View>
                        {completada ? (
                          <View style={[styles.completedBadgePill, { borderColor: c.gold, backgroundColor: 'rgba(212,160,23,0.15)' }]}>
                            <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 9 }]}>
                              ✓ HECHO
                            </Text>
                          </View>
                        ) : bloqueada ? (
                          <Text style={{ fontSize: 13 }}>🔒</Text>
                        ) : (
                          <Icon name="chevron" size={12} color={c.gold} />
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
              label={esLeccionCompletada(leccionMostrada.id, currentLessonIndex) ? '↺ QUITAR DE COMPLETADAS' : '✓ MARCAR LECCIÓN COMO COMPLETADA'}
              loading={actualizandoCompletado}
              onPress={() => handleAlternarLeccionCompletada(leccionMostrada)}
              style={{ width: '100%', marginTop: 16 }}
            />

            {/* Fila de navegación sucesiva entre lecciones (Req 3 y 4) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
              {prevLesson ? (
                <Pressable
                  onPress={() => handleAbrirLeccion(prevLesson)}
                  style={[styles.exploreBtn, { flex: 1, borderColor: c.border, backgroundColor: c.cardBgAlt, paddingVertical: 10 }]}
                  hitSlop={6}
                >
                  <Text style={[t.micro, { color: c.textSoft, fontWeight: '700' }]}>
                    ‹ ANTERIOR
                  </Text>
                </Pressable>
              ) : (
                <View style={{ flex: 1 }} />
              )}

              {allCourseLessons.length > 0 && (
                <Text style={[t.micro, { color: c.micro, fontSize: 10, textAlign: 'center' }]}>
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
                        color: esLeccionCompletada(leccionMostrada.id, currentLessonIndex) ? c.gold : c.textSoft,
                        fontWeight: '700',
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
                        ? 'rgba(212,160,23,0.12)'
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
                        color: esLeccionCompletada(leccionMostrada.id, currentLessonIndex) ? c.gold : c.textSoft,
                        fontWeight: '800',
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
              onPress={() => irASeccion('inicio')}
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
                ENTORNO RENASER
              </Text>
            </View>
          </View>

          {/* Selector de Pestaña Principal: TICKETS AL MENTOR vs CHATS */}
          <View style={[styles.tabsRow, { borderColor: c.border, backgroundColor: c.cardBg, marginBottom: 12 }]}>
            <Pressable
              onPress={() => setEntornoTab('tickets')}
              style={[styles.tabBtn, entornoTab === 'tickets' && { backgroundColor: c.gold }]}
            >
              <Text style={[t.micro, { color: entornoTab === 'tickets' ? '#1E1B18' : c.textSoft, fontWeight: '700', fontSize: 9.5 }]}>
                🎫 TICKETS AL MENTOR
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setEntornoTab('chats')}
              style={[styles.tabBtn, entornoTab === 'chats' && { backgroundColor: c.gold }]}
            >
              <Text style={[t.micro, { color: entornoTab === 'chats' ? '#1E1B18' : c.textSoft, fontWeight: '700', fontSize: 9.5 }]}>
                💬 CHATS COMUNIDAD
              </Text>
            </Pressable>
          </View>

          {/* ========================================================================= */}
          {/* PESTAÑA 1: TICKETS AL MENTOR (CON VALIDACIÓN DE GRUPO/CÉLULA)             */}
          {/* ========================================================================= */}
          {entornoTab === 'tickets' && (
            <View style={{ gap: 12, paddingBottom: 28 }}>
              {/* Tarjeta Informativa de Mentor */}
              <View style={[styles.sectionCard, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 0.8 }]}>
                      SISTEMA DE TICKETS SMART
                    </Text>
                    <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13.5, marginTop: 4 }]}>
                      {tieneMentor && miCelula?.assigned === true ? `Mentor asignado: ${mentorTitulo}` : 'Sin mentor asignado'}
                    </Text>
                  </View>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(212,160,23,0.15)', borderWidth: 1, borderColor: c.gold, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>🎫</Text>
                  </View>
                </View>
                <Text style={[t.body, { color: c.textSoft, fontSize: 11.5, marginTop: 6, lineHeight: 16 }]}>
                  Envía preguntas estructuradas a tu mentor para desbloquear obstáculos en tus metas y plan de 90 días.
                </Text>
              </View>

              {/* Validación de Prerrequisito: Debe pertenecer a un grupo/célula */}
              {!tieneGrupo ? (
                <View style={[styles.sectionCard, { borderColor: c.border, backgroundColor: c.cardBgAlt, padding: 18, alignItems: 'center' }]}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(212,160,23,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 22 }}>🔒</Text>
                  </View>
                  <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 15, textAlign: 'center' }]}>
                    Prerrequisito de Grupo Requerido
                  </Text>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, textAlign: 'center', marginTop: 8, lineHeight: 18 }]}>
                    Para poder enviar un ticket con preguntas a tu mentor, es necesario pertenecer a una célula (grupo de trabajo) y tener un mentor asignado.
                  </Text>
                  <View style={{ marginTop: 14, padding: 10, borderRadius: 10, backgroundColor: isDark ? 'rgba(212,160,23,0.08)' : 'rgba(212,160,23,0.05)', width: '100%', borderWidth: 1, borderColor: c.border }}>
                    <Text style={[t.micro, { color: c.gold, textAlign: 'center', fontWeight: '600', fontSize: 10.5 }]}>
                      ℹ️ Tu célula se asignará durante el inicio de tu programa. En cuanto esté lista, este canal se activará para ti.
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <GoldButton
                    label="+ CREAR NUEVO TICKET AL MENTOR"
                    onPress={() => setModalNuevoTicketVisible(true)}
                    style={{ width: '100%' }}
                  />

                  {ticketsCargando && ticketsMentor.length === 0 && (
                    <Text style={[t.micro, { color: c.textSoft, textAlign: 'center', marginTop: 16 }]}>
                      Cargando tus tickets...
                    </Text>
                  )}

                  {ticketsError && (
                    <Text style={[t.micro, { color: '#f28e8e', textAlign: 'center', marginTop: 16 }]}>
                      {ticketsError}
                    </Text>
                  )}

                  {!ticketsCargando && !ticketsError && ticketsMentor.length === 0 && (
                    <View style={[styles.sectionCard, { borderColor: c.border, backgroundColor: c.cardBgAlt, padding: 20, alignItems: 'center', marginTop: 4 }]}>
                      <Text style={{ fontSize: 26, marginBottom: 8 }}>📝</Text>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13.5, textAlign: 'center' }]}>
                        No tienes tickets creados
                      </Text>
                      <Text style={[t.body, { color: c.textSoft, fontSize: 11.5, textAlign: 'center', marginTop: 6, lineHeight: 16 }]}>
                        Cuando experimentes un obstáculo en tu avance, crea un ticket con las 3 preguntas clave para recibir la guía directa de tu mentor.
                      </Text>
                    </View>
                  )}

                  {ticketsMentor.map(ticket => (
                    <View
                      key={ticket.id}
                      style={[
                        styles.sectionCard,
                        {
                          borderColor: ticket.status === 'ANSWERED' ? c.gold : c.border,
                          backgroundColor: c.cardBg,
                        },
                      ]}
                    >
                      {/* Cabecera de Estado y Fecha */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <Text style={[t.micro, { color: c.micro, fontSize: 10 }]}>
                          {new Date(ticket.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                        <View
                          style={[
                            styles.completedBadgePill,
                            {
                              borderColor: ticket.status === 'ANSWERED' ? '#4CAF50' : c.gold,
                              backgroundColor: ticket.status === 'ANSWERED' ? 'rgba(76,175,80,0.15)' : 'rgba(212,160,23,0.15)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              t.micro,
                              {
                                color: ticket.status === 'ANSWERED' ? '#4CAF50' : c.gold,
                                fontWeight: '800',
                                fontSize: 9,
                              },
                            ]}
                          >
                            {ticket.status === 'ANSWERED' ? '✓ RESPONDIDO' : '⏳ PENDIENTE'}
                          </Text>
                        </View>
                      </View>

                      {/* Pregunta 1: Bloqueo */}
                      <View style={{ marginBottom: 8 }}>
                        <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10 }]}>
                          1. ¿CUÁL ES TU BLOQUEO O PREGUNTA?
                        </Text>
                        <Text style={[t.body, { color: c.textStrong, fontSize: 12.5, marginTop: 2, lineHeight: 17 }]}>
                          {ticket.blockDescription}
                        </Text>
                      </View>

                      {/* Pregunta 2: Soluciones intentadas */}
                      <View style={{ marginBottom: 8 }}>
                        <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10 }]}>
                          2. ¿QUÉ SOLUCIONES HAS INTENTADO?
                        </Text>
                        <Text style={[t.body, { color: c.textSoft, fontSize: 12, marginTop: 2, lineHeight: 17 }]}>
                          {ticket.attemptedSolutions}
                        </Text>
                      </View>

                      {/* Pregunta 3: Impacto SMART */}
                      <View style={{ marginBottom: 8 }}>
                        <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10 }]}>
                          3. ¿CÓMO IMPACTA EN TU META SMART?
                        </Text>
                        <Text style={[t.body, { color: c.textSoft, fontSize: 12, marginTop: 2, lineHeight: 17 }]}>
                          {ticket.smartGoalImpact}
                        </Text>
                      </View>

                      {/* Respuesta del Mentor */}
                      {ticket.mentorAnswer && (
                        <View
                          style={{
                            marginTop: 10,
                            padding: 12,
                            borderRadius: 12,
                            backgroundColor: isDark ? 'rgba(212,160,23,0.12)' : 'rgba(212,160,23,0.08)',
                            borderWidth: 1,
                            borderColor: c.gold,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 10.5 }]}>
                              🦅 RESPUESTA DEL MENTOR
                            </Text>
                            {ticket.answeredAt && (
                              <Text style={[t.micro, { color: c.micro, fontSize: 9.5 }]}>
                                {new Date(ticket.answeredAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                              </Text>
                            )}
                          </View>
                          <Text style={[t.body, { color: c.textStrong, fontSize: 12.5, lineHeight: 18 }]}>
                            {ticket.mentorAnswer}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {/* ========================================================================= */}
          {/* PESTAÑA 2: CHATS DE COMUNIDAD (CÉLULA, DIRECTOS, GLOBAL)                  */}
          {/* ========================================================================= */}
          {entornoTab === 'chats' && (
            <>
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
            </>
          )}
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
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5, flex: 1 }]}>
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
                        borderColor: c.gold,
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
                          <View key={idx} style={[styles.chatMediaThumbnail, { borderColor: c.border, backgroundColor: c.bg }]}>
                            <Text style={[t.micro, { color: c.gold, fontSize: 9.5, fontWeight: '700' }]}>{m}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {msg.text && (
                      <Text style={[t.body, { color: c.text, fontSize: 12, marginTop: 2 }]}>{msg.text}</Text>
                    )}
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

          {/*
            Barra de escribir, con la gramática de WhatsApp: mientras se graba, la barra entera
            pasa a ser el estado de la grabación (cronómetro corriendo y un solo botón para
            cortar y enviar) en vez de seguir mostrando controles que en ese momento no hacen
            nada. Es lo que separa "grabar" de "escribir" sin explicárselo a nadie.
          */}
          <View style={[styles.chatInputBar, { borderTopColor: c.divider, backgroundColor: c.cardBg }]}>
            {grabando ? (
              <>
                <View style={[styles.grabandoPunto, { backgroundColor: '#f28e8e' }]} />
                <Text style={[t.body, { color: c.text, fontSize: 12.5, flex: 1 }]}>
                  Grabando… {formatearSegundos(segundosGrabados)}
                </Text>
                <Pressable
                  onPress={() => void alternarGrabacion()}
                  style={[styles.sendBtnGold, { backgroundColor: c.gold }]}
                  accessibilityLabel="Terminar y enviar la nota de voz"
                >
                  <Text style={{ color: '#1E1B18', fontWeight: '900', fontSize: 13 }}>➤</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={handleAdjuntarFoto}
                  disabled={enviandoMedia}
                  style={[styles.mediaOptionBtn, {
                    borderColor: c.border,
                    backgroundColor: c.cardBgAlt,
                    opacity: enviandoMedia ? 0.4 : 1,
                  }]}
                  accessibilityLabel="Enviar una foto"
                >
                  <Text style={{ fontSize: 15 }}>📷</Text>
                </Pressable>

                {/* Acción aparte del botón de foto: acá la imagen se sella como EVIDENCIA de un
                    hábito (otro endpoint, otro bucket, otorga puntos), no como una foto de chat. */}
                <Pressable
                  onPress={() => setEvidenciaVisible(true)}
                  disabled={enviandoMedia}
                  style={[styles.mediaOptionBtn, {
                    borderColor: c.gold,
                    backgroundColor: c.cardBgAlt,
                    opacity: enviandoMedia ? 0.4 : 1,
                  }]}
                  accessibilityLabel="Subir evidencia de un hábito"
                >
                  <Text style={{ fontSize: 15 }}>✅</Text>
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
                    <Text style={{ color: '#1E1B18', fontWeight: '900', fontSize: 13 }}>➤</Text>
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
                    <Text style={{ fontSize: 14 }}>🎙</Text>
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
                  TODOS ({reactionUsers.length})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setReactionFilter('like')}
                style={[styles.tabBtn, reactionFilter === 'like' && { backgroundColor: c.gold }]}
              >
                <Text style={[t.micro, { color: reactionFilter === 'like' ? '#1E1B18' : c.textSoft, fontWeight: '700', fontSize: 9.5 }]}>
                  👍 LIKES ({likesReactions.length})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setReactionFilter('dislike')}
                style={[styles.tabBtn, reactionFilter === 'dislike' && { backgroundColor: c.gold }]}
              >
                <Text style={[t.micro, { color: reactionFilter === 'dislike' ? '#1E1B18' : c.textSoft, fontWeight: '700', fontSize: 9.5 }]}>
                  👎 DISLIKES ({dislikesReactions.length})
                </Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 220 }}>
              {/* Mismos tokens que los estados del feed real (muroCargando/muroError/lista vacía,
                  más arriba en esta pantalla) — ningún componente nuevo, solo texto. */}
              {cargandoReacciones && (
                <Text style={[t.micro, { color: c.textSoft, textAlign: 'center', paddingVertical: 12 }]}>
                  Cargando reacciones...
                </Text>
              )}
              {!cargandoReacciones && errorReacciones && (
                <Text style={[t.micro, { color: '#f28e8e', textAlign: 'center', paddingVertical: 12 }]}>
                  {errorReacciones}
                </Text>
              )}
              {!cargandoReacciones && !errorReacciones && reactionUsers.length === 0 && (
                <Text style={[t.micro, { color: c.textSoft, textAlign: 'center', paddingVertical: 12 }]}>
                  Todavía nadie reaccionó a esta publicación.
                </Text>
              )}
              {!cargandoReacciones && !errorReacciones && reactionUsers.length > 0 && filteredReactions.map(user => (
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

      {/* Modal: Crear Nuevo Ticket al Mentor (Entorno Renaser) */}
      <Modal
        visible={modalNuevoTicketVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalNuevoTicketVisible(false)}
      >
        <View style={styles.ticketModalOverlay}>
          <View style={[styles.ticketModalContainer, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 15 }]}>
                  Nuevo Ticket al Mentor 🎫
                </Text>
                <Pressable onPress={() => setModalNuevoTicketVisible(false)} hitSlop={8}>
                  <Text style={{ fontSize: 18, color: c.textSoft }}>✕</Text>
                </Pressable>
              </View>

              <Text style={[t.body, { color: c.textSoft, fontSize: 11.5, marginBottom: 12, lineHeight: 16 }]}>
                Responde las 3 preguntas clave del método SMART para que tu mentor pueda desbloquear tu avance:
              </Text>

              {/* Pregunta 1 */}
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', marginBottom: 4 }]}>
                1. ¿Cuál es tu bloqueo o pregunta específica? *
              </Text>
              <TextInput
                value={ticketBloqueo}
                onChangeText={setTicketBloqueo}
                placeholder="Describe el obstáculo, duda o dificultad..."
                placeholderTextColor={c.placeholderA}
                multiline
                style={[styles.ticketInput, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
              />

              {/* Pregunta 2 */}
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', marginTop: 10, marginBottom: 4 }]}>
                2. ¿Qué soluciones has intentado? *
              </Text>
              <TextInput
                value={ticketSoluciones}
                onChangeText={setTicketSoluciones}
                placeholder="Indica qué acciones o pruebas realizaste antes..."
                placeholderTextColor={c.placeholderA}
                multiline
                style={[styles.ticketInput, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
              />

              {/* Pregunta 3 */}
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', marginTop: 10, marginBottom: 4 }]}>
                3. ¿Cómo impacta en tu Meta SMART? *
              </Text>
              <TextInput
                value={ticketImpactoSmart}
                onChangeText={setTicketImpactoSmart}
                placeholder="En qué medida atrasa o afecta tu meta principal..."
                placeholderTextColor={c.placeholderA}
                multiline
                style={[styles.ticketInput, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable
                  onPress={() => setModalNuevoTicketVisible(false)}
                  style={[styles.exploreBtn, { flex: 1, borderColor: c.border, backgroundColor: c.cardBgAlt, paddingVertical: 12 }]}
                >
                  <Text style={[t.micro, { color: c.textSoft, fontWeight: '700' }]}>
                    CANCELAR
                  </Text>
                </Pressable>

                <View style={{ flex: 2 }}>
                  <GoldButton
                    label="ENVIAR TICKET"
                    loading={ticketCreando}
                    onPress={handleEnviarTicket}
                  />
                </View>
              </View>
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
            dislikes={activeViewerPost?.dislikes}
            userReaction={activeViewerPost?.userReaction}
            comments={activeViewerPost?.comments}
            onToggleLike={handleToggleLike}
            onToggleDislike={handleToggleDislike}
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
    marginTop: 6,
    overflow: 'hidden',
    maxWidth: 220,
  },
  commentPhotoImage: {
    width: '100%',
    height: 130,
    borderRadius: 7,
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
    height: 185,
    padding: 14,
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
  completedBadgePill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonInfoCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  ticketInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    minHeight: 68,
    textAlignVertical: 'top',
    fontFamily: 'Jost_400Regular',
  },
  ticketModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  ticketModalContainer: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 20,
    borderWidth: 1.2,
    padding: 18,
    maxHeight: '90%',
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
  shareModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
});