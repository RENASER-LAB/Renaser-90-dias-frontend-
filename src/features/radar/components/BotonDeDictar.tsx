import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';

/** Cuánto baja la luz del círculo en el punto bajo de la respiración (1 = llena). */
const OPACIDAD_BAJA = 0.45;
/** Media respiración: una ida o una vuelta. La respiración entera dura 1,3 s, tranquila, sin llamar la atención. */
const MEDIA_RESPIRACION_MS = 650;

/** Lado del área táctil y del círculo que se dibuja dentro de ella. */
export const LADO_DEL_AREA = 44;
export const LADO_DEL_CIRCULO = 36;

/**
 * El micrófono de «Dictar» del Código Renaser, de SOLO ícono, que vive DENTRO del campo de cada respuesta, abajo a la derecha, como
 * en un buscador (2026-11-03, opción C del dueño: «Dictar dentro del campo»). Ya no hay «Escuchar»: con solo leer la pregunta basta.
 *
 * - **Se ve chico y se toca grande.** Ícono de 20 en un círculo de 36 que solo se dibuja cuando está activo; el área táctil es de
 *   44 × 44. En reposo no tiene fondo ni borde: solo el ícono, en el gris secundario.
 * - **El estado no depende solo del color.** Activo, el círculo es de lavado dorado con un borde fino y el ícono es dorado; y el lector
 *   de pantalla lo oye como botón «seleccionado» con otro nombre («Parar de dictar la respuesta a …»).
 * - **Mientras dicta, respira.** El círculo dorado sube y baja de opacidad (1 ↔ 0,45 cada 1,3 s): solo `opacity`, en el hilo de la
 *   interfaz, sin re-dibujar nada. Con «reducir movimiento» queda quieto, solo con el color.
 * - **Sin movimiento propio al tocar** más que el hundimiento de `Presionable` (0,97 en 120 ms): se toca varias veces por formulario.
 */
export function BotonDeDictar({
  activo,
  nombreAccesible,
  nombreAccesibleActivo,
  deshabilitado,
  alPresionar,
}: {
  activo: boolean;
  nombreAccesible: string;
  nombreAccesibleActivo: string;
  deshabilitado?: boolean;
  alPresionar: () => void;
}) {
  const { c } = useTheme();
  const reducir = useReducedMotion();
  const luz = useSharedValue(1);
  const respira = activo && !reducir;

  useEffect(() => {
    if (!respira) {
      cancelAnimation(luz);
      luz.set(1);
      return;
    }
    const config = { duration: MEDIA_RESPIRACION_MS, easing: Easing.inOut(Easing.ease) };
    luz.set(withRepeat(withSequence(withTiming(OPACIDAD_BAJA, config), withTiming(1, config)), -1, false));
    return () => cancelAnimation(luz);
  }, [respira, luz]);

  const estiloDeLaLuz = useAnimatedStyle(() => ({ opacity: luz.get() }));

  return (
    <Presionable
      onPress={alPresionar}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={activo ? nombreAccesibleActivo : nombreAccesible}
      accessibilityState={{ selected: activo, disabled: !!deshabilitado }}
      style={[estilos.area, { opacity: deshabilitado ? 0.4 : 1 }]}
    >
      <View style={estilos.circulo}>
        {activo ? (
          <Animated.View
            pointerEvents="none"
            style={[estilos.luz, { backgroundColor: c.goldWash, borderColor: c.goldInk }, estiloDeLaLuz]}
          />
        ) : null}
        <Icon name="mic" size={20} color={activo ? c.goldInk : c.textSoft} />
      </View>
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  area: { width: LADO_DEL_AREA, height: LADO_DEL_AREA, alignItems: 'center', justifyContent: 'center' },
  circulo: {
    width: LADO_DEL_CIRCULO,
    height: LADO_DEL_CIRCULO,
    borderRadius: LADO_DEL_CIRCULO / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  luz: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: LADO_DEL_CIRCULO / 2, borderWidth: 1 },
});
