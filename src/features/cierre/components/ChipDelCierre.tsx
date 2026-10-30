import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';

/**
 * Una opción de «¿Qué pasó?» o «¿Qué harás mañana?» (spec 017). Sin animación propia: se toca decenas de veces al
 * cerrar el día y el cambio tiene que verse en el acto (`emil-design-eng`); solo se hunde al apretar (`Presionable`) y
 * vibra con `tacto.seleccion()`. El estado se dice con el color, el borde y `accessibilityState`, no solo con el color.
 * Mismo peso elegido o no, para que elegir no ensanche el chip y corra a los de al lado. Mide 48 (AGENTS.md §4).
 */
export function ChipDelCierre({
  etiqueta,
  elegido,
  onPress,
}: {
  etiqueta: string;
  elegido: boolean;
  onPress: () => void;
}) {
  const { c, t } = useTheme();
  return (
    <Presionable
      onPress={() => {
        tacto.seleccion();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected: elegido }}
      accessibilityLabel={etiqueta}
      style={[
        estilos.chip,
        { backgroundColor: elegido ? c.goldWash : c.cardBg, borderColor: elegido ? c.gold : c.border },
      ]}
    >
      <Text style={[t.body, { color: elegido ? c.textStrong : c.textSoft, fontSize: 16, fontFamily: 'Jost_500Medium' }]}>
        {etiqueta}
      </Text>
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  chip: { minHeight: 48, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1, justifyContent: 'center' },
});
