import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { CuotaVisible } from '../utils/vistaDeMiIngreso';

/**
 * Lo que dice una cuota, en la ficha de Administración y en «Mi ingreso» (spec 032; #96). Dos renglones fijos, sin `flexWrap`:
 *
 * 1. **Cuándo y cómo va:** el calendario con la fecha a la izquierda y la pastilla de estado —«✓ Pagado» en verde o «Pendiente» con reloj en dorado— a la
 *    derecha. Nunca bajan de renglón: antes la fila llevaba también el monto, y cuando no cabía en 360 dp la pastilla bajaba sola, pegada a la derecha, y
 *    dejaba un hueco y un renglón casi vacío.
 * 2. **El monto**, en grande y tabular, con todo el ancho de la tarjeta para él: no se encoge ni se parte por la mitad del número (#89 y #91) con cuatro, cinco
 *    o más cifras, ni con la letra del sistema grande.
 *
 * El estado lleva ícono y palabra además del color (nunca solo color) y «Pendiente» nunca es un reproche: una cuota con la fecha pasada se ve igual. El
 * conjunto se lee como una sola frase. Lo que cada pantalla le pone debajo (la nota de quién la marcó, los botones) es suyo.
 */
export function DatosDeLaCuota({ cuota }: { cuota: CuotaVisible }) {
  const { c, t } = useTheme();
  return (
    <View accessible accessibilityLabel={cuota.etiqueta} style={estilos.datos}>
      <View style={estilos.encabezado}>
        <View style={estilos.cuando}>
          <Icon name="calendar" size={20} color={c.textSoft} />
          <Text style={[t.body, estilos.fecha, { color: c.textStrong }]}>{cuota.fecha}</Text>
        </View>
        <View style={[estilos.estado, { backgroundColor: cuota.pagada ? c.successWash : c.goldWash }]}>
          <Icon name={cuota.pagada ? 'check' : 'clock'} size={16} color={cuota.pagada ? c.success : c.goldInk} />
          <Text style={[t.body, estilos.estadoTexto, { color: cuota.pagada ? c.success : c.goldInk }]}>{cuota.estado}</Text>
        </View>
      </View>
      <Text style={[t.body, estilos.monto, { color: c.textStrong }]}>{cuota.monto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  datos: { gap: 8 },
  /* Un solo renglón: la fecha cede (puede pasar a dos líneas con la letra del sistema muy grande) antes de que la pastilla baje o se parta. */
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', columnGap: 12 },
  cuando: { flexShrink: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', columnGap: 8 },
  fecha: { flexShrink: 1, fontSize: 17, lineHeight: 24, fontFamily: fuentes.seminegrita },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, flexShrink: 0 },
  estadoTexto: { fontSize: 16, fontFamily: fuentes.media },
  /* Sin `adjustsFontSizeToFit` ni `numberOfLines`: en Android el texto conservaba el ancho anterior cuando la fila crecía y se recortaba («US$ 1 00»; #89). Va solo
     en su renglón, con todo el ancho: nada lo encoge, así que tampoco se parte (#91). Cifras de ancho fijo para que 9 → 10 no corra nada. */
  monto: { flexShrink: 0, fontSize: 22, lineHeight: 28, fontFamily: fuentes.negrita, fontVariant: ['tabular-nums'] },
});
