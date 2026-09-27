/**
 * El refresco de la lista de chats (2026-09-27, «tipo WhatsApp»).
 *
 * Hasta acá `GET /api/v1/chat/conversations` se pedía una vez, al abrir Tribu por primera vez: el
 * orden por último mensaje y los no leídos quedaban como estaban en ese momento, aunque llegaran
 * mensajes nuevos a otras conversaciones. Ahora la lista se relee al volver de una conversación,
 * al volver a la pestaña o a Tribu, y deslizando hacia abajo (`useChatConversaciones.recargar`).
 *
 * No hay refresco en vivo de la lista: el backend solo publica por conversación
 * (`/topic/conversaciones/{id}`) y no tiene un destino STOMP por persona para avisar «te llegó un
 * mensaje en otro chat». No se inventa del lado del cliente.
 */
import type { ChatConversation } from '../../../screens/ComunidadScreen';
import { refinarTituloConMensajes } from '../api/chatMappers';

/**
 * Si cambiar de conversación abierta pide releer la lista: cerrar una (volver a la lista). Pasar
 * directo de una a otra no, porque la lista no está a la vista.
 */
export function pideReleerAlCerrarElChat(anterior: string | null, actual: string | null): boolean {
  return anterior !== null && actual === null;
}

/**
 * D-212: la foto propia de un grupo cambia sin que cambie la conversación. Al releer la lista llega otro
 * `fotoPath` (otro `?v=`), y la conversación abierta —su cabecera y su info— toma el de la lista, sin
 * tocar lo demás (el historial, lo que se está escribiendo). Devuelve la MISMA si no cambió, para que
 * React no vuelva a dibujar.
 */
export function conLaFotoDeLaLista(abierta: ChatConversation, lista: readonly ChatConversation[]): ChatConversation {
  const enLaLista = lista.find(conversacion => conversacion.id === abierta.id);
  if (!enLaLista || (enLaLista.fotoPath ?? null) === (abierta.fotoPath ?? null)) return abierta;
  return { ...abierta, fotoPath: enLaLista.fotoPath ?? null };
}

/**
 * Lo que trae el servidor, sin perder lo que el teléfono ya sabía de cada conversación.
 *
 * Del servidor sale todo lo de la fila —vista previa, hora, fecha con la que se ordena, no leídos—
 * y qué conversaciones hay (una que ya no viene, se va). De lo que había se conserva el historial
 * ya cargado, para que volver a abrir un chat muestre sus mensajes al toque mientras se relee
 * (sin esto, cada refresco los borraba y reabrir decía «Cargando mensajes...»), y con él el nombre
 * de un 1 a 1 que solo se supo al abrirlo (`refinarTituloConMensajes`).
 *
 * No modifica ninguna de las dos listas.
 */
export function fusionarConLoQueHabia(
  previas: readonly ChatConversation[],
  nuevas: readonly ChatConversation[]
): ChatConversation[] {
  const porId = new Map(previas.map(conversacion => [conversacion.id, conversacion]));
  return nuevas.map(nueva => {
    const previa = porId.get(nueva.id);
    if (!previa || previa.messages.length === 0 || nueva.messages.length > 0) return nueva;
    return refinarTituloConMensajes({ ...nueva, messages: previa.messages }, previa.messages);
  });
}
