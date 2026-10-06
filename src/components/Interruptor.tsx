import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme/ThemeContext';
import { CURVA_EN_PANTALLA, DURACION_MS } from '../theme/movimiento';
import { tacto } from '../utils/tacto';

/** Medidas del interruptor de iOS: riel de 51 × 31 con un pulgar de 27. */
const ANCHO_RIEL = 51;
const ALTO_RIEL = 31;
const MARGEN = 2;
const PULGAR = ALTO_RIEL - MARGEN * 2;
/** Lo que viaja el pulgar de apagado a encendido. */
export const RECORRIDO_DEL_PULGAR = ANCHO_RIEL - PULGAR - MARGEN * 2;

/**
 * El interruptor de la app (Yo, 2026-10-05): reemplaza al `Switch` de React Native con colores
 * escritos a mano (`'#332C20'`, `'#888'`, `'#1E1B18'`).
 *
 * **Por qué uno propio y no el `Switch` con los colores del tema.** En la web, `react-native-web`
 * pinta el pulgar encendido con su `activeThumbColor`, que por defecto es `#009688`: el verde
 * azulado que se veía en Yo → Notificaciones. Y en Android el `Switch` es el de Material, con otra
 * forma que en iOS. Este se dibuja igual en los tres y sale del tema:
 *
 * - **Encendido**: riel `gold`, pulgar blanco a la derecha.
 * - **Apagado**: riel `borderStrong`, pulgar blanco a la izquierda. El estado lo dicen la POSICIÓN y
 *   el color del riel juntos, nunca el color solo.
 * - El pulgar es blanco en los dos modos, como en iOS: `cardBgAlt` en claro y `textStrong` en
 *   oscuro (los dos son blanco puro; ningún token es «blanco» en ambos).
 *
 * **Movimiento** (`animate-expo`): un cambio de estado chico, 180 ms (`DURACION_MS.seleccion`), con
 * la curva de lo que se desplaza en pantalla, en el hilo de la interfaz. Con «reducir movimiento» el
 * pulgar salta y el color cambia igual. **Tacto**: `tacto.seleccion()` en el mismo toque que mueve
 * el pulgar, una vez por cambio; nunca es la única señal.
 *
 * **Accesible**: rol `switch` con `checked`, y un nombre fijo (`etiqueta`): el lector ya anuncia
 * «activado / desactivado», así que el nombre no lleva la acción. El área táctil llega a 48 de
 * alto aunque el riel mida 31.
 *
 * Es controlado, como el `Switch`: quien lo usa decide el valor (y lo devuelve si el servidor
 * rechaza el cambio).
 */
export function Interruptor({
  valor,
  onCambiar,
  etiqueta,
  deshabilitado = false,
}: {
  valor: boolean;
  onCambiar: (nuevo: boolean) => void;
  /** El nombre para el lector de pantalla: lo que se prende o se apaga («Modo oscuro»). */
  etiqueta: string;
  deshabilitado?: boolean;
}) {
  const { c, mode } = useTheme();
  const progreso = useSharedValue(valor ? 1 : 0);

  useEffect(() => {
    progreso.set(
      withTiming(valor ? 1 : 0, {
        duration: DURACION_MS.seleccion,
        easing: CURVA_EN_PANTALLA,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [valor, progreso]);

  const apagado = c.borderStrong;
  const encendido = c.gold;
  const estiloRiel = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progreso.get(), [0, 1], [apagado, encendido]),
  }));
  const estiloPulgar = useAnimatedStyle(() => ({
    transform: [{ translateX: progreso.get() * RECORRIDO_DEL_PULGAR }],
  }));

  return (
    <Pressable
      onPress={() => {
        tacto.seleccion();
        onCambiar(!valor);
      }}
      disabled={deshabilitado}
      accessibilityRole="switch"
      accessibilityLabel={etiqueta}
      accessibilityState={{ checked: valor, disabled: deshabilitado }}
      // react-native-web 0.21 ignora `accessibilityState`: sin `aria-checked` el lector de pantalla
      // de la web no dice si está activado (medido con Playwright: `checked: null`).
      aria-checked={valor}
      hitSlop={8}
      style={[estilos.area, deshabilitado && estilos.deshabilitado]}
    >
      <Animated.View style={[estilos.riel, estiloRiel]}>
        <Animated.View
          style={[
            estilos.pulgar,
            { backgroundColor: mode === 'dark' ? c.textStrong : c.cardBgAlt },
            estiloPulgar,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  area: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'flex-end' },
  deshabilitado: { opacity: 0.5 },
  riel: { width: ANCHO_RIEL, height: ALTO_RIEL, borderRadius: ALTO_RIEL / 2, padding: MARGEN, justifyContent: 'center' },
  pulgar: {
    width: PULGAR,
    height: PULGAR,
    borderRadius: PULGAR / 2,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
