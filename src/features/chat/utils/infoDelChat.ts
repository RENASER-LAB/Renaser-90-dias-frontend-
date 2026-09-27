/**
 * Lo que dice la info de una conversación, al estilo de WhatsApp (pedido del dueño, 2026-09-27):
 * el título de la barra, la línea bajo el nombre y la lista de integrantes de un grupo, en orden.
 *
 * Todo puro y sin React. Solo usa datos que la app ya tiene: `/me/cells` (el grupo, su mentor —con
 * su id y la ruta de su tarjeta desde D-206— y cuántos aprendices son) y `/me/cells/{id}/members` (los
 * aprendices, cada uno con la ruta de su tarjeta). Nada de secciones sin datos detrás: no hay
 * «archivos compartidos» ni «descripción» porque el backend no los da.
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
 *   a 1»; si no se sabe su rol (o quién es), el subtítulo genérico que ya traía la conversación
 *   («1 a 1», «Conversación directa»): nunca un rol supuesto;
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
  /** D-206: la ruta de su tarjeta con nombre. Ausente si el servidor no la manda. */
  photoPath?: string | null;
};

/** El mentor del grupo tal como llega de `/me/cells` (`CelulaDelAprendiz`). */
export type MentorDelGrupo = {
  /** D-206: su id de usuario. Ausente en un backend anterior: entonces no se sabe si es uno mismo. */
  id?: string | null;
  nombre: string | null;
  avatarUrl: string | null;
  /** D-206: la ruta de su tarjeta con nombre. */
  fotoPath?: string | null;
};

/** Los dos papeles que hay en un grupo. Salen de DÓNDE viene cada persona, no de adivinar. */
export type RolEnElGrupo = 'Mentor' | 'Aprendiz';

export type IntegranteDeLaInfo = {
  /** Clave de la fila: `'mentor'` o el id del aprendiz. */
  clave: string;
  /**
   * Id de usuario, para abrir su 1 a 1. En el mentor, el `mentorId` de `/me/cells` (D-206); `null` si
   * el servidor no lo manda.
   *
   * > **Corregido 2026-09-27 (D-206).** Decía «`null` en el mentor»: `/me/cells` no traía su id.
   */
  usuarioId: string | null;
  /** «Tú» para uno mismo, como WhatsApp —también si uno mismo es el mentor—; el nombre completo para el resto. */
  nombre: string;
  /** El nombre real también para uno mismo: es el que dibuja las iniciales del avatar. */
  nombreCompleto: string;
  avatarUrl: string | null;
  /**
   * D-206: la ruta de su tarjeta con nombre. Con ella la info muestra la tarjeta e ignora `avatarUrl`
   * (`fotosDelChat.fotoDelIntegrante`); sin ella, la foto subida o las iniciales.
   */
  fotoPath: string | null;
  rol: RolEnElGrupo;
  esYo: boolean;
  /**
   * Si tocarlo abre su chat 1 a 1. Es la acción que ya existía en la info (el botón «Chatear»,
   * `abrirDMConIntegrante`): para cualquiera menos uno mismo, el mentor incluido cuando se sabe su id
   * (D-207, decisión del dueño: «Sí, agregarlo»; si el chat de dos de D-173 ya existe, el servidor
   * devuelve ese). Quien puede o no escribirle a quién lo sigue decidiendo el servidor (cuentas
   * activas, G-4).
   *
   * > **Corregido 2026-09-27 (D-207).** Decía «no para uno mismo, ni para el mentor, que no trae id»:
   * > `/me/cells` no traía su id y el dueño todavía no había decidido si se le podía escribir desde acá.
   */
  abreChat: boolean;
  /**
   * D-207: si la fila lleva el botón «Ver ficha», que abre la misma ficha que «Mi grupo». Solo en los
   * aprendices, y solo cuando quien mira es el mentor de ESTE grupo (su id de sesión es el del
   * mentor): es a quien el servidor le sirve la ficha (acompañante vigente del grupo) y quien ve esta
   * lista, junto con los aprendices. No se inventa un permiso por rol.
   */
  abreFicha: boolean;
};

