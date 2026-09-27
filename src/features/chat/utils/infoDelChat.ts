/**
 * Lo que dice la info de una conversación, al estilo de WhatsApp (pedido del dueño, 2026-09-27):
 * el título de la barra, la línea bajo el nombre y la lista de integrantes de un grupo, en orden.
 *
 * Todo puro y sin React. Solo usa datos que la app ya tiene: `/me/cells` (el grupo, su mentor y
 * cuántos aprendices son) y `/me/cells/{id}/members` (los aprendices). Nada de secciones sin datos
 * detrás: no hay «archivos compartidos» ni «descripción» porque el backend no los da.
 */
import { cuantosIntegrantes, integrantesDelChatDeGrupo } from './formatoChat';

/** El tipo de conversación, el mismo vocabulario que `ChatConversation['type']`. */
export type TipoDeInfo = 'celula' | 'direct' | 'global' | 'soporte';

/** El título de la barra de arriba, como WhatsApp: «Info. del grupo», «Info. del contacto». */
export function tituloDeLaInfo(tipo: TipoDeInfo): string {
  if (tipo === 'celula') return 'Info. del grupo';
  if (tipo === 'direct') return 'Info. del contacto';
  return 'Info. del chat';
}

/**
 * La línea bajo el nombre grande:
 * - grupo: «Grupo · 5 integrantes» (la misma cifra que la cabecera del chat; «Grupo» a secas si
 *   todavía no se sabe cuántos son: no se inventa);
 * - soporte: «Chat de soporte»;
 * - 1 a 1: el rol del otro («Aprendiz»), el mismo dato con el que la cabecera dice «Aprendiz · 1
 *   a 1»; si no se sabe quién es el otro, el subtítulo que ya traía la conversación;
 * - comunidad: el subtítulo que ya traía («Comunidad completa RENASER»).
 */
export function subtituloDeLaInfo(params: {
  tipo: TipoDeInfo;
  integrantes: number | null;
  rolDelOtro?: string | null;
  subtitulo: string;
}): string {
  switch (params.tipo) {
    case 'celula':
      return params.integrantes === null ? 'Grupo' : `Grupo · ${cuantosIntegrantes(params.integrantes)}`;
    case 'soporte':
      return 'Chat de soporte';
    case 'direct':
      return params.rolDelOtro?.trim() || params.subtitulo;
    default:
      return params.subtitulo;
  }
}

/**
 * Cuántos son en el grupo, para la info: la MISMA cifra que la cabecera del chat
 * (`integrantesDelChatDeGrupo`: aprendices vigentes + el mentor). Solo si el grupo todavía no se
 * resolvió en `/me/cells` se usan las filas ya cargadas, que salen de la misma consulta del
 * backend (`aprendicesVigentesEn`) más el mentor. Sin ninguna de las dos, `null`.
 */
export function cifraDeIntegrantes(
  grupo: { memberCount: number; mentorName: string | null } | null,
  filasCargadas: number
): number | null {
  return integrantesDelChatDeGrupo(grupo) ?? (filasCargadas > 0 ? filasCargadas : null);
}

/** Un aprendiz del grupo tal como llega de `/me/cells/{id}/members` (`CellMember`). */
export type MiembroDelGrupo = {
  traineeId: string;
  fullName: string;
  avatarUrl: string | null;
  isSelf: boolean;
};

/** Los dos papeles que hay en un grupo. Salen de DÓNDE viene cada persona, no de adivinar. */
export type RolEnElGrupo = 'Mentor' | 'Aprendiz';

export type IntegranteDeLaInfo = {
  /** Clave de la fila. El mentor no trae id de usuario (`/me/cells` da solo su nombre y foto). */
  clave: string;
  /** Id de usuario, para abrir su 1 a 1. `null` en el mentor. */
  usuarioId: string | null;
  /** «Tú» para uno mismo, como WhatsApp; el nombre completo para el resto. */
  nombre: string;
  /** El nombre real también para uno mismo: es el que dibuja las iniciales del avatar. */
  nombreCompleto: string;
  avatarUrl: string | null;
  rol: RolEnElGrupo;
  esYo: boolean;
  /**
   * Si tocarlo abre su chat 1 a 1. Es la acción que ya existía en la info (el botón «Chatear»,
   * `abrirDMConIntegrante`) y con los mismos límites: no para uno mismo, ni para el mentor, que no
   * trae id. Quien puede o no escribirle a quién lo sigue decidiendo el servidor.
   */
  abreChat: boolean;
};

/**
 * Las filas de la sección «N integrantes»: el MENTOR primero (con la marca «Mentor»), después uno
 * mismo («Tú») y después el resto de los aprendices por nombre, como ordena WhatsApp. El mentor
 * entra con el mismo criterio con que la cabecera lo cuenta (hay `mentorName`), para que la cifra
 * y la lista digan lo mismo.
 */
export function integrantesDeLaInfo(params: {
  mentor: { nombre: string | null; avatarUrl: string | null } | null;
  miembros: readonly MiembroDelGrupo[];
}): IntegranteDeLaInfo[] {
  const filas: IntegranteDeLaInfo[] = [];
  const mentor = params.mentor;
  if (mentor?.nombre) {
    filas.push({
      clave: 'mentor',
      usuarioId: null,
      nombre: mentor.nombre,
      nombreCompleto: mentor.nombre,
      avatarUrl: mentor.avatarUrl,
      rol: 'Mentor',
      esYo: false,
      abreChat: false,
    });
  }
  const yo = params.miembros.filter(m => m.isSelf);
  const otros = params.miembros
    .filter(m => !m.isSelf)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' }));
  for (const m of [...yo, ...otros]) {
    filas.push({
      clave: m.traineeId,
      usuarioId: m.traineeId,
      nombre: m.isSelf ? 'Tú' : m.fullName,
      nombreCompleto: m.fullName,
      avatarUrl: m.avatarUrl,
      rol: 'Aprendiz',
      esYo: m.isSelf,
      abreChat: !m.isSelf,
    });
  }
  return filas;
}
