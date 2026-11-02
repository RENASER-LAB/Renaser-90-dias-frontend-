import { FORMACION_POR_DEFECTO } from '../types/formaciones.types';
import { nombreLargoDeFormacion } from './nombreDeFormacion';

/** Lo que dice la sección de chats de Tribu en la Escuela, y donde no se sabe de qué formación es (un backend anterior, o «Todas»). */
export const ROTULO_DE_TRIBU_POR_DEFECTO = 'Formación Renaser';

/**
 * El rótulo de la sección de chats de Tribu (spec 035). La Escuela conserva «Formación Renaser»; el Diplomado y la Certificación llevan SU
 * nombre —«Diplomado Renaser», «Certificación Renaser»—, el mismo con el que se llaman sus chats y firma el programa: una persona del
 * Diplomado no lee «Formación Renaser» sobre sus conversaciones. Sin formación conocida (o leyendo «Todas»), el de siempre.
 *
 * @param nombreConfigurado el nombre que Administración le puso a la formación, si la sesión lo trae
 */
export function rotuloDeLaSeccionDeTribu(codigo: string | null | undefined, nombreConfigurado?: string | null): string {
  if (!codigo || codigo.toUpperCase() === FORMACION_POR_DEFECTO) return ROTULO_DE_TRIBU_POR_DEFECTO;
  return nombreConfigurado?.trim() || nombreLargoDeFormacion(codigo.toUpperCase());
}
