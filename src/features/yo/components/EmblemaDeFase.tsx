import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import { CURVA_SALIDA } from '../../../theme/movimiento';
import { tacto } from '../../../utils/tacto';
import type { AnimalDeFase } from '../data/animalesDeFase';
import type { EstadoDeFase } from '../utils/estadoDeLasFases';

const ENTRADA = { damping: 14, stiffness: 170, reduceMotion: ReduceMotion.System } as const;
const ONDA_MS = 700;

/**
 * El animal de una fase dentro de un disco del color de la marca (`goldWash`, que se ve igual de bien
 * en claro y en oscuro: el arte ya viene recortado, sin fondo, y no necesita un cuadro negro detrás).
 *
 * - `actual`: aro dorado. `lograda`: a color, sin aro. `futura`: sólo la silueta, tenue — se ve que
 *   hay algo, no se ve qué es, y no se confunde con algo ya logrado.
 * - `celebrar` (sólo la primera vez que se entra en una fase): el animal aterriza desde un 82 % con un
 *   resorte corto y un aro dorado se abre y se desvanece una vez (700 ms, ease-out). Nunca desde
 *   escala 0. Una sola vibración. Con «reducir movimiento» el sistema salta las dos animaciones y el
 *   animal simplemente aparece.
 */
export function EmblemaDeFase({
  animal,
  estado,
  tamano,
  celebrar = false,
}: {
  animal: AnimalDeFase;
  estado: EstadoDeFase;
  tamano: number;
  celebrar?: boolean;
}) {
  const { c } = useTheme();
  const escala = useSharedValue(1);
  const onda = useSharedValue(0);

  useEffect(() => {
    if (!celebrar) return;
    escala.set(0.82);
    escala.set(withSpring(1, ENTRADA));
    onda.set(0);
    onda.set(withTiming(1, { duration: ONDA_MS, easing: CURVA_SALIDA, reduceMotion: ReduceMotion.System }));
    tacto.logro();
  }, [celebrar, escala, onda]);

  const estiloAnimal = useAnimatedStyle(() => ({ transform: [{ scale: escala.get() }] }));
  const estiloOnda = useAnimatedStyle(() => ({
    opacity: celebrar ? 0.6 * (1 - onda.get()) : 0,
    transform: [{ scale: 1 + 0.45 * onda.get() }],
  }));

  const futura = estado === 'futura';
  return (
    <View style={{ width: tamano, height: tamano }}>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', width: tamano, height: tamano, borderRadius: tamano / 2, borderWidth: 2, borderColor: c.gold },
          estiloOnda,
        ]}
      />
      <Animated.View
        style={[
          {
            width: tamano,
            height: tamano,
            borderRadius: tamano / 2,
            backgroundColor: c.goldWash,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: estado === 'actual' ? 2 : 0,
            borderColor: c.gold,
          },
          estiloAnimal,
        ]}
      >
        <Image
          source={animal.imagen}
          contentFit="contain"
          tintColor={futura ? c.borderStrong : undefined}
          style={{ width: tamano * 0.82, height: tamano * 0.82, opacity: futura ? 0.55 : 1 }}
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
    </View>
  );
}
