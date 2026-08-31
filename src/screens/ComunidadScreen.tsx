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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { MicroLabel, ScreenHeader, Placeholder } from '../components/ui';
import { Icon, IconName } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';

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
  media: { type: 'image' | 'video'; title: string; subtitle?: string }[];
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
// DATOS ESTÁTICOS: CURSOS
// =========================================================================
const COURSES_DATA: CourseItem[] = [
  {
    id: 'c1',
    title: 'Mentalidad Inquebrantable & Coherencia Somática',
    category: 'PROGRAMA COMPLETO · INCLUIDO',
    instructor: 'Sebastián Arango',
    summary: 'Aprende a disociar el hecho objetivo de la reacción emocional y hackear el cortisol matutino.',
    progressPercent: 65,
    totalModules: 2,
    totalResources: 6,
    sections: [
      {
        id: 's1',
        title: 'SECCIÓN 1: LA FUNDACIÓN SOMÁTICA',
        lessons: [
          {
            id: 'l1',
            type: 'video',
            title: '1.1 El Observador Consciente y la Verdad',
            meta: '🎥 Video Masterclass HD · 14 min',
            desc: 'Cómo desarticular la narrativa mental automática y responder desde la calma.',
            completed: true,
          },
          {
            id: 'l2',
            type: 'doc',
            title: '1.2 Manual de Tensión Isométrica y Fascia',
            meta: '📄 Documento PDF · 2.4 MB · 18 págs',
            desc: 'Guía ilustrada con posturas de tensión isométrica para regular el sistema nervioso.',
            completed: true,
          },
          {
            id: 'l3',
            type: 'text',
            title: '1.3 El Código del No Juicio en Alto Rendimiento',
            meta: '✍️ Escrito Formativo · 5 min de lectura',
            desc: 'Ensayo de Sebastián Arango sobre la diferencia entre dolor biológico y sufrimiento mental.',
            content:
              'La mayoría de las personas viven atrapadas en su narrativa mental, confundiendo lo que realmente sucedió con la historia que se contaron acerca de lo que sucedió.\n\nEl dolor es un hecho biológico. El sufrimiento es la historia que agregas en tu mente.\n\nEn el protocolo RENASER, tu primera victoria es callar la interpretación y volver al dato puro: ¿Qué pasó realmente? Solo eso. Nada más.',
            completed: true,
          },
        ],
      },
      {
        id: 's2',
        title: 'SECCIÓN 2: ALTA EJECUCIÓN & HERRAMIENTAS',
        lessons: [
          {
            id: 'l4',
            type: 'video',
            title: '2.1 Bloques de Poder Deep Work 90 min',
            meta: '🎥 Video Masterclass · 22 min',
            desc: 'Cómo blindar tu agenda matutina sin distracciones ni celular para avanzar tu Roca #1.',
            completed: false,
          },
          {
            id: 'l5',
            type: 'link',
            title: '2.2 Plantilla de Auditoría 80/20 (Notion / Sheets)',
            meta: '🔗 Enlace a Herramienta Externa',
            desc: 'Hoja interactiva para auditar tus fugas de tiempo y prioridades de alto apalancamiento.',
            completed: false,
          },
          {
            id: 'l6',
            type: 'doc',
            title: '2.3 Checklist Imprimible de Cierre del Día',
            meta: '📄 Documento PDF · 1 pág',
            desc: 'Plantilla para colocar en tu escritorio con los 5 puntos de validación.',
            completed: false,
          },
        ],
      },
    ],
  },
  {
    id: 'c2',
    title: 'Arquitectura Financiera & Alto Apalancamiento',
    category: 'MASTERCLASS ESTRATÉGICA',
    instructor: 'Sebastián Arango',
    summary: 'Sistemas de flujo de caja, ofertas de alto valor y apalancamiento estratégico de tiempo.',
    progressPercent: 20,
    totalModules: 1,
    totalResources: 2,
    sections: [
      {
        id: 's2_1',
        title: 'SECCIÓN 1: AUDITORÍA DE INGRESOS Y GASTOS',
        lessons: [
          {
            id: 'l2_1',
            type: 'video',
            title: '1.1 Flujo de Caja y Desconexión Emocional del Dinero',
            meta: '🎥 Video Masterclass · 28 min',
            desc: 'Principios para tratar el dinero como energía circulante y métrica de servicio.',
            completed: true,
          },
          {
            id: 'l2_2',
            type: 'link',
            title: '1.2 Simulador de Proyecciones Financieras',
            meta: '🔗 Hoja de Cálculo Interactiva',
            desc: 'Herramienta de proyección de escenarios financieros a 12 meses.',
            completed: false,
          },
        ],
      },
    ],
  },
  {
    id: 'c3',
    title: 'Protocolo 05:00 AM · Bioquímica Matutina',
    category: 'WORKSHOP SOMÁTICO',
    instructor: 'Sebastián Arango',
    summary: 'Rutina de activación biológica, luz solar, hidratación y anclaje de enfoque.',
    progressPercent: 0,
    totalModules: 1,
    totalResources: 1,
    sections: [
      {
        id: 's3_1',
        title: 'SECCIÓN 1: EL RITUAL DE PODER',
        lessons: [
          {
            id: 'l3_1',
            type: 'video',
            title: '1.1 Hackeo del Cortisol Matutino',
            meta: '🎥 Video Masterclass · 16 min',
            desc: 'Cómo evitar los picos de estrés y sincronizar el ritmo circadiano.',
            completed: false,
          },
        ],
      },
    ],
  },
];

