import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
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
  ESCALA_DEL_POP,
  ESCALA_INICIAL_DEL_CHECK,
  ESCALA_REGISTRANDO,
  MOMENTO_MS,
  RELLENO_REGISTRANDO,
  RELLENO_RESPIRANDO,
  SUBIDA_DE_LOS_PUNTOS,
  demoraDeLaCelebracion,
  planDelMomento,
  seCumplioRecien,
  type PlanDelMomento,
} from './momentoDelHabito';
import { anunciarALaTarjeta, escucharLaTarjeta, estaRegistrando } from './momentoEnLaTarjeta';

/**
 * Lo de adentro de la casilla de un hábito (2026-10-07): el disco dorado con el ✓ y, al cumplirse, el «+N pts» que
 * sube. La casilla en sí (el borde, el toque, el hundirse a 0.92 al apretar) es el `Presionable` de la tarjeta.
 *
 * Tres momentos (ver `momentoDelHabito.ts`): `registrando` (al soltar el dedo, antes de la respuesta), la confirmación
 * (cuando `cumplido` pasa a true) y el `fallo` (vuelve atrás). Todo corre en el hilo de la interfaz con valores
 * compartidos, solo `transform` y `opacity`; React vuelve a dibujar este componente una sola vez, para poner el texto
 * de los puntos.
 */
