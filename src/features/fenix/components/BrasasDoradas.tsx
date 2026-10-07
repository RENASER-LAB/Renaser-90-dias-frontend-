import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

/**
 * Brasas doradas que suben detrás del fénix en la pantalla de celebración (2026-10-07). Sutiles: 12 puntos de 3–6 px
 * que suben y se apagan, cada uno con su demora, dos veces. Solo `transform` y `opacity` en el hilo de la interfaz.
 * Las posiciones son fijas (no aleatorias) para que la pantalla sea la misma cada vez y se pueda probar.
 */
const BRASAS: ReadonlyArray<{ x: number; y: number; lado: number; sube: number; demora: number; dura: number }> = [
  { x: -96, y: 40, lado: 4, sube: 150, demora: 0, dura: 2100 },
  { x: -62, y: 70, lado: 6, sube: 190, demora: 260, dura: 2400 },
  { x: -30, y: 54, lado: 3, sube: 170, demora: 520, dura: 1900 },
  { x: 8, y: 80, lado: 5, sube: 210, demora: 120, dura: 2600 },
  { x: 40, y: 50, lado: 4, sube: 160, demora: 680, dura: 2000 },
  { x: 74, y: 66, lado: 6, sube: 200, demora: 380, dura: 2300 },
  { x: 104, y: 36, lado: 3, sube: 140, demora: 820, dura: 1800 },
  { x: -120, y: 0, lado: 3, sube: 120, demora: 940, dura: 1900 },
  { x: 126, y: 4, lado: 4, sube: 130, demora: 560, dura: 2100 },
  { x: -48, y: 96, lado: 4, sube: 230, demora: 1100, dura: 2500 },
  { x: 54, y: 98, lado: 3, sube: 220, demora: 200, dura: 2400 },
  { x: -6, y: 20, lado: 5, sube: 150, demora: 1300, dura: 2000 },
];

export const CANTIDAD_DE_BRASAS = BRASAS.length;

function Brasa({ x, y, lado, sube, demora, dura, color }: (typeof BRASAS)[number] & { color: string }) {
  const avance = useSharedValue(0);
  useEffect(() => {
    avance.set(withDelay(demora, withRepeat(withTiming(1, { duration: dura, easing: Easing.out(Easing.quad) }), 2, false)));
  }, [avance, demora, dura]);
  const estilo = useAnimatedStyle(() => {
    const p = avance.get();
    return {
      opacity: p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85,
      transform: [{ translateX: x }, { translateY: y - sube * p }, { scale: 1 - 0.4 * p }],
    };
  });
  return (
    <Animated.View
      style={[estilos.brasa, { width: lado, height: lado, borderRadius: lado / 2, backgroundColor: color }, estilo]}
    />
  );
}

export function BrasasDoradas({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={estilos.capa} testID="brasas-doradas">
      {BRASAS.map((b, i) => (
        <Brasa key={i} {...b} color={color} />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  capa: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  brasa: { position: 'absolute', opacity: 0 },
});
