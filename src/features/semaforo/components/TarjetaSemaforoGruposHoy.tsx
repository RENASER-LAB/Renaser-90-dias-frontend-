import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * La entrada al semáforo por grupos desde Hoy, **solo para el líder de mentores**.
 *
 * Misma forma que `TarjetaBandejaHoy` —la otra tarjeta propia de ese rol—: una tarjeta más dentro
 * del día, no un banner ni una pestaña (AGENTS.md §1). **No trae cifras**: las de la semana se leen
 * adentro, con su fecha de corte; una cifra suelta en Hoy quedaría sin decir de qué días es.
 *
 * Hoy la monta solo si el servidor ya respondió que el resumen existe (`entradaDelResumenVisible`):
 * con un backend que todavía no lo tiene, Hoy queda exactamente como estaba.
 */
export function TarjetaSemaforoGruposHoy({ onAbrir }: { onAbrir: () => void }) {
  const { c, t } = useTheme();

  return (
    <Pressable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel="Abrir el semáforo por grupos"
      style={({ pressed }) => [
        estilos.tarjeta,
        { backgroundColor: pressed ? c.goldWash : c.cardBg, borderColor: c.border },
      ]}
    >
      <View style={{ flex: 1, flexShrink: 1 }}>
        <MicroLabel>Semáforo</MicroLabel>
        <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 6 }]}>Semáforo por grupos</Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 6, lineHeight: 23 }]}>
          Cuántos aprendices de cada grupo van al día, requieren atención o tienen problemas.
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
