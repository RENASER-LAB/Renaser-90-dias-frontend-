/**
 * Formas EXACTAS que devuelve el backend Java para el Muro (community/infrastructure/adapter/
 * in/rest/publicacion y .../categoria en el repo Spring). Separadas a propósito de los tipos de
 * UI (`PostItem`/`CommentItem`, definidos en `screens/ComunidadScreen.tsx`): el wire habla en
 * inglés (`LIKE`/`DISLIKE`, `reactionCounts`), la UI habla el vocabulario del diseño ya hecho.
 * `api/wallMappers.ts` traduce de uno a otro.
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
