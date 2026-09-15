import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { Ritmo } from '../utils/ritmoDelDia';

/**
 * Un punto dorado que orbita sobre los anillos del hero de Hoy, al ritmo del día.
 *
 * - `detenido` — quieto arriba. No hizo nada todavía.
 * - `lento` — una vuelta cada 9 s. Va a medias.
 * - `rapido` — una vuelta cada 3 s. Día completo.
 *
 * Qué ritmo toca lo decide `ritmoDelDia`, que es una función pura y probada. Este componente solo
 * sabe animar: **no consulta nada ni decide nada**. Esa separación es la que permite cambiar la
 * señal (el día que el backend calcule coherencia de verdad) sin tocar una línea de animación.
 *
 * ## Tres decisiones que no son de gusto
 *
 * 1. **Se anima la ROTACIÓN de un contenedor, no la posición del punto.** Mover `top`/`left` en
 *    cada frame obliga a recalcular layout 60 veces por segundo en el hilo de JS; rotar usa
 *    `transform`, que corre en el hilo nativo con `useNativeDriver`. Es la diferencia entre una
 *    órbita fluida y una que tironea cuando la pantalla está cargando datos.
 * 2. **Respeta "reducir movimiento" del sistema**, igual que `FondoAnillos`. Si la consulta falla
 *    —pasa en algunas versiones de Android— se queda quieto: equivocarse hacia "sin movimiento"
 *    no molesta a nadie, al revés sí.
 * 3. **Es decorativo para el lector de pantalla** (`accessibilityElementsHidden` y
 *    `pointerEvents="none"`). El estado del día se dice con TEXTO al lado; un punto que gira no
 *    es información para quien no lo ve, y robar un toque en el medio del hero sería peor.
 */
export function ParticulaDeRitmo({ ritmo, diametro }: { ritmo: Ritmo; diametro: number }) {
  const { c } = useTheme();
  const giro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let vivo = true;
    let bucle: Animated.CompositeAnimation | null = null;

    if (ritmo === 'detenido') {
      giro.setValue(0);
      return;
    }

    const arrancar = () => {
      if (!vivo) return;
      giro.setValue(0);
      bucle = Animated.loop(
        Animated.timing(giro, {
          toValue: 1,
          duration: ritmo === 'rapido' ? 3000 : 9000,
          easing: Easing.linear, // una órbita no acelera ni frena: si lo hiciera, parecería un fallo
          useNativeDriver: true,
        })
      );
      bucle.start();
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reducido => {
        if (vivo && !reducido) arrancar();
      })
      .catch(() => {
        /* Sin respuesta del sistema, queda quieto. Ver nota 2 del encabezado. */
      });

    return () => {
      vivo = false;
      bucle?.stop();
    };
  }, [ritmo, giro]);

  const rotacion = giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const tamanoPunto = ritmo === 'detenido' ? 7 : 8;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.orbita,
        {
          width: diametro,
          height: diametro,
          borderRadius: diametro / 2,
          marginLeft: -diametro / 2,
          marginTop: -diametro / 2,
          transform: [{ rotate: rotacion }],
        },
      ]}
    >
      <View
        style={{
          width: tamanoPunto,
          height: tamanoPunto,
          borderRadius: tamanoPunto / 2,
          backgroundColor: c.gold,
          marginTop: -tamanoPunto / 2,
          /* Quieto se ve apagado; en movimiento, encendido. Es la única señal de color: el punto
             nunca se pone rojo ni verde, porque el método no castiga con el color. */
          opacity: ritmo === 'detenido' ? 0.45 : 1,
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  orbita: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    alignItems: 'center',
  },
});
