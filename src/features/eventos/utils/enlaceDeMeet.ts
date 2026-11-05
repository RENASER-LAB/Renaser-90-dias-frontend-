import type { Evento, ResumenDeMeet } from '../types/eventos.types';
import type { MotivoSinMeet } from '../api/meetApi';

/**
 * Los textos y las reglas del enlace de Meet automático (spec 040, D-321), sin React: el formulario, el detalle del evento y las pruebas leen de acá.
 *
 * Palabras simples, tuteo de Perú y lo mínimo de texto (el dueño pidió «sin mucha entrada»). Los textos de FALLO que ve
 * ADMIN en el detalle los escribe el servidor (`ResumenDeMeet.mensaje`); la app solo los muestra, junto a «Reintentar».
 */

/**
 * Dónde es el evento (decisión del dueño del 2026-11-05: «el Meet se crea solo y los demás entran sin tanto ajetreo; mucha configuración
 * arruina la experiencia»). Lo que viene marcado es Meet, que se crea solo y siempre con la sala ABIERTA: no hay nada que elegir sobre quién
 * entra. «En un lugar» pide la dirección; pegar otro enlace es una salida secundaria y discreta.
 */
export const ROTULO_DONDE = 'Dónde es';
export const OPCION_MEET = 'Por Meet (se crea solo)';
export const OPCION_LUGAR = 'En un lugar';
export const ETIQUETA_OTRO_ENLACE = 'Pegar otro enlace';

/** En un evento que se repite: cada fecha tiene su propia sala (decisión 4 del dueño). */
export const LINEA_CADA_FECHA = 'Cada fecha tendrá su propio enlace.';

export const ETIQUETA_REINTENTAR = 'Reintentar';

/** Por qué no se ofrece «Crear enlace de Meet» a quien sí crea eventos (se muestra solo si ya tenía el enlace automático y dejó de poder). */
export function motivoSinMeet(motivo: MotivoSinMeet | null): string {
  switch (motivo) {
    case 'SIN_CUENTA':
      return 'Conecta la cuenta de Google en Más opciones para crear enlaces de Meet.';
    case 'CUENTA_REVOCADA':
      return 'Hay que volver a conectar la cuenta de Google para crear enlaces de Meet.';
    default:
      return '';
  }
}

/** ¿El evento tiene el enlace automático? Solo lo sabe quien administra (el servidor manda `meet` solo a ADMIN y ALCHEMIST). */
export function usaEnlaceAutomatico(evento: Pick<Evento, 'meet'>): boolean {
  return !!evento.meet;
}

/**
 * Lo que se le dice a ADMIN en el detalle cuando algo de la sala quedó sin terminar, o `null` si no hay nada que decir. Es la frase del
 * servidor tal cual; un evento sin enlace automático o con todo en orden no dice nada.
 */
export function lineaDeLaSala(meet: ResumenDeMeet | null | undefined): string | null {
  return meet?.mensaje ? meet.mensaje : null;
}

/** «Reintentar» solo cuando hay algo sin terminar (el servidor dice qué en `mensaje`). */
export function sePuedeReintentar(meet: ResumenDeMeet | null | undefined): boolean {
  return lineaDeLaSala(meet) !== null;
}

/**
 * La línea de «cada fecha tiene su enlace»: solo para un evento que se repite con el enlace automático. Hoy el formulario de la app no
 * edita eventos que se repiten (`sePuedeEditarEnLaApp`), así que se dice en el detalle de la serie.
 */
export function lineaDeLaSerie(evento: Pick<Evento, 'recurrente' | 'meet'>): string | null {
  return evento.recurrente && usaEnlaceAutomatico(evento) ? LINEA_CADA_FECHA : null;
}
