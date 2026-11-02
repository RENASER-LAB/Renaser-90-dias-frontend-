import { quienYCuando } from '../../admin/utils/bienvenida';
import type { ImagenDeLaFormacionApi } from '../api/imagenDeLaFormacionApi';
import { FORMACION_POR_DEFECTO } from '../types/formaciones.types';

/**
 * La lógica de «Imagen de la formación» (Administración, spec 035), sin React: qué línea de estado se lee y qué se ofrece. La pantalla solo
 * pinta lo que sale de acá.
 */

export const SIN_ALMACENAMIENTO_DE_IMAGEN =
  'Este servidor no tiene dónde guardar imágenes, así que la imagen no se puede cambiar desde acá.';

export const SIN_IMAGEN_DEL_SERVIDOR = 'Todavía no se pudo mostrar la imagen. Vuelve a intentar.';

type Estado = Pick<ImagenDeLaFormacionApi, 'formation' | 'hayImagen' | 'cambiada' | 'heredada' | 'ultimoCambio'>;

/** La línea de estado: de quién es la imagen que se ve hoy en el chat. */
export function estadoDeLaImagen(imagen: Estado): string {
  const cambio = imagen.ultimoCambio ?? null;
  if (imagen.cambiada) return cambio ? `Cambiada por ${quienYCuando(cambio)}.` : 'Cambiada por Administración.';
  const enLaEscuela = imagen.formation === FORMACION_POR_DEFECTO;
  if (imagen.heredada) return 'Usa la imagen de la Escuela.';
  if (cambio?.volvioAlOriginal) {
    return enLaEscuela ? `Volvió a la imagen de siempre: ${quienYCuando(cambio)}.` : `Vuelve a ser la de la Escuela: ${quienYCuando(cambio)}.`;
  }
  return enLaEscuela ? 'Usa la imagen de siempre.' : 'Usa la imagen de siempre, como la Escuela.';
}

/** Qué se ofrece: cambiarla (si el servidor guarda imágenes) y volver atrás (aunque no guarde: no sube nada). */
export function accionesDeLaImagen(imagen: Pick<ImagenDeLaFormacionApi, 'cambiada' | 'sePuedeCambiar'>): {
  puedeCambiar: boolean;
  puedeVolver: boolean;
  aviso: string | null;
} {
  return {
    puedeCambiar: imagen.sePuedeCambiar,
    puedeVolver: imagen.cambiada,
    aviso: imagen.sePuedeCambiar ? null : SIN_ALMACENAMIENTO_DE_IMAGEN,
  };
}

/** El texto del botón de volver: la Escuela vuelve a la imagen de siempre; las otras, a la de la Escuela. */
export function etiquetaDeVolver(formacion: string): string {
  return formacion === FORMACION_POR_DEFECTO ? 'Volver a la imagen de siempre' : 'Volver a la imagen de la Escuela';
}

/** ¿Esta respuesta es de la formación que se pidió? Defensa barata contra una respuesta que llega a destiempo. */
export function imagenEsDe(imagen: { formation: string }, codigo: string): boolean {
  return imagen.formation.toUpperCase() === codigo.toUpperCase();
}
