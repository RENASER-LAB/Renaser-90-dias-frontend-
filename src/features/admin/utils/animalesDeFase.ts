import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import type { AnimalDeFaseApi } from '../../yo/api/animalesDeFaseApi';

export const SIN_PERMISO_DE_ANIMALES = 'Solo Administración y Alquimista pueden cambiar los animales de las fases.';
export const SIN_ALMACENAMIENTO_DE_ANIMALES =
  'Este servidor no tiene dónde guardar imágenes, así que la imagen no se puede cambiar desde acá.';

export function mensajeDeErrorDeAnimales(error: unknown, porDefecto: string): string {
  if (error instanceof ApiError && error.esProhibido) return SIN_PERMISO_DE_ANIMALES;
  return mensajeDeError(error, porDefecto);
}

/** Qué se dice de la imagen de una fase en la lista. */
export function estadoDeLaImagen(animal: AnimalDeFaseApi | undefined): string {
  return animal?.personalizada ? 'Imagen cambiada' : 'Imagen por defecto';
}

/** Lo que hay para guardar: la imagen elegida y/o un nombre distinto al vigente. */
export function hayCambiosParaGuardar(
  animal: AnimalDeFaseApi | undefined,
  hayImagenElegida: boolean,
  nombre: string,
): boolean {
  return hayImagenElegida || nombre.trim() !== (animal?.nombre ?? '').trim();
}
