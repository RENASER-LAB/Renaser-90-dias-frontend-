import React from 'react';
import { StyleSheet } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';

/** La estrella de la cabecera de la ficha de un mentor (spec 056 FR-023): en lugar del lápiz de las notas, abre «Reconocer, sugerir o alertar». 48 de toque. */
export function BotonDeEstrella({ nombre, onPress }: { nombre: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Presionable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Reconocer, sugerir o alertar a ${nombre}`} style={[estilos.boton, { borderColor: c.border }]}>
      <Icon name="star" size={20} color={c.goldInk} />
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  boton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
