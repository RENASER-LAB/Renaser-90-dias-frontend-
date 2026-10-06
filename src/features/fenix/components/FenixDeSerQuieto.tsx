import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { useAnimoDeSer } from '../hooks/useAnimoDeSer';
import { PHOENIX_STATIC_IMAGES } from '../rive/PhoenixMascot';

/**
 * El fénix de SER como ícono (2026-10-06): donde el orbe era un dibujo chico (20–36 px) dentro de otro control — el
 * botón «Pregúntale a SER» del curso, la hoja de acción de la voz, la baldosa de SER en Yo. Es la imagen del ánimo
 * del semáforo (la misma del respaldo de la entrega), sin Rive: a ese tamaño la vida del rig no se ve y cada vista
 * Rive es un lienzo más dibujando en el teléfono. El fénix vivo está en el botón flotante y en el panel.
 *
 * Decorativo: el control que lo contiene ya dice qué hace, así que el lector de pantalla no lo nombra.
 */
export function FenixDeSerQuieto({ size, style }: { size: number; style?: StyleProp<ImageStyle> }) {
  const animo = useAnimoDeSer();
  return (
    <Image
      source={PHOENIX_STATIC_IMAGES[animo]}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no"
      testID="fenix-de-ser-quieto"
    />
  );
}
