import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';

/** El ícono de lápiz de la ficha (spec 055 FR-010): abre las notas; con un puntito rojo si hay al menos una. 48 de toque. */
export function BotonDeNota({ nombre, conNotas, onPress }: { nombre: string; conNotas: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Presionable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={conNotas ? `Notas sobre ${nombre}, hay notas` : `Notas sobre ${nombre}`}
      style={[estilos.boton, { borderColor: c.border }]}
    >
      <Icon name="pencil" size={20} color={c.goldInk} />
      {conNotas ? <View testID="puntito-de-notas" style={[estilos.puntito, { backgroundColor: c.danger, borderColor: c.bg }]} /> : null}
    </Presionable>
  );
}

/** El ícono de chat redondo de la ficha: abre el 1 a 1 sin enviar nada. 48 de toque. */
export function BotonDeChat({ nombre, ocupado, onPress }: { nombre: string; ocupado: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Presionable
      onPress={onPress}
      disabled={ocupado}
      accessibilityRole="button"
      accessibilityLabel={`Escribirle a ${nombre}`}
      accessibilityState={{ disabled: ocupado, busy: ocupado }}
      style={[estilos.boton, { borderColor: c.border, opacity: ocupado ? 0.5 : 1 }]}
    >
      <Icon name="chat" size={20} color={c.goldInk} />
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  boton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  puntito: { position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: 4.5, borderWidth: 1.5 },
});
