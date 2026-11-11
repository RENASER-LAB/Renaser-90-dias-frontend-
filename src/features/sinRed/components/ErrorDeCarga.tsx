import React from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { esTextoSinSenal } from '../utils/sinSenal';

/**
 * Spec 048: el texto de un fallo al cargar (lo que dejó `mensajeDeCarga` / `mensajeDeCargaEnLinea`). Un error de verdad va en rojo y
 * se anuncia como alerta; «sin señal» es un estado normal del modo sin internet y va en el color suave, sin alerta (#182).
 *
 * `caja`: si la pantalla lo muestra dentro de un recuadro con filete o borde (Hoy, Activar programa), pasa su estilo y el recuadro también deja el rojo.
 */
export function ErrorDeCarga({ mensaje, style, caja }: { mensaje: string; style?: StyleProp<TextStyle>; caja?: StyleProp<ViewStyle> }) {
  const { c, t } = useTheme();
  const sinSenal = esTextoSinSenal(mensaje);
  const texto = (
    <Text style={[t.small, style, { color: sinSenal ? c.textSoft : c.danger }]} accessibilityRole={sinSenal ? undefined : 'alert'}>
      {mensaje}
    </Text>
  );
  if (!caja) return texto;
  return <View style={[caja, { backgroundColor: sinSenal ? c.cardBgAlt : c.dangerWash, borderColor: sinSenal ? c.border : c.danger }]}>{texto}</View>;
}
