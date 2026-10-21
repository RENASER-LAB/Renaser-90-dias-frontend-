import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Icon, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';

/** El botón de la fila: con borde dorado, de 48 px de alto, que se hunde al apoyar el dedo. */
export function BotonDeEvidencia({
  etiqueta,
  icono,
  onPress,
  accessibilityLabel,
}: {
  etiqueta: string;
  icono: IconName;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { c, t } = useTheme();
  return (
    <Presionable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? etiqueta}
      style={[estilos.boton, { borderColor: c.goldInk }]}
    >
      <Icon name={icono} size={16} color={c.goldInk} />
      <Text style={[t.body, { color: c.goldInk, fontSize: 16, fontFamily: 'Jost_500Medium' }]}>{etiqueta}</Text>
    </Presionable>
  );
}


const estilos = StyleSheet.create({
  /* 48 px: pulsable sin apuntar, dentro de la fila de un hábito. */
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});
