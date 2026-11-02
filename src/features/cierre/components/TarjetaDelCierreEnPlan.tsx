import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import type { TextosDeLaTarjeta } from '../utils/tarjetaDelCierre';

/**
 * La tarjeta «Cierra tu día» de Plan (spec 033, movida de Training). Es una tarjeta **del día completo**: no cambia con el
 * selector de eje. Hecha como las otras de Plan (medallón + título + segunda línea + chevron, como «Tu 80/20»); ya cerrada queda
 * en verde con «Día cerrado» y lo que dijo para mañana, y se puede volver a abrir para cambiarlo mientras el día no termine.
 *
 * Toda la parte de arriba es un solo botón de 48 o más. Lo de abajo (`children`, la semana) va fuera de ese botón: nada de
 * botones dentro de botones. Sin animación propia: `Presionable` ya da la respuesta al tacto y la hoja trae su fundido.
 */
export function TarjetaDelCierreEnPlan({
  textos,
  onAbrir,
  children,
}: {
  textos: TextosDeLaTarjeta;
  onAbrir: () => void;
  children?: React.ReactNode;
}) {
  const { c, t } = useTheme();
  const { cerrado, titulo, segundaLinea } = textos;
  // Sin cerrar, la segunda línea ya dice «opcional, no da puntos»; cerrada, el lector avisa que se puede cambiar.
  const etiqueta = [titulo, segundaLinea, cerrado ? 'toca para cambiar tu cierre' : null].filter(Boolean).join(', ');

  return (
    <View style={[estilos.tarjeta, { borderColor: cerrado ? c.success : c.border, backgroundColor: cerrado ? c.successWash : c.cardBg }]}>
      <Presionable onPress={onAbrir} accessibilityRole="button" accessibilityLabel={etiqueta} style={estilos.fila}>
        <View style={[estilos.medallon, { backgroundColor: cerrado ? c.cardBg : c.goldWash }]}>
          <Icon name={cerrado ? 'checkCircle' : 'moon'} size={TAMANO_ICONO.normal} color={cerrado ? c.success : c.goldInk} />
        </View>
        <View style={estilos.texto}>
          <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]}>{titulo}</Text>
          {segundaLinea ? <Text style={[t.small, { color: c.textSoft, fontSize: 15 }]}>{segundaLinea}</Text> : null}
        </View>
        <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
      </Presionable>
      {children ? <View style={[estilos.pie, { borderTopColor: c.divider }]}>{children}</View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 17 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  medallon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1, minWidth: 0, gap: 2 },
  pie: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
});
