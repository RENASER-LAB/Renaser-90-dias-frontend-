import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { Ocurrencia } from '../types/eventos.types';

/**
 * Piezas chicas de la sección Eventos, pensadas para quien tiene de 30 a 60 años (spec §0.4): letra
 * de 16 px o más, filas de 64 px, palabras simples. Los botones son los de `components/Legible.tsx`.
 */

export const LETRA = { cuerpo: 16, titulo: 18, grande: 22 } as const;

/** Un texto de cuerpo, a 16 px. */
export function Parrafo({ children, tono = 'suave' }: { children: React.ReactNode; tono?: 'suave' | 'fuerte' | 'peligro' | 'bien' }) {
  const { c } = useTheme();
  const color = { suave: c.textSoft, fuerte: c.textStrong, peligro: c.danger, bien: c.success }[tono];
  return <Text style={[estilos.parrafo, { color }]}>{children}</Text>;
}

/** «← Volver a Eventos», con 48 px de alto para el pulgar. */
export function BotonVolver({ etiqueta, onPress }: { etiqueta: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={8}
      style={({ pressed }) => [estilos.volver, { opacity: pressed ? 0.7 : 1 }]}
    >
      {/* La flecha de volver va a 24 en toda Comunidad (2026-10-05); el área ya es de 48. */}
      <Icon name="arrowLeft" size={24} color={c.goldInk} />
      <Text style={[estilos.volverTexto, { color: c.goldInk }]}>{etiqueta}</Text>
    </Pressable>
  );
}

/** Un campo de texto con su rótulo a 16 px (el `FormField` de la app usa rótulos de 10,5 px). */
export function CampoDeTexto({
  rotulo,
  ayuda,
  ...props
}: TextInputProps & { rotulo: string; ayuda?: string | null }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[estilos.rotulo, { color: c.textStrong }]}>{rotulo}</Text>
      {ayuda ? <Text style={[estilos.parrafo, { color: c.textSoft }]}>{ayuda}</Text> : null}
      <TextInput
        placeholderTextColor={c.tabInactive}
        accessibilityLabel={rotulo}
        {...props}
        style={[
          estilos.entrada,
          { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt, color: c.textStrong },
          props.multiline ? { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 } : null,
        ]}
      />
    </View>
  );
}

/** «Vas» / «No vas», en palabras y con color. Sin respuesta no dice nada. */
export function EtiquetaAsistencia({ oc }: { oc: Ocurrencia }) {
  const { c } = useTheme();
  if (oc.asistencia !== 'GOING' && oc.asistencia !== 'NOT_GOING') return null;
  const vas = oc.asistencia === 'GOING';
  return (
    <View style={[estilos.etiqueta, { backgroundColor: vas ? c.successWash : c.dangerWash }]}>
      <Text style={[estilos.etiquetaTexto, { color: vas ? c.success : c.danger }]}>{vas ? 'Vas' : 'No vas'}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  parrafo: { fontFamily: 'Jost_400Regular', fontSize: LETRA.cuerpo, lineHeight: 23 },
  rotulo: { fontFamily: 'Jost_500Medium', fontSize: 17, lineHeight: 22 },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, alignSelf: 'flex-start' },
  volverTexto: { fontFamily: 'Jost_500Medium', fontSize: LETRA.cuerpo },
  entrada: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: 'Jost_400Regular',
    fontSize: 17,
  },
  etiqueta: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginTop: 2 },
  etiquetaTexto: { fontFamily: 'Jost_700Bold', fontSize: 16 },
});
