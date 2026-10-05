import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import { CURVA_SALIDA, DURACION_MS } from '../../../theme/movimiento';

/**
 * La barra fina de avance de la Ficha Inicial, arriba, entre «atrás» y el botón de tema
 * (alta y onboarding nativos, 2026-10-05).
 *
 * Reemplaza a `OnboardingStepBar`: tres píldoras numeradas de 24 px más el texto «CAPÍTULO 1 DE 3 ·
 * 33 % COMPLETADO» — un asistente de formulario web. Ahora son tres tramos de 4 px, uno por capítulo
 * (los capítulos siguen siendo la unidad de guardado), y el tramo del capítulo en curso se llena paso
 * a paso. Se lee de un vistazo sin leer nada.
 *
 * El relleno anima su ANCHO, que es la excepción admitida a «sólo transform y opacidad»: es un
 * elemento absoluto y sin hijos, así que no re-acomoda nada alrededor, y `scaleX` le deformaría las
 * puntas redondeadas. 280 ms con ease-out; con «reducir movimiento», salta.
 */
interface BarraDeAvanceProps {
  /** Cuánto se llenó cada tramo, de 0 a 1. */
  rellenos: number[];
  /** Para el lector de pantalla: «Paso 3 de 12, Identidad y familia». */
  descripcion: string;
  pasoActual: number;
  totalPasos: number;
}

export function BarraDeAvance({ rellenos, descripcion, pasoActual, totalPasos }: BarraDeAvanceProps) {
  return (
    <View
      style={styles.fila}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={descripcion}
      accessibilityValue={{ min: 1, max: totalPasos, now: pasoActual }}
    >
      {rellenos.map((relleno, i) => (
        <Tramo key={i} relleno={relleno} />
      ))}
    </View>
  );
}

function Tramo({ relleno }: { relleno: number }) {
  const { c } = useTheme();
  const avance = useSharedValue(relleno);

  useEffect(() => {
    avance.set(withTiming(relleno, { duration: DURACION_MS.avance, easing: CURVA_SALIDA, reduceMotion: ReduceMotion.System }));
  }, [relleno, avance]);

  const estiloRelleno = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, avance.get())) * 100}%` }));

  return (
    <View style={[styles.tramo, { backgroundColor: c.border }]}>
      <Animated.View style={[styles.relleno, { backgroundColor: c.gold }, estiloRelleno]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  tramo: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  relleno: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
});
