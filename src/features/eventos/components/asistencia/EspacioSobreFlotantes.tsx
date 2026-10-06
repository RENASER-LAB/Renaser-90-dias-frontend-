import React, { useContext } from 'react';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ALTO_TAB_BAR, DIAMETRO, ESPACIO_PARA_LANZADOR, SEPARACION } from '../../../renasia/components/lugarDelLanzador';

/**
 * Los botones flotantes de abajo: a la derecha el orbe de SER (`RenasiaLauncher`) y, mientras la cuenta
 * no firmó el Pacto, a la izquierda la burbuja «✳ SER» del arranque guiado (`SparkieOverlay`, en todas
 * las plataformas, no solo en la web). Los dos se ubican contra el borde de la PANTALLA, a
 * `insets.bottom + ALTO_TAB_BAR + SEPARACION`, con 52 y 48 px de alto.
 *
 * Al desplazar, la barra de pestañas se esconde y la lista de la sección llega hasta abajo: el
 * `paddingBottom` de Comunidad (`ESPACIO_PARA_LANZADOR`, pensado con la barra a la vista) no alcanza, y
 * el último botón («Cerrar la lista», «Corregir», «Cancelar evento») quedaba debajo de la burbuja
 * (captura del 2026-10-06). Lo que hay que dejar libre, medido desde el borde de la pantalla:
 */
export const ALTO_DE_LOS_FLOTANTES = ALTO_TAB_BAR + SEPARACION + DIAMETRO;

/** Aire entre el último botón y los flotantes. */
const MARGEN = 12;

/** Lo que falta sumar al relleno de Comunidad para que el final de la lista quede por encima de los flotantes. */
export function rellenoExtraAlPie(insetAbajo: number): number {
  return Math.max(0, ALTO_DE_LOS_FLOTANTES + MARGEN + insetAbajo - ESPACIO_PARA_LANZADOR);
}

/** Dónde va un aviso flotante de la sección (el «Deshacer»): justo encima de los flotantes. */
export function alturaSobreFlotantes(insetAbajo: number): number {
  return ALTO_DE_LOS_FLOTANTES + 8 + insetAbajo;
}

/** El hueco al final de la lista: así el último botón se puede desplazar por encima de los flotantes. */
export function EspacioSobreFlotantes() {
  return <View testID="espacio-sobre-flotantes" style={{ height: rellenoExtraAlPie(useInsetAbajo()) }} />;
}

/**
 * El borde seguro de abajo, sin exigir un `SafeAreaProvider`: `useSafeAreaInsets` revienta sin él
 * («No safe area value available»), y el detalle del evento también se dibuja en pruebas sueltas.
 */
export function useInsetAbajo(): number {
  return useContext(SafeAreaInsetsContext)?.bottom ?? 0;
}
