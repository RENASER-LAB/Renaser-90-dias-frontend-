import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { useFormacionDeLaComunidad } from '../hooks/useFormacionDeLaComunidad';

/**
 * El rótulo de formación de una fila de la Comunidad (spec 024): un chip chico con el nombre de la formación a la que pertenece una
 * publicación, un testimonio, un evento, un curso, un chat o una fila del ranking.
 *
 * **Solo se dibuja cuando quien mira ve todas las formaciones y está leyendo «Todas»** (`mostrarRotulos`): es la única lectura en la
 * que las filas pueden ser de formaciones distintas y hace falta distinguirlas. Para todas las demás cuentas, y cuando se eligió una
 * formación, no devuelve nada —ni un hueco—. Sin `formation` en la fila (un servidor anterior) tampoco.
 *
 * Es solo texto con borde: no se toca. El lector de pantalla lo oye como «Formación: Diplomado Renaser».
 */
export function RotuloDeFormacion({ formation, estilo }: { formation?: string | null; estilo?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const { mostrarRotulos, rotuloDe, nombreDe } = useFormacionDeLaComunidad();
  if (!mostrarRotulos || typeof formation !== 'string' || !formation.trim()) return null;
  return (
    <View
      accessible
      accessibilityLabel={`Formación: ${nombreDe(formation)}`}
      style={[estilos.chip, { borderColor: c.gold, backgroundColor: c.goldWash }, estilo]}
    >
      <Text numberOfLines={1} style={[estilos.texto, { color: c.goldInk }]}>
        {rotuloDe(formation)}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  chip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, maxWidth: '100%' },
  texto: { fontFamily: fuentes.seminegrita, fontSize: 13, lineHeight: 18 },
});
