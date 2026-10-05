import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { ETIQUETA_TERMINAR } from '../utils/rotuloDelOrbe';

/**
 * Cierra la conversación por voz en vivo (E-458). Mantener presionado el orbe también la cierra,
 * pero no se descubre solo: el dueño pidió un botón a la vista, chico, como el de Gemini Live.
 *
 * > **Rediseño de Hoy (2026-10-05).** Medía ~26 px de alto (✕ de 12 y 4 px de relleno): chico para
 * > un dedo de 40–60 años, y se apretaba sin querer el orbe de al lado. Ahora es una píldora de 44
 * > con el ✕ a 16 y el texto a 14, y responde al dedo (`Presionable`).
 */
export function BotonTerminarConversacion({ onPress }: { onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Presionable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={ETIQUETA_TERMINAR}
      contenedorStyle={styles.area}
      style={[styles.boton, { borderColor: c.border }]}
    >
      <Icon name="close" size={TAMANO_ICONO.chico} color={c.textSoft} />
      <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>Terminar</Text>
    </Presionable>
  );
}

const styles = StyleSheet.create({
  area: { alignSelf: 'center', marginTop: 8 },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
  },
});
