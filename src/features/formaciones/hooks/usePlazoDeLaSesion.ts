import { plazoDelObjetivo, PLAZO_POR_DEFECTO } from '../../objetivos/utils/nombreDelObjetivo';
import { useFormacionDeLaSesion } from '../context/contextoDeFormacion';

/**
 * El plazo del programa de la persona que tiene la sesión, para las pantallas que lo nombran antes de que exista un `/home` (el onboarding): lo saca de la
 * formación de la sesión (`useFormacionDeLaSesion` → `plazoDelObjetivo`), la misma que nombra «Tu programa empieza mañana» (`lineaDelPlazo`).
 *
 * Sin formación conocida (un servidor anterior a las formaciones, o todavía sin leer) es el de siempre: 90 días. `duracionDias` es el largo en días
 * (el último día del programa: «llegarás al Día 90», «al Día 365»).
 */
export function usePlazoDeLaSesion(): { plazo: string; duracionDias: number } {
  const { formacion } = useFormacionDeLaSesion();
  const duracion = formacion?.duracionDias;
  return {
    plazo: plazoDelObjetivo(duracion, formacion?.activa?.codigo) || PLAZO_POR_DEFECTO,
    duracionDias: typeof duracion === 'number' && Number.isFinite(duracion) && duracion > 0 ? duracion : 90,
  };
}
