import { claveDeLaConversacion, claveDeLaSeccionDeComunidad } from './clavesDeLaApp';

/**
 * Qué se esconde cuando algo no le corresponde a esta sesión (fase 2 de la spec 002, decisión P1 del dueño). Funciones
 * puras: las usan Comunidad y la lista de chats, y se prueban sin montar pantallas.
 */

type EsDisponible = (clave: string | null | undefined) => boolean;

/**
 * Las secciones de Comunidad que se dibujan en la fila de medallones, en su orden. Una sección sin interruptor
 * (Testimonios) acompaña a las demás, pero no sostiene la pestaña sola: si todas las que tienen interruptor quedaron
 * fuera, la lista sale vacía y la pestaña muestra el texto neutro.
 */
export function seccionesDisponibles<S extends { id: string }>(secciones: readonly S[], esDisponible: EsDisponible): S[] {
  const conInterruptor = secciones.filter(s => claveDeLaSeccionDeComunidad(s.id) !== null);
  if (conInterruptor.length > 0 && conInterruptor.every(s => !esDisponible(claveDeLaSeccionDeComunidad(s.id)))) return [];
  return secciones.filter(s => esDisponible(claveDeLaSeccionDeComunidad(s.id)));
}

/**
 * La sección que se muestra: la elegida si sigue a la vista; si se escondió, la primera que quede. Sin ninguna, la
 * elegida (la pestaña entera muestra el texto neutro y no la dibuja).
 */
export function seccionQueSeMuestra<T extends string>(elegida: T, visibles: readonly { id: T }[]): T {
  if (visibles.length === 0 || visibles.some(s => s.id === elegida)) return elegida;
  return visibles[0].id;
}

/** Las conversaciones que se listan: cada una según su tipo (`chat.grupos`, `chat.global`, `chat.soporte`…). */
export function conversacionesDisponibles<C extends { type?: string | null }>(conversaciones: readonly C[], esDisponible: EsDisponible): C[] {
  return conversaciones.filter(conv => esDisponible(claveDeLaConversacion(conv.type)));
}
