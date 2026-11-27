import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '../../../components/GoldButton';
import { ModalConZonaSegura } from '../../../components/ModalConZonaSegura';
import { Presionable } from '../../../components/Presionable';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { useConsentimientoDeIa } from '../state/consentimientoDeIa';
import {
  ACEPTAR_CONSENTIMIENTO_DE_IA,
  RECHAZAR_CONSENTIMIENTO_DE_IA,
  TEXTO_CONSENTIMIENTO_DE_IA,
  TITULO_CONSENTIMIENTO_DE_IA,
} from '../utils/consentimientoDeIa';

/**
 * El aviso de que el acompañante funciona con IA de Google (Gemini) y qué datos viajan (spec 060 FR-001, Apple 5.1.2(i)).
 * Va antes del primer envío: dentro del panel del chat, y como hoja antes de la primera conversación por voz.
 */
export function TarjetaDeConsentimientoDeIa({ alAceptar, alRechazar }: { alAceptar: () => void; alRechazar: () => void }) {
  const { c, t } = useTheme();
  const { horizontalPadding } = useResponsive();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, padding: horizontalPadding, paddingBottom: 36, gap: 16 }}
    >
      <Text accessibilityRole="header" style={[t.cardTitle, { color: c.textStrong }]}>
        {TITULO_CONSENTIMIENTO_DE_IA}
      </Text>
      <Text style={[t.body, { color: c.text, fontSize: 15, lineHeight: 23 }]}>{TEXTO_CONSENTIMIENTO_DE_IA}</Text>
      <View style={styles.botones}>
        <GoldButton label={ACEPTAR_CONSENTIMIENTO_DE_IA} onPress={alAceptar} />
        <Presionable
          accessibilityRole="button"
          accessibilityLabel={RECHAZAR_CONSENTIMIENTO_DE_IA}
          onPress={alRechazar}
          style={styles.rechazar}
        >
          <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>{RECHAZAR_CONSENTIMIENTO_DE_IA}</Text>
        </Presionable>
      </View>
    </ScrollView>
  );
}

/** La hoja de la voz: se abre sola cuando la persona toca el orbe sin haber aceptado (se monta una vez, en el lanzador). */
export function HojaDeConsentimientoDeIa() {
  const { c } = useTheme();
  const { vozEsperando, aceptar, descartarVoz } = useConsentimientoDeIa();
  useSystemBackHandler(() => {
    descartarVoz();
    return true;
  }, vozEsperando);
  if (!vozEsperando) return null;
  return (
    <ModalConZonaSegura visible animationType="slide" onRequestClose={descartarVoz} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }} edges={['top', 'bottom']}>
        <TarjetaDeConsentimientoDeIa alAceptar={aceptar} alRechazar={descartarVoz} />
      </SafeAreaView>
    </ModalConZonaSegura>
  );
}

const styles = StyleSheet.create({
  botones: { gap: 8, width: '100%' },
  rechazar: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
