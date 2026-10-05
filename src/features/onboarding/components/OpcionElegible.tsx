import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import { CURVA_SALIDA, DURACION_MS } from '../../../theme/movimiento';
import { Presionable } from '../../../components/Presionable';
import { Icon } from '../../../components/Icon';
import { tacto } from '../../../utils/tacto';

/**
 * Una opción de respuesta única, grande y de un toque (alta y onboarding nativos, 2026-10-05).
 *
 * Reemplaza a los botoncitos de 44 px con el texto en versalitas de la Ficha Inicial («Masculino»,
 * «Soltero(a)», «Sí»…). Dos formas:
 *
 * - **`fila`**: ocupa todo el ancho, 56 px de alto, la palabra en tamaño de lectura y una marca a la
 *   derecha. Es la lista de opciones de los ajustes de Android/iOS: se toca con el pulgar sin
 *   apuntar.
 * - **`circulo`**: para números cortos en fila (la cantidad de hijos).
 *
 * Al elegir: háptico de selección en el mismo toque, el borde y el fondo pasan al dorado en 180 ms
 * (ease-out) y la marca se llena. Si el teléfono no vibra, el cambio de color basta solo.
 */
interface OpcionElegibleProps {
  etiqueta: string;
  elegida: boolean;
  onElegir: () => void;
  forma?: 'fila' | 'circulo';
  accessibilityLabel?: string;
}

export function OpcionElegible({ etiqueta, elegida, onElegir, forma = 'fila', accessibilityLabel }: OpcionElegibleProps) {
  const { c, t } = useTheme();
  const progreso = useSharedValue(elegida ? 1 : 0);

  useEffect(() => {
    progreso.set(
      withTiming(elegida ? 1 : 0, { duration: DURACION_MS.seleccion, easing: CURVA_SALIDA, reduceMotion: ReduceMotion.Never }),
    );
  }, [elegida, progreso]);

  const esCirculo = forma === 'circulo';
  const fondoElegido = esCirculo ? c.gold : c.goldWash;
  const estiloColor = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progreso.get(), [0, 1], [c.border, c.gold]),
    backgroundColor: interpolateColor(progreso.get(), [0, 1], [c.cardBgAlt, fondoElegido]),
  }));

  const elegir = () => {
    if (!elegida) tacto.seleccion();
    onElegir();
  };

  return (
    <Presionable
      accessibilityRole="radio"
      accessibilityState={{ selected: elegida }}
      accessibilityLabel={accessibilityLabel ?? etiqueta}
      onPress={elegir}
      hitSlop={esCirculo ? 4 : 0}
      contenedorStyle={esCirculo ? styles.circuloCaja : undefined}
    >
      <Animated.View style={[esCirculo ? styles.circulo : styles.fila, estiloColor]}>
        <Text
          numberOfLines={esCirculo ? 1 : 2}
          style={[
            t.body,
            esCirculo ? styles.textoCirculo : styles.textoFila,
            {
              color: esCirculo && elegida ? c.onGold : elegida ? c.textStrong : c.text,
              fontFamily: elegida || esCirculo ? 'Jost_500Medium' : 'Jost_400Regular',
            },
          ]}
        >
          {etiqueta}
        </Text>
        {!esCirculo && (
          <View
            style={[
              styles.marca,
              { borderColor: elegida ? c.gold : c.borderStrong, backgroundColor: elegida ? c.gold : 'transparent' },
            ]}
          >
            {elegida && <Icon name="check" size={13} color={c.onGold} strokeWidth={2.4} />}
          </View>
        )}
      </Animated.View>
    </Presionable>
  );
}

const styles = StyleSheet.create({
  fila: {
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  textoFila: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  marca: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuloCaja: {
    flex: 1,
  },
  circulo: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCirculo: {
    fontSize: 16,
    lineHeight: 22,
  },
});
