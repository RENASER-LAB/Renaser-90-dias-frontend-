import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * La entrada a la bandeja de tickets desde Hoy.
 *
 * Misma forma que `TarjetaAdminHoy`: una tarjeta más dentro del día propio, no un banner que se
 * apropia de la pantalla ni una sexta pestaña (AGENTS.md §1). Para un líder de mentores, Hoy
 * sigue siendo SU día.
 *
 * **No trae cifras.** Podría decir cuántos tickets esperan respuesta, pero eso obligaría a pedir
 * la bandeja entera en cada entrada a Hoy, para todos los días que no se va a abrir. Una entrada
 * que dice a dónde lleva es honesta; una que dice "3 sin responder" y se equivoca porque la
 * consulta falló, no.
 */
export function TarjetaBandejaHoy({ onAbrir }: { onAbrir: () => void }) {
  const { c, t } = useTheme();

  return (
    <Pressable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel="Abrir la bandeja de tickets de mentoría"
      style={({ pressed }) => [
        estilos.tarjeta,
        { backgroundColor: pressed ? c.goldWash : c.cardBg, borderColor: c.border },
      ]}
    >
      <View style={{ flex: 1, flexShrink: 1 }}>
        <MicroLabel>Acompañamiento</MicroLabel>
        <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 6 }]}>Tickets de mentoría</Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 13, marginTop: 6, lineHeight: 19 }]}>
          Los bloqueos abiertos en toda la plataforma y qué se respondió. Solo para mirar.
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
