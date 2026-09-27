import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ColoresDelChat } from './coloresDelChat';

/** La píldora centrada «Hoy» / «Ayer» / «25 de septiembre» entre los mensajes de días distintos. */
export function SeparadorDeDia({ etiqueta, colores }: { etiqueta: string; colores: ColoresDelChat }) {
  return (
    <View style={styles.fila} accessibilityRole="header">
      <View style={[styles.pildora, { backgroundColor: colores.separador }]}>
        <Text style={[styles.texto, { color: colores.textoSeparador }]}>{etiqueta}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  pildora: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  texto: {
    fontFamily: 'Jost_500Medium',
    fontSize: 14,
  },
});
