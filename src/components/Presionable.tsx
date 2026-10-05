import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { CURVA_SALIDA, DURACION_MS, ESCALA_APRETADO } from '../theme/movimiento';

/**
 * Un `Pressable` que responde al dedo como un objeto físico: se hunde un 3 % al APOYAR el dedo
 * (no al levantarlo) y vuelve al soltar (alta y onboarding nativos, 2026-10-05).
 *
 * - **La respuesta va en el apoyo.** Esperar al final del toque para mostrar algo se siente muerto;
 *   el compromiso (el `onPress`) sigue siendo al levantar el dedo.
 * - **120 ms con ease-out y escala 0.97**: casi imperceptible a propósito, porque se toca decenas de
 *   veces por sesión. Va en un valor compartido, en el hilo de la interfaz: apretar no re-dibuja
 *   el componente.
 * - **`pressRetentionOffset`**: si el dedo se corre unos píxeles, el toque no se cancela.
 * - Con «reducir movimiento» la escala no se anima (`ReduceMotion.System`); el cambio de color de
 *   quien lo use sigue explicando el estado.
 */
export function Presionable({
  children,
  style,
  contenedorStyle,
  disabled,
  onPressIn,
  onPressOut,
  ...resto
}: Omit<PressableProps, 'style' | 'children'> & {
  children: React.ReactNode;
  /** Estilo de la caja que se hunde (bordes, fondo, tamaño). */
  style?: StyleProp<ViewStyle>;
  /** Estilo del área táctil que la contiene (p. ej. `flex: 1` dentro de una fila). No se hunde. */
  contenedorStyle?: StyleProp<ViewStyle>;
}) {
  const escala = useSharedValue(1);
  const estiloEscala = useAnimatedStyle(() => ({ transform: [{ scale: escala.get() }] }));
  const config = { duration: DURACION_MS.presion, easing: CURVA_SALIDA, reduceMotion: ReduceMotion.System };

  return (
    <Pressable
      {...resto}
      disabled={disabled}
      style={contenedorStyle}
      pressRetentionOffset={16}
      onPressIn={e => {
        if (!disabled) escala.set(withTiming(ESCALA_APRETADO, config));
        onPressIn?.(e);
      }}
      onPressOut={e => {
        escala.set(withTiming(1, config));
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, estiloEscala]}>{children}</Animated.View>
    </Pressable>
  );
}
