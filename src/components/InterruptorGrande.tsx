import { fuentes } from '../theme/fuentes';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  Extrapolation,
} from 'react-native-reanimated';

import { useTheme } from '../theme/ThemeContext';
import { CURVA_EN_PANTALLA, DURACION_MS } from '../theme/movimiento';
import { tacto } from '../utils/tacto';
import { Presionable } from './Presionable';

/**
 * El interruptor GRANDE con su fila (spec 009, «Cómo suena», 2026-10-20): una fila entera que se toca —rótulo,
 * una línea que explica qué pasa y el interruptor a la derecha— para quien lee y toca despacio.
 *
 * ## Por qué uno aparte de `Interruptor`
 *
 * `Interruptor` (51 × 31) es el de Yo, Plan y Eventos. Agrandarlo cambiaría esas pantallas sin que nadie lo pidiera.
 * Este es para una pantalla pensada para personas de 40 años en adelante (pedido del dueño): riel de **72 × 40**,
 * pulgar blanco de **34** con sombra suave, la fila de **56 o más** de alto en la que se toca en cualquier parte, el
 * rótulo a **17** y la explicación a **15**.
 *
 * ## Cómo se lee el estado (nunca solo por el color)
 *
 * - **Encendido**: riel dorado del tema, pulgar a la derecha y «Sí» en el riel.
 * - **Apagado**: riel gris, pulgar a la izquierda y «No» en el riel.
 * - **Varía** (los días marcados no coinciden): riel gris, pulgar en el medio con un guion y, bajo el riel, la palabra
 *   «Varía». Al tocarlo pasa a encendido para todos.
 *
 * Contraste (medido): el gris del riel apagado contra la tarjeta es de 3,2 : 1 en claro y 3,4 : 1 en oscuro; el dorado
 * encendido, 2,9 : 1 en claro y 7 : 1 en oscuro. Lo que no llega lo completa la posición del pulgar y el «Sí» / «No».
 *
 * ## Movimiento (`emil-design-eng`, `animate-expo`)
 *
 * Un cambio de estado chico: el pulgar se desplaza 180 ms (`DURACION_MS.seleccion`) con la curva de lo que se mueve
 * sobre la pantalla, en el hilo de la interfaz. Con «reducir movimiento» salta al instante (el color, el «Sí» / «No» y la
 * posición cambian igual: el estado se entiende sin ver el desplazamiento). La fila se hunde un 3 % al apoyar el dedo
 * (`Presionable`) y `tacto.seleccion()` da UN «tic» en el mismo toque que cambia el estado.
 *
 * ## Accesible
 *
 * Rol `switch` con `checked` (`'mixed'` en «Varía»), el rótulo como nombre y la explicación como ayuda. El área táctil
 * es toda la fila. Controlado, como `Interruptor`: quien lo usa decide el valor y recibe el nuevo.
 */

export const ANCHO_RIEL_GRANDE = 72;
export const ALTO_RIEL_GRANDE = 40;
export const MARGEN_DEL_PULGAR_GRANDE = 3;
export const PULGAR_GRANDE = ALTO_RIEL_GRANDE - MARGEN_DEL_PULGAR_GRANDE * 2; // 34
/** Lo que viaja el pulgar de apagado a encendido. */
export const RECORRIDO_DEL_PULGAR_GRANDE = ANCHO_RIEL_GRANDE - PULGAR_GRANDE - MARGEN_DEL_PULGAR_GRANDE * 2; // 32
/** El alto mínimo de la fila (AGENTS.md §4: 48–52; acá más, para la mano que no es tan firme). */
export const ALTO_MINIMO_DE_LA_FILA = 56;

/** Gris del riel apagado (tonos medidos contra la tarjeta del tema, ver arriba). */
const GRIS_APAGADO = { light: '#948E82', dark: '#6E6A62' } as const;

/** Lo que muestra el interruptor. `'varia'` = los días marcados no coinciden. */
export type ValorDelInterruptorGrande = boolean | 'varia';

/** La posición del pulgar según el valor: 0 apagado, 1 encendido, 0,5 en el medio (varía). */
export function posicionDelPulgar(valor: ValorDelInterruptorGrande): number {
  return valor === 'varia' ? 0.5 : valor ? 1 : 0;
}

/** El valor que pide un toque: apagado y «Varía» pasan a encendido; encendido pasa a apagado. */
export function valorTrasElToque(valor: ValorDelInterruptorGrande): boolean {
  return valor === true ? false : true;
}

