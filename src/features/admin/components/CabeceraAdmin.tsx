import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * La barra de toda pantalla de Administración: volver, título y —solo en la raíz— la salida
 * explícita a Mi programa.
 *
 * Existe como componente y no copiada en cada pantalla porque el botón de volver es el que
 * sostiene el gesto lateral: si una pantalla se olvidara de ponerlo, el retroceso del sistema
 * cerraría la app en vez de subir un nivel (AGENTS.md §6).
 */
export function CabeceraAdmin({
  titulo,
  subtitulo,
  onVolver,
  accion,
}: {
  titulo: string;
  subtitulo?: string | null;
  onVolver: () => void;
  accion?: { etiqueta: string; onPress: () => void };
}) {
  const { c, t } = useTheme();
  const { horizontalPadding } = useResponsive();

  return (
    <View style={[estilos.barra, { paddingHorizontal: horizontalPadding }]}>
      <Pressable
        onPress={onVolver}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        style={estilos.volver}
      >
        {/* El chevron del proyecto apunta a la derecha y no acepta `style`: se rota el contenedor. */}
        <View style={{ transform: [{ rotate: '180deg' }] }}>
          <Icon name="chevron" size={20} color={c.textSoft} />
        </View>
      </Pressable>
      <View style={{ flex: 1, flexShrink: 1 }}>
        <Text style={[t.cardTitle, { color: c.textStrong }]} numberOfLines={1}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 12.5 }]} numberOfLines={1}>
            {subtitulo}
          </Text>
        ) : null}
      </View>
      {accion ? (
        <Pressable
          onPress={accion.onPress}
          accessibilityRole="button"
          accessibilityLabel={accion.etiqueta}
          style={[estilos.accion, { borderColor: c.border }]}
        >
          <Text style={[t.body, { color: c.textStrong, fontSize: 13.5, fontWeight: '500' }]}>
            {accion.etiqueta}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  /* 48 px: el mínimo cómodo para una sola mano (AGENTS.md §4). */
  volver: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginLeft: -12 },
  accion: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});
