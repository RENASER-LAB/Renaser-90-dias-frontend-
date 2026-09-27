/**
 * Qué foto lleva cada cosa del chat (decisiones del dueño del 2026-09-27). Puro y sin React: lo dibujan
 * `AvatarDeChat` (una conversación) y `AvatarDeIntegrante` (una persona de la info del grupo).
 */
import type { TipoDeInfo } from './infoDelChat';

/**
 * La foto de una conversación. `foto-del-servidor` es la que el backend sirve con la sesión por la ruta
 * que manda (`fotoPath`): en un soporte, la tarjeta con el nombre de su aprendiz; en un grupo, su foto
 * propia. Debajo, mientras carga o si falla, va la tarjeta sin nombre.
 */
export type FotoDeConversacion = 'persona' | 'foto-del-servidor' | 'tarjeta-sin-nombre' | 'fenix';

/**
 * - **1 a 1:** la persona (su foto o sus iniciales).
 * - **Soporte:** SU tarjeta con el primer nombre de su aprendiz (D-205), si el servidor manda la ruta;
 *   si no, la tarjeta sin nombre.
 * - **Grupo:** su foto propia si tiene (D-212: la eligen el administrador o su mentor, y el servidor
 *   manda la ruta con `?v=`); si no, la tarjeta sin nombre (8971acf).
 * - **Comunidad (`global`):** el fénix, como antes de 8971acf (D-206: «solo afecta esos 2 primeros»,
 *   el grupo y el soporte).
 *
 * > **Corregido 2026-09-27 (D-212).** El grupo era siempre la tarjeta sin nombre, y el valor para la
 * > foto que sirve el backend se llamaba `tarjeta-con-nombre` (solo existía la del soporte).
 */
export function fotoDeLaConversacion(tipo: TipoDeInfo, fotoPath?: string | null): FotoDeConversacion {
  switch (tipo) {
    case 'direct':
      return 'persona';
    case 'global':
      return 'fenix';
    default:
      return fotoPath?.trim() ? 'foto-del-servidor' : 'tarjeta-sin-nombre';
  }
}

/** La foto de una persona en la lista de integrantes de la info de un grupo (D-206). */
export type FotoDeIntegrante = 'tarjeta-con-nombre' | 'foto-subida' | 'iniciales';

/**
 * Una sola regla para los dos modos del servidor (`CHAT_FOTO_DE_INTEGRANTES`): si llega la ruta de su
 * tarjeta, la tarjeta, y la foto subida se ignora; si no llega, su foto subida; si tampoco hay, las
 * iniciales. Con el modo `TARJETA` (el default, decisión del dueño) el servidor manda la ruta de todos;
 * con `FOTO_SUBIDA`, solo la de quien no subió foto. Cambiar de modo no pide una app nueva.
 *
 * Mientras la tarjeta carga o si falla, `AvatarDeIntegrante` muestra las iniciales, nunca la foto
 * subida: en el modo `TARJETA` esa foto no se muestra.
 */
export function fotoDelIntegrante(persona: { fotoPath?: string | null; avatarUrl?: string | null }): FotoDeIntegrante {
  if (persona.fotoPath?.trim()) return 'tarjeta-con-nombre';
  if (persona.avatarUrl?.trim()) return 'foto-subida';
  return 'iniciales';
}
