import { etiquetaDeDuracion } from '../../formaciones/utils/etiquetaDeDuracion';

/**
 * Cómo se llama el objetivo grande de la persona según SU programa (decisión del dueño, 2026-10-31): «objetivo de 90 días» en la Escuela y la
 * Certificación, «objetivo de 3 meses» en el Diplomado de 3 meses y «objetivo de 1 año» en el de 1 año.
 *
 * La duración sola no alcanza para «3 meses»: los 90 días de la Escuela y los 3 meses del Diplomado duran lo mismo. Por eso el Diplomado
 * dice su duración en meses o años (`etiquetaDeDuracion`) y las demás formaciones dicen los días; solo el año completo es «1 año» en todas.
 * Sin dato (un servidor anterior a las formaciones, o `/home` sin leer) es el de siempre: 90 días.
 *
 * Esto es solo cómo se dice. No cambia el nombre de la formación («Escuela Renaser 90 días») ni lo que se guarda.
 */
export const PLAZO_POR_DEFECTO = '90 días';

export function plazoDelObjetivo(duracionDias?: number | null, formacion?: string | null): string {
  if (typeof duracionDias !== 'number' || !Number.isFinite(duracionDias) || duracionDias <= 0) return PLAZO_POR_DEFECTO;
  if (formacion === 'DIPLOMADO') return etiquetaDeDuracion(duracionDias);
  if (duracionDias % 365 === 0) return etiquetaDeDuracion(duracionDias);
  return `${duracionDias} días`;
}

/** «objetivo de 90 días», «objetivo de 3 meses», «objetivo de 1 año». */
export function nombreDelObjetivo(duracionDias?: number | null, formacion?: string | null): string {
  return `objetivo de ${plazoDelObjetivo(duracionDias, formacion)}`;
}

/** «objetivos de 90 días», «objetivos de 3 meses», «objetivos de 1 año». */
export function nombreDeLosObjetivos(duracionDias?: number | null, formacion?: string | null): string {
  return `objetivos de ${plazoDelObjetivo(duracionDias, formacion)}`;
}
