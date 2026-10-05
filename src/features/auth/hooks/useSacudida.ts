import { useCallback } from 'react';
import {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { CURVA_EN_PANTALLA } from '../../../theme/movimiento';
import { TRAMOS_DE_LA_SACUDIDA } from '../utils/movimientoDelIngreso';

/**
 * La sacudida horizontal del bloque de campos cuando el ingreso se rechaza (2026-10-05).
 *
 * Devuelve el estilo para el `Animated.View` que se sacude y la función que la dispara. Es un
 * valor compartido en el hilo de la interfaz; si se dispara de nuevo a mitad de camino, arranca
 * desde donde está (no salta al centro).
 *
 * Con «reducir movimiento» no se mueve nada: el borde rojo del campo, el mensaje debajo y la
 * vibración ya dicen que no entró. Un desplazamiento lateral es justo lo que esa preferencia pide
 * evitar.
 */
export function useSacudida() {
  const movimientoReducido = useReducedMotion();
  const desplazamiento = useSharedValue(0);

  const estilo = useAnimatedStyle(() => ({ transform: [{ translateX: desplazamiento.get() }] }));

  const sacudir = useCallback(() => {
    if (movimientoReducido) return;
    const tramos = TRAMOS_DE_LA_SACUDIDA.map(({ hasta, ms }) =>
      withTiming(hasta, { duration: ms, easing: CURVA_EN_PANTALLA, reduceMotion: ReduceMotion.Never }),
    );
    desplazamiento.set(withSequence(...tramos));
  }, [movimientoReducido, desplazamiento]);

  return { estilo, sacudir };
}
