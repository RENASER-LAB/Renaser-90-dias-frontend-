import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { CURVA_SALIDA } from '../../../theme/movimiento';
import { entradaDelBloque } from '../utils/movimientoDelIngreso';

/**
 * Un bloque del login que entra con los demás, escalonado (2026-10-05): opacidad 0 → 1 y 8 px
 * hacia arriba, con la espera que le toca por su `indice` (ver `movimientoDelIngreso`).
 *
 * - Se anima al MONTAR, una sola vez. Para que vuelva a entrar (pasar del login a «Solicitar
 *   acceso») quien lo usa le cambia la `key`. Nada se anima al escribir ni al mover el foco: eso
 *   pasa decenas de veces y tiene que ser instantáneo.
 * - El valor arranca en 0 desde que se crea, así el primer cuadro ya sale transparente y no hay un
 *   parpadeo del contenido entero antes de empezar a entrar.
 * - Valor compartido + `withTiming`, en el hilo de la interfaz: React no se vuelve a dibujar
 *   durante la animación. No se usa `entering` de Reanimated por lo que se vio en el onboarding
 *   (`MarcoDePaso`): con él, un `<Modal>` adentro se dibujaba invisible.
 * - «Reducir movimiento» lo decide `entradaDelBloque` (solo fundido); por eso acá va
 *   `ReduceMotion.Never`: la versión reducida ya es la que se pide.
 */
export function EntradaEscalonada({
  indice,
  children,
  style,
}: {
  /** 0 el título, 1 los campos, 2 el botón. */
  indice: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const movimientoReducido = useReducedMotion();
  const { retardo, duracion, recorrido } = entradaDelBloque(indice, movimientoReducido);
  const progreso = useSharedValue(0);

  useEffect(() => {
    progreso.set(
      withDelay(retardo, withTiming(1, { duration: duracion, easing: CURVA_SALIDA, reduceMotion: ReduceMotion.Never })),
    );
    // Sólo al montar: cada entrada nueva es un montaje nuevo (`key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estilo = useAnimatedStyle(() => ({
    opacity: progreso.get(),
    transform: [{ translateY: (1 - progreso.get()) * recorrido }],
  }));

  return <Animated.View style={[style, estilo]}>{children}</Animated.View>;
}
