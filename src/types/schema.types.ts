/**
 * =========================================================================
 * RENASER 90 DÍAS — ESQUEMA MAESTRO DE ARQUITECTURA DE DATOS & TIPOS
 * =========================================================================
 * Este archivo centraliza todas las interfaces y modelos de datos del sistema
 * para asegurar una integración limpia y directa con el Backend (Supabase /
 * PostgreSQL / REST / WebSockets / S3).
 */

// =========================================================================
// 1. USUARIOS, AUTENTICACIÓN Y ONBOARDING
// =========================================================================
export type UserRole = 'student' | 'mentor' | 'coach' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  country?: string;
  city?: string;
  avatarUrl?: string;
  role: UserRole;
  currentDay: number; // Día 1 al 90
  currentPhase: 1 | 2 | 3; // 1: Fundación, 2: Aceleración, 3: Maestría
  cellId: string; // ID de la Célula asignada (ej. 'cell_07')
  cellName: string; // ej. 'Célula Fénix 07'
  mentorId: string;
  mentorName: string;
  onboardingCompleted: boolean;
  termsAcceptedAt?: string;
  pactoTruthSignatureUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// =========================================================================
// 2. DIMENSIONES SOMÁTICAS, HÁBITOS Y EVIDENCIAS FOTOGRÁFICAS (TRAINING)
// =========================================================================
export type SomaticDimension =
  | 'CUERPO'
  | 'MENTE'
  | 'EMOCIONES'
  | 'ESPÍRITU'
  | 'VIDA Y NEGOCIO';

export type HabitPriorityTag =
  | 'INNEGOCIABLE'
  | 'SALUD'
  | 'ENERGÍA'
  | 'APRENDIZAJE'
  | 'REGISTRO'
  | 'ENFOQUE'
  | 'RELACIONES'
  | 'PAZ'
  | 'PROPÓSITO'
  | 'FE'
  | 'ESTRATEGIA'
  | 'HÁBITOS';

export interface HabitItem {
  id: string;
  userId: string;
  dimension: SomaticDimension;
  title: string;
  scheduledTime: string;
  tag: HabitPriorityTag;
  streakDays: number;
  isDoneToday: boolean;
  hasEvidence: boolean;
  isCustom: boolean; // Si fue creado por el alumno
  createdAt: string;
}

export interface HabitEvidenceRecord {
  id: string;
  habitId: string;
  userId: string;
  dayNumber: number; // Día 37
  timestamp: string; // ISO 8601 (ej. '2026-08-31T07:45:00Z')
  formattedStamp: string; // 'Día 37 · 07:45 AM'
  photoUrl: string;
  truthNote?: string;
  status: 'pending' | 'sealed' | 'reviewed';
  reviewedByMentorId?: string;
}

// =========================================================================
// 3. RECURSOS EXCLUSIVOS & ACADEMIA (CURSOS Y MASTERCLASSES)
// =========================================================================
export type CourseCategory =
  | 'PROGRAMA COMPLETO · INCLUIDO'
  | 'MASTERCLASS ESTRATÉGICA'
  | 'WORKSHOP SOMÁTICO'
  | 'CURSO AVANZADO';

export type LessonResourceType = 'video' | 'doc' | 'link' | 'text';

