import React, { useEffect } from 'react';
import { TextInput, type TextStyle, type StyleProp } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { CURVA_SALIDA } from '../../../theme/movimiento';

const TextoAnimado = Animated.createAnimatedComponent(TextInput);

/**
 * Un número que sube de 0 a `valor` en el hilo de la interfaz (2026-10-07, la pantalla de celebración). El texto lo
 * escribe un worklet en la prop nativa `text` de un `TextInput` de solo lectura: ningún render de React por cuadro.
 * Con `sube = false` («reducir movimiento») aparece ya en su valor. El lector de pantalla lee siempre el final.
 */
export function ContadorQueSube({
  valor,
  sube,
  esperaMs,
  duracionMs,
  prefijo = '',
  style,
  testID,
}: {
  valor: number;
  sube: boolean;
  esperaMs: number;
  duracionMs: number;
  prefijo?: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const actual = useSharedValue(sube ? 0 : valor);

  useEffect(() => {
    if (!sube) {
      actual.set(valor);
      return;
    }
    actual.set(0);
    actual.set(withDelay(esperaMs, withTiming(valor, { duration: duracionMs, easing: CURVA_SALIDA })));
  }, [actual, valor, sube, esperaMs, duracionMs]);

  const props = useAnimatedProps(() => {
    const texto = `${prefijo}${Math.round(actual.get())}`;
    return { text: texto, defaultValue: texto } as object;
  });

  return (
    <TextoAnimado
      editable={false}
      underlineColorAndroid="transparent"
      defaultValue={`${prefijo}${sube ? 0 : valor}`}
      animatedProps={props}
      accessibilityLabel={`${prefijo}${valor}`}
      style={[{ padding: 0, margin: 0, fontVariant: ['tabular-nums'] }, style]}
      testID={testID}
    />
  );
}
