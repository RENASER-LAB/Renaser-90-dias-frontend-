import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { ScrollView, Text, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';

/** Lo que se lee cuando todo el contenido de una pestaña quedó fuera de esta sesión (fase 2 de la spec 002). */
export const TEXTO_SECCION_NO_DISPONIBLE = 'Esta sección todavía no está disponible para tu cuenta.';

/**
 * Una pestaña cuyo contenido entero no le corresponde a esta sesión (fase 2, decisión P1 del dueño: lo no disponible se
 * esconde). Las pestañas nunca desaparecen, así que en su lugar queda un texto neutro, **sin el ícono de
 * mantenimiento** (no está roto ni en arreglo: la persona todavía no lo tiene) y sin «Reintentar». Un solo
 * `ScrollView`, como pide AGENTS.md §2, con el relleno que le pase la pestaña.
 */
export function SeccionNoDisponible({
  contentContainerStyle,
  ...resto
}: { contentContainerStyle?: StyleProp<ViewStyle> } & Omit<ScrollViewProps, 'contentContainerStyle' | 'children'>) {
  const { c, t } = useTheme();
  return (
    <ScrollView showsVerticalScrollIndicator={false} {...resto} contentContainerStyle={[{ flexGrow: 1, paddingBottom: 36 }, contentContainerStyle]}>
      <View testID="seccion-no-disponible" style={{ paddingTop: 24 }}>
        <Text accessibilityRole="text" style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23, fontFamily: fuentes.regular }]}>
          {TEXTO_SECCION_NO_DISPONIBLE}
        </Text>
      </View>
    </ScrollView>
  );
}
