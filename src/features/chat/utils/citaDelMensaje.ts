import type { ChatMessage } from '../../../screens/ComunidadScreen';
import type { CitaDelMensaje, ClaseDeCita, WireMensaje, WireReplyPreview } from '../types/chat.types';
import { nombreDelSticker } from './stickersRenaser';

/**
 * La cita de una respuesta (responder a un mensaje, D-251 del backend, 2026-10-05): qué se dibuja
 * arriba de la burbuja que responde y en la barra «Respondiendo a…» de encima del campo.
 *
 * Todo puro y sin React, como `formatoChat`. Dos fuentes, el mismo resultado:
 *
 * - **Del servidor** ({@link citaDelServidor}): el resumen que manda `MensajeResponse.replyTo` en el
 *   listado y, desde D-251, también en la respuesta de enviar. `replyToDeleted` dice que el citado ya
 *   no está; un backend anterior lo decía con `replyTo.deletedAt`.
 * - **De lo cargado** ({@link citaDeMensajeCargado}): el mensaje que la persona eligió para
 *   responder, que ya está en pantalla. Es lo que dibuja la barra de encima del campo y lo que
 *   completa la burbuja recién enviada cuando el servidor es anterior a D-251 y su respuesta trae
 *   `replyToId` sin el resumen ({@link conCitaCompleta}).
 */

/** Hasta cuántos caracteres del texto citado se muestran: los mismos que corta el servidor. */
export const LARGO_DEL_EXTRACTO = 80;

const AUTOR_PROPIO = 'Tú';
const AUTOR_DESCONOCIDO = 'Miembro Renaser';

/** El rótulo de una nota de voz, con su duración si se sabe: «Nota de voz (0:12)». */
function rotuloDeAudio(duracion: string | undefined): string {
  return duracion ? `Nota de voz (${duracion})` : 'Nota de voz';
}

function duracionDe(segundos: number | null | undefined): string | undefined {
  if (segundos == null || !(segundos > 0)) return undefined;
  const enteros = Math.floor(segundos);
  return `${Math.floor(enteros / 60)}:${(enteros % 60).toString().padStart(2, '0')}`;
}

/**
 * Los primeros {@link LARGO_DEL_EXTRACTO} caracteres, contados como letras y no como unidades de
 * UTF-16: cortar a mitad de un emoji dejaría un carácter roto al final.
 */
export function extracto(texto: string | null | undefined): string {
  const limpio = (texto ?? '').replace(/\s+/g, ' ').trim();
  const letras = Array.from(limpio);
  return letras.length <= LARGO_DEL_EXTRACTO ? limpio : `${letras.slice(0, LARGO_DEL_EXTRACTO).join('')}…`;
}

/** De qué es el citado, con la misma regla que la burbuja para reconocer un sticker. */
function claseDelServidor(preview: WireReplyPreview): ClaseDeCita {
  if (nombreDelSticker({ type: preview.type, mediaMime: preview.mediaMime ?? null, text: preview.text })) {
    return 'sticker';
  }
  switch (preview.type) {
    case 'IMAGE':
      return 'foto';
    case 'AUDIO':
      return 'audio';
    case 'VIDEO':
      return 'video';
    case 'SYSTEM':
      // La tarjeta de bienvenida del programa es una imagen sin texto.
      return !preview.text?.trim() && (preview.mediaMime ?? '').startsWith('image/') ? 'foto' : 'texto';
    default:
      return 'texto';
  }
}

function resumenDe(clase: ClaseDeCita, texto: string | null | undefined, duracion: string | undefined): string {
  const leido = extracto(texto);
  switch (clase) {
    case 'sticker':
      return 'Sticker';
    case 'audio':
      return rotuloDeAudio(duracion);
    case 'foto':
      return leido || 'Foto';
    case 'video':
      return leido || 'Video';
    default:
      return leido || 'Mensaje';
  }
}

/**
 * La cita que manda el servidor, o `undefined` si el mensaje no responde a nada (o si es de un
 * servidor anterior a D-251 y viene solo con `replyToId`: ver {@link conCitaCompleta}).
 */
export function citaDelServidor(
  wire: Pick<WireMensaje, 'replyTo' | 'replyToDeleted'>,
): CitaDelMensaje | undefined {
  if (wire.replyToDeleted === true) return { estado: 'eliminada' };
  const preview = wire.replyTo;
  if (!preview) return undefined;
  if (preview.deletedAt) return { estado: 'eliminada' };
  const esMia = preview.mine === true;
  const clase = claseDelServidor(preview);
  return {
    estado: 'visible',
    id: preview.id,
    autor: esMia ? AUTOR_PROPIO : preview.senderName?.trim() || AUTOR_DESCONOCIDO,
    esMia,
    clase,
    resumen: resumenDe(clase, preview.text, duracionDe(preview.mediaDurationSeconds)),
    miniatura: clase === 'foto' || clase === 'sticker' ? preview.mediaUrl ?? undefined : undefined,
  };
}

function claseDelCargado(mensaje: ChatMessage): ClaseDeCita {
  if (mensaje.esSticker) return 'sticker';
  switch (mensaje.type) {
    case 'image_grid':
      return 'foto';
    case 'audio':
      return 'audio';
    case 'video':
      return 'video';
    default:
      return 'texto';
  }
}

/** La cita de un mensaje que ya está en pantalla: el que la persona eligió para responder. */
export function citaDeMensajeCargado(mensaje: ChatMessage): Extract<CitaDelMensaje, { estado: 'visible' }> {
  const esMia = mensaje.isMe && !mensaje.esDelPrograma;
  const clase = claseDelCargado(mensaje);
  return {
    estado: 'visible',
    id: mensaje.id,
    autor: esMia ? AUTOR_PROPIO : mensaje.sender?.trim() || AUTOR_DESCONOCIDO,
    esMia,
    clase,
    resumen: resumenDe(clase, mensaje.text, mensaje.audioDuration),
    miniatura: clase === 'foto' || clase === 'sticker' ? mensaje.mediaUrl : undefined,
  };
}

/**
 * La burbuja recién enviada con su cita. Si el servidor ya mandó el resumen (D-251), queda el suyo;
 * si es anterior y solo devolvió `replyToId`, se arma con el mensaje citado que ya está cargado. Si
 * tampoco está cargado, se deja sin cita: no hay de dónde decir qué se citó.
 */
export function conCitaCompleta(
  mensaje: ChatMessage,
  replyToId: string | null | undefined,
  cargados: readonly ChatMessage[],
): ChatMessage {
  if (mensaje.cita || !replyToId) return mensaje;
  const citado = cargados.find(m => m.id === replyToId);
  return citado ? { ...mensaje, cita: citaDeMensajeCargado(citado) } : mensaje;
}

/**
 * Lo que «Copiar» lleva al portapapeles: el texto del mensaje tal cual. Una foto con pie copia el
 * pie; un sticker, una nota de voz o una foto sola no tienen texto que copiar (`null`).
 */
export function textoParaCopiar(mensaje: ChatMessage): string | null {
  if (mensaje.esSticker) return null;
  /* Solo texto y el pie de una foto que se ve: en los demás casos `text` puede traer un rótulo que
     armó el mapeador («Nota de voz», «▶ Video adjunto», «Imagen adjunta» de una foto sin URL), y
     copiar eso sería copiar algo que nadie escribió. */
  const conTextoPropio = mensaje.type === 'text' || (mensaje.type === 'image_grid' && !!mensaje.mediaUrl);
  if (!conTextoPropio || !mensaje.text?.trim()) return null;
  return mensaje.text;
}
