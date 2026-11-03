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

import { Icon, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';

/** Cuánto baja la luz del círculo en el punto bajo de la respiración (1 = llena). */
const OPACIDAD_BAJA = 0.45;
/** Media respiración: una ida o una vuelta. La respiración entera dura 1,3 s, tranquila, sin llamar la atención. */
const MEDIA_RESPIRACION_MS = 650;

/**
 * Un botón de voz del Código Renaser, de SOLO ícono, que vive en el renglón de la pregunta (2026-11-03, pedido del dueño: «esos
 * botones de escuchar, dictar deben de aparecer allí de manera sutil … el ícono de audio dentro del label»). Los dos —el parlante
 * (escuchar la pregunta) y el micrófono (dictar la respuesta)— son este mismo componente, así que se ven, miden y responden igual.
 *
 * - **Se ve chico y se toca grande.** Ícono de 20 en un círculo de 36 que solo se dibuja cuando está activo; el área táctil es de
 *   44 × 44. En reposo no tiene fondo ni borde: solo el ícono, en el gris secundario.
 * - **El estado no depende solo del color.** Activo cambia el ícono (el parlante pasa a pausa), el color (dorado, con un círculo
 *   de lavado dorado y un borde fino) y el lector de pantalla lo oye como botón «seleccionado» con su nombre completo
 *   («Parar de dictar la respuesta a …»).
 * - **Mientras dicta, respira.** `pulso` hace que el círculo dorado suba y baje de opacidad (1 ↔ 0,45 cada 1,3 s): solo
 *   `opacity`, en el hilo de la interfaz, sin re-dibujar nada. Con «reducir movimiento» queda quieto, solo con el color. El
 *   parlante activo no pulsa: suena la voz y el cambio de ícono ya lo dice.
 * - **Sin movimiento propio al tocar** más que el hundimiento de `Presionable` (0,97 en 120 ms): se toca varias veces por formulario.
 */
export function BotonDeVoz({
  icono,
  iconoActivo,
  activo,
  pulso = false,
  nombreAccesible,
  nombreAccesibleActivo,
  deshabilitado,
  alPresionar,
}: {
  icono: IconName;
  iconoActivo: IconName;
  activo: boolean;
  /** El círculo dorado respira mientras `activo` (el micrófono abierto). */
  pulso?: boolean;
  nombreAccesible: string;
  nombreAccesibleActivo: string;
  deshabilitado?: boolean;
  alPresionar: () => void;
}) {
  const { c } = useTheme();
  const reducir = useReducedMotion();
  const luz = useSharedValue(1);
  const respira = activo && pulso && !reducir;

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
        <Icon name={activo ? iconoActivo : icono} size={20} color={activo ? c.goldInk : c.textSoft} />
      </View>
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  area: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  circulo: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  luz: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 18, borderWidth: 1 },
});
