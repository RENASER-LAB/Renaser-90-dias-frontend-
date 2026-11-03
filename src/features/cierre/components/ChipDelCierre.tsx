import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Icon, TAMANO_ICONO, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';

/**
 * Una opción de «¿Qué pasó?» o «¿Qué harás mañana?» (spec 017): un ícono de línea de 20 y un texto corto («Tiempo», «Otra
 * hora»), en una caja de 48 de alto con esquinas de 12 (2026-11-03, «Cierra tu día con chips de ícono»).
 *
 * - **Lo que se ve es corto; lo que se oye es entero.** `texto` es lo visible y `etiqueta` el texto completo de siempre
 *   («No me alcanzó el tiempo»): el lector de pantalla dice «No me alcanzó el tiempo, seleccionado».
 * - **Sin animación propia**: se toca decenas de veces al cerrar el día y el cambio tiene que verse en el acto
 *   (`emil-design-eng`); solo se hunde al apretar (`Presionable`) y vibra con `tacto.seleccion()`.
 * - **El estado no es solo color**: el elegido lleva fondo dorado suave, borde dorado y el ícono dorado, y además
 *   `accessibilityState`. Mismo borde y mismo peso de letra elegido o no, para que elegir no ensanche el chip ni corra a
 *   los de al lado.
 */
export function ChipDelCierre({
  etiqueta,
  texto,
  icono,
  elegido,
  onPress,
}: {
  /** El texto completo, para el lector de pantalla. */
  etiqueta: string;
  /** El texto corto que se ve. */
  texto: string;
  icono: IconName;
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
      <Icon name={icono} size={TAMANO_ICONO.normal} color={elegido ? c.goldInk : c.textSoft} />
      <Text style={[t.body, { color: elegido ? c.textStrong : c.textSoft, fontSize: 16, fontFamily: fuentes.media }]}>
        {texto}
      </Text>
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  chip: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
