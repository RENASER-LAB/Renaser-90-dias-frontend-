import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * «Elige una formación arriba para publicar.» / «…para crear.» (spec 024): la línea, en el lugar de la acción, cuando Administración
 * tiene «Todas» elegida y toca algo que CREA (publicar en el Muro, crear un evento). Nada se crea «para todas» ni «sin formación»
 * (el servidor respondería 400), así que no se envía nada; en vez de un diálogo, una línea que dice qué falta.
 *
 * No se anima y no se va sola: se queda hasta que se elige una formación (la pantalla se arma de nuevo) o se sale. El lector de
 * pantalla la anuncia al aparecer.
 */
export function AvisoDeFormacionPorElegir({ texto }: { texto: string }) {
  const { c, t } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[estilos.fila, { borderColor: c.gold, backgroundColor: c.goldWash }]}
    >
      <Icon name="layoutGrid" size={TAMANO_ICONO.normal} color={c.goldInk} />
      <Text style={[t.body, estilos.texto, { color: c.textStrong }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  texto: { flex: 1, fontSize: 16, lineHeight: 22 },
});
