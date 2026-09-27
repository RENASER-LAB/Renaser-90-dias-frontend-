import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
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
        {/* Rótulo de la tarjeta, con la forma de las demás de Hoy pero a 14 px (A-1). */}
        <Text style={[t.micro, { color: c.micro, fontSize: 14 /* metadato */ }]}>OPERACIÓN</Text>
        <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 6 }]}>Administración</Text>
        {/* Dice SOLO lo que hay detrás. Decía «…solicitudes y evidencias» y no existe ninguna
            pantalla de evidencias: la bandeja está construida en el backend
            (`GET /admin/evidence`) y sin un solo consumidor acá. Prometer una sección que no se
            puede abrir hace perder el tiempo buscándola y resta confianza al resto de la lista. */}
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 6, lineHeight: 23 }]}>
          Grupos, personas y solicitudes. Tu programa personal sigue acá, sin cambios.
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
