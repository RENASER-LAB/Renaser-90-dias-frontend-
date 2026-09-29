import { destinoDeRuta } from '../../mentor/api/avisosApi';

/**
 * Qué hacer con un aviso de mensaje que llega con la app ABIERTA (D-221, 2026-09-29, «como WhatsApp»).
 *
 * El servidor ya no le manda el push a quien tiene esa conversación abierta en vivo (la suscripción
 * por socket al chat), pero entre un aviso en camino y un chat recién abierto hay carrera, y en la web
 * no hay socket. Así que el teléfono decide también, con la conversación que tiene en pantalla:
 *
 * - **No es de chat** → nada cambia: el resto de avisos se muestra como siempre.
 * - **Es del chat abierto** → `silencio`: ni banner ni sonido; el mensaje ya se ve llegar.
 * - **Es de otro chat** → `sonarEnLaApp`: ni banner ni bandeja del sistema, pero un sonido corto
 *   dentro de la app y la lista de chats se relee (orden y contador de no leídos).
 *
 * Pura: no sabe de `expo-notifications` ni de React.
 */
export type DecisionAvisoDeChat = 'noEsDeChat' | 'silencio' | 'sonarEnLaApp';

/** La conversación de un aviso de chat (`data.route` = `/chat/{id}`), o `null` si no es de chat. */
export function conversacionDelAviso(datos: unknown): string | null {
  const ruta = (datos as { route?: unknown } | null | undefined)?.route;
  const destino = destinoDeRuta(ruta);
  return destino?.tipo === 'chat' ? destino.conversacionId : null;
}

export function decidirAvisoDeChat(datos: unknown, conversacionAbierta: string | null): DecisionAvisoDeChat {
  const conversacionId = conversacionDelAviso(datos);
  if (!conversacionId) return 'noEsDeChat';
  return conversacionId === conversacionAbierta ? 'silencio' : 'sonarEnLaApp';
}

/** Lo que devuelve el `setNotificationHandler` para un aviso de chat en primer plano: nada visible. */
export const SIN_PRESENTAR = {
  shouldShowBanner: false,
  shouldShowList: false,
  shouldPlaySound: false,
  shouldSetBadge: false,
} as const;

/**
 * El mensaje que el service worker de la web le manda a la ventana abierta en vez de mostrar el
 * aviso del sistema (`public/renaser-push-sw.js`). Devuelve la ruta o `null`.
 */
export const MENSAJE_DE_CHAT_DEL_SERVICE_WORKER = 'renaser-mensaje-chat';

export function rutaDelMensajeDeChat(datos: unknown): string | null {
  const d = datos as { tipo?: unknown; ruta?: unknown } | null;
  return d && d.tipo === MENSAJE_DE_CHAT_DEL_SERVICE_WORKER && typeof d.ruta === 'string' ? d.ruta : null;
}