// =========================================================================
// DATOS ESTÁTICOS: MURO SOCIAL, TESTIMONIOS Y RANKING
// =========================================================================
const INITIAL_POSTS: PostItem[] = [
  {
    id: 'p1',
    author: 'María Alejandra',
    avatar: '👩‍💼',
    cell: 'Célula 07',
    dayStreak: 37,
    timeAgo: 'Hace 2 horas',
    tag: '🔥 VICTORIA SOMÁTICA',
    text: 'Hoy completé mi Bloque de Poder de 90 minutos sin celular ni distracciones. Durante semanas pospuse terminar la propuesta de expansión por miedo al rechazo, pero el Código de la Verdad me obligó a mirar el dato puro: 4 llamadas, 2 cierres y $6,500 USD facturados sin inventar excusas. ¡La verdad biológica produce resultados inmediatos y medibles en cualquier área!',
    media: [
      { type: 'image', title: '🏋️ Bloque de Poder 90m' },
      { type: 'image', title: '✓ 05:00 AM Sellado' },
      { type: 'image', title: '📊 Cierre $6.5k' },
    ],
    likes: 38,
    dislikes: 4,
    userReaction: null,
    comments: [
      {
        id: 'cm1',
        author: 'Sebastián Arango',
        avatar: '🦅',
        role: 'Mentor Principal',
        text: 'Esa es la postura. La verdad produce resultados tangibles y medibles. Aquí te dejo la métrica de avance de tu célula:',
        photoAttached: '📷 Metrica_Celula_07.png',
        likes: 14,
        dislikes: 0,
        userReaction: null,
        timeAgo: 'Hace 1 hora',
      },
    ],
  },
  {
    id: 'p2',
    author: 'Carlos Méndez',
    avatar: '👨‍💼',
    cell: 'Célula 04',
    dayStreak: 90,
    timeAgo: 'Ayer',
    tag: '⚡ ALTO RENDIMIENTO',
    text: 'Graduado oficial de los 90 días. Mi experiencia reduciendo la jornada laboral de 14 a 6 horas diarias manteniendo la facturación más alta del año. El verdadero apalancamiento no es trabajar más, sino eliminar las micro-fugas energéticas y respetar los bloques innegociables.',
    media: [{ type: 'video', title: '▶ Ver Sesión Grabada (18 min)' }],
    likes: 52,
    dislikes: 1,
    userReaction: null,
    comments: [],
  },
];

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
  const mentorPhoto = rs(50);
  const avatarSize = rs(42);
  const medallionSize = rs(40);

  // =========================================================================
  // ESTADOS DE NAVEGACIÓN
  // =========================================================================
  const [inExclusiveResources, setInExclusiveResources] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [fullScreenLesson, setFullScreenLesson] = useState<LessonResource | null>(null);

  // Sub-módulo: Eventos & Experiencias
  const [inEventosExperiencias, setInEventosExperiencias] = useState(false);
  const [eventosTab, setEventosTab] = useState<'muro' | 'testimonios' | 'ranking'>('muro');

  // Estados del Muro Social
  const [posts, setPosts] = useState<PostItem[]>(INITIAL_POSTS);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentPhotos, setCommentPhotos] = useState<Record<string, boolean>>({});

  // Ventana Externa de Publicación a Pantalla Completa
  const [createPostModalVisible, setCreatePostModalVisible] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostTag, setNewPostTag] = useState('🔥 VICTORIA SOMÁTICA');
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([
    '📷 Bloque_Poder.jpg',
    '📷 Registro_05AM.png',
  ]);

  // Modal Quién dio Like/Dislike
  const [reactionsModalVisible, setReactionsModalVisible] = useState(false);
  const [reactionFilter, setReactionFilter] = useState<'all' | 'like' | 'dislike'>('all');

  // =========================================================================
  // GESTOS TÁCTILES DEL SISTEMA (BACKHANDLER)
  // =========================================================================
  useSystemBackHandler(() => {
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
      setSelectedCourse(null);
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
  }, inEventosExperiencias || inExclusiveResources || selectedCourse !== null || fullScreenLesson !== null || createPostModalVisible || reactionsModalVisible);

  // =========================================================================
  // HANDLERS
  // =========================================================================
  const handleSoportePress = (label: string) => {
    if (label.includes('Eventos')) {
      setInEventosExperiencias(true);
    } else if (label.includes('Recursos')) {
      setInExclusiveResources(true);
    } else {
      Alert.alert('Atención Personalizada', 'Abriendo canal de soporte prioritario 1 a 1.');
    }
  };

  const handleToggleLike = (postId: string) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          if (p.userReaction === 'like') {
            return { ...p, likes: p.likes - 1, userReaction: null };
          } else {
            return {
              ...p,
              likes: p.likes + 1,
              dislikes: p.userReaction === 'dislike' ? p.dislikes - 1 : p.dislikes,
              userReaction: 'like',
            };
          }
        }
        return p;
      })
    );
  };

  const handleToggleDislike = (postId: string) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          if (p.userReaction === 'dislike') {
            return { ...p, dislikes: p.dislikes - 1, userReaction: null };
          } else {
            return {
              ...p,
              dislikes: p.dislikes + 1,
              likes: p.userReaction === 'like' ? p.likes - 1 : p.likes,
              userReaction: 'dislike',
            };
          }
        }
        return p;
      })
    );
  };

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

  const handleAddComment = (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text && !commentPhotos[postId]) return;

    const newComment: CommentItem = {
      id: `c_${Date.now()}`,
      author: 'Kelin Arango (Tú)',
      avatar: '🦅',
      text: text,
      photoAttached: commentPhotos[postId] ? '📷 foto_adjunta.jpg' : undefined,
      likes: 0,
      dislikes: 0,
      userReaction: null,
      timeAgo: 'Justo ahora',
    };

    setPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p))
    );

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    setCommentPhotos(prev => ({ ...prev, [postId]: false }));
  };

  const handlePublishPost = () => {
    if (!newPostText.trim()) {
      Alert.alert('Campo requerido', 'Por favor escribe tu reflexión o experiencia antes de publicar.');
      return;
    }

    const newPost: PostItem = {
      id: `post_${Date.now()}`,
      author: 'Kelin Arango',
      avatar: '🦅',
      cell: 'Célula 07',
      dayStreak: 37,
      timeAgo: 'Justo ahora',
      tag: newPostTag,
      text: newPostText.trim(),
      media: attachedPhotos.map((p, idx) => ({
        type: 'image',
        title: `📷 Imagen ${idx + 1}`,
      })),
      likes: 1,
      dislikes: 0,
      userReaction: 'like',
      comments: [],
    };

    setPosts(prev => [newPost, ...prev]);
    setNewPostText('');
    setCreatePostModalVisible(false);
    Alert.alert('¡Publicado con Éxito! 🦅', 'Tu victoria ha sido compartida con la tribu.');
  };

  const filteredReactions = REACTION_USERS_MOCK.filter(r => {
    if (reactionFilter === 'like') return r.type === 'like';
    if (reactionFilter === 'dislike') return r.type === 'dislike';
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="COMUNIDAD" right="info" />

      {/* ========================================================================= */}
      {/* VISTA 1: PANTALLA PRINCIPAL DE COMUNIDAD (DISEÑO ORIGINAL LIMPIO)         */}
      {/* ========================================================================= */}
      {!inExclusiveResources && !inEventosExperiencias && (
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
                        borderColor: s.label.includes('Eventos') || s.label.includes('Recursos') ? c.gold : c.border,
                        backgroundColor: s.label.includes('Eventos') || s.label.includes('Recursos') ? c.cardBgAlt : c.cardBg,
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

          {/* ===================================================================== */}
          {/* PESTAÑA 1: MURO SOCIAL DE LA TRIBU                                    */}
          {/* ===================================================================== */}
          {eventosTab === 'muro' && (
            <View style={{ gap: 14, paddingTop: 10, paddingBottom: 28 }}>
              {/* Botón que Abre la Ventana Externa de Publicación */}
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
                      ¿Qué conquistaste hoy, Kelin?
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
                          </View>
                        ) : post.media.length === 2 ? (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {post.media.map((m, idx) => (
                              <View key={idx} style={[styles.mediaHalfBox, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
                                <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10 }]}>
                                  {m.title}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', gap: 6, height: 130 }}>
                            <View style={[styles.mediaLargeLeft, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
                              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>
                                {post.media[0].title}
                              </Text>
                            </View>
                            <View style={{ flex: 1, gap: 6 }}>
                              {post.media.slice(1, 3).map((m, idx) => (
                                <View key={idx} style={[styles.mediaSmallRight, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
                                  <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                                    {m.title}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Resumen de Reacciones (Toca para ver quién reaccionó) */}
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

                      <Pressable onPress={() => setOpenComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}>
                        <Text style={[t.micro, { color: c.textSoft, fontSize: 10 }]}>
                          {post.comments.length} Comentarios
                        </Text>
                      </Pressable>
                    </View>

                    {/* Botones de Acción: ÚNICAMENTE LIKE 👍 Y DISLIKE 👎 */}
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
                        onPress={() => setOpenComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                        style={styles.actionBtn}
                      >
                        <Text style={{ fontSize: 13 }}>💬</Text>
                        <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                          Comentar
                        </Text>
                      </Pressable>
                    </View>

                    {/* SECCIÓN DE COMENTARIOS CON FOTOS */}
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

                            {/* Foto Subida en el Comentario */}
                            {cItem.photoAttached && (
                              <View style={[styles.commentPhotoBox, { borderColor: c.gold, backgroundColor: c.bg }]}>
                                <Text style={[t.micro, { color: c.gold, fontSize: 9.5, fontWeight: '700' }]}>
                                  {cItem.photoAttached}
                                </Text>
                              </View>
                            )}

                            {/* Reacciones Like/Dislike al Comentario */}
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

                        {/* Input para Nuevo Comentario con Selector de Foto */}
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

          {/* ===================================================================== */}
          {/* PESTAÑA 2: TESTIMONIOS CON DISEÑO DE MEDIA LUNA Y AVATAR CENTRADO     */}
          {/* ===================================================================== */}
          {eventosTab === 'testimonios' && (
            <View style={{ gap: 16, paddingTop: 10, paddingBottom: 28 }}>
              <View style={[styles.headerBannerBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1.2, textAlign: 'center' }]}>
                  CASOS DE ÉXITO & TESTIMONIOS
                </Text>
                <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16, textAlign: 'center', marginTop: 2 }]}>
                  Transformaciones de Alto Rendimiento
                </Text>
                <Text style={[t.micro, { color: c.textSoft, textAlign: 'center', marginTop: 2 }]}>
                  Historias reales de alumnos que completaron el protocolo de 90 días.
                </Text>
              </View>

              {/* Tarjetas de Testimonios en Media Luna */}
              {INITIAL_TESTIMONIALS.map(item => (
                <View
                  key={item.id}
                  style={[styles.testimonialArcCard, { borderColor: c.gold, backgroundColor: c.cardBg }]}
                >
                  {/* Aureola Media Luna */}
                  <View style={styles.arcGlowOverlay} />

                  {/* Badge Superior */}
                  <View style={[styles.genBadge, { borderColor: c.gold, backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 9.5 }]}>
                      {item.badge}
                    </Text>
                  </View>

                  {/* Avatar Centrado */}
                  <View style={[styles.testimonialAvatarRing, { borderColor: c.gold }]}>
                    <Text style={{ fontSize: 26 }}>{item.avatar}</Text>
                    <View style={[styles.daysTag, { backgroundColor: '#173429', borderColor: '#70d2a0' }]}>
                      <Text style={{ color: '#70d2a0', fontWeight: '800', fontSize: 8 }}>90 DÍAS</Text>
                    </View>
                  </View>

                  {/* Nombre y Cargo */}
                  <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 15, textAlign: 'center', marginTop: 6 }]}>
                    {item.name}
                  </Text>
                  <Text style={[t.micro, { color: c.gold, textAlign: 'center', fontSize: 10 }]}>
                    {item.role}
                  </Text>

                  {/* Cita de Transformación */}
                  <Text style={[t.body, { color: c.text, fontStyle: 'italic', fontSize: 12, lineHeight: 18, textAlign: 'center', marginVertical: 8, paddingHorizontal: 6 }]}>
                    {item.quote}
                  </Text>

                  {/* Métricas Cuantificables */}
                  <View style={{ flexDirection: 'row', gap: 6, marginVertical: 6 }}>
                    {item.metrics.map((m, idx) => (
                      <View
                        key={idx}
                        style={[styles.metricBoxItem, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                      >
                        <Text style={[t.micro, { color: c.textSoft, fontSize: 8, textAlign: 'center' }]}>
                          {m.label}
                        </Text>
                        <Text style={[t.metric, { color: m.isHighlight ? '#70d2a0' : c.gold, fontSize: 13, textAlign: 'center', marginTop: 2 }]}>
                          {m.value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Botón de Video Testimonio */}
                  <GoldButton
                    label={`▶ VER VIDEO TESTIMONIO HD (${item.videoDuration})`}
                    onPress={() => Alert.alert('Testimonio en Video', `Reproduciendo historia de ${item.name}`)}
                    style={{ width: '100%', marginTop: 8 }}
                  />
                </View>
              ))}
            </View>
          )}

          {/* ===================================================================== */}
          {/* PESTAÑA 3: PODIO 3D CON PERSPECTIVA Y BRILLO ORO, PLATA Y BRONCE      */}
          {/* ===================================================================== */}
          {eventosTab === 'ranking' && (
            <View style={{ gap: 14, paddingTop: 10, paddingBottom: 28 }}>
              {/* Contenedor del Podio 3D */}
              <View style={[styles.podiumContainerBox, { borderColor: c.gold, backgroundColor: '#11100D' }]}>
                <View style={[styles.podiumHeaderBadge, { borderColor: c.gold, backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 9.5, letterSpacing: 1 }]}>
                    PODIO DE COHERENCIA 3D
                  </Text>
                </View>

                {/* Los 3 Pedestales 3D */}
                <View style={styles.podiumRow}>
                  {/* PUESTO 2: PLATA */}
                  <View style={[styles.pedestalColumn, { flex: 1 }]}>
                    <View style={[styles.medalCircle, styles.silverGlow]}>
                      <Text style={{ fontSize: 16 }}>🥈</Text>
                    </View>
                    <Text style={[t.cardTitle, { color: '#FFFFFF', fontSize: 11, textAlign: 'center', marginTop: 4 }]}>
                      Rodrigo V.
                    </Text>
                    <Text style={[t.micro, { color: '#C5BEB3', fontSize: 8.5, textAlign: 'center' }]}>
                      36d · 96%
                    </Text>
                    <LinearGradient
                      colors={['#FFFFFF', '#A8B1C2', '#3a3f4d']}
                      style={[styles.pedestalBlock, { height: 75 }]}
                    >
                      <Text style={[styles.pedestalRankText, { color: '#1E1B18' }]}>#2</Text>
                      <Text style={[styles.pedestalLabelText, { color: '#1E1B18' }]}>PLATA</Text>
                    </LinearGradient>
                  </View>

                  {/* PUESTO 1: ORO (ELEVADO CON CORONA Y HALO BRILLANTE) */}
                  <View style={[styles.pedestalColumn, { flex: 1.1, marginTop: -16 }]}>
                    <View style={[styles.medalCircleLarge, styles.goldGlow]}>
                      <Text style={{ fontSize: 20 }}>👑 🥇</Text>
                    </View>
                    <Text style={[t.cardTitle, { color: c.gold, fontSize: 12.5, fontWeight: '800', textAlign: 'center', marginTop: 4 }]}>
                      María A.
                    </Text>
                    <Text style={[t.micro, { color: '#70d2a0', fontSize: 9.5, fontWeight: '700', textAlign: 'center' }]}>
                      37d · 99%
                    </Text>
                    <LinearGradient
                      colors={['#FFE29F', '#E5C689', '#9C7A34']}
                      style={[styles.pedestalBlock, { height: 110 }]}
                    >
                      <Text style={[styles.pedestalRankText, { color: '#1E1B18', fontSize: 18 }]}>#1</Text>
                      <Text style={[styles.pedestalLabelText, { color: '#1E1B18', fontSize: 9 }]}>ORO LÍDER</Text>
                    </LinearGradient>
                  </View>

                  {/* PUESTO 3: BRONCE (BRILLO CAFÉ METÁLICO) */}
                  <View style={[styles.pedestalColumn, { flex: 1 }]}>
                    <View style={[styles.medalCircle, styles.bronzeGlow]}>
                      <Text style={{ fontSize: 16 }}>🥉</Text>
                    </View>
                    <Text style={[t.cardTitle, { color: '#E29B72', fontSize: 11, textAlign: 'center', marginTop: 4 }]}>
                      Esteban G.
                    </Text>
                    <Text style={[t.micro, { color: '#C5BEB3', fontSize: 8.5, textAlign: 'center' }]}>
                      35d · 94%
                    </Text>
                    <LinearGradient
                      colors={['#E29B72', '#B86E45', '#4A220F']}
                      style={[styles.pedestalBlock, { height: 60 }]}
                    >
                      <Text style={[styles.pedestalRankText, { color: '#FFFFFF' }]}>#3</Text>
                      <Text style={[styles.pedestalLabelText, { color: '#FFFFFF' }]}>BRONCE</Text>
                    </LinearGradient>
                  </View>
                </View>
              </View>

              {/* Tu Posición Personal */}
              <View style={[styles.myPositionCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={[t.metric, { color: c.gold, fontSize: 18 }]}>#4</Text>
                  <View style={[styles.avatarCircle, { borderColor: c.gold, backgroundColor: c.bg }]}>
                    <Text style={{ fontSize: 14 }}>🦅</Text>
                  </View>
                  <View>
                    <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>TÚ (Kelin Arango)</Text>
                    <Text style={[t.micro, { color: c.micro, fontSize: 9.5 }]}>Célula 07 · Aceleración</Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 12 }]}>🔥 37 Días</Text>
                  <Text style={[t.micro, { color: '#70d2a0', fontWeight: '700', fontSize: 9.5 }]}>94% Evidencias</Text>
                </View>
              </View>

              {/* Resto de la Tabla de Posiciones */}
              <View style={{ gap: 6 }}>
                {INITIAL_LEADERBOARD.filter(u => u.rank > 4).map(u => (
                  <View
                    key={u.id}
                    style={[styles.leaderboardRow, { borderColor: c.border, backgroundColor: c.cardBg }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 11, fontWeight: '700', width: 20 }]}>
                        #{u.rank}
                      </Text>
                      <Text style={[t.body, { color: c.textStrong, fontSize: 12, fontWeight: '600' }]}>
                        {u.name}
                      </Text>
                    </View>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>
                      {u.streakDays} Días · {u.evidencePercent}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: RECURSOS EXCLUSIVOS & CURSOS                                      */}
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
            <Pressable onPress={() => setInExclusiveResources(false)} style={styles.backBtnRow} hitSlop={8}>
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

          <View style={{ paddingTop: 10, gap: 4 }}>
            <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 18 }]}>CURSOS & PROGRAMAS</Text>
            <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>
              Masterclasses y recursos avanzados ofrecidos por Sebastián Arango.
            </Text>
          </View>

          <View style={{ gap: 14, paddingTop: 12, paddingBottom: 24 }}>
            {COURSES_DATA.map(course => (
              <Pressable
                key={course.id}
                onPress={() => setSelectedCourse(course)}
                style={[styles.courseCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
              >
                <View style={[styles.courseCoverHeader, { backgroundColor: c.cardBgAlt }]}>
                  <View style={[styles.courseCategoryBadge, { backgroundColor: 'rgba(0,0,0,0.7)', borderColor: c.gold }]}>
                    <Text style={[t.micro, { color: c.gold, fontSize: 9, fontWeight: '800' }]}>
                      {course.category}
                    </Text>
                  </View>
                  <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 14, marginTop: 14 }]}>
                    {course.title}
                  </Text>
                </View>

                <View style={{ padding: 12, gap: 8 }}>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 11.5, lineHeight: 16 }]}>
                    {course.summary}
                  </Text>

                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>Tu progreso</Text>
                      <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10 }]}>
                        {course.progressPercent}%
                      </Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: c.border }]}>
                      <View style={[styles.progressBarFill, { backgroundColor: c.gold, width: `${course.progressPercent}%` }]} />
                    </View>
                  </View>

                  <View style={[styles.exploreBtn, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                      EXPLORAR SECCIONES Y RECURSOS ›
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 4: DENTRO DEL CURSO — SECCIONES                                     */}
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
            <Pressable onPress={() => setSelectedCourse(null)} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A CURSOS
              </Text>
            </Pressable>

            <View style={[styles.categoryPillBadge, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                CONTENIDO DEL CURSO
              </Text>
            </View>
          </View>

          <View style={[styles.courseHeaderBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16 }]}>{selectedCourse.title}</Text>
            <Text style={[t.micro, { color: c.micro, marginTop: 2 }]}>
              Por {selectedCourse.instructor} · {selectedCourse.totalModules} Secciones
            </Text>
          </View>

          <View style={{ gap: 14, paddingTop: 10, paddingBottom: 24 }}>
            {selectedCourse.sections.map(section => (
              <View key={section.id} style={[styles.sectionCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5, borderBottomWidth: 1, borderBottomColor: c.divider, paddingBottom: 6 }]}>
                  {section.title}
                </Text>

                <View style={{ gap: 8, marginTop: 6 }}>
                  {section.lessons.map(lesson => (
                    <Pressable
                      key={lesson.id}
                      onPress={() => setFullScreenLesson(lesson)}
                      style={[
                        styles.lessonItemRow,
                        {
                          borderColor: lesson.completed ? '#4E9F76' : c.border,
                          backgroundColor: lesson.completed ? c.cardBgAlt : c.bg,
                        },
                      ]}
                    >
                      <View style={[styles.resourceTypeIcon, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
                        <Icon name={lesson.type === 'video' ? 'play' : 'doc'} size={14} color={c.gold} />
                      </View>

                      <View style={{ flex: 1, gap: 1 }}>
                        <Text style={[t.body, { color: c.textStrong, fontSize: 12.5, fontWeight: '600' }]}>
                          {lesson.title}
                        </Text>
                        <Text style={[t.micro, { color: c.textSoft, fontSize: 10 }]}>{lesson.meta}</Text>
                      </View>

                      <Text style={[t.micro, { color: lesson.completed ? '#4E9F76' : c.gold, fontWeight: '700', fontSize: 10 }]}>
                        {lesson.completed ? '✓ Visto' : 'Abrir ›'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 5: SESIÓN A PANTALLA COMPLETA                                       */}
      {/* ========================================================================= */}
      {inExclusiveResources && fullScreenLesson !== null && (
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
            <Pressable onPress={() => setFullScreenLesson(null)} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                SALIR AL CURSO
              </Text>
            </Pressable>

            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 9.5 }]}>
                {fullScreenLesson.type === 'video' ? '🎥 VIDEO MASTERCLASS' : '📄 DOCUMENTO'}
              </Text>
            </View>
          </View>

          <View style={{ gap: 14, paddingTop: 10 }}>
            <View style={[styles.lessonInfoCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16 }]}>
                {fullScreenLesson.title}
              </Text>
              <Text style={[t.micro, { color: c.gold, marginTop: 2 }]}>
                {fullScreenLesson.meta}
              </Text>
              <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, lineHeight: 18, marginTop: 8 }]}>
                {fullScreenLesson.desc}
              </Text>
            </View>

            <GoldButton
              label="✓ MARCAR SESIÓN COMO COMPLETADA"
              onPress={() => {
                fullScreenLesson.completed = true;
                Alert.alert('¡Completada!', 'Sesión marcada como vista.');
                setFullScreenLesson(null);
              }}
            />
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VENTANA EXTERNA PARA CREAR PUBLICACIÓN (SIN LÍMITE DE CARACTERES)  */}
      {/* ========================================================================= */}
      <Modal
        visible={createPostModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setCreatePostModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <View style={[styles.modalHeaderBar, { borderBottomColor: c.divider, paddingHorizontal: horizontalPadding }]}>
            <Pressable onPress={() => setCreatePostModalVisible(false)} hitSlop={8}>
              <Text style={[t.micro, { color: c.textSoft, fontWeight: '700', fontSize: 11 }]}>
                ✕ CANCELAR
              </Text>
            </Pressable>

            <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 10, letterSpacing: 1 }]}>
              NUEVA PUBLICACIÓN
            </Text>

            <Pressable
              onPress={handlePublishPost}
              style={[styles.publishHeaderBtn, { backgroundColor: c.gold }]}
            >
              <Text style={{ color: '#1E1B18', fontWeight: '800', fontSize: 11 }}>PUBLICAR</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              {
                paddingHorizontal: horizontalPadding,
                maxWidth: isTablet ? 560 : undefined,
                alignSelf: isTablet ? 'center' : 'stretch',
                width: isTablet ? '100%' : undefined,
                paddingTop: 14,
              },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.avatarCircle, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                <Text style={{ fontSize: 14 }}>🦅</Text>
              </View>
              <View>
                <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13.5 }]}>Kelin Arango</Text>
                <Text style={[t.micro, { color: c.micro, fontSize: 10 }]}>Célula 07 · Día 37 de Verdad</Text>
              </View>
            </View>

            {/* Selector de Etiquetas */}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              {['🔥 VICTORIA SOMÁTICA', '⚡ ALTO RENDIMIENTO', '🧠 REFLEXIÓN'].map(tag => (
                <Pressable
                  key={tag}
                  onPress={() => setNewPostTag(tag)}
                  style={[
                    styles.tagPill,
                    {
                      borderColor: newPostTag === tag ? c.gold : c.border,
                      backgroundColor: newPostTag === tag ? c.cardBgAlt : c.bg,
                    },
                  ]}
                >
                  <Text style={[t.micro, { color: newPostTag === tag ? c.gold : c.textSoft, fontWeight: '700', fontSize: 9.5 }]}>
                    {tag}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Textarea sin Límite */}
            <TextInput
              multiline
              numberOfLines={8}
              value={newPostText}
              onChangeText={setNewPostText}
              placeholder="Escribe aquí tu experiencia, victoria, aprendizaje o reflexión sin límite de espacio..."
              placeholderTextColor={c.textSoft}
              style={[
                styles.largeTextArea,
                {
                  borderColor: c.border,
                  backgroundColor: c.cardBg,
                  color: c.text,
                },
              ]}
            />

            {/* Galería Autodetectada */}
            <View style={{ marginTop: 14, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[t.micro, { color: c.textSoft, fontSize: 10 }]}>
                  Galería Autodetectada ({attachedPhotos.length} fotos adjuntas):
                </Text>
                <Pressable onPress={() => Alert.alert('Galería', 'Foto añadida')}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10 }]}>+ Agregar Foto</Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {attachedPhotos.map((photo, idx) => (
                  <View key={idx} style={[styles.photoPreviewThumbnail, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                    <Text style={[t.micro, { color: c.gold, fontSize: 9.5, fontWeight: '700' }]}>{photo}</Text>
                    <Pressable
                      onPress={() => setAttachedPhotos(prev => prev.filter((_, i) => i !== idx))}
                      style={styles.removePhotoBadge}
                    >
                      <Text style={{ color: '#fff', fontSize: 8, fontWeight: 'bold' }}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: QUIÉN DIO LIKE / DISLIKE (CON FILTRO POR PESTAÑA)                  */}
      {/* ========================================================================= */}
      <Modal
        visible={reactionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReactionsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.reactionsModalCard, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.divider, paddingBottom: 8 }}>
              <Text style={[t.cardTitle, { color: c.gold, fontSize: 12, letterSpacing: 1 }]}>
                REACCIONES DE LA TRIBU
              </Text>
              <Pressable onPress={() => setReactionsModalVisible(false)}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>✕ Cerrar</Text>
              </Pressable>
            </View>

            {/* Filtro de Reacciones */}
            <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8 }}>
              <Pressable
                onPress={() => setReactionFilter('all')}
                style={[
                  styles.filterBtnPill,
                  reactionFilter === 'all' && { backgroundColor: c.gold },
                ]}
              >
                <Text style={{ color: reactionFilter === 'all' ? '#1E1B18' : c.textSoft, fontWeight: '700', fontSize: 9.5 }}>
                  TODOS (4)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setReactionFilter('like')}
                style={[
                  styles.filterBtnPill,
                  reactionFilter === 'like' && { backgroundColor: '#173429', borderColor: '#70d2a0' },
                ]}
              >
                <Text style={{ color: reactionFilter === 'like' ? '#70d2a0' : c.textSoft, fontWeight: '700', fontSize: 9.5 }}>
                  👍 LIKES (3)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setReactionFilter('dislike')}
                style={[
                  styles.filterBtnPill,
                  reactionFilter === 'dislike' && { backgroundColor: '#331a1a', borderColor: '#f28e8e' },
                ]}
              >
                <Text style={{ color: reactionFilter === 'dislike' ? '#f28e8e' : c.textSoft, fontWeight: '700', fontSize: 9.5 }}>
                  👎 DISLIKES (1)
                </Text>
              </Pressable>
            </View>

            {/* Lista de Alumnos */}
            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 6 }}>
                {filteredReactions.map(rItem => (
                  <View
                    key={rItem.id}
                    style={[styles.reactionUserRow, { backgroundColor: c.cardBgAlt }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 14 }}>{rItem.avatar}</Text>
                      <View>
                        <Text style={[t.body, { color: c.textStrong, fontSize: 11.5, fontWeight: '600' }]}>
                          {rItem.name}
                        </Text>
                        <Text style={[t.micro, { color: c.textSoft, fontSize: 9 }]}>{rItem.role}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 14 }}>{rItem.type === 'like' ? '👍' : '👎'}</Text>
                  </View>
                ))}
              </View>
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
    borderWidth: 1.2,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  dayBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mediaGridContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaSingleBox: {
    height: 100,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaHalfBox: {
    flex: 1,
    height: 90,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaLargeLeft: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaSmallRight: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 10,
  },
  rxCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 9.5,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  commentsSection: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 8,
    gap: 8,
  },
  commentCard: {
    padding: 10,
    borderRadius: 12,
  },
  commentPhotoBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
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
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11.5,
  },
  sendCommentBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerBannerBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  testimonialArcCard: {
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  arcGlowOverlay: {
    position: 'absolute',
    top: -20,
    width: 140,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(229,198,137,0.2)',
  },
  genBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  testimonialAvatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  daysTag: {
    position: 'absolute',
    bottom: -4,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  metricBoxItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
  },
  podiumContainerBox: {
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
  },
  podiumHeaderBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingTop: 16,
  },
  pedestalColumn: {
    alignItems: 'center',
  },
  medalCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalCircleLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldGlow: {
    backgroundColor: '#FFE29F',
  },
  silverGlow: {
    backgroundColor: '#E0E4EC',
  },
  bronzeGlow: {
    backgroundColor: '#E29B72',
  },
  pedestalBlock: {
    width: '100%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  pedestalRankText: {
    fontWeight: '900',
    fontSize: 14,
  },
  pedestalLabelText: {
    fontWeight: '800',
    fontSize: 7.5,
    letterSpacing: 1,
  },
  myPositionCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaderboardRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  modalHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  publishHeaderBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  largeTextArea: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    textAlignVertical: 'top',
    fontSize: 12.5,
    minHeight: 140,
  },
  photoPreviewThumbnail: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  removePhotoBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#000',
    borderRadius: 6,
    paddingHorizontal: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  reactionsModalCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
  },
  filterBtnPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reactionUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
});