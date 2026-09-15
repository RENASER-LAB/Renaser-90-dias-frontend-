import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * La entrada a Administración desde Hoy.
 *
 * Es una tarjeta más dentro del día propio, no un banner que se apropia de la pantalla: para
 * ADMIN y ALQUIMISTA, Hoy sigue siendo SU día. Administración es otro contexto de trabajo al que
 * se entra, no el modo por defecto de la cuenta — por eso tampoco hay una pregunta de modo al
 * iniciar sesión (ARF-01).
 */
export function TarjetaAdminHoy({ onAbrir }: { onAbrir: () => void }) {
  const { c, t } = useTheme();

  return (
    <Pressable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel="Abrir Administración"
      style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}
    >
      <View style={{ flex: 1, flexShrink: 1 }}>
        <MicroLabel>Operación</MicroLabel>
        <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 6 }]}>Administración</Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 13, marginTop: 6, lineHeight: 19 }]}>
          Grupos, personas, solicitudes y evidencias. Tu programa personal sigue acá, sin cambios.
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
