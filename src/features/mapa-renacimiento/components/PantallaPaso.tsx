import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '../../../components/GoldButton';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { PasoCabecera } from './Piezas';

/**
 * Esqueleto común de V01–V10: cabecera con el paso, contenido que se desplaza, y la acción
 * principal FUERA del scroll — fija abajo, así queda visible cuando se abre el teclado
 * (manual §2.1 "Teclado"). `onAtras` conserva los datos; nunca reinicia nada.
 */
export function PantallaPaso({
  paso,
  onAtras,
  etiquetaAtras = 'Anterior',
  boton,
  children,
}: {
  paso: number | null;
  onAtras?: () => void;
  etiquetaAtras?: string;
  boton: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };
  children: React.ReactNode;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding } = useResponsive();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingTop: 12, paddingBottom: 28 }}
          keyboardShouldPersistTaps="handled"
        >
          {onAtras ? (
            <Pressable onPress={onAtras} hitSlop={10} accessibilityRole="button" style={styles.atras}>
              <Text style={[t.micro, { color: c.textSoft, letterSpacing: 1 }]}>← {etiquetaAtras.toUpperCase()}</Text>
            </Pressable>
          ) : null}
          {paso !== null ? <PasoCabecera paso={paso} /> : null}
          {children}
        </ScrollView>
        <View style={[styles.pie, { paddingHorizontal: horizontalPadding, borderTopColor: c.divider, backgroundColor: c.bg }]}>
          <GoldButton label={boton.label} onPress={boton.onPress} disabled={boton.disabled} loading={boton.loading} icon="arrow" />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  atras: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginBottom: 4 },
  pie: { paddingTop: 12, paddingBottom: 14, borderTopWidth: 1 },
});
