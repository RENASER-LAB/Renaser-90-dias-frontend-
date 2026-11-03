import type { TarjetaDeFormacion } from '../../formaciones/types/formaciones.types';

/**
 * La vista previa del diagnóstico (spec 026): cómo lo ve una persona de esa formación y esa duración, sin guardar nada. Los textos de la
 * ficha traen `{duracion}` y `{formacion}` ya reemplazados por el servidor, así que la formación y la duración se eligen aquí.
 */

export const DURACION_POR_DEFECTO_DE_LA_VISTA = 90;
/** Las duraciones de siempre, para cuando no se pudo leer lo que ofrece cada formación. */
const DURACIONES_DE_SIEMPRE = [90, 365];

/** Las duraciones que se pueden elegir para esa formación (`null` = todas: cualquiera de las que ofrece alguna). */
export function duracionesDeLaVistaPrevia(formacion: string | null, tarjetas: readonly TarjetaDeFormacion[] | null): number[] {
  if (!tarjetas || tarjetas.length === 0) return DURACIONES_DE_SIEMPRE;
  const de = formacion ? tarjetas.filter(t => t.resumen.codigo === formacion) : tarjetas;
  const dias = [...new Set(de.flatMap(t => t.resumen.duracionesDias))].filter(d => d > 0).sort((a, b) => a - b);
  return dias.length > 0 ? dias : DURACIONES_DE_SIEMPRE;
}

/** Al cambiar de formación la duración elegida puede dejar de existir: se pasa a la primera que sí. */
export function duracionVigente(elegida: number, disponibles: readonly number[]): number {
  if (disponibles.includes(elegida)) return elegida;
  return disponibles[0] ?? DURACION_POR_DEFECTO_DE_LA_VISTA;
}

export interface ParametrosDeLaVistaPrevia {
  formacion: string | null;
  duracionDias: number;
}

/** «Diplomado · 1 año», o «Todas las formaciones · 3 meses». */
export function rotuloDeLaVistaPrevia(nombreDeLaFormacion: string | null, duracionTexto: string): string {
  return `${nombreDeLaFormacion ?? 'Todas las formaciones'} · ${duracionTexto}`;
}
