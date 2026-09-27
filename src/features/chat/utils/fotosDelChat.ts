/**
 * Qué foto lleva cada cosa del chat (decisiones del dueño del 2026-09-27). Puro y sin React: lo dibujan
 * `AvatarDeChat` (una conversación) y `AvatarDeIntegrante` (una persona de la info del grupo).
 */
import type { TipoDeInfo } from './infoDelChat';

/** La foto de una conversación. */
export type FotoDeConversacion = 'persona' | 'tarjeta-con-nombre' | 'tarjeta-sin-nombre' | 'fenix';

/**
 * - **1 a 1:** la persona (su foto o sus iniciales).
 * - **Soporte:** SU tarjeta con el primer nombre de su aprendiz (D-205), si el servidor manda la ruta;
 *   si no, la tarjeta sin nombre.
 * - **Grupo:** la tarjeta sin nombre (8971acf).
 * - **Comunidad (`global`):** el fénix, como antes de 8971acf (D-206: «solo afecta esos 2 primeros»,
 *   el grupo y el soporte).
 */
export function fotoDeLaConversacion(tipo: TipoDeInfo, fotoPath?: string | null): FotoDeConversacion {
  switch (tipo) {
    case 'direct':
      return 'persona';
    case 'global':
      return 'fenix';
    case 'soporte':
      return fotoPath?.trim() ? 'tarjeta-con-nombre' : 'tarjeta-sin-nombre';
    default:
      return 'tarjeta-sin-nombre';
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
