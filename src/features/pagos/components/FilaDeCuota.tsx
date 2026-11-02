import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { CuotaVisible } from '../utils/vistaDeMiIngreso';
import { DatosDeLaCuota } from './DatosDeLaCuota';

/**
 * Una cuota del cronograma, como en la maqueta: calendario, fecha («15 oct»), el estado a la derecha —«✓ Pagado» en verde o «Pendiente» con reloj en dorado— y
 * el monto («US$ 1 000») en su propio renglón (`DatosDeLaCuota`; #96: en una sola línea la pastilla bajaba sola cuando no cabía). La fila entera se lee como una
 * sola frase. No se toca: la persona no cambia sus pagos, los marca Administración.
 */
export function FilaDeCuota({ cuota }: { cuota: CuotaVisible }) {
  const { c } = useTheme();
  return (
    <View style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}>
      <DatosDeLaCuota cuota={cuota} />
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderRadius: 14 },
});
