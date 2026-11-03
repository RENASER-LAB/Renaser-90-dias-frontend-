import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { fuentes } from '../../../theme/fuentes';
import { CURVA_SALIDA } from '../../../theme/movimiento';

/** Cuánto se queda «Guardado» a la vista antes de apagarse. */
const SE_QUEDA_MS = 1400;

/**
 * «Guardado», un instante, cada vez que el borrador del Código Renaser quedó escrito en el teléfono (2026-11-03).
 *
 * Es lo más callado posible: un check de 16 y la palabra en el gris del rótulo, a 12 px, en la cabecera. Aparece con un fundido
 * de 150 ms, se queda 1,4 s y se apaga en 250 ms; no mueve nada de lugar (siempre ocupa su sitio, solo cambia su opacidad) y
 * no recibe toques. Con «reducir movimiento» aparece y se apaga sin fundido. El lector de pantalla lo ignora: no es algo que
 * haya que anunciar cada vez que se escribe una frase.
 *
 * `cuenta` es cuántas veces se ha guardado desde que se abrió el formulario; el 0 no muestra nada.
 */
export function IndicadorDeGuardado({ cuenta }: { cuenta: number }) {
  const { c } = useTheme();
  const reducir = useReducedMotion();
  const opacidad = useSharedValue(0);
  const estilo = useAnimatedStyle(() => ({ opacity: opacidad.get() }));

  useEffect(() => {
    if (cuenta === 0) {
      opacidad.set(0);
      return;
    }
    if (reducir) {
      opacidad.set(1);
      const id = setTimeout(() => opacidad.set(0), SE_QUEDA_MS);
      return () => clearTimeout(id);
    }
    const entra = { duration: 150, easing: CURVA_SALIDA };
    const sale = { duration: 250, easing: CURVA_SALIDA };
    opacidad.set(withSequence(withTiming(1, entra), withDelay(SE_QUEDA_MS, withTiming(0, sale))));
  }, [cuenta, reducir, opacidad]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[estilos.fila, estilo]}
    >
      <Icon name="check" size={16} color={c.micro} />
      <Text style={[estilos.texto, { color: c.micro }]}>Guardado</Text>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  texto: { fontFamily: fuentes.media, fontSize: 12, lineHeight: 16 },
});
