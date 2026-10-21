import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { CURVA_SALIDA, DURACION_MS } from '../../../theme/movimiento';
import { light } from '../../../theme/tokens';
import { tacto } from '../../../utils/tacto';

/**
 * El interruptor de la consola de Soporte TI (decisión del dueño, 2026-10-21): el mismo riel de
 * `Interruptor`, pero con la **marca dentro del pulgar**: ✕ cuando está apagado y ✓ cuando está
 * prendido («marca ✓ / ✕ en el círculo», de un «toggle set»).
 *
 * **Por qué uno aparte y solo acá.** En la consola, quien lo toca decide si una funcionalidad
 * queda viva o apagada para todos o para un rol: se quiere que el estado se lea sin dudar, sin
 * depender de la posición del pulgar ni del color del riel. El pedido del dueño alcanza **solo a la
 * consola**: `Interruptor` (Yo, Training, Plan, Eventos, Administración) no cambia y sigue siendo
 * el de toda la app (`interruptorDeConsola.test.ts` frena que este se use fuera de la consola).
 *
 * **Cómo se lee** (el estado nunca es solo el color):
 * - **Prendido**: riel `gold`, pulgar a la derecha con ✓.
 * - **Apagado**: riel `borderStrong`, pulgar a la izquierda con ✕.
 * - El pulgar es blanco en los dos modos, como en `Interruptor`: `cardBgAlt` en claro y `textStrong`
 *   en oscuro. Como es blanco siempre, las marcas se pintan con los tonos de la paleta CLARA que se
 *   leen sobre blanco (✓ `goldInk`, 5,0 : 1; ✕ `tabInactive`, 5,2 : 1); en oscuro `goldInk` es el
 *   dorado claro y sobre el pulgar blanco bajaría a 2,4 : 1.
 *
 * **Movimiento** (`emil-design-eng`, `animate-expo`). Se toca pocas veces al día, pero cada vez
 * que se toca se mira: tiene que responder en el mismo cuadro. El pulgar viaja 180 ms
 * (`DURACION_MS.seleccion`) con ease-out fuerte (`CURVA_SALIDA`), sin rebote, en el hilo de la
 * interfaz y solo con `transform` y `opacity` (más el color del riel). La marca no escala: una
 * sale y la otra entra con un fundido, una después de la otra (nunca las dos a medias, que se vería
 * como dos dibujos encimados), atadas a la misma curva del pulgar: la ✕ se va en los primeros
 * ~20 ms y la ✓ llega a pleno hacia los ~80 ms, mientras el pulgar todavía termina de asentarse.
 * Si se vuelve a tocar a mitad de camino, el valor compartido sigue desde donde está.
 * Con «reducir movimiento» no se anima nada: el pulgar, el color y la marca cambian al instante.
 * **Tacto**: `tacto.seleccion()` en el mismo toque, una vez por cambio; nunca es la única señal.
 *
 * **Accesible**: rol `switch` con `checked`, y un nombre fijo (`etiqueta`) que no lleva la acción:
 * el lector ya anuncia «activado / desactivado». Las marcas son decorativas (el estado lo dice
 * `accessibilityState`). El área táctil llega a 48 de alto aunque el riel mida 31.
 *
 * Misma API que `Interruptor` (`valor`, `onCambiar`, `etiqueta`, `deshabilitado`): controlado,
 * quien lo usa decide el valor (y lo devuelve si el servidor rechaza el cambio).
 */

/** Medidas de `Interruptor`: riel de 51 × 31 con un pulgar de 27. Así la fila no cambia de forma. */
export const ANCHO_RIEL_DE_CONSOLA = 51;
export const ALTO_RIEL_DE_CONSOLA = 31;
const MARGEN = 2;
export const PULGAR_DE_CONSOLA = ALTO_RIEL_DE_CONSOLA - MARGEN * 2;
/** Lo que viaja el pulgar de apagado a prendido. */
export const RECORRIDO_DEL_PULGAR_DE_CONSOLA = ANCHO_RIEL_DE_CONSOLA - PULGAR_DE_CONSOLA - MARGEN * 2;

/** Colores de las marcas sobre el pulgar blanco (ver «Cómo se lee»): salen de la paleta clara. */
export const COLOR_DE_LA_CRUZ = light.tabInactive;
export const COLOR_DE_LA_PALOMITA = light.goldInk;

/**
 * Cuánto se ve cada marca según lo avanzado del pulgar (0 apagado, 1 prendido): la ✕ se apaga en la
 * primera mitad del recorrido y la ✓ se enciende en la segunda, así nunca hay dos a medias.
 */
export function opacidadDeLasMarcas(progreso: number): { cruz: number; palomita: number } {
  'worklet';
  const p = Math.max(0, Math.min(1, progreso));
  return { cruz: Math.max(0, 1 - p * 2), palomita: Math.max(0, p * 2 - 1) };
}

export function InterruptorDeConsola({
  valor,
  onCambiar,
  etiqueta,
  deshabilitado = false,
}: {
  valor: boolean;
  onCambiar: (nuevo: boolean) => void;
  /** El nombre para el lector de pantalla: lo que se prende o se apaga («Prendida para todos»). */
  etiqueta: string;
  deshabilitado?: boolean;
}) {
  const { c, mode } = useTheme();
  const reducirMovimiento = useReducedMotion();
  const progreso = useSharedValue(valor ? 1 : 0);

  useEffect(() => {
    const destino = valor ? 1 : 0;
    if (reducirMovimiento) {
      progreso.set(destino);
      return;
    }
    progreso.set(
      withTiming(destino, {
        duration: DURACION_MS.seleccion,
        easing: CURVA_SALIDA,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [valor, reducirMovimiento, progreso]);

  const apagado = c.borderStrong;
  const prendido = c.gold;
  const estiloRiel = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progreso.get(), [0, 1], [apagado, prendido]),
  }));
  const estiloPulgar = useAnimatedStyle(() => ({
    transform: [{ translateX: progreso.get() * RECORRIDO_DEL_PULGAR_DE_CONSOLA }],
  }));
  const estiloCruz = useAnimatedStyle(() => ({ opacity: opacidadDeLasMarcas(progreso.get()).cruz }));
  const estiloPalomita = useAnimatedStyle(() => ({ opacity: opacidadDeLasMarcas(progreso.get()).palomita }));

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
      // de la web no dice si está activado (medido con Playwright en `Interruptor`: `checked: null`).
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
        >
          {/* Las dos marcas, una encima de la otra: solo cambia cuál se ve. Decorativas. */}
          <Animated.View
            testID="marca-apagado"
            style={[estilos.marca, estiloCruz]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Icon name="close" size={TAMANO_ICONO.chico} color={COLOR_DE_LA_CRUZ} />
          </Animated.View>
          <Animated.View
            testID="marca-prendido"
            style={[estilos.marca, estiloPalomita]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Icon name="check" size={TAMANO_ICONO.chico} color={COLOR_DE_LA_PALOMITA} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  area: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'flex-end' },
  deshabilitado: { opacity: 0.5 },
  riel: {
    width: ANCHO_RIEL_DE_CONSOLA,
    height: ALTO_RIEL_DE_CONSOLA,
    borderRadius: ALTO_RIEL_DE_CONSOLA / 2,
    padding: MARGEN,
    justifyContent: 'center',
  },
  pulgar: {
    width: PULGAR_DE_CONSOLA,
    height: PULGAR_DE_CONSOLA,
    borderRadius: PULGAR_DE_CONSOLA / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  marca: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});
