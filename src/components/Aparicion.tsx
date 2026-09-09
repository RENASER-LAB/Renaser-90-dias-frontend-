import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleProp, ViewStyle } from 'react-native';

/**
 * Entrada escalonada para bloques de una pantalla: aparece con una opacidad y un
 * desplazamiento corto hacia arriba.
 *
 * Por que `Animated` y no GSAP: GSAP anima nodos del DOM y aqui no hay DOM. En React Native
 * el equivalente es `Animated`, que ya viene con el runtime y no anade dependencia.
 *
 * `useNativeDriver` deja la animacion en el hilo de UI, asi que no se entrecorta cuando el
 * hilo de JS esta ocupado pintando la lista o resolviendo una peticion.
 *
 * Si el sistema tiene activada la reduccion de movimiento (AGENTS.md y las pautas de
 * accesibilidad de iOS/Android), el contenido aparece ya colocado: sin desplazamiento ni
 * desvanecido. No se "acorta" la animacion, se omite.
 */
export function Aparicion({
  children,
  retardo = 0,
  desplazamiento = 10,
  style,
}: {
  children: React.ReactNode;
  /** Milisegundos de espera antes de entrar. Escalona los bloques de una misma pantalla. */
  retardo?: number;
  /** Pixeles que sube al entrar. */
  desplazamiento?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [movimientoReducido, setMovimientoReducido] = useState<boolean | null>(null);
  const progreso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(v => { if (vivo) setMovimientoReducido(v); })
      .catch(() => { if (vivo) setMovimientoReducido(false); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => setMovimientoReducido(v));
    return () => { vivo = false; sub.remove(); };
  }, []);

  useEffect(() => {
    // Mientras no sepamos la preferencia no animamos: evita un parpadeo al resolverse.
    if (movimientoReducido === null) return;
    if (movimientoReducido) {
      progreso.setValue(1);
      return;
    }
    const animacion = Animated.timing(progreso, {
      toValue: 1,
      duration: 260,
      delay: retardo,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animacion.start();
    return () => animacion.stop();
  }, [movimientoReducido, progreso, retardo]);

  if (movimientoReducido === null) {
    // Primer pintado: visible y quieto. Nunca se oculta contenido esperando a una animacion.
    return <Animated.View style={style}>{children}</Animated.View>;
  }

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progreso,
          transform: [
            { translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [desplazamiento, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
