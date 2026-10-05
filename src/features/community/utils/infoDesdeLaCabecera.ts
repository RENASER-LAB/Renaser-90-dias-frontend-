import type { CelulaDelAprendiz } from '../types/community.types';

/**
 * La ⓘ de la cabecera de Comunidad abre la info de TU grupo (28/09, pedido del dueño: «que abra la
 * info del grupo»; corrige E-409, que la había quitado porque no hacía nada).
 *
 * **Qué grupo.** El mismo que muestra la tarjeta de Tribu: el que la persona eligió ahí, si tiene
 * varios, o el primero de `/me/cells`. El servidor pone primero el principal del aprendiz y, para un
 * mentor que acompaña varios, los ordena por nombre: se abre el primero, sin preguntar.
 *
 * **Qué pantalla.** La misma info del grupo que se abre desde el chat (CHT-12, D-206/D-207), no una
 * copia: se abre el chat de ese grupo y, encima, su info. «Atrás» vuelve al chat.
 *
 * Sin grupo (o un admin que no acompaña ninguno) no hay ⓘ: un ícono sin acción es E-409.
 */
export function grupoDeLaCabecera(
  grupos: readonly CelulaDelAprendiz[],
  elegidoId: string | null
): CelulaDelAprendiz | null {
  return grupos.find(g => g.cellId === elegidoId) ?? grupos[0] ?? null;
}

/** El chat de ese grupo en la bandeja, si ya llegó. */
export function conversacionDelGrupo<T extends { type: string; celulaId: string | null }>(
  conversaciones: readonly T[],
  grupoId: string
): T | null {
  return conversaciones.find(c => c.type === 'celula' && c.celulaId === grupoId) ?? null;
}

/**
 * Lo que recibe `ScreenHeader`: con grupo, el botón y su acción; sin grupo, nada.
 *
 * > **Corregido 2026-10-05.** Era una ⓘ (`info`), que se lee «ayuda», no «tu grupo». Ahora es el
 * > ícono de personas (`users`), con su nombre para el lector de pantalla.
 */
export function botonDeInfoDelGrupo(
  grupo: CelulaDelAprendiz | null,
  abrir: (grupoId: string) => void
): { right?: 'users'; onPressRight?: () => void; etiquetaRight?: string } {
  if (!grupo) return {};
  return { right: 'users', onPressRight: () => abrir(grupo.cellId), etiquetaRight: `Ver la información de ${grupo.cellName}` };
}
