import type { WireMensaje } from '../types/chat.types';

// Un IMAGE con un texto legible mantiene compatibilidad con versiones anteriores de la app.
// Solo nuestra combinación explícita de tipo, MIME y prefijo se muestra como sticker.
const PREFIJO = 'Sticker Renaser: ';

export function textoDeSticker(nombre: string): string {
  return `${PREFIJO}${nombre}`;
}

export function nombreDelSticker(mensaje: Pick<WireMensaje, 'type' | 'mediaMime' | 'text'>): string | null {
  if (mensaje.type !== 'IMAGE' || mensaje.mediaMime !== 'image/webp' || !mensaje.text?.startsWith(PREFIJO)) {
    return null;
  }
  return mensaje.text.slice(PREFIJO.length).trim() || null;
}
