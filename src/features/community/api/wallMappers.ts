import type { CommentItem, PostItem, ReactionUser } from '../../../screens/ComunidadScreen';
import type {
  WallComment,
  WallPost,
  WallReactionItem,
  WallReactionToggleResult,
  WallReactionType,
} from '../types/community.types';
import { tiempoRelativo } from '../utils/tiempoRelativo';

/**
 * Traduce las respuestas del backend (inglés, `wallSchemas.ts`) a los tipos que ya consume el
 * diseño del Muro (`PostItem`/`CommentItem`, definidos en `ComunidadScreen.tsx`). El JSX no se
 * toca: solo cambia de dónde sale el valor de cada prop.
 */

/**
 * El diseño pinta el avatar como un emoji (`<Text>{post.avatar}</Text>`, sin `<Image>`). El
 * backend guarda `avatarUrl` como una URL real a S3 (`V13__avatar_url_permanente.sql`), así que
 * mostrarla ahí imprimiría la URL cruda como texto. Hasta que el diseño sume un `<Image>` para el
 * avatar (fuera de alcance: no se puede tocar el JSX), se usa un emoji neutro por defecto.
 */
export const AVATAR_POR_DEFECTO = '👤';

/** Mismo criterio que `chat/api/chatMappers.ts:ETIQUETA_ROL`: se duplica acá en vez de
 * importarse de `chat` a propósito (cada feature es dueña de su propia traducción,
 * AGENTS.md), son 5 líneas y evita acoplar `community` a `chat`. */
const ETIQUETA_ROL: Record<string, string> = {
  TRAINEE: 'Aprendiz',
  MENTOR: 'Mentor',
  MENTOR_LEAD: 'Líder de Mentores',
  ADMIN: 'Administrador',
  ALCHEMIST: 'Alquimista',
};

function mapearMedia(media: WallPost['media']): PostItem['media'] {
  return media.map((m, idx) => {
    const esVideo = m.mimeType.startsWith('video/');
    return {
      type: esVideo ? 'video' : 'image',
      title: esVideo ? `🎥 Video ${idx + 1}` : `📷 Foto ${idx + 1}`,
      // Se propagan tal cual: `FotoMuro` (features/community/components/) decide si pinta la foto
      // real encima de este `title`, o lo deja como está (es video, o la URL falló al cargar).
      url: m.url,
      mimeType: m.mimeType,
    };
  });
}

export function mapearPublicacion(post: WallPost): PostItem {
  return {
    id: post.id,
    author: post.authorName?.trim() || 'Miembro Renaser',
    avatar: AVATAR_POR_DEFECTO,
    // El feed del Muro (WallPostResponse) no trae la célula del autor: no existe ese dato en
    // esta respuesta, así que se deja vacío en vez de inventar uno.
    cell: '',
    // El día de programa del autor CUANDO publicó, sellado por el backend al crear la
    // publicación (V51). Antes acá había un `dayStreak: 0` fijo, y por eso el Muro entero
    // mostraba "Día 0". `null` cuando el autor no tenía programa activo: la insignia no se pinta.
    diaPrograma: post.programDay ?? null,
    timeAgo: tiempoRelativo(post.createdAt),
    text: post.text,
    media: mapearMedia(post.media),
    likes: post.reactionCounts.LIKE ?? 0,
    // `reactionCounts.DISLIKE` se ignora a propósito: el cliente pidió sacar el dislike del
    // producto. El backend sigue devolviéndolo (el enum `WallReactionType` no se tocó, así que las
    // reacciones negativas viejas siguen contadas ahí), pero ninguna pantalla lo muestra.
    // Quien había dejado un DISLIKE ve la publicación como si no hubiera reaccionado; en cuanto
    // toque "me gusta", el backend reemplaza una reacción por la otra y el rastro desaparece solo.
    userReaction: post.myReactions.includes('LIKE') ? 'like' : null,
    // Se cargan aparte, al abrir la sección de comentarios (GET /wall/{id}/comments) — el feed
    // solo trae `commentCount`, no la lista.
    comments: [],
  };
}

export function mapearComentario(comment: WallComment): CommentItem {
  const match = comment.text.match(/\[📷:(.+?)\]/);
  const photoAttached = match ? match[1] : undefined;
  const cleanText = match ? comment.text.replace(/\[📷:(.+?)\]/, '').trim() : comment.text;

  return {
    id: comment.id,
    author: comment.authorName?.trim() || 'Miembro Renaser',
    avatar: AVATAR_POR_DEFECTO,
    text: cleanText,
    photoAttached,
    // El backend no tiene reacciones a comentarios (solo a publicaciones, ver ReaccionarUseCase):
    // quedan en 0, sin interacción real posible desde este mapeo.
    likes: 0,
    userReaction: null,
    timeAgo: tiempoRelativo(comment.createdAt),
  };
}

/**
 * Aplica el resultado de `POST /wall/{id}/react` sobre un post ya en memoria. El backend hace el
 * toggle (tocar el mismo tipo lo saca, tocar el otro lo reemplaza — `ReaccionarUseCase`
 * `deUsuario`/`calcularToggle`) y devuelve los conteos reales, así que acá no hay que reinventar
 * esa aritmética: solo reflejar lo que contestó el servidor.
 */
export function aplicarReaccion(
  post: PostItem,
  tipo: WallReactionType,
  resultado: WallReactionToggleResult
): PostItem {
  return {
    ...post,
    likes: resultado.reactionCounts.LIKE ?? 0,
    // `tipo` siempre llega como 'LIKE' desde que se retiró el dislike (la app no tiene otro botón
    // que dispare esto). El parámetro se conserva porque el endpoint sigue aceptando los dos.
    userReaction: resultado.reacted && tipo === 'LIKE' ? 'like' : null,
  };
}

/**
 * Traduce una fila de `GET /api/v1/wall/{id}/reactions` al tipo que ya consume el modal
 * "Reacciones del post" (`ReactionUser`, definido en `ComunidadScreen.tsx`). El JSX del modal
 * no se toca: solo cambia de dónde sale `id`/`name`/`role`/`avatar`/`type`.
 *
 * El diseño no trae célula (`"Célula 04"`) del backend hoy — `users.api` no expone una
 * versión en lote de "célula por usuario" y agregarla está fuera del alcance de esta
 * integración (ver el informe). El subtítulo usa el rol real, traducido con el mismo
 * criterio que `ETIQUETA_ROL` de `chat/api/chatMappers.ts`, en vez de inventar una célula.
 */
export function mapearReaccion(item: WallReactionItem): ReactionUser {
  return {
    id: item.userId,
    name: item.name?.trim() || 'Miembro Renaser',
    role: item.role ? (ETIQUETA_ROL[item.role] ?? item.role) : '',
    avatar: AVATAR_POR_DEFECTO,
    // Siempre 'like': quien llama ya descartó las filas DISLIKE (`useWallReactions`), porque el
    // modal "quién reaccionó" dejó de mostrar reacciones negativas.
    type: 'like',
  };
}
