import { avisar } from '../../admin/utils/dialogo';
import { abrirConversacionDirecta, enviarMensajeTexto } from '../../chat/api/chatApi';
import { irAPestana } from '../../../navigation/navegacionRef';

/**
 * «Escribirle»: abre (o recupera) el chat directo con el mentor y lleva a Comunidad. **No manda nada**:
 * el mensaje lo escribe el líder (SDD 002, RL-14). Mismo camino que «Escribirle» del administrador.
 */
export async function escribirleAlMentor(mentorId: string, nombre: string): Promise<void> {
  try {
    const conversacion = await abrirConversacionDirecta(mentorId);
    if (!irAPestana('Comunidad', { abrirChatConversacionId: conversacion.id })) {
      avisar('Conversación lista', `Tu chat con ${nombre} está en Comunidad. No se envió ningún mensaje.`);
    }
  } catch {
    avisar('No se pudo abrir el chat', 'Revisa tu conexión e inténtalo de nuevo.');
  }
}

/**
 * Manda por el chat directo EXACTAMENTE el texto que el líder escribió y confirmó (RL-14, RL-16).
 * Devuelve el id del mensaje, o null si no se pudo: la observación se guarda igual.
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
