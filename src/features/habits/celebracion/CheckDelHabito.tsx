import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { CURVA_SALIDA } from '../../../theme/movimiento';
import { tomarPuntosDe } from '../eventos/habitoCumplido';
import {
  AMORTIGUACION_DEL_REBOTE,
  ESCALA_INICIAL_DEL_CHECK,
  MOMENTO_MS,
  SUBIDA_DE_LOS_PUNTOS,
  planDelMomento,
  seCumplioRecien,
  type PlanDelMomento,
} from './momentoDelHabito';

/**
 * Lo de adentro de la casilla de un hábito (2026-10-07): el disco dorado con el ✓ y, al cumplirse, el «+N» que sube.
 * La casilla en sí (el borde, el toque, el hundirse al apretar) sigue siendo el `Presionable` de la tarjeta.
 *
 * Todo corre en el hilo de la interfaz (valores compartidos, solo `transform` y `opacity`): cumplir un hábito no
 * vuelve a dibujar la lista, solo este componente, una vez, para poner el texto de los puntos.
 */
export function CheckDelHabito({ registroId, cumplido }: { registroId: string; cumplido: boolean }) {
  const { c } = useTheme();
  const reducido = useReducedMotion();
  const anterior = useRef(cumplido);
  const [puntos, setPuntos] = useState<string | null>(null);

  const relleno = useSharedValue(cumplido ? 1 : 0);
  const escala = useSharedValue(1);
  const puntosVisibles = useSharedValue(0);
  const puntosY = useSharedValue(0);

  useEffect(() => {
    const antes = anterior.current;
    anterior.current = cumplido;
    if (!seCumplioRecien(antes, cumplido)) {
      relleno.set(cumplido ? 1 : 0);
      return;
    }
    const plan = planDelMomento(tomarPuntosDe(registroId), reducido);
    setPuntos(plan.puntos);
    llenarElCheck(plan, relleno, escala);
    hacerSubirLosPuntos(plan, puntosVisibles, puntosY);
  }, [cumplido, registroId, reducido, relleno, escala, puntosVisibles, puntosY]);

  const estiloDelDisco = useAnimatedStyle(() => ({
    opacity: relleno.get(),
    transform: [{ scale: escala.get() }],
  }));
  const estiloDeLosPuntos = useAnimatedStyle(() => ({
    opacity: puntosVisibles.get(),
    transform: [{ translateY: puntosY.get() }],
  }));

  return (
    <>
      <Animated.View style={[styles.disco, { backgroundColor: c.gold }, estiloDelDisco]} testID="check-del-habito-disco">
        <Icon name="check" size={TAMANO_ICONO.chico} color={c.onGold} strokeWidth={2.2} />
      </Animated.View>
      {puntos !== null && (
        <Animated.View
          pointerEvents="none"
          style={[styles.puntos, estiloDeLosPuntos]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="check-del-habito-puntos"
        >
          <Text style={[styles.textoPuntos, { color: c.goldInk }]} numberOfLines={1}>
            {puntos}
          </Text>
        </Animated.View>
      )}
    </>
  );
}

type Valor = ReturnType<typeof useSharedValue<number>>;

/** El disco se llena; con movimiento, además rebota desde 0.8 con un resorte que pasa apenas de 1 y se posa. */
function llenarElCheck(plan: PlanDelMomento, relleno: Valor, escala: Valor): void {
  relleno.set(withTiming(1, { duration: MOMENTO_MS.fundido, easing: CURVA_SALIDA }));
  if (plan.check !== 'rebote') return;
  escala.set(
    withSequence(
      withTiming(ESCALA_INICIAL_DEL_CHECK, { duration: 0 }),
      withSpring(1, { duration: MOMENTO_MS.check, dampingRatio: AMORTIGUACION_DEL_REBOTE }),
    ),
  );
}

/** El «+N» entra, se queda un instante y se va; con movimiento, sube mientras tanto (ease-out: arranca y se posa). */
function hacerSubirLosPuntos(plan: PlanDelMomento, visibles: Valor, y: Valor): void {
  const quieto = MOMENTO_MS.puntos - MOMENTO_MS.puntosEntrada - MOMENTO_MS.puntosSalida;
  visibles.set(
    withSequence(
      withTiming(1, { duration: MOMENTO_MS.puntosEntrada, easing: CURVA_SALIDA }),
      withDelay(quieto, withTiming(0, { duration: MOMENTO_MS.puntosSalida, easing: CURVA_SALIDA })),
    ),
  );
  y.set(withSequence(withTiming(0, { duration: 0 }), withTiming(plan.puntosSuben ? -SUBIDA_DE_LOS_PUNTOS : 0, {
    duration: MOMENTO_MS.puntos,
    easing: CURVA_SALIDA,
  })));
}

const styles = StyleSheet.create({
  disco: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Centrado sobre la casilla y más ancho que ella: «Registrado» no entra en 28 px. Fuera del flujo, no mueve nada. */
  puntos: {
    position: 'absolute',
    bottom: '100%',
    left: -48,
    right: -48,
    alignItems: 'center',
  },
  textoPuntos: { fontFamily: 'Jost_700Bold', fontSize: 13, letterSpacing: 0.2 },
});
