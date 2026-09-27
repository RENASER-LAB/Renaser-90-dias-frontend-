/**
 * Cuándo la conversación de Comunidad se toma la pantalla entera, como en WhatsApp (2026-09-26):
 * sin la cabecera «COMUNIDAD», sin la fila de secciones y sin la barra de pestañas de abajo. Queda
 * solo la cabecera del chat, los mensajes y la barra de escribir.
 *
 * Vale también para la info del grupo abierta DESDE la conversación (es un nivel más adentro de
 * ella, y el «atrás» vuelve al chat). La info que se abre desde la tarjeta de Tribu, sin
 * conversación, no es una conversación: ahí la pantalla sigue como siempre.
 *
 * Al cerrarla —con la flecha de la cabecera o con el «atrás» de Android— `activeChat` vuelve a
 * `null` y todo reaparece: la barra de pestañas se restaura desde el mismo efecto que la escondió.
 */
export function conversacionAPantallaCompleta(params: {
  enTribu: boolean;
  hayConversacionAbierta: boolean;
}): boolean {
  return params.enTribu && params.hayConversacionAbierta;
}
