import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { ColorSemaforo } from '../types/semaforo.types';
import { coloresDelSemaforo } from '../utils/coloresDelSemaforo';

/**
 * El porcentaje grande, con el `%` más chico al lado — la misma forma que la cifra de coherencia de
 * Hoy, para que dos porcentajes de la misma pantalla se lean igual.
 *
 * Tal cual llega: `78.3` se escribe `78.3`. Redondear pondría «80» al lado de «Requiere atención».
 * Sin número no dibuja nada: nunca un 0 % por falta de datos (§5).
 */
export function CifraDelSemaforo({
  porcentaje,
  color,
  tamano = 'normal',
}: {
  porcentaje: number | null;
  color: ColorSemaforo;
  tamano?: 'normal' | 'grande';
}) {
  const { c, t } = useTheme();
  if (porcentaje === null) return null;
  const { tinta } = coloresDelSemaforo(color, c);
  const grande = tamano === 'grande';

  return (
    <View style={estilos.fila}>
      <Text style={[t.metric, { color: tinta, fontSize: grande ? 44 : 28, lineHeight: grande ? 50 : 34 }]}>
        {String(porcentaje)}
      </Text>
      <Text style={{ fontFamily: 'Jost_500Medium', fontSize: grande ? 20 : 15, color: tinta }}>%</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
});
