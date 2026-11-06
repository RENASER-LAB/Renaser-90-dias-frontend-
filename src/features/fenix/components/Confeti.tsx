import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

/**
 * Spec 045 FR-007 (D7: solo en el primer post). Una sola ráfaga de confeti dorado, corta y en los colores de la marca.
 *
 * Decisiones de movimiento (skills `animate-expo` y `emil-design-eng`):
 * - 36 piezas chicas (6 a 10 dp), rectángulos y círculos; dorado, dorado claro, crema con borde y un acento oscuro al 30 %.
 * - 1,4 s en total: cada pieza sale con un retraso de hasta 220 ms, cae con `Easing.out(quad)`, gira y se desvanece al final.
 * - Solo `transform` y `opacity`, en el hilo de la interfaz: nada se repite ni queda en bucle, ningún `setState` por cuadro.
 * - `pointerEvents="none"`: no tapa «Seguir». No vibra: la vibración (una sola) es de la pantalla que lo monta.
 * - Con «reducir movimiento» no se monta (lo decide quien lo usa).
 */
export const CONFETI_MS = 1400;
export const PIEZAS_DE_CONFETI = 36;
export const COLORES_DEL_CONFETI = ['#B2924F', '#D9C08A', '#B2924F', '#FCFBF9', 'rgba(30,27,24,0.3)', '#C9A866'] as const;

export type PiezaDeConfeti = {
  x: number;
  ancho: number;
  alto: number;
  redonda: boolean;
  color: string;
  retraso: number;
  derivaX: number;
  caida: number;
  giro: number;
};

/** Pura y con semilla, para que las pruebas sepan qué se dibuja. */
export function piezasDeConfeti(anchoPantalla: number, altoPantalla: number, semilla = 7): PiezaDeConfeti[] {
  let s = semilla;
  const azar = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  return Array.from({ length: PIEZAS_DE_CONFETI }, (_, i) => {
    const ancho = 6 + Math.round(azar() * 4);
    const redonda = azar() < 0.35;
    return {
      x: Math.round(azar() * anchoPantalla),
      ancho,
      alto: redonda ? ancho : Math.round(ancho * 1.6),
      redonda,
      color: COLORES_DEL_CONFETI[i % COLORES_DEL_CONFETI.length],
      retraso: Math.round(azar() * 220),
      derivaX: Math.round((azar() - 0.5) * 90),
      caida: Math.round(altoPantalla * (0.7 + azar() * 0.3)),
      giro: Math.round((azar() - 0.5) * 720),
    };
  });
}

export function Confeti() {
  const { width, height } = useWindowDimensions();
  const piezas = useMemo(() => piezasDeConfeti(width, height), [width, height]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="confeti" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {piezas.map((p, i) => (
        <Pieza key={i} pieza={p} />
      ))}
    </View>
  );
}

function Pieza({ pieza }: { pieza: PiezaDeConfeti }) {
  const avance = useSharedValue(0);
  useEffect(() => {
    avance.value = withDelay(
      pieza.retraso,
      withTiming(1, { duration: CONFETI_MS - pieza.retraso, easing: Easing.out(Easing.quad) }),
    );
  }, [avance, pieza.retraso]);
  const estilo = useAnimatedStyle(() => ({
    opacity: avance.value < 0.75 ? 1 : Math.max(0, 1 - (avance.value - 0.75) / 0.25),
    transform: [
      { translateX: pieza.derivaX * avance.value },
      { translateY: pieza.caida * avance.value },
      { rotate: `${pieza.giro * avance.value}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: -16,
          left: pieza.x,
          width: pieza.ancho,
          height: pieza.alto,
          borderRadius: pieza.redonda ? pieza.ancho / 2 : 2,
          backgroundColor: pieza.color,
          borderWidth: pieza.color === '#FCFBF9' ? StyleSheet.hairlineWidth : 0,
          borderColor: '#E2D7C1',
        },
        estilo,
      ]}
    />
  );
}
