import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { CuotaVisible } from '../utils/vistaDeMiIngreso';

/**
 * Una cuota del cronograma, como en la maqueta: calendario, fecha («15 oct»), monto y el estado a la derecha —«✓ Pagado» en verde o «Pendiente» con
 * reloj en dorado—. El estado lleva ícono y palabra además del color (nunca solo color) y «Pendiente» nunca es un reproche: una cuota con la fecha pasada
 * se ve igual. La fila entera se lee como una sola frase. No se toca: la persona no cambia sus pagos, los marca Administración.
 */
export function FilaDeCuota({ cuota }: { cuota: CuotaVisible }) {
  const { c, t } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={cuota.etiqueta}
      style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
    >
      <Icon name="calendar" size={20} color={c.textSoft} />
      <View style={estilos.datos}>
        <Text style={[t.body, estilos.fecha, { color: c.textStrong }]}>{cuota.fecha}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[t.body, estilos.monto, { color: c.textStrong }]}>
          {cuota.monto}
        </Text>
      </View>
      <View style={[estilos.estado, { backgroundColor: cuota.pagada ? c.successWash : c.goldWash }]}>
        <Icon name={cuota.pagada ? 'check' : 'clock'} size={16} color={cuota.pagada ? c.success : c.goldInk} />
        <Text style={[t.body, { color: cuota.pagada ? c.success : c.goldInk, fontSize: 16, fontFamily: fuentes.media }]}>{cuota.estado}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderRadius: 14 },
  datos: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16, minWidth: 0 },
  fecha: { fontSize: 17, fontFamily: fuentes.negrita, minWidth: 64 },
  monto: { fontSize: 17, flexShrink: 1 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 18 },
});
