import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Alert } from '../../../components/Alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { mapearPacto, PREGUNTA_FIRMA_PACTO } from '../data/mapaPreguntas';
import { usePersistenciaOnboarding } from '../hooks/usePersistenciaOnboarding';
import { Icon } from '../../../components/Icon';
import { SignatureCanvas, SignatureCanvasHandle, SignatureData } from '../../../components/SignatureCanvas';
import { GoldButton } from '../../../components/GoldButton';

interface PactoScreenProps {
  initialName?: string;
  savedSignature?: SignatureData | null;
  /**
   * Texto del botón de volver. Por defecto `TÉRMINOS`, que es de dónde se llegaba acá cuando el
   * Pacto era un paso del onboarding inicial. Desde el arranque guiado (`features/sparkie`) el
   * Pacto se abre como modal después del primer post del Muro, y ahí atrás no hay ningún
   * "Términos": mentirle a la persona sobre a dónde la lleva un botón es peor que un texto feo.
   */
  etiquetaVolver?: string;
  onAccept: (name: string, signature: SignatureData) => void;
  onBack: () => void;
}

export function PactoScreen({
  initialName = '',
  savedSignature,
  etiquetaVolver = 'TÉRMINOS',
  onAccept,
  onBack,
}: PactoScreenProps) {
  const { c, t, mode, toggle } = useTheme();
  const { isSmall, isTablet, contentMaxWidth, horizontalPadding } = useResponsive();
  const { guardarCapitulo, avanzarEstado, aceptarHito, guardarFirma } = usePersistenciaOnboarding();
  // Ref al lienzo para poder capturarlo como PNG al confirmar (ver SignatureCanvas.capturarComoPngBase64).
  const signatureRef = useRef<SignatureCanvasHandle>(null);

  // Interceptar gestos de retroceso en pantalla táctil (Xiaomi / Android / iOS)
  useSystemBackHandler(() => {
    onBack();
    return true;
  }, true);

  const [signature, setSignature] = useState<SignatureData | null>(savedSignature || null);
  const [hasSigned, setHasSigned] = useState<boolean>(Boolean(savedSignature?.data && savedSignature.data.trim().length > 0));
  const [clearTrigger, setClearTrigger] = useState(0);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (savedSignature && savedSignature.data && savedSignature.data.trim().length > 0) {
      setSignature(savedSignature);
      setHasSigned(true);
    }
  }, [savedSignature]);

  const handleSignatureChange = (valid: boolean, sigData: SignatureData) => {
    setHasSigned(valid);
    setSignature(valid ? sigData : null);
  };

  const handleClearSignature = () => {
    setSignature(null);
    setHasSigned(false);
    setClearTrigger(prev => prev + 1);
  };

  const handleConfirmSignature = async () => {
    const finalSignature = signature || savedSignature;
    if (!hasSigned || !finalSignature || !finalSignature.data) {
      Alert.alert('Firma requerida', 'Por favor traza tu firma con el dedo en el recuadro para confirmar.');
      return;
    }

    if (guardando) return;

    // Decisión 2026-09-03 (reemplaza la de 2026-09-01): el Pacto de Sangre es el compromiso legal
    // más importante del onboarding, así que ni la aceptación ni la firma pueden fallar en
    // silencio acá — si no se pudo respaldar, la persona se entera y no avanza creyendo que quedó
    // firmado.
    setGuardando(true);
    try {
      // "Leer y firmar" es una sola acción en esta pantalla — no hay un paso separado de
      // "aceptar" antes de firmar (ver comentario en mapearPacto sobre accepted_pacto), por eso
      // el hito PACTO se marca acá igual.
      const resultadoRespuesta = await guardarCapitulo(mapearPacto(initialName));
      if (resultadoRespuesta.pendientes > 0) {
        Alert.alert('No se pudo guardar', 'No pudimos registrar tu aceptación del Pacto. Revisa tu conexión e inténtalo de nuevo.');
        return;
      }
      await aceptarHito('PACTO');

      // Firma con valor legal: se captura el lienzo ya dibujado como PNG y se sube a S3 con su
      // referencia guardada en la base (ver mapaPreguntas.ts, PREGUNTA_FIRMA_PACTO). El hito
      // PACTO_FIRMADO solo se marca si la firma llegó a guardarse de verdad — un pacto marcado
      // como firmado sin la firma real es peor que uno sin marcar, es justamente el registro con
      // valor probatorio que se quiere tener.
      const pngFirma = await signatureRef.current?.capturarComoPngBase64();
      if (!pngFirma) {
        Alert.alert('No se pudo capturar la firma', 'Vuelve a dibujar tu firma e inténtalo de nuevo.');
        return;
      }
      const resultado = await guardarFirma({
        flow: 'pacto',
        questionKey: PREGUNTA_FIRMA_PACTO.clave,
        pngBase64: pngFirma,
        trazosOriginales: finalSignature.data,
      });
      if (!resultado.ok) {
        Alert.alert(
          'No se pudo guardar tu firma',
          'No pudimos respaldar tu firma en el almacenamiento. Revisa tu conexión e inténtalo de nuevo.'
        );
        return;
      }
      await aceptarHito('PACTO_FIRMADO');

      await avanzarEstado({ flow: 'pacto', section: 'firma', step: 0 });

      onAccept(initialName, finalSignature);
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
            {etiquetaVolver}
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
            paddingHorizontal: isSmall ? 16 : isTablet ? 32 : 20,
            maxWidth: contentMaxWidth,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Gold Medallion Logo */}
        <View style={styles.logoSection}>
          <View style={[styles.goldLogoBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
            <Icon name="spark" size={26} color={c.goldInk} />
          </View>
        </View>

        {/* Header Title Block */}
        <View style={styles.headerBlock}>
          <Text style={[t.micro, { color: c.textSoft, fontSize: 11, letterSpacing: 1.5, textAlign: 'center' }]}>
            BIENVENIDO OFICIALMENTE A LA
          </Text>
          <Text style={[t.screenTitle, { color: c.goldInk, fontSize: 17, fontFamily: 'Jost_700Bold', letterSpacing: 1.5, marginTop: 4, textAlign: 'center' }]}>
            FAMILIA RENASER
          </Text>

          {/* Divider */}
          <View style={[styles.goldDivider, { backgroundColor: c.gold }]} />

          <Text style={[t.body, { color: c.textSoft, fontSize: 13.5, textAlign: 'center', marginTop: 10 }]}>
            A partir de hoy, empieza a regir tu vida el
          </Text>
          <Text style={[t.micro, { color: c.goldInk, fontSize: 11.5, letterSpacing: 1.5, fontFamily: 'Jost_700Bold', marginTop: 4, textAlign: 'center' }]}>
            CÓDIGO I DE RENASER
          </Text>
          <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 38, letterSpacing: 4, fontFamily: 'Jost_700Bold', marginTop: 6, textAlign: 'center' }]}>
            VERDAD
          </Text>

          {/* Divider */}
          <View style={[styles.goldDivider, { backgroundColor: c.gold, marginTop: 12 }]} />
        </View>

        {/* Philosophy & Creed Block */}
        <View style={styles.creedBlock}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_700Bold', textAlign: 'center' }]}>
            Sé verdad. Actúa con la VERDAD.
          </Text>

          <Text style={[t.body, { color: c.textSoft, fontSize: 14.5, lineHeight: 22, textAlign: 'center' }]}>
            Comprométete a programar y cumplir tus horarios con verdad.
          </Text>

          <Text style={[t.body, { color: c.textSoft, fontSize: 14.5, lineHeight: 22, textAlign: 'center' }]}>
            No programes lo que quisieras cumplir.
          </Text>

          <Text style={[t.body, { color: c.textSoft, fontSize: 14.5, lineHeight: 22, textAlign: 'center' }]}>
            Programa únicamente aquello que verdaderamente estás dispuesto a sostener.
          </Text>

          <Text style={[t.body, { color: c.textSoft, fontSize: 14.5, lineHeight: 22, textAlign: 'center' }]}>
            Lo que niegas te somete.
          </Text>
        </View>

        {/* Statement Box */}
        <View style={[styles.statementBox, { backgroundColor: c.cardBgAlt, borderColor: c.borderStrong }]}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 15, textAlign: 'center', fontFamily: 'Jost_500Medium' }]}>
            A partir de hoy, me comprometo a <Text style={{ color: c.goldInk, fontFamily: 'Jost_700Bold' }}>SER VERDAD.</Text>
          </Text>
        </View>

        {/* Signature Box Section */}
        <View style={styles.signatureSection}>
          <Text style={[t.micro, { color: c.textSoft, fontSize: 11, letterSpacing: 1.5, textAlign: 'center', fontFamily: 'Jost_700Bold', marginBottom: 8 }]}>
            FIRMA PARA CONTINUAR
          </Text>

          {/* Wrapper SIN caja propia: el recuadro visible lo dibuja `canvasBox` dentro de
              SignatureCanvas. Solo queda como contenedor relativo para el watermark absoluto. */}
          <View style={styles.signatureCard}>
            <SignatureCanvas
              ref={signatureRef}
              key={clearTrigger}
              onSignatureChange={handleSignatureChange}
              initialSignature={savedSignature}
              hideControls
            />
            {/* Watermark label when empty */}
            {!hasSigned && (
              <View pointerEvents="none" style={styles.watermarkBox}>
                <View style={[styles.watermarkLine, { backgroundColor: c.border }]} />
                <Text style={[t.micro, { color: c.tabInactive, letterSpacing: 2, fontSize: 11, fontFamily: 'Jost_700Bold' }]}>
                  FIRMA AQUÍ
                </Text>
              </View>
            )}
          </View>

          {/* Signature Action Bar below canvas */}
          <View style={styles.signatureFooterRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Borrar la firma y volver a firmar"
              onPress={handleClearSignature}
              style={styles.clearBtn}
            >
              <Text style={{ color: c.textSoft, fontSize: 13 }}>⟲</Text>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 12 }]}>Limpiar firma</Text>
            </Pressable>

            <Text style={[t.micro, { color: hasSigned ? c.success : c.tabInactive, fontFamily: 'Jost_700Bold', fontSize: 11.5 }]}>
              {hasSigned ? '✓ FIRMADO' : 'SIN FIRMAR'}
            </Text>
          </View>
        </View>

        {/* Confirm Button */}
        <GoldButton
          label="Confirmar mi firma"
          onPress={handleConfirmSignature}
          disabled={!hasSigned}
          loading={guardando}
          icon="check"
          style={{ marginTop: 8, marginBottom: 20 }}
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
    paddingBottom: 40,
    gap: 16,
    alignItems: 'center',
  },
  logoSection: {
    paddingTop: 10,
    alignItems: 'center',
  },
  goldLogoBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBlock: {
    alignItems: 'center',
    width: '100%',
  },
  goldDivider: {
    width: 44,
    height: 1.5,
    marginTop: 8,
    borderRadius: 1,
  },
  creedBlock: {
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 10,
    width: '100%',
  },
  statementBox: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureSection: {
    width: '100%',
    marginTop: 4,
  },
  /**
   * BUG DE MAQUETADO (2026-09-04): esto tenía `height: 180`, `borderWidth: 1.5` y `borderRadius: 18`
   * mientras que el `canvasBox` de `SignatureCanvas` ya trae su propio recuadro de 145 de alto con
   * borde. Se veían DOS marcos anidados y quedaba una franja muerta de 35 px debajo de la firma.
   * Ahora es solo un contenedor relativo (lo necesita el watermark, que es absoluto): el único
   * recuadro visible es el del lienzo, y el área dibujable no cambia — los 145 de siempre.
   */
  signatureCard: {
    width: '100%',
    position: 'relative',
  },
  watermarkBox: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
    gap: 8,
  },
  watermarkLine: {
    width: '100%',
    height: 1,
  },
  signatureFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 8,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
});
