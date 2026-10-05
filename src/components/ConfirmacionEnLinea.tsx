import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '../theme/ThemeContext';
import { CURVA_SALIDA, DURACION_MS } from '../theme/movimiento';
import { Icon, TAMANO_ICONO } from './Icon';

/** Cuánto queda a la vista antes de irse sola: lo justo para leer una línea sin apurarse. */
export const CONFIRMACION_VISIBLE_MS = 4000;

/**
 * Una confirmación que NO interrumpe (Comunidad, 2026-10-05; tanda 3 del rediseño de íconos).
 *
 * Reemplaza a los avisos de éxito que se abrían en un diálogo («¡Publicación Compartida! 🦅»,
 * «¡Hábito completado! 🦅», «¡Excelente Progreso! 🦅»): un diálogo de éxito obliga a tocar «OK»
 * para seguir, y lo que dice ya se ve en la pantalla. Esto es una línea con un ✓ que aparece JUNTO
 * a lo que se acaba de hacer, se lee y se va sola. Los errores siguen en diálogo: esos sí hay que
 * leerlos antes de seguir.
 *
 * Movimiento (`animate-expo`): entra con fundido y 6 px de subida en `DURACION_MS.paso` con
 * ease-out, y sale con un fundido más corto (`fundido`): la salida, más rápida que la entrada. Con
 * «reducir movimiento» no se desplaza, sólo funde. Va con valores compartidos y NO con `entering`
 * de Reanimated, por lo que anota `MarcoDePaso` (en el emulador, `entering` dejó invisible un modal).
 *
 * El háptico (`tacto.logro()`) lo dispara quien la muestra, en el mismo instante: así una sola
 * acción vibra una sola vez aunque el texto se actualice después (publicar y, al rato, el hábito).
 * El lector de pantalla la anuncia al aparecer.
 */
export function ConfirmacionEnLinea({
  texto,
  onTerminar,
  visibleMs = CONFIRMACION_VISIBLE_MS,
}: {
  texto: string;
  /** Se llama cuando terminó de irse: quien la muestra limpia su estado. */
  onTerminar: () => void;
  visibleMs?: number;
}) {
  const { c, t } = useTheme();
  const reducido = useReducedMotion();
  const opacidad = useSharedValue(0);
  const subida = useSharedValue(reducido ? 0 : 6);
  const alTerminar = useRef(onTerminar);
  alTerminar.current = onTerminar;

  useEffect(() => {
    const entrada = { duration: DURACION_MS.paso, easing: CURVA_SALIDA, reduceMotion: ReduceMotion.System };
    opacidad.set(withTiming(1, entrada));
    subida.set(withTiming(0, entrada));
    AccessibilityInfo.announceForAccessibility?.(texto);
    let fin: ReturnType<typeof setTimeout> | undefined;
    const salida = setTimeout(() => {
      opacidad.set(withTiming(0, { duration: DURACION_MS.fundido, easing: CURVA_SALIDA }));
      fin = setTimeout(() => alTerminar.current(), DURACION_MS.fundido);
    }, visibleMs);
    return () => {
      clearTimeout(salida);
      if (fin) clearTimeout(fin);
    };
  }, [texto, visibleMs, opacidad, subida]);

  const estilo = useAnimatedStyle(() => ({
    opacity: opacidad.get(),
    transform: [{ translateY: subida.get() }],
  }));

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
      style={[estilos.caja, { backgroundColor: c.goldWash }, estilo]}
    >
      <View style={[estilos.marca, { backgroundColor: c.gold }]}>
        <Icon name="check" size={TAMANO_ICONO.chico} color={c.onGold} />
      </View>
      <Text style={[t.small, estilos.texto, { color: c.textStrong }]}>{texto}</Text>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
  },
  marca: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    flex: 1,
    fontFamily: 'Jost_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
});
