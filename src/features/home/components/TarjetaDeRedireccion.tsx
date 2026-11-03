import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, MicroLabel } from '../../../components/ui';
import { Icon, TAMANO_ICONO, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * La tarjeta de Hoy que solo redirige: el rótulo arriba, un disco lavado de oro con su ícono a la izquierda, el título, una línea dorada
 * debajo y el chevron. Es la forma que tenía «Próximo evento» desde el 2026-09-26, sacada a un componente (2026-11-03) para que «Clase
 * diaria» sea EXACTAMENTE del mismo tamaño y no dos copias que se desalineen con el tiempo.
 *
 * Sin contorno dorado ni botón: una tarjeta con borde de color entre varias sin él no es jerarquía, es ruido. Toda ella es el botón y
 * responde al dedo con la escala de `Presionable`. El disco no lleva línea propia: su borde estaba dentro del borde de la tarjeta.
 *
 * **Movimiento:** ninguno propio; la escala 0,97 de `Presionable` al apoyar el dedo, como el resto de Hoy.
 */
export function TarjetaDeRedireccion({
  rotulo,
  icono,
  titulo,
  linea,
  onPress,
  accessibilityLabel,
}: {
  rotulo: string;
  icono: IconName;
  titulo: string;
  /** Una línea corta debajo del título, en dorado, negrita y con cifras de ancho fijo («Hoy · 20:00», «Pendiente»). */
  linea: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { c, t } = useTheme();
  return (
    <Presionable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <Card>
        <MicroLabel>{rotulo}</MicroLabel>
        <View style={estilos.fila}>
          <View style={[estilos.disco, { backgroundColor: c.goldWash }]}>
            <Icon name={icono} size={TAMANO_ICONO.normal} color={c.goldInk} />
          </View>
          <View style={estilos.textos}>
            <Text style={[t.cardTitle, { color: c.textStrong }]}>{titulo}</Text>
            <Text style={[t.small, estilos.cifras, { color: c.goldInk, fontFamily: fuentes.negrita, marginTop: 3 }]}>{linea}</Text>
          </View>
          <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
        </View>
      </Card>
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  disco: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
  },
  /** Cifras que cambian en pantalla: ancho de dígito fijo para que nada salte (AGENTS.md §4). */
  cifras: {
    fontVariant: ['tabular-nums'],
  },
});
