import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { ColorSemaforo } from '../types/semaforo.types';
import { coloresDelSemaforo } from '../utils/coloresDelSemaforo';
import { palabraDelSemaforo } from '../utils/lecturaDelSemaforo';

export interface PropsEtiquetaSemaforo {
  color: ColorSemaforo;
  /** La palabra del servidor. Si no vino, la del color («Al día», «Requiere atención»…). */
  etiqueta?: string | null;
  tamano?: 'normal' | 'grande';
  /**
   * Texto en gris, sin cambiar el punto: para una cantidad en cero («0 con problemas»), que dice
   * algo cierto pero no tiene por qué llamar la atención en rojo. El punto conserva su color para
   * que la línea se siga leyendo en el mismo orden.
   */
  atenuada?: boolean;
}

/**
 * Punto de color + palabra. **La palabra va siempre** (RL-30): para quien no distingue rojo de
 * verde el punto solo no dice nada, y "Requiere atención" se entiende sin leyenda.
 *
 * "Sin datos" lleva un aro vacío en vez de un punto lleno: ni el color ni la forma dicen que hay un
 * estado donde no lo hay.
 *
 * Solo props. Se puede reemplazar (animación, imagen) sin tocar a quien la usa.
 */
export function EtiquetaSemaforo({ color, etiqueta, tamano = 'normal', atenuada = false }: PropsEtiquetaSemaforo) {
  const { c } = useTheme();
  const { tinta, relleno } = coloresDelSemaforo(color, c);
  const palabra = palabraDelSemaforo(color, etiqueta);
  const grande = tamano === 'grande';
  const lado = grande ? 14 : 11;
  const sinDatos = color === 'SIN_DATOS';

  return (
    <View style={estilos.fila} accessible accessibilityLabel={palabra}>
      <View
        style={{
          width: lado,
          height: lado,
          borderRadius: lado / 2,
          backgroundColor: sinDatos ? 'transparent' : relleno,
          borderWidth: sinDatos ? 2 : 0,
          borderColor: relleno,
        }}
      />
      <Text
        style={{
          color: atenuada ? c.textSoft : tinta,
          fontFamily: grande ? 'Jost_700Bold' : atenuada ? 'Jost_400Regular' : 'Jost_500Medium',
          fontSize: grande ? 20 : 16,
          lineHeight: grande ? 26 : 22,
          flexShrink: 1,
        }}
      >
        {palabra}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
});
