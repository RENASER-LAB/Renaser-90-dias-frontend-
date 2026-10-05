import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { CURVA_EN_PANTALLA, DURACION_MS } from '../theme/movimiento';
import { tacto } from '../utils/tacto';

/**
 * Control segmentado: dos o tres opciones excluyentes en una sola pieza, con una «píldora» que viaja
 * a la elegida (alta y onboarding nativos, 2026-10-05).
 *
 * Reemplaza a las pestañas «Iniciar sesión / Crear cuenta» del login, que eran dos botones con el
 * texto en versalitas espaciadas y un recuadro que aparecía y desaparecía de golpe: se leían como
 * las pestañas de una página web. El control de iOS/Android es esto: una pista, una píldora que se
 * DESPLAZA, y el texto en tamaño de lectura.
 *
 * Decisiones de movimiento (las de `animate-expo`):
 * - **Sólo se mueve la píldora.** El contenido de abajo cambia sin deslizarse: las pestañas son
 *   pares, no una jerarquía, y deslizarlas sugeriría una profundidad que no existe.
 * - **`translateX` + ancho medido una vez** con `onLayout`, nunca por cuadro. 250 ms con
 *   ease-in-out, porque la píldora se traslada sobre la pantalla (no entra ni sale).
 * - **El primer dibujo no anima**: la píldora aparece ya en su lugar, no llega deslizándose desde
 *   la izquierda al abrir la pantalla.
 * - **Con «reducir movimiento»** del sistema la píldora salta sin recorrido (`ReduceMotion.System`).
 * - **Háptico de selección** en el mismo toque que cambia la opción, y sólo si cambia.
 */
export interface OpcionSegmento<T extends string> {
  valor: T;
  etiqueta: string;
  accessibilityLabel?: string;
}

interface ControlSegmentadoProps<T extends string> {
  opciones: readonly OpcionSegmento<T>[];
  valor: T;
  onCambiar: (valor: T) => void;
  /** `tab` cuando cambia lo que se ve debajo (login); `radio` cuando es un dato del formulario. */
  rol?: 'tab' | 'radio';
  accessibilityLabel?: string;
}

/** Aire entre la pista y la píldora. */
const RELLENO = 4;

export function ControlSegmentado<T extends string>({
  opciones,
  valor,
  onCambiar,
  rol = 'tab',
  accessibilityLabel,
}: ControlSegmentadoProps<T>) {
  const { c, t } = useTheme();
  const [anchoPista, setAnchoPista] = useState(0);
  const indice = Math.max(0, opciones.findIndex(o => o.valor === valor));
  const anchoSegmento = anchoPista > 0 ? (anchoPista - RELLENO * 2) / opciones.length : 0;

  const desplazamiento = useSharedValue(0);
  const yaUbicada = useRef(false);

  useEffect(() => {
    if (anchoSegmento <= 0) return;
    const destino = indice * anchoSegmento;
    if (!yaUbicada.current) {
      // Primera medida: la píldora se pone en su lugar sin recorrido.
      yaUbicada.current = true;
      desplazamiento.set(destino);
      return;
    }
    desplazamiento.set(
      withTiming(destino, {
        duration: DURACION_MS.indicador,
        easing: CURVA_EN_PANTALLA,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [indice, anchoSegmento, desplazamiento]);

  const estiloPildora = useAnimatedStyle(() => ({
    transform: [{ translateX: desplazamiento.get() }],
  }));

  const alMedir = (e: LayoutChangeEvent) => {
    const ancho = e.nativeEvent.layout.width;
    if (Math.abs(ancho - anchoPista) >= 1) setAnchoPista(ancho);
  };

  return (
    <View
      onLayout={alMedir}
      accessibilityRole={rol === 'tab' ? 'tablist' : 'radiogroup'}
      accessibilityLabel={accessibilityLabel}
      style={[styles.pista, { backgroundColor: c.placeholderA, borderColor: c.border }]}
    >
      {anchoSegmento > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pildora,
            { width: anchoSegmento, backgroundColor: c.cardBgAlt, borderColor: c.borderStrong, shadowColor: '#000' },
            estiloPildora,
          ]}
        />
      )}
      {opciones.map(opcion => {
        const elegida = opcion.valor === valor;
        return (
          <Pressable
            key={opcion.valor}
            accessibilityRole={rol}
            accessibilityState={{ selected: elegida }}
            accessibilityLabel={opcion.accessibilityLabel ?? opcion.etiqueta}
            onPress={() => {
              if (elegida) return;
              tacto.seleccion();
              onCambiar(opcion.valor);
            }}
            pressRetentionOffset={16}
            style={styles.segmento}
          >
            <Text
              numberOfLines={1}
              style={[
                t.body,
                styles.etiqueta,
                {
                  color: elegida ? c.textStrong : c.textSoft,
                  fontFamily: elegida ? 'Jost_500Medium' : 'Jost_400Regular',
                },
              ]}
            >
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pista: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: RELLENO,
  },
  pildora: {
    position: 'absolute',
    top: RELLENO,
    bottom: RELLENO,
    left: RELLENO,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmento: {
    flex: 1,
    /* 44 de alto: el mínimo táctil (AGENTS.md §4 pide 48–52 en botones; el segmento suma los 4 px
       de relleno de la pista por arriba y por abajo, 52 en total). */
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  etiqueta: {
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: 0,
  },
});