/**
 * Las filas de la sección «N integrantes»: el MENTOR primero (con la marca «Mentor»), después uno
 * mismo («Tú») y después el resto de los aprendices por nombre, como ordena WhatsApp. El mentor
 * entra con el mismo criterio con que la cabecera lo cuenta (hay `mentorName`), para que la cifra
 * y la lista digan lo mismo.
 */
export function integrantesDeLaInfo(params: {
  mentor: MentorDelGrupo | null;
  miembros: readonly MiembroDelGrupo[];
  /**
   * El id de la sesión. Si es el del mentor, su fila dice «Tú» (D-206: el mentor que miraba su propio
   * grupo se veía como «Ricardo Palomino») y cada aprendiz lleva «Ver ficha» (D-207). Para los
   * aprendices no hace falta: traen `isSelf`.
   */
  yoId?: string | null;
}): IntegranteDeLaInfo[] {
  const delMentor = filaDelMentor(params.mentor, params.yoId);
  const filas: IntegranteDeLaInfo[] = delMentor ? [delMentor] : [];
  const yoSoyElMentor = delMentor?.esYo === true;
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
      fotoPath: m.photoPath?.trim() || null,
      rol: 'Aprendiz',
      esYo: m.isSelf,
      abreChat: !m.isSelf,
      abreFicha: yoSoyElMentor && !m.isSelf,
    });
  }
  return filas;
}

/**
 * D-212: si la info del grupo le muestra a quien mira el control para cambiar la foto del grupo. El dueño
 * decidió que la cambian «Admin y el mentor de ese grupo», y el Alquimista: el ADMIN y el ALCHEMIST (de
 * cualquier grupo) y el mentor cuyo id es el `mentorId` del grupo. Es lo mismo que exige el servidor, que
 * tiene la última palabra; sin `mentorId` no se adivina quién es el mentor.
 *
 * > **Corregido 2026-09-27.** Solo el ADMIN: en la página de decisiones el dueño sumó al Alquimista («sí»).
 */
export function puedeCambiarLaFotoDelGrupo(params: {
  mentorId?: string | null;
  yoId?: string | null;
  miRol?: string | null;
}): boolean {
  if (esAdministracionDeGrupos(params.miRol)) return true;
  const mentorId = params.mentorId?.trim();
  return !!mentorId && mentorId === params.yoId;
}

/**
 * El mentor, si el grupo lo tiene (hay `mentorName`). Con su id (D-206) se sabe si es uno mismo —su
 * fila dice «Tú»— y se le puede escribir (D-207); sin id no se adivina ninguna de las dos cosas.
 */
function filaDelMentor(mentor: MentorDelGrupo | null, yoId: string | null | undefined): IntegranteDeLaInfo | null {
  if (!mentor?.nombre) return null;
  const mentorId = mentor.id?.trim() || null;
  const esYo = mentorId !== null && mentorId === yoId;
  return {
    clave: 'mentor',
    usuarioId: mentorId,
    nombre: esYo ? 'Tú' : mentor.nombre,
    nombreCompleto: mentor.nombre,
    avatarUrl: mentor.avatarUrl,
    fotoPath: mentor.fotoPath?.trim() || null,
    rol: 'Mentor',
    esYo,
    abreChat: mentorId !== null && !esYo,
    abreFicha: false,
  };
}

/** ADMIN y ALCHEMIST: los que administran los grupos (en el servidor, `UserRole.canManageRoles`). */
export function esAdministracionDeGrupos(rol: string | null | undefined): boolean {
  const normalizado = rol?.toUpperCase();
  return normalizado === 'ADMIN' || normalizado === 'ALCHEMIST';
}