export interface LessonResource {
  id: string;
  sectionId: string;
  courseId: string;
  type: LessonResourceType;
  title: string;
  meta: string; // ej. '🎥 Video Masterclass HD · 14 min' o '📄 PDF 2.4 MB'
  desc: string;
  mediaUrl?: string; // Video streaming URL o URL de PDF/Notion
  contentMarkdown?: string; // Texto formativo para lecturas inmersivas
  durationSeconds?: number;
  fileSizeBytes?: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface CourseSection {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  lessons: LessonResource[];
}

export interface CourseItem {
  id: string;
  title: string;
  category: CourseCategory;
  instructorName: string;
  instructorAvatar?: string;
  summary: string;
  coverImageUrl?: string;
  progressPercent: number;
  totalModules: number;
  totalResources: number;
  isLocked: boolean;
  unlockAtDay?: number;
  sections: CourseSection[];
}

// =========================================================================
// 4. EVENTOS & EXPERIENCIAS: MURO SOCIAL DE LA TRIBU
// =========================================================================
/**
 * Clave de la categoría del Muro (`REVELACIONES`, `AGRADECIMIENTO`, …). Es un `string` a
 * propósito: el catálogo lo administra ADMIN/ALCHEMIST en caliente desde el panel
 * (`categorias_muro`, `GET /api/v1/wall/categories`), así que ninguna unión de literales lo puede
 * describir sin quedar desactualizada en cuanto alguien dé de alta una categoría nueva.
 *
 * > **Corregido 2026-09-06.** Antes era la unión `'🔥 VICTORIA SOMÁTICA' | '⚡ ALTO RENDIMIENTO' |
 * > '🧠 REFLEXIÓN' | '👑 OFICIAL'` — cuatro valores que no existen en el catálogo del backend y
 * > que, mandados al publicar, dan 400 `"Categoria desconocida"`. De ahí salían las pastillas del
 * > compositor. Ver `docs/BITACORA_ERRORES.md` E-135.
 */
export type PostTag = string;

export type PostReactionType = 'like' | 'dislike';

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  aspectRatio?: number; // Para autocorrección vertical/horizontal
  title?: string;
}

export interface CommentReaction {
  userId: string;
  userName: string;
  userAvatar: string;
  type: PostReactionType;
}

export interface CommentItem {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole?: string;
  text: string;
  photoUrl?: string; // Soporte para subir fotos en comentarios
  likesCount: number;
  dislikesCount: number;
  userReaction?: PostReactionType | null;
  createdAt: string;
  timeAgo: string;
}

export interface PostItem {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorCell: string;
  authorStreakDays: number;
  tag?: PostTag;
  text: string;
  mediaList: MediaAttachment[];
  likesCount: number;
  dislikesCount: number;
  userReaction?: PostReactionType | null;
  comments: CommentItem[];
  createdAt: string;
  timeAgo: string;
}

// =========================================================================
// 5. EVENTOS & EXPERIENCIAS: TESTIMONIOS Y RANKING 3D
// =========================================================================
export interface MetricDelta {
  label: string;
  value: string;
  isHighlight: boolean;
}

export interface TestimonialRecord {
  id: string;
  name: string;
  role: string;
  generationBadge: string; // '👑 GRADUADO GENERACIÓN 04'
  avatarUrl: string;
  daysCompleted: number;
  quote: string;
  metrics: MetricDelta[];
  videoTestimonialUrl?: string;
  videoDuration: string;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  userId: string;
  name: string;
  cellName: string;
  streakDays: number;
  evidencePercent: number;
  medalType?: 'gold' | 'silver' | 'bronze';
  isCurrentUser: boolean;
}

// =========================================================================
// 6. ATENCIÓN PERSONALIZADA & CHATS TIPO WHATSAPP
// =========================================================================
export type ConversationType = 'celula' | 'direct' | 'global';
export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read';
export type ChatMessageType = 'text' | 'audio' | 'image_grid' | 'video' | 'gif';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderAvatar: string;
  isMe: boolean;
  timeFormatted: string;
  createdAt: string;
  type: ChatMessageType;
  text?: string;
  audioUrl?: string;
  audioDurationSeconds?: number;
  formattedDuration?: string; // '0:42'
  mediaUrls?: string[];
  gifTitle?: string;
  gifIcon?: string;
  status: MessageDeliveryStatus;
}

export interface ChatConversation {
  id: string;
  type: ConversationType;
  title: string;
  subtitle: string;
  avatar: string;
  lastMessageText: string;
  lastMessageTime: string;
  unreadCount: number;
  membersCount?: number;
  isOnline?: boolean;
  messages: ChatMessage[];
}

export interface CellGroupMember {
  id: string;
  userId: string;
  name: string;
  role: string;
  avatar: string;
  badge: 'MENTOR' | 'ALUMNO' | 'GRADUADO';
  streakDays: number;
  cellName: string;
  focusArea: string;
}
