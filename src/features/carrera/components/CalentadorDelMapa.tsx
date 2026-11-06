import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { marcarMapaCalentado, useHayQueCalentarElMapa } from '../servicios/calentarLaCarrera';
import { cargarMapas } from './MapaDeCarrera';

/** Lo más que vive el calentador si Google Maps nunca avisa que cargó (sin red, por ejemplo): el SDK ya quedó cargado igual. */
export const TOPE_DEL_CALENTADOR_MS = 8000;

/**
 * El mapa que calienta Google Maps antes de la carrera (spec 042, 2026-11-06; ver `calentarLaCarrera`): 1 × 1, transparente, sin
 * gestos ni lector de pantalla, montado por el anfitrión mientras no hay carrera abierta. Se quita en cuanto Google Maps avisa que
 * cargó (`onMapLoaded`), o al pasar `TOPE_DEL_CALENTADOR_MS`, y no vuelve en este proceso. Sin clave de Maps no monta nada.
 */
export function CalentadorDelMapa() {
  const hayQue = useHayQueCalentarElMapa();
  const Mapas = useMemo(cargarMapas, []);
  useEffect(() => {
    if (!hayQue || !Mapas) return;
    const id = setTimeout(marcarMapaCalentado, TOPE_DEL_CALENTADOR_MS);
    return () => clearTimeout(id);
  }, [hayQue, Mapas]);
  if (!hayQue || !Mapas) return null;
  return (
    <View
      testID="calentador-del-mapa"
      pointerEvents="none"
      style={estilos.caja}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Mapas.default
        provider={Mapas.PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        googleRenderer="LATEST"
        showsBuildings
        toolbarEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onMapLoaded={marcarMapaCalentado}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0, overflow: 'hidden' },
});
