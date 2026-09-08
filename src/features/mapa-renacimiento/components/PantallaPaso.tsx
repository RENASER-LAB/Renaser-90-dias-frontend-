import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '../../../components/GoldButton';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { PasoCabecera } from './Piezas';

/**
 * Modo recorrido libre: deja avanzar sin completar los campos.
 *
 * Cada vista calcula su propio `valido` con las reglas del manual (§3, §4) y con eso apaga el
 * botón. Eso es correcto para el aprendiz, pero impide **recorrer** el flujo para ver qué pide
 * cada paso — que es justo lo que hace falta mientras el mapa se está revisando.
 *
 * Mismo criterio que `MAPA_DIA7_HABILITADO` en `HoyScreen`: suelto en desarrollo, y en un build
 * publicado solo si alguien lo enciende a propósito con `EXPO_PUBLIC_MAPA_LIBRE=on`. Por defecto,
 * en producción, las reglas siguen exigiéndose igual que antes.
 *
 * Las reglas **no se tocaron**: `objetivoValido`, `definicionDeTerminado` y las demás siguen
 * calculándose y los avisos de calidad se siguen mostrando. Lo único que cambia es que el botón
 * deja de estar bloqueado — se ve lo que falta, pero no frena.
 */
const RECORRIDO_LIBRE = __DEV__ || process.env.EXPO_PUBLIC_MAPA_LIBRE === 'on';

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
          {/* En recorrido libre el botón nunca se bloquea por campos incompletos. `loading` sí
              se respeta siempre: eso no es una regla de negocio, es que hay algo en vuelo. */}
          <GoldButton
            label={boton.label}
            onPress={boton.onPress}
            disabled={RECORRIDO_LIBRE ? false : boton.disabled}
            loading={boton.loading}
            icon="arrow"
          />
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
