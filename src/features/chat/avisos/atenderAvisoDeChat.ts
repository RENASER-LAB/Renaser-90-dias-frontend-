import { conversacionAbierta } from './conversacionAbierta';
import { conversacionDelAviso, decidirAvisoDeChat, type DecisionAvisoDeChat } from './avisoDeChat';
import { avisarMensajeDeOtroChat } from './mensajesEnVivo';
import { sonarMensajeEnLaApp } from './sonidoDeMensaje';

/**
 * Lo que hace la app con un aviso de chat que llega estando abierta (teléfono: `setNotificationHandler`;
 * web: el mensaje del service worker). Devuelve la decisión para que el llamador sepa si el aviso era
 * de chat y, entonces, no mostrarlo.
 */
export function atenderAvisoDeChatEnPrimerPlano(datos: unknown): DecisionAvisoDeChat {
  const decision = decidirAvisoDeChat(datos, conversacionAbierta());
  if (decision === 'sonarEnLaApp') {
    sonarMensajeEnLaApp();
    const conversacionId = conversacionDelAviso(datos);
    if (conversacionId) avisarMensajeDeOtroChat(conversacionId);
  }
  return decision;
}
