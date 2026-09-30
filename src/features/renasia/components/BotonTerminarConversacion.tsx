import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { ETIQUETA_TERMINAR } from '../utils/rotuloDelOrbe';

/**
 * Cierra la conversación por voz en vivo (E-458). Mantener presionado el orbe también la cierra,
 * pero no se descubre solo: el dueño pidió un botón a la vista, chico, como el de Gemini Live.
 */
export function BotonTerminarConversacion({ onPress }: { onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={ETIQUETA_TERMINAR}
      hitSlop={10}
      style={({ pressed }) => [styles.boton, { borderColor: c.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon name="close" size={12} color={c.textSoft} />
      <Text style={[t.small, { color: c.textSoft }]}>Terminar</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
