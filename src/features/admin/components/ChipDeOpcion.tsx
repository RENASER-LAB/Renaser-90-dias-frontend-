import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * Una opción elegible en una fila que envuelve (filtro por rol, dimensión, tipo). Sin animación al cambiar: se
 * toca seguido y el cambio tiene que verse en el acto (`emil-design-eng`); solo se hunde al apretar.
 */
export function ChipDeOpcion({
  etiqueta,
  activo,
  onPress,
  deshabilitado = false,
}: {
  etiqueta: string;
  activo: boolean;
  onPress: () => void;
  deshabilitado?: boolean;
}) {
  const { c, t } = useTheme();
  return (
    <Presionable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="radio"
      accessibilityState={{ selected: activo, disabled: deshabilitado }}
      accessibilityLabel={etiqueta}
      style={[
        estilos.chip,
        {
          backgroundColor: activo ? c.goldWash : c.cardBg,
          borderColor: activo ? c.gold : c.border,
          opacity: deshabilitado ? 0.55 : 1,
        },
      ]}
    >
      <Text
        style={[
          t.body,
          // Mismo peso elegido o no (E-602 del backend, E2E 2026-10-12): pasar a negrita lo ensanchaba y corría los chips de al lado.
          { color: activo ? c.textStrong : c.textSoft, fontSize: 16, fontFamily: fuentes.media },
        ]}
      >
        {etiqueta}
      </Text>
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, justifyContent: 'center' },
});
