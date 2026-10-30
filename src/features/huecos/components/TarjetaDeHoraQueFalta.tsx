import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { AvisoDeHoraQueFalta } from '../utils/agendaDelDia';

/**
 * El aviso de que a esa persona le falta la hora de Despertar o la de Dormir (spec 015, corregido 2026-10-29). Sin ellas no
 * se sabe de cuándo a cuándo es su día: la ficha lo dice UNA vez, pide que la elija en Training → Planificar y NO dibuja el
 * sueño como tiempo libre ni cuenta un total inventado. Es una tarjeta de lectura, sin botón: a quien acompaña le toca
 * pedírselo a la persona.
 */
export function TarjetaDeHoraQueFalta({ aviso }: { aviso: AvisoDeHoraQueFalta }) {
  const { c, t } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${aviso.titulo}. ${aviso.detalle}`}
      style={[estilos.tarjeta, { backgroundColor: c.goldWash, borderColor: c.border }]}
    >
      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17, lineHeight: 23 }]}>{aviso.titulo}</Text>
      <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>{aviso.detalle}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: 6, padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 14 },
});
