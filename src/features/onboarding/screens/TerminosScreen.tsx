import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Alert } from '../../../components/Alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { TERMINOS_CLAUSULAS } from '../data/terminosData';
import { mapearTerminos, PREGUNTA_FIRMA_TERMINOS } from '../data/mapaPreguntas';
import { usePersistenciaOnboarding } from '../hooks/usePersistenciaOnboarding';
import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import {
  SignatureCanvas,
  SignatureCanvasHandle,
  SignatureData,
  safeParsePaths,
} from '../../../components/SignatureCanvas';
import { Checkbox } from '../../../components/Checkbox';
import { GoldButton } from '../../../components/GoldButton';

interface TerminosScreenProps {
  onAccept: () => void;
  onBack: () => void;
  savedSignature?: SignatureData | null;
  onSaveSignature?: (sig: SignatureData) => void;
}

export function TerminosScreen({
  onAccept,
  onBack,
  savedSignature,
  onSaveSignature,
}: TerminosScreenProps) {
  const { c, t, mode, toggle } = useTheme();
  const { isSmall, isTablet, contentMaxWidth, horizontalPadding } = useResponsive();
  const { guardarCapitulo, avanzarEstado, aceptarHito, guardarFirma } = usePersistenciaOnboarding();
  // Ref al lienzo para poder capturarlo como PNG al confirmar (ver SignatureCanvas.capturarComoPngBase64).
  const signatureRef = useRef<SignatureCanvasHandle>(null);

  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState<SignatureData | null>(savedSignature || null);
  const [hasSigned, setHasSigned] = useState<boolean>(Boolean(savedSignature?.data && savedSignature.data.trim().length > 0));
  const [showError, setShowError] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (savedSignature && savedSignature.data && savedSignature.data.trim().length > 0) {
      setSignature(savedSignature);
      setHasSigned(true);
    }
  }, [savedSignature]);

  const canContinue = accepted && hasSigned;

  const handleSignatureChange = (valid: boolean, sigData: SignatureData) => {
    setHasSigned(valid);
    setSignature(valid ? sigData : null);
    if (valid) {
      onSaveSignature?.(sigData);
      if (showError) setShowError(false);
    }
  };

  const handleContinue = async () => {
    if (!accepted) {
      setShowError(true);
      Alert.alert(
        'Aceptación requerida',
        'Por favor marca la casilla de lectura y aceptación de los términos y condiciones.'
      );
      return;
    }
    if (!hasSigned) {
      setShowError(true);
      Alert.alert(
        'Firma requerida',
        'Por favor dibuja tu firma con el dedo en el recuadro para validar la aceptación legal.'
      );
      return;
    }
    if (signature) {
      onSaveSignature?.(signature);
    }
    if (guardando) return;

    // Decisión 2026-09-03 (reemplaza la de 2026-09-01): ni la respuesta de aceptación ni la firma
    // pueden fallar en silencio acá — es un compromiso legal, así que si no se pudo respaldar, la
    // persona se entera y no avanza creyendo que quedó firmado.
    setGuardando(true);
    try {
      const resultadoRespuesta = await guardarCapitulo(mapearTerminos(accepted));
      if (resultadoRespuesta.pendientes > 0) {
        Alert.alert('No se pudo guardar', 'No pudimos registrar tu aceptación. Revisa tu conexión e inténtalo de nuevo.');
        return;
      }

      // Firma con valor legal: se captura el lienzo ya dibujado como PNG y se sube a S3 con su
      // referencia guardada en la base (ver mapaPreguntas.ts, PREGUNTA_FIRMA_TERMINOS).
      const pngFirma = await signatureRef.current?.capturarComoPngBase64();
      if (!pngFirma || !signature) {
        Alert.alert('No se pudo capturar la firma', 'Vuelve a dibujar tu firma e inténtalo de nuevo.');
        return;
      }
      const resultadoFirma = await guardarFirma({
        flow: 'terminos',
        questionKey: PREGUNTA_FIRMA_TERMINOS.clave,
        pngBase64: pngFirma,
        trazosOriginales: signature.data,
      });
      if (!resultadoFirma.ok) {
        Alert.alert(
          'No se pudo guardar tu firma',
          'No pudimos respaldar tu firma en el almacenamiento. Revisa tu conexión e inténtalo de nuevo.'
        );
        return;
      }

      await aceptarHito('TERMINOS');
      await avanzarEstado({ flow: 'terminos', section: 'aceptacion', step: 0 });

      onAccept();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      {/* Top Header Bar */}
      <View style={[styles.topBar, { paddingHorizontal: horizontalPadding }]}>
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver al paso anterior"
          onPress={onBack}
          style={[styles.backBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
        >
          <Icon name="arrowLeft" size={16} color={c.goldInk} />
          <Text style={[t.micro, { color: c.text, letterSpacing: 1.2, fontSize: 11, fontFamily: 'Jost_700Bold' }]}>
            FICHA
          </Text>
        </Pressable>

        <Pressable
          hitSlop={10}
          onPress={toggle}
          accessibilityRole="button"
          style={[styles.themeBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
        >
          <Icon name={mode === 'light' ? 'moon' : 'sun'} size={15} color={c.goldInk} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            maxWidth: contentMaxWidth,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Medallion */}
        <View style={styles.header}>
          <View style={[styles.iconMedallion, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <Icon name="doc" size={22} color={c.goldInk} />
          </View>
          <MicroLabel>Acuerdo de transformación</MicroLabel>
          <Text style={[t.screenTitle, { color: c.textStrong, marginTop: 4, textAlign: 'center' }]}>
            TÉRMINOS Y CONDICIONES
          </Text>
          <Text style={[t.body, { color: c.textSoft, textAlign: 'center', marginTop: 4, fontSize: 13.5 }]}>
            Lee atentamente las 23 cláusulas y sella tu aceptación
          </Text>
        </View>

        {/* Legal Clauses Container */}
        <View style={[styles.termsCard, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          <View style={[styles.preambleBox, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}>
            <Icon name="diamond" size={16} color={c.goldInk} />
            <Text style={[t.body, { color: c.textStrong, fontFamily: 'Jost_500Medium', flex: 1, fontSize: 14, lineHeight: 21 }]}>
              Al inscribirme en el programa Renaser, declaro que lo hago de manera libre y voluntaria, y acepto íntegramente los siguientes términos:
            </Text>
          </View>

          <View style={styles.clausesList}>
            {TERMINOS_CLAUSULAS.map(item => (
              <View key={item.num} style={styles.clauseRow}>
                <View style={[styles.numBadge, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
                  <Text style={[t.micro, { color: c.goldInk, fontSize: 10, fontFamily: 'Jost_700Bold' }]}>
                    {item.num < 10 ? `0${item.num}` : item.num}
                  </Text>
                </View>
                <Text style={[t.body, styles.clauseText, { color: c.text, fontSize: 14, lineHeight: 22 }]}>
                  {item.texto}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Signature Box */}
        <View style={[styles.signatureCard, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          <SignatureCanvas
            ref={signatureRef}
            onSignatureChange={handleSignatureChange}
            label="FIRMA DE ACEPTACIÓN LEGAL (CON TU DEDO)"
            initialSignature={savedSignature}
            error={showError && !hasSigned ? 'Por favor dibuja tu firma con el dedo para continuar' : null}
          />
        </View>

        {/* Acceptance Checkbox */}
        <Checkbox
          checked={accepted}
          onToggle={val => {
            setAccepted(val);
            if (val && showError) setShowError(false);
          }}
          title="He leído y acepto los Términos y Condiciones"
          subtitle="Este es un compromiso legal y ético entre tú y el sistema Renaser."
        />

        {/* Continue Action */}
        <GoldButton
          label="CONTINUAR"
          onPress={handleContinue}
          disabled={!canContinue}
          loading={guardando}
          icon="arrow"
          style={{ marginTop: 4, marginBottom: 16 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 12,
  },
  themeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 36,
    gap: 14,
  },
  header: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 4,
  },
  iconMedallion: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  termsCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  preambleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  clausesList: {
    gap: 14,
  },
  clauseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  numBadge: {
    width: 26,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  clauseText: {
    flex: 1,
  },
  signatureCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
});