export function CheckDelHabito({ registroId, cumplido }: { registroId: string; cumplido: boolean }) {
  const { c } = useTheme();
  const reducido = useReducedMotion();
  const anterior = useRef(cumplido);
  const [puntos, setPuntos] = useState<string | null>(null);

  const relleno = useSharedValue(cumplido ? 1 : 0);
  const escala = useSharedValue(1);
  const visto = useSharedValue(cumplido ? 1 : 0);
  const puntosVisibles = useSharedValue(0);
  const puntosY = useSharedValue(0);

  /* Antes de la respuesta: responder al toque, y volver atrás si el servidor no confirmó. */
  useEffect(
    () =>
      escucharLaTarjeta(registroId, evento => {
        if (evento.tipo === 'registrando') empezarALlenar(reducido, { relleno, escala, visto });
        if (evento.tipo === 'fallo') vaciar({ relleno, escala, visto });
      }),
    [registroId, reducido, relleno, escala, visto],
  );

  /*
   * `useLayoutEffect` y no `useEffect`: la celebración arranca en el MISMO cuadro en que la tarjeta se dibuja cumplida
   * (borde, «Ver»). Con `useEffect`, en el emulador de depuración el check quedó ~230 ms a medio llenar con la tarjeta
   * ya marcada: el efecto pasivo esperaba a que el hilo de JS terminara la recarga que va detrás del cierre.
   */
  useLayoutEffect(() => {
    const antes = anterior.current;
    anterior.current = cumplido;
    if (!seCumplioRecien(antes, cumplido)) {
      relleno.set(cumplido ? 1 : 0);
      visto.set(cumplido ? 1 : 0);
      escala.set(1);
      return;
    }
    const empezoEnLaTarjeta = estaRegistrando(registroId);
    const demora = demoraDeLaCelebracion(empezoEnLaTarjeta);
    const plan = planDelMomento(tomarPuntosDe(registroId), reducido);
    setPuntos(plan.puntos);
    llenarElCheck(plan, { relleno, escala, visto }, { demora, desdeCero: !empezoEnLaTarjeta });
    hacerSubirLosPuntos(plan, demora, puntosVisibles, puntosY);
    anunciarALaTarjeta(registroId, { tipo: 'celebrar', demoraMs: demora });
  }, [cumplido, registroId, reducido, relleno, escala, visto, puntosVisibles, puntosY]);

  const estiloDelDisco = useAnimatedStyle(() => ({
    opacity: relleno.get(),
    transform: [{ scale: escala.get() }],
  }));
  const estiloDelVisto = useAnimatedStyle(() => ({ opacity: visto.get() }));
  const estiloDeLosPuntos = useAnimatedStyle(() => ({
    opacity: puntosVisibles.get(),
    transform: [{ translateY: puntosY.get() }],
  }));

  return (
    <>
      <Animated.View style={[styles.disco, { backgroundColor: c.gold }, estiloDelDisco]} testID="check-del-habito-disco">
        <Animated.View style={estiloDelVisto}>
          <Icon name="check" size={TAMANO_ICONO.chico} color={c.onGold} strokeWidth={2.2} />
        </Animated.View>
      </Animated.View>
      {puntos !== null && (
        <Animated.View
          pointerEvents="none"
          style={[styles.puntos, estiloDeLosPuntos]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="check-del-habito-puntos"
        >
          <Text
            style={[styles.textoPuntos, { color: c.goldInk, backgroundColor: c.cardBg, borderColor: c.gold }]}
            numberOfLines={1}
          >
            {puntos}
          </Text>
        </Animated.View>
      )}
    </>
  );
}

type Valor = ReturnType<typeof useSharedValue<number>>;
type Disco = { relleno: Valor; escala: Valor; visto: Valor };

/**
 * Al soltar el dedo: el disco aparece a medio llenar y respira (opacidad 0.55 ↔ 0.3) hasta que el servidor responda.
 * Sin ✓ todavía: el ✓ es la confirmación. Con «reducir movimiento», solo el fundido a medias, quieto.
 */
function empezarALlenar(reducido: boolean, disco: Disco): void {
  const entrada = { duration: MOMENTO_MS.registrando, easing: CURVA_SALIDA };
  disco.visto.set(0);
  if (reducido) {
    disco.relleno.set(withTiming(RELLENO_REGISTRANDO, entrada));
    return;
  }
  disco.escala.set(withTiming(ESCALA_REGISTRANDO, entrada));
  const respiro = { duration: MOMENTO_MS.respiracion, easing: CURVA_SALIDA };
  disco.relleno.set(
    withSequence(
      withTiming(RELLENO_REGISTRANDO, entrada),
      withRepeat(withSequence(withTiming(RELLENO_RESPIRANDO, respiro), withTiming(RELLENO_REGISTRANDO, respiro)), -1),
    ),
  );
}

/** El servidor dijo que no: el disco se vacía y vuelve a su tamaño, corto y sin rebote. */
function vaciar(disco: Disco): void {
  const salida = { duration: MOMENTO_MS.reversion, easing: CURVA_SALIDA };
  disco.relleno.set(withTiming(0, salida));
  disco.escala.set(withTiming(1, salida));
  disco.visto.set(withTiming(0, salida));
}

/**
 * La confirmación: el disco se llena del todo, aparece el ✓ y, con movimiento, da un «pop» (1.15 y un resorte que lo
 * posa en 1). Si no hubo «registrando» (cierre desde una hoja), arranca desde 0.8, nunca desde la nada.
 */
function llenarElCheck(plan: PlanDelMomento, disco: Disco, cuando: { demora: number; desdeCero: boolean }): void {
  const fundido = { duration: MOMENTO_MS.fundido, easing: CURVA_SALIDA };
  disco.relleno.set(withDelay(cuando.demora, withTiming(1, fundido)));
  disco.visto.set(withDelay(cuando.demora, withTiming(1, fundido)));
  if (plan.check !== 'rebote') {
    disco.escala.set(1);
    return;
  }
  const pop = withTiming(ESCALA_DEL_POP, { duration: MOMENTO_MS.pop, easing: CURVA_SALIDA });
  const posarse = withSpring(1, { duration: MOMENTO_MS.check, dampingRatio: AMORTIGUACION_DEL_REBOTE });
  disco.escala.set(
    withDelay(
      cuando.demora,
      cuando.desdeCero
        ? withSequence(withTiming(ESCALA_INICIAL_DEL_CHECK, { duration: 0 }), pop, posarse)
        : withSequence(pop, posarse),
    ),
  );
}

/** El «+N pts» entra, se queda y se va; con movimiento, sube 32 px durante todo el recorrido (ease-out: se posa). */
function hacerSubirLosPuntos(plan: PlanDelMomento, demora: number, visibles: Valor, y: Valor): void {
  const quieto = MOMENTO_MS.puntos - MOMENTO_MS.puntosEntrada - MOMENTO_MS.puntosSalida;
  visibles.set(
    withDelay(
      demora,
      withSequence(
        withTiming(1, { duration: MOMENTO_MS.puntosEntrada, easing: CURVA_SALIDA }),
        withDelay(quieto, withTiming(0, { duration: MOMENTO_MS.puntosSalida, easing: CURVA_SALIDA })),
      ),
    ),
  );
  y.set(0);
  if (!plan.puntosSuben) return;
  y.set(withDelay(demora, withTiming(-SUBIDA_DE_LOS_PUNTOS, { duration: MOMENTO_MS.puntos, easing: CURVA_DE_SUBIDA })));
}

/**
 * La subida del «+N pts»: un ease-out más suave que `CURVA_SALIDA`. Con la fuerte, el 80 % del recorrido pasaba en los
 * primeros ~150 ms y en el emulador el número parecía quieto; con esta se lo ve subir durante todo el recorrido.
 */
const CURVA_DE_SUBIDA = Easing.out(Easing.cubic);

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
    marginBottom: 2,
    left: -56,
    right: -56,
    alignItems: 'center',
  },
  /* Una pastilla con el fondo de la tarjeta: se lee aunque suba por encima del borde o de la tarjeta de arriba. */
  textoPuntos: {
    fontFamily: 'Jost_700Bold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.2,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
