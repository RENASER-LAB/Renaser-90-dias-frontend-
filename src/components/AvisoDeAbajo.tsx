import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { DIAMETRO, SEPARACION } from '../features/renasia/components/lugarDelLanzador';
import { CURVA_SALIDA } from '../theme/movimiento';
import { useTheme } from '../theme/ThemeContext';
import { Icon, TAMANO_ICONO } from './Icon';

/** Cuánto queda a la vista antes de irse sola. */
export const AVISO_DE_ABAJO_VISIBLE_MS = 2500;
/** Entra en 200 ms con ease-out fuerte y sale en 150: lo que responde, más rápido que lo que se posa. */
export const ENTRADA_MS = 200;
export const SALIDA_MS = 150;
/** Cuánto sube al entrar. */
export const RECORRIDO = 8;
/** Aire entre el aviso y lo que flota debajo (el botón de SER). */
const AIRE = 8;

/**
 * Dónde va el aviso, contado desde el borde de abajo de la SECCIÓN que lo dibuja: justo encima del orbe de SER. Las
 * secciones (el Muro, «Publicaciones ocultas») ya terminan sobre la caja de la barra de pestañas, que reserva su alto y el
 * borde seguro, así que acá no se vuelven a sumar `ALTO_TAB_BAR` ni el borde seguro: sumarlos dejaba el aviso ~110 dp por
 * encima del orbe, tapando la foto de la publicación (E2E del 2026-10-31). Cuando la barra se esconde al desplazar, la
 * sección crece y el orbe baja lo mismo, así que la distancia entre los dos no cambia.
 */
export function alturaDelAviso(): number {
  return SEPARACION + DIAMETRO + AIRE;
}


/**
 * Un aviso «snackbar», abajo (pedido del dueño, 2026-10-31, tras ver «Publicación oculta» flotando con fondo transparente
 * sobre los círculos de las secciones del Muro): como WhatsApp o Instagram, **nunca sobre la cabecera**; va abajo, encima de
 * los botones flotantes de SER y de la barra de pestañas, con fondo opaco, borde y una sombra suave, el ✓ dorado y el
 * texto de 16 px. No recibe toques: dice lo que pasó y se va solo.
 *
 * Movimiento (`emil-design-eng`, `animate-expo`): se ve ocasionalmente, así que entra con fundido y 8 px de subida en 200 ms
 * con ease-out fuerte y sale en 150 ms; con «reducir movimiento», solo el fundido. Solo `opacity` y `transform` en el hilo de
 * la interfaz (valores compartidos; no `entering`, E-504). Un aviso nuevo (otra `clave`) con uno ya a la vista cambia el
 * texto y reinicia la cuenta sin volver a entrar.
 *
 * `aviso` es `null` cuando no hay nada que decir; quien lo muestra lo vuelve a poner en `null` en `onTerminar` (cuando el aviso
 * terminó de irse). El háptico (`tacto.logro()`) lo dispara quien lo muestra, en el mismo instante de la acción.
 */
export function AvisoDeAbajo({
  aviso,
  onTerminar,
  abajo,
  visibleMs = AVISO_DE_ABAJO_VISIBLE_MS,
}: {
  aviso: { clave: number; texto: string } | null;
  onTerminar: () => void;
  /** Distancia al borde de abajo; por defecto, encima de los botones flotantes. */
  abajo?: number;
  visibleMs?: number;
}) {
  const { c } = useTheme();
  const reducir = useReducedMotion();
  const visible = useSharedValue(0);
  const alTerminar = useRef(onTerminar);
  alTerminar.current = onTerminar;
  const clave = aviso?.clave;
  const texto = aviso?.texto;

  useEffect(() => {
    if (clave === undefined) return;
    visible.set(withTiming(1, { duration: ENTRADA_MS, easing: CURVA_SALIDA }));
    if (texto) AccessibilityInfo.announceForAccessibility?.(texto);
    let fin: ReturnType<typeof setTimeout> | undefined;
    const salida = setTimeout(() => {
      visible.set(withTiming(0, { duration: SALIDA_MS, easing: CURVA_SALIDA }));
      fin = setTimeout(() => alTerminar.current(), SALIDA_MS);
    }, visibleMs);
    return () => {
      clearTimeout(salida);
      if (fin) clearTimeout(fin);
    };
    // El texto se anuncia con la `clave` nueva; cambiarlo con la misma clave no reinicia nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, visibleMs, visible]);

  const estilo = useAnimatedStyle(() => ({
    opacity: visible.get(),
    transform: [{ translateY: reducir ? 0 : (1 - visible.get()) * RECORRIDO }],
  }));

  if (!aviso) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
      testID="aviso-de-abajo"
      style={[
        estilos.aviso,
        // Opaco: `cardBgAlt` es blanco en claro y la superficie elevada en oscuro, sin transparencia.
        { bottom: abajo ?? alturaDelAviso(), backgroundColor: c.cardBgAlt, borderColor: c.borderStrong },
        estilo,
      ]}
    >
      <View style={[estilos.marca, { backgroundColor: c.gold }]}>
        <Icon name="check" size={TAMANO_ICONO.chico} color={c.onGold} />
      </View>
      <Text style={[estilos.texto, { color: c.textStrong }]}>{aviso.texto}</Text>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  aviso: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  marca: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1, fontFamily: 'Jost_500Medium', fontSize: 16, lineHeight: 22 },
});
