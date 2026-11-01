import { useCallback, useMemo, useSyncExternalStore } from 'react';

import {
  elegirFormacionDeLaComunidad,
  estadoDeLaFormacionDeLaComunidad,
  hayQueElegirParaCrear,
  suscribirseALaFormacionDeLaComunidad,
} from '../estado/formacionDeLaComunidad';
import {
  nombreDeLaFormacion,
  opcionesDelSelector,
  rotuloDeLaFormacion,
  type OpcionDelSelectorDeLaComunidad,
} from '../utils/opcionesDeLaComunidad';

/**
 * La formación de la Comunidad (spec 024) para las pantallas.
 *
 * - `mostrarSelector`: solo Administración, Alquimista y Soporte TI. Para las demás cuentas no hay selector ni la palabra
 *   «formación» en Comunidad (FR-050): todo lo demás de este hook queda en su valor neutro.
 * - `eleccion`: el código elegido o `null` = «Todas».
 * - `formation`: lo que se manda en las lecturas (`null` = nada).
 * - `mostrarRotulos`: cada fila nombra su formación solo cuando se lee «Todas».
 * - `listo`: falta leer lo recordado en el teléfono; mientras tanto Comunidad no pide nada (evita pedir «Todas» y volver a pedir).
 */
export function useFormacionDeLaComunidad() {
  const estado = useSyncExternalStore(suscribirseALaFormacionDeLaComunidad, estadoDeLaFormacionDeLaComunidad, estadoDeLaFormacionDeLaComunidad);
  const disponibles = estado.disponibles;
  const opciones: OpcionDelSelectorDeLaComunidad[] = useMemo(() => opcionesDelSelector(disponibles), [disponibles]);
  const elegir = useCallback((codigo: string | null) => elegirFormacionDeLaComunidad(codigo), []);
  const nombreDe = useCallback((codigo: string) => nombreDeLaFormacion(codigo, disponibles), [disponibles]);
  const rotuloDe = useCallback((codigo: string) => rotuloDeLaFormacion(codigo, disponibles), [disponibles]);
  /* El nombre de la formación que se está mirando, para la imagen del podio: quien ve todas, la que eligió; las demás cuentas, la suya.
     `null` si no se sabe (un backend anterior a las formaciones): nada se escribe. */
  const nombreDeLaQueSeMira = estado.veTodas
    ? estado.eleccion
      ? nombreDeLaFormacion(estado.eleccion, disponibles)
      : null
    : (estado.activa?.nombre ?? null);

  return {
    mostrarSelector: estado.veTodas,
    veTodas: estado.veTodas,
    eleccion: estado.eleccion,
    formation: estado.veTodas ? estado.eleccion : null,
    mostrarRotulos: estado.veTodas && estado.eleccion === null,
    hayQueElegirParaCrear: hayQueElegirParaCrear(estado),
    nombreDeLaQueSeMira,
    listo: estado.listo,
    opciones,
    elegir,
    nombreDe,
    rotuloDe,
  };
}
