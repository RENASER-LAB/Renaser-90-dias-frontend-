import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CURVA_SALIDA } from '../../../theme/movimiento';
import { alCumplirUnHabito } from '../../habits/eventos/habitoCumplido';
import {
  ALTURA_DEL_SALTO,
  ESCALA_DEL_SALTO,
  MOMENTO_MS,
  fenixSalta,
} from '../../habits/celebracion/momentoDelHabito';
import { FenixDeSerQuieto } from './FenixDeSerQuieto';

/**
 * El fénix del botón flotante de SER, que da un saltito de alegría al cumplirse un hábito (pedido del dueño,
 * 2026-10-07). Sigue siendo la FOTO FIJA (`FenixDeSerQuieto`): el salto es un `transform` de la imagen en el hilo de la
 * interfaz, nunca un Rive más — el único fénix vivo es el del centro de Hoy, y ese ya asiente con el mismo aviso.
 *
 * Sube 7 px y crece un 6 % en 180 ms (ease-out: arranca al instante) y vuelve con un resorte de 320 ms que se posa con
 * un rebote mínimo: ~500 ms. Un «te vi», no una fiesta — cumplir un hábito pasa varias veces al día; la celebración
 * del día completo sigue siendo la del fénix vivo. Si se cumplen dos seguidos, el segundo salto arranca desde donde
 * esté el primero (sin saltos de posición). Con «reducir movimiento», quieto.
 */
export function FenixDeSerQueSalta({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  const reducido = useReducedMotion();
  const alto = useSharedValue(0);
  const escala = useSharedValue(1);

  useEffect(() => {
    if (!fenixSalta(reducido)) return;
    return alCumplirUnHabito(() => {
      const subida = { duration: MOMENTO_MS.saltoSubida, easing: CURVA_SALIDA };
      const bajada = { duration: MOMENTO_MS.saltoBajada, dampingRatio: 0.55 };
      alto.set(withSequence(withTiming(-ALTURA_DEL_SALTO, subida), withSpring(0, bajada)));
      escala.set(withSequence(withTiming(ESCALA_DEL_SALTO, subida), withSpring(1, bajada)));
    });
  }, [reducido, alto, escala]);

  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateY: alto.get() }, { scale: escala.get() }],
  }));

  /* `style` (la posición del fénix sobre el disco) va en la capa que se mueve: la foto queda en (0, 0) dentro de ella. */
  return (
    <Animated.View style={[style, { width: size, height: size }, estilo]} pointerEvents="none" testID="fenix-que-salta">
      <FenixDeSerQuieto size={size} />
    </Animated.View>
  );
}
