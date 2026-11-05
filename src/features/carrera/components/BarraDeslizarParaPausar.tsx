import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { TEXTOS_DE_LA_CARRERA } from '../utils/textosDeLaCarrera';

/**
 * «Desliza para pausar» (FR-007): la píldora dorada con el pulgar blanco. Deslizar evita pausar por un roce del bolsillo; un
 * golpe rápido hacia la derecha alcanza aunque no llegue al final (velocidad O distancia).
 *
 * El pulgar sigue al dedo con un valor compartido (sin volver a dibujar React por cuadro); al soltar sin llegar, vuelve con un
 * resorte que conserva la velocidad. Con «reducir movimiento» vuelve sin resorte.
 *
 * Sin deslizar: mantener presionado medio segundo también pausa, y el lector de pantalla la ofrece como un botón con la acción
 * «activar» (`accessibilityActions`), así nadie depende de un gesto para pausar.
 *
 * Gesture Handler no está instalado (agregarlo pide un APK con prebuild aparte): se usa `PanResponder`, como `HojaDesdeAbajo`.
 */

const ALTO = 64;
const PULGAR = 52;
const MARGEN = 6;
const UMBRAL = 0.7;
const VELOCIDAD_QUE_ALCANZA = 1.2;
const MANTENER_MS = 600;

export function BarraDeslizarParaPausar({ alPausar }: { alPausar: () => void }) {
  const { c } = useTheme();
  const reducir = useReducedMotion();
  const [ancho, setAncho] = useState(0);
  const x = useSharedValue(0);
  const maximo = Math.max(0, ancho - PULGAR - MARGEN * 2);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hecho = useRef(false);

  const pausar = useRef(alPausar);
  pausar.current = alPausar;

  const disparar = () => {
    if (hecho.current) return;
    hecho.current = true;
    tacto.logro();
    pausar.current();
    // Se deja el pulgar en su lugar para la próxima vez (la barra se desmonta con la pausa).
    setTimeout(() => {
      hecho.current = false;
      x.set(0);
    }, 400);
  };

  const respondedor = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          temporizador.current = setTimeout(disparar, MANTENER_MS);
        },
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dx) > 6 && temporizador.current) {
            clearTimeout(temporizador.current);
            temporizador.current = null;
          }
          x.set(Math.max(0, Math.min(maximo, g.dx)));
        },
        onPanResponderRelease: (_, g) => {
          if (temporizador.current) {
            clearTimeout(temporizador.current);
            temporizador.current = null;
          }
          if (hecho.current) return;
          const llega = maximo > 0 && (g.dx >= maximo * UMBRAL || g.vx >= VELOCIDAD_QUE_ALCANZA);
          if (llega) {
            x.set(withTiming(maximo, { duration: 120 }));
            disparar();
          } else {
            x.set(reducir ? withTiming(0, { duration: 160 }) : withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: g.vx * 1000 }));
          }
        },
        onPanResponderTerminate: () => {
          if (temporizador.current) clearTimeout(temporizador.current);
          temporizador.current = null;
          x.set(withTiming(0, { duration: 160 }));
        },
      }),
    // `disparar` lee refs: no cambia de efecto entre dibujos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maximo, reducir, x],
  );

  const estiloPulgar = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const estiloTexto = useAnimatedStyle(() => ({ opacity: maximo > 0 ? 1 - Math.min(1, x.get() / maximo) * 0.9 : 1 }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={TEXTOS_DE_LA_CARRERA.pausarAccesible}
      accessibilityHint="Desliza hacia la derecha, o mantén presionado, para pausar"
      accessibilityActions={[{ name: 'activate', label: TEXTOS_DE_LA_CARRERA.pausarAccesible }]}
      onAccessibilityAction={e => {
        if (e.nativeEvent.actionName === 'activate') disparar();
      }}
      style={[estilos.pista, { backgroundColor: c.gold }]}
      {...respondedor.panHandlers}
    >
      <Animated.Text style={[estilos.texto, estiloTexto]}>{TEXTOS_DE_LA_CARRERA.deslizaParaPausar}</Animated.Text>
      <Animated.View style={[estilos.pulgar, estiloPulgar]}>
        <Icon name="pause" size={TAMANO_ICONO.grande} color={c.goldInk} />
      </Animated.View>
      <View style={estilos.flechas} pointerEvents="none">
        <Text style={estilos.flecha}>›››</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pista: { height: ALTO, borderRadius: ALTO / 2, justifyContent: 'center', overflow: 'hidden' },
  texto: { position: 'absolute', alignSelf: 'center', color: '#FFFFFF', fontFamily: fuentes.seminegrita, fontSize: 16 },
  pulgar: {
    position: 'absolute',
    left: MARGEN,
    width: PULGAR,
    height: PULGAR,
    borderRadius: PULGAR / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flechas: { position: 'absolute', right: 20 },
  flecha: { color: 'rgba(255,255,255,0.7)', fontFamily: fuentes.negrita, fontSize: 18 },
});
