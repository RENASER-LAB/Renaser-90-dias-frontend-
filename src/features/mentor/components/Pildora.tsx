import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';

/** Una opción de un selector de «Mi grupo» (mes del ranking). 44 px de alto: se toca con el pulgar. */
export function Pildora({ texto, activa, onPress }: { texto: string; activa: boolean; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: activa }}
      hitSlop={4}
      style={[estilos.pildora, { borderColor: activa ? c.gold : c.border, backgroundColor: activa ? c.goldWash : 'transparent' }]}
    >
      <Text numberOfLines={1} style={[t.body, { color: activa ? c.goldInk : c.textSoft, fontFamily: activa ? fuentes.negrita : fuentes.media, fontSize: 16 }]}>
        {texto}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pildora: { minHeight: 44, maxWidth: 240, justifyContent: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14 },
});
