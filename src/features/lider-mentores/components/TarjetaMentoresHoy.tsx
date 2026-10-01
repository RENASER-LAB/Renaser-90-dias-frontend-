import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * La entrada a «Mis mentores» desde Hoy, para el Líder de Mentores. Misma forma que la tarjeta de la
 * bandeja de tickets: dice a dónde lleva y no trae cifras (pedir el padrón en cada entrada a Hoy, para
 * los días que no se abre, no vale la pena; y una cifra de una consulta fallida mentiría).
 */
export function TarjetaMentoresHoy({ onAbrir }: { onAbrir: () => void }) {
  const { c, t } = useTheme();

  return (
    <Pressable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel="Abrir mis mentores"
      style={({ pressed }) => [estilos.tarjeta, { backgroundColor: pressed ? c.goldWash : c.cardBg, borderColor: c.border }]}
    >
      <View style={{ flex: 1, flexShrink: 1 }}>
        <MicroLabel>Tu cargo</MicroLabel>
        <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 6 }]}>Mis mentores</Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 6, lineHeight: 22 }]}>
          Cómo va cada uno y el reporte del mes.
        </Text>
      </View>
      <Icon name="chevron" size={20} color={c.chevron} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    width: '100%',
    flexWrap: 'wrap',
  },
});