export function InterruptorGrande({
  etiqueta,
  descripcion,
  valor,
  onCambiar,
  deshabilitado = false,
  testID,
}: {
  /** El rótulo de la fila, a 17 px. También es el nombre para el lector de pantalla. */
  etiqueta: string;
  /**
   * Lo que pasa, en una línea corta, a 15 px. El lector de pantalla la oye como ayuda. Vacía (`''`) no dibuja la línea:
   * el rótulo se explica solo (Mi Radar, spec 019: «Encendido»).
   */
  descripcion: string;
  valor: ValorDelInterruptorGrande;
  /** Recibe el valor NUEVO (de «Varía» pasa a `true`). */
  onCambiar: (nuevo: boolean) => void;
  deshabilitado?: boolean;
  testID?: string;
}) {
  const { c, mode } = useTheme();
  const reducirMovimiento = useReducedMotion();
  const posicion = useSharedValue(posicionDelPulgar(valor));
  const encendido = useSharedValue(valor === true ? 1 : 0);

  useEffect(() => {
    const destino = posicionDelPulgar(valor);
    const color = valor === true ? 1 : 0;
    if (reducirMovimiento) {
      posicion.set(destino);
      encendido.set(color);
      return;
    }
    const config = { duration: DURACION_MS.seleccion, easing: CURVA_EN_PANTALLA, reduceMotion: ReduceMotion.System };
    posicion.set(withTiming(destino, config));
    encendido.set(withTiming(color, config));
  }, [valor, reducirMovimiento, posicion, encendido]);

  const gris = GRIS_APAGADO[mode === 'dark' ? 'dark' : 'light'];
  const colorDelTextoApagado = mode === 'dark' ? c.textStrong : c.text;

  const estiloRiel = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(encendido.get(), [0, 1], [gris, c.gold]),
  }));
  const estiloPulgar = useAnimatedStyle(() => ({
    transform: [{ translateX: posicion.get() * RECORRIDO_DEL_PULGAR_GRANDE }],
  }));
  // «Sí» se ve con el pulgar a la derecha y «No» con el pulgar a la izquierda; en el medio (varía) ninguno.
  const estiloSi = useAnimatedStyle(() => ({
    opacity: interpolate(posicion.get(), [0.5, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const estiloNo = useAnimatedStyle(() => ({
    opacity: interpolate(posicion.get(), [0, 0.5], [1, 0], Extrapolation.CLAMP),
  }));

  const varia = valor === 'varia';

  return (
    <Presionable
      testID={testID}
      onPress={() => {
        tacto.seleccion();
        onCambiar(valorTrasElToque(valor));
      }}
      disabled={deshabilitado}
      accessibilityRole="switch"
      accessibilityLabel={etiqueta}
      accessibilityHint={descripcion || undefined}
      accessibilityState={{ checked: varia ? 'mixed' : valor, disabled: deshabilitado }}
      accessibilityValue={varia ? { text: 'Varía según el día' } : undefined}
      // react-native-web 0.21 ignora `accessibilityState`: sin `aria-checked` el lector de la web no dice el estado.
      aria-checked={varia ? 'mixed' : valor}
      contenedorStyle={estilos.area}
      style={[estilos.fila, deshabilitado && estilos.deshabilitado]}
    >
      <View style={estilos.textos}>
        <Text style={[estilos.etiqueta, { color: c.text }]}>{etiqueta}</Text>
        {descripcion ? <Text style={[estilos.descripcion, { color: c.textSoft }]}>{descripcion}</Text> : null}
      </View>

      <View style={estilos.columnaDelRiel}>
        <Animated.View style={[estilos.riel, estiloRiel]}>
          <Animated.Text
            style={[estilos.textoDelRiel, estilos.si, { color: c.onGold }, estiloSi]}
            importantForAccessibility="no"
            accessibilityElementsHidden
          >
            Sí
          </Animated.Text>
          <Animated.Text
            style={[estilos.textoDelRiel, estilos.no, { color: colorDelTextoApagado }, estiloNo]}
            importantForAccessibility="no"
            accessibilityElementsHidden
          >
            No
          </Animated.Text>
          <Animated.View
            style={[
              estilos.pulgar,
              { backgroundColor: mode === 'dark' ? c.textStrong : c.cardBgAlt },
              estiloPulgar,
            ]}
          >
            {varia && <View style={[estilos.guion, { backgroundColor: c.textSoft }]} />}
          </Animated.View>
        </Animated.View>
        {varia && <Text style={[estilos.palabraVaria, { color: c.text }]}>Varía</Text>}
      </View>
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  area: { width: '100%' },
  fila: {
    minHeight: ALTO_MINIMO_DE_LA_FILA,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  deshabilitado: { opacity: 0.5 },
  textos: { flex: 1, flexShrink: 1, gap: 2 },
  // 17 px el rótulo y 15 la explicación: lo que se lee sin acercar el teléfono (pedido del dueño, 40+).
  etiqueta: { fontSize: 17, lineHeight: 23, fontFamily: fuentes.media, letterSpacing: 0 },
  descripcion: { fontSize: 15, lineHeight: 21, fontFamily: fuentes.regular, letterSpacing: 0 },
  columnaDelRiel: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  riel: {
    width: ANCHO_RIEL_GRANDE,
    height: ALTO_RIEL_GRANDE,
    borderRadius: ALTO_RIEL_GRANDE / 2,
    padding: MARGEN_DEL_PULGAR_GRANDE,
    justifyContent: 'center',
  },
  pulgar: {
    width: PULGAR_GRANDE,
    height: PULGAR_GRANDE,
    borderRadius: PULGAR_GRANDE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  guion: { width: 14, height: 3, borderRadius: 2 },
  textoDelRiel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    textAlignVertical: 'center',
    lineHeight: ALTO_RIEL_GRANDE,
    fontSize: 14,
    fontFamily: fuentes.negrita,
    letterSpacing: 0,
  },
  // Del lado contrario al pulgar: con él a la derecha se lee «Sí» a la izquierda, y al revés.
  si: { left: 11 },
  no: { right: 10 },
  palabraVaria: { fontSize: 15, lineHeight: 18, fontFamily: fuentes.negrita, letterSpacing: 0 },
});
