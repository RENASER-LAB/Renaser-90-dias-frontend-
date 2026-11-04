import type { AccesoDeLaSala, Evento, ResumenDeMeet } from '../types/eventos.types';
import type { MotivoSinMeet } from '../api/meetApi';

/**
 * Los textos y las reglas del enlace de Meet automático (spec 040, D-321), sin React: el formulario, el detalle del evento y las pruebas leen de acá.
 *
 * Palabras simples, tuteo de Perú y una sola frase por opción (poco texto: el dueño pidió «sin mucha entrada»). Los textos de FALLO que ve
 * ADMIN en el detalle los escribe el servidor (`ResumenDeMeet.mensaje`); la app solo los muestra, junto a «Reintentar».
 */

export const ETIQUETA_CREAR_ENLACE = 'Crear enlace de Meet';
export const AYUDA_CREAR_ENLACE = 'Renaser lo crea al guardar el evento.';

export const ROTULO_ACCESO = 'Quién puede entrar';

/** Las dos opciones, en el orden en que se ofrecen: «Abierta» es la que viene marcada. */
export const ACCESOS_DE_LA_SALA: ReadonlyArray<{ clave: AccesoDeLaSala; nombre: string; ayuda: string }> = [
  { clave: 'ABIERTA', nombre: 'Abierta', ayuda: 'Se entra directo, sin esperar.' },
  { clave: 'CON_PERMISO', nombre: 'Con permiso', ayuda: 'Tú admites a cada persona.' },
];

export const ACCESO_POR_DEFECTO: AccesoDeLaSala = 'ABIERTA';

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

export function accesoEnPalabras(acceso: AccesoDeLaSala): string {
  return ACCESOS_DE_LA_SALA.find(a => a.clave === acceso)?.nombre ?? 'Abierta';
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
