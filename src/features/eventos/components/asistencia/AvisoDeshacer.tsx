import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '../../../../components/Icon';
import { useTheme } from '../../../../theme/ThemeContext';
import { CURVA_SALIDA, DURACION_MS } from '../../../../theme/movimiento';
import type { Deshacer } from '../../hooks/usePasarLista';
import { DESHACER_VISIBLE_MS } from '../../hooks/usePasarLista';

const TEXTO = { A_TIEMPO: 'a tiempo', TARDE: 'tarde', nada: 'sin marcar' } as const;
const SALIDA_MS = 150;
const RECORRIDO = 8;

/**
 * «Luis Paz: a tiempo · Deshacer» (D-256), abajo de la lista durante ~4 s después de cada toque.
 *
 * Movimiento (`emil-design-eng`, `animate-expo`): **solo la aparición se anima** —fundido y 8 px hacia
 * arriba, 200 ms con ease-out fuerte; sale en 150 ms—. Un toque nuevo con el aviso ya a la vista solo
 * cambia el texto y reinicia la cuenta: no vuelve a entrar, porque se toca decenas de veces seguidas.
 * Con «reducir movimiento», solo el fundido. Valores compartidos de Reanimated (no `entering`: E-504).
 */
export function AvisoDeshacer({
  deshacer,
  alDeshacer,
  alVencer,
  abajo,
}: {
  deshacer: Deshacer | null;
  alDeshacer: () => void;
  alVencer: () => void;
  /** Distancia al borde de abajo (encima del botón de SER). */
  abajo: number;
}) {
  const { c, mode } = useTheme();
  const isDark = mode === 'dark';
  const reducir = useReducedMotion();
  const visible = useSharedValue(0);
  const [ultimo, setUltimo] = useState<Deshacer | null>(deshacer);

  useEffect(() => {
    if (deshacer) setUltimo(deshacer);
    visible.set(withTiming(deshacer ? 1 : 0, { duration: deshacer ? DURACION_MS.paso - 60 : SALIDA_MS, easing: CURVA_SALIDA }));
  }, [deshacer, visible]);

  useEffect(() => {
    if (!deshacer) return;
    const reloj = setTimeout(alVencer, DESHACER_VISIBLE_MS);
    return () => clearTimeout(reloj);
  }, [deshacer, alVencer]);

  const estilo = useAnimatedStyle(() => ({
    opacity: visible.get(),
    transform: [{ translateY: reducir ? 0 : (1 - visible.get()) * RECORRIDO }],
  }));

  const mostrado = deshacer ?? ultimo;
  if (!mostrado) return null;
  const texto = `${mostrado.nombre}: ${TEXTO[mostrado.nueva ?? 'nada']}`;
  return (
    <Animated.View
      pointerEvents={deshacer ? 'auto' : 'none'}
      accessibilityLiveRegion="polite"
      style={[
        estilos.aviso,
        { bottom: abajo, backgroundColor: isDark ? c.cardBgAlt : c.textStrong, borderColor: isDark ? c.borderStrong : 'transparent' },
        estilo,
      ]}
    >
      <Text style={[estilos.texto, { color: isDark ? c.textStrong : c.bg }]} numberOfLines={1}>
        {texto}
      </Text>
      <Pressable
        onPress={alDeshacer}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Deshacer: ${texto}`}
        style={({ pressed }) => [estilos.boton, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Icon name="rotateCcw" size={20} color={isDark ? c.goldInk : c.gold} />
        <Text style={[estilos.deshacer, { color: isDark ? c.goldInk : c.gold }]}>Deshacer</Text>
      </Pressable>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  aviso: {
    position: 'absolute',
    left: 12,
    right: 12,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 18,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  texto: { flex: 1, fontFamily: 'Jost_400Regular', fontSize: 16 },
  boton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 10 },
  deshacer: { fontFamily: 'Jost_700Bold', fontSize: 16 },
});
