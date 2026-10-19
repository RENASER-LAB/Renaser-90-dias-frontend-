import { avisar } from '../../admin/utils/dialogo';
import { abrirConversacionDirecta, enviarMensajeTexto } from '../../chat/api/chatApi';
import { irAPestana } from '../../../navigation/navegacionRef';
import { mensajeDeError } from '../../../services/http/apiClient';

/**
 * «Escribirle»: abre (o recupera) el chat directo con una persona y lleva a Comunidad. **No manda nada**:
 * el mensaje lo escribe el líder (SDD 002, RL-14; spec 005, FR-015). Mismo camino que «Escribirle» del
 * administrador y del mentor.
 *
 * Quién puede escribirle a quién lo decide el servidor (cuentas activas): si no abre el chat, se dice con su
 * respuesta y no se queda quieto el toque.
 */
export async function escribirleA(personaId: string, nombre: string): Promise<void> {
  try {
    const conversacion = await abrirConversacionDirecta(personaId);
    if (!irAPestana('Comunidad', { abrirChatConversacionId: conversacion.id })) {
      avisar('Conversación lista', `Tu chat con ${nombre} está en Comunidad. No se envió ningún mensaje.`);
    }
  } catch (e) {
    avisar('No se pudo abrir el chat', mensajeDeError(e, 'Revisa tu conexión e inténtalo de nuevo.'));
  }
}

/** El mismo camino, con el nombre que ya usaba la ficha del mentor. */
export const escribirleAlMentor = escribirleA;

/**
 * Manda por el chat directo EXACTAMENTE el texto que se le pasa: el que el líder escribió y confirmó (RL-14,
 * RL-16) o, si la observación es sobre una persona, ese mismo texto con su nombre y la semana al principio
 * (`textoParaElChat`). Devuelve el id del mensaje, o null si no se pudo: la observación se guarda igual.
 */
export async function enviarPorChat(mentorId: string, texto: string): Promise<string | null> {
  try {
    const conversacion = await abrirConversacionDirecta(mentorId);
    const mensaje = await enviarMensajeTexto(conversacion.id, texto);
    return mensaje.id;
  } catch {
    return null;
  }
}
