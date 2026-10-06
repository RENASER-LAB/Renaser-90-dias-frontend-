import React, { forwardRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useTheme } from '../../../theme/ThemeContext';
import PhoenixMascot, { type PhoenixMascotHandle } from '../rive/PhoenixMascot';
import type { PhoenixMood } from '../rive/phoenixMaster';

/**
 * El fénix tal como lo usa la app: con el tema (halo de fondo oscuro), «reducir movimiento» del sistema y sin robar
 * toques (el toque es de la tarjeta o del botón que lo contiene). Todo lo demás es la entrega del diseñador.
 */
export const FenixVivo = forwardRef<
  PhoenixMascotHandle,
  { size: number; animo: PhoenixMood; life?: number; etiqueta: string; style?: StyleProp<ViewStyle>; testID?: string }
>(function FenixVivo({ size, animo, life = 1, etiqueta, style, testID }, ref) {
  const { mode } = useTheme();
  const reducido = useReducedMotion();
  return (
    <PhoenixMascot
      ref={ref}
      size={size}
      mood={animo}
      life={life}
      onDarkBackground={mode === 'dark'}
      interactive={false}
      reduceMotion={reducido}
      accessibilityLabel={etiqueta}
      style={style}
      testID={testID}
    />
  );
});
