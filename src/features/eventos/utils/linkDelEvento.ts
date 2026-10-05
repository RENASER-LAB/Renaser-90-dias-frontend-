import type { MarcaConLogo } from '../../../components/LogoDeMarca';
import type { Evento, TipoUbicacion } from '../types/eventos.types';

/**
 * El link de un evento (Meet, Zoom, Drive…) y el botón «Unirme».
 *
 * Decisión del dueño (26/09): la vinculación es liviana — quien crea el evento **pega el link** y el
 * alumno ve un botón grande «Unirme» que lo abre. Sin OAuth, sin crear reuniones solas.
 *
 * El backend guarda `locationValue` como texto libre y **no valida que sea una URL** (confirmado con
 * el backend, D-186). Por eso la app solo ofrece «Unirme» si el texto es un `https://` bien formado:
 * abrir con `Linking` cualquier cosa que alguien escribió (un `javascript:`, un `intent:`) no es
 * algo que se haga por un botón que dice «Unirme».
 */

/** `https://…` con un dominio de verdad. Nada de `http`, `javascript:`, `intent:` ni espacios. */
export function esLinkSeguro(texto: string | null | undefined): texto is string {
  if (!texto) return false;
  const limpio = texto.trim();
  if (!/^https:\/\/[^\s/?#]+\.[^\s/?#]+([/?#]\S*)?$/i.test(limpio)) return false;
  return !/\s/.test(limpio);
}

/** El link al que lleva «Unirme», o `null` si el evento no tiene uno que se pueda abrir. */
export function linkParaUnirme(evento: Pick<Evento, 'tipoUbicacion' | 'valorUbicacion'>): string | null {
  // Una dirección física no se «une»: se muestra como texto.
  if (evento.tipoUbicacion === 'ADDRESS') return null;
  return esLinkSeguro(evento.valorUbicacion) ? evento.valorUbicacion.trim() : null;
}

/** Qué tipo de ubicación mandar al backend según el link que se pegó. Drive y el resto → `LINK`. */
export function tipoDeUbicacionDelLink(link: string): Extract<TipoUbicacion, 'MEET' | 'ZOOM' | 'LINK'> {
  const host = (/^https:\/\/([^/?#]+)/i.exec(link.trim())?.[1] ?? '').toLowerCase();
  if (host === 'meet.google.com') return 'MEET';
  if (host === 'zoom.us' || host.endsWith('.zoom.us')) return 'ZOOM';
  return 'LINK';
}

/** Cómo se nombra el link en pantalla, en palabras simples. */
export function nombreDelLink(link: string): string {
  const tipo = tipoDeUbicacionDelLink(link);
  if (tipo === 'MEET') return 'Google Meet';
  if (tipo === 'ZOOM') return 'Zoom';
  if (esDeDrive(link)) return 'Google Drive';
  return 'Enlace';
}

/**
 * El logo que va junto a ese nombre (`LogoDeMarca`, 2026-10-05), o `null` si es un «Enlace» sin
 * marca. Sale de la misma lectura del dominio que `nombreDelLink`: el logo y el texto no pueden
 * decir dos servicios distintos.
 */
export function marcaDelLink(link: string): MarcaConLogo | null {
  const tipo = tipoDeUbicacionDelLink(link);
  if (tipo === 'MEET') return 'googleMeet';
  if (tipo === 'ZOOM') return 'zoom';
  return esDeDrive(link) ? 'googleDrive' : null;
}

function esDeDrive(link: string): boolean {
  const host = (/^https:\/\/([^/?#]+)/i.exec(link.trim())?.[1] ?? '').toLowerCase();
  return host === 'drive.google.com' || host === 'docs.google.com';
}
