import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BotonSecundario } from '../../../components/Legible';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { EstadoConForma, type EstadoDelLider } from './EstadoConForma';

/**
 * Una fila de «Por resolver» (spec 056 FR-002): el símbolo del estado, una cifra corta y UN botón que hace una sola cosa. Sin párrafos: la
 * fila dice «3 grupos sin mentor» y el botón dice «Asignar». El botón le dice al lector de pantalla de qué fila es.
 */
export function FilaPorResolver({ estado, texto, boton, onPress }: { estado: EstadoDelLider; texto: string; boton: string; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <View style={[estilos.fila, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <EstadoConForma estado={estado} tamano={20} />
      <Text style={[t.body, estilos.texto, { color: c.textStrong }]}>{texto}</Text>
      <BotonSecundario etiqueta={boton} compacto accessibilityLabel={`${boton}: ${texto}`} onPress={onPress} estilo={estilos.boton} />
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, borderWidth: 1, borderRadius: 14, paddingVertical: 6, paddingLeft: 12, paddingRight: 8 },
  texto: { flex: 1, minWidth: 0, fontFamily: fuentes.media, fontSize: 16, lineHeight: 21 },
  boton: { minWidth: 92, flexShrink: 0 },
});
