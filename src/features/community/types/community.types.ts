/**
 * Formas EXACTAS que devuelve el backend Java para el Muro (community/infrastructure/adapter/
 * in/rest/publicacion y .../categoria en el repo Spring). Separadas a propósito de los tipos de
 * UI (`PostItem`/`CommentItem`, definidos en `screens/ComunidadScreen.tsx`): el wire habla en
 * inglés (`LIKE`/`DISLIKE`, `reactionCounts`), la UI habla el vocabulario del diseño ya hecho.
 * `api/wallMappers.ts` traduce de uno a otro.
 */

/**
 * Los dos valores que sigue aceptando y devolviendo el backend. `DISLIKE` se conserva acá porque
 * es lo que hay del otro lado del cable —el enum de Java no cambió y las reacciones negativas
 * viejas siguen guardadas—, pero **la app ya no lo produce ni lo muestra**: el cliente pidió sacar
 * el dislike del producto. Quien filtre reacciones se queda solo con `LIKE`.
 */
export type WallReactionType = 'LIKE' | 'DISLIKE';

export interface WallMedia {
  url: string;
  mimeType: string;
}

export interface WallPost {
  id: string;
  authorId: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
  type: string;
  category: string | null;
  text: string;
  media: WallMedia[];
  createdAt: string;
  reactionCounts: Record<string, number>;
  myReactions: string[];
  commentCount: number;
  /** Día de programa del autor al publicar (1..90). `null`/ausente = no tenía programa activo. */
  programDay?: number | null;
}

export interface WallFeedPage {
  posts: WallPost[];
  nextCursor: string | null;
}

export interface WallComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
  text: string;
  createdAt: string;
}

export interface WallCommentsPage {
  comments: WallComment[];
  nextCursor: string | null;
  total: number;
}

export interface WallCategory {
  key: string;
  label: string;
  emoji: string;
  order: number;
}

export interface WallReactionToggleResult {
  reacted: boolean;
  reactionCounts: Record<string, number>;
}

/** `UrlSubidaMediaResponse` del backend (POST /api/v1/wall/media/upload-url). */
export interface WallUrlSubida {
  uploadUrl: string;
  bucket: string;
  ruta: string;
}

/**
 * Una fila de `GET /api/v1/wall/{id}/reactions` (`WallReactionItemResponse` en el backend
 * Java) — quién reaccionó a una publicación. `role` viaja tal cual el enum `UserRole` del
 * backend (TRAINEE/MENTOR/MENTOR_LEAD/ADMIN/ALCHEMIST), sin traducir: la traducción a
 * español vive en `wallMappers.ts` (mismo criterio que `chat/api/chatMappers.ts:ETIQUETA_ROL`).
 * `name`/`avatarUrl`/`role` son `null` en el caso raro de que el usuario ya no exista.
 */
export interface WallReactionItem {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  role: string | null;
  type: WallReactionType;
}

export interface WallReactionsPage {
  reactions: WallReactionItem[];
}

/**
 * Formas de `MiCelulaController` (`/api/v1/me/cell`, `/api/v1/me/cell/members`). Ver
 * `api/celulaSchemas.ts` para el detalle de qué se validó en vivo contra el backend real.
 */
export interface CellMember {
  traineeId: string;
  fullName: string;
  avatarUrl: string | null;
  isSelf: boolean;
}

/** `MiCelulaResponse` del backend, ya normalizado con el discriminante `assigned` explícito
 * (el backend no manda `assigned:true`, lo agrega `celulaApi.obtenerMiCelula` al validar). */
export type MiCelulaInfo =
  | { assigned: false }
  | {
      assigned: true;
      cellId: string;
      cellName: string;
      cohortName: string;
      cohortStatus: string;
      mentorName: string | null;
      mentorAvatarUrl: string | null;
      memberCount: number;
      totalCellsInCohort: number;
      videoCallUrl: string | null;
      nextSessionAt: string | null;
    };
