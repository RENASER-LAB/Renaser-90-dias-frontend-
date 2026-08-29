import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { Icon } from '../../../components/Icon';
import { SignatureCanvas, SignatureData } from '../../../components/SignatureCanvas';
import { GoldButton } from '../../../components/GoldButton';

interface PactoScreenProps {
  initialName?: string;
  savedSignature?: SignatureData | null;
  onAccept: (name: string, signature: SignatureData) => void;
  onBack: () => void;
}

export function PactoScreen({
  initialName = '',
  savedSignature,
  onAccept,
  onBack,
}: PactoScreenProps) {
  const { c, t, mode, toggle } = useTheme();
  const { isSmall, isTablet } = useResponsive();

  const [signature, setSignature] = useState<SignatureData | null>(savedSignature || null);
  const [hasSigned, setHasSigned] = useState<boolean>(Boolean(savedSignature?.data && savedSignature.data.trim().length > 0));
  const [clearTrigger, setClearTrigger] = useState(0);

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

  const handleConfirmSignature = () => {
    const finalSignature = signature || savedSignature;
    if (!hasSigned || !finalSignature || !finalSignature.data) {
      Alert.alert('Firma requerida', 'Por favor traza tu firma con el dedo en el recuadro para confirmar.');
      return;
    }
    onAccept(initialName, finalSignature);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      {/* Top Header Bar */}
      <View style={[styles.topBar, { paddingHorizontal: isSmall ? 14 : isTablet ? 32 : 18 }]}>
        <Pressable
          hitSlop={12}
          onPress={onBack}
          style={[styles.backBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
        >
          <Icon name="arrowLeft" size={16} color={c.gold} />
          <Text style={[t.micro, { color: c.text, letterSpacing: 1.2, fontSize: 11, fontWeight: '700' }]}>
            TÉRMINOS
          </Text>
        </Pressable>

        <Pressable
          hitSlop={10}
          onPress={toggle}
          accessibilityRole="button"
          style={[styles.themeBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
        >
          <Icon name={mode === 'light' ? 'moon' : 'sun'} size={15} color={c.gold} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isSmall ? 16 : isTablet ? 32 : 20,
            maxWidth: isTablet ? 560 : undefined,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Gold Medallion Logo */}
        <View style={styles.logoSection}>
          <View style={[styles.goldLogoBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
            <Icon name="spark" size={26} color={c.gold} />
          </View>
        </View>

        {/* Header Title Block */}
        <View style={styles.headerBlock}>
          <Text style={[t.micro, { color: c.textSoft, fontSize: 11, letterSpacing: 1.5, textAlign: 'center' }]}>
            BIENVENIDO OFICIALMENTE A LA
          </Text>
          <Text style={[t.screenTitle, { color: c.gold, fontSize: 17, fontWeight: '700', letterSpacing: 1.5, marginTop: 4, textAlign: 'center' }]}>
            FAMILIA RENASER
          </Text>

          {/* Divider */}
          <View style={[styles.goldDivider, { backgroundColor: c.gold }]} />

          <Text style={[t.body, { color: c.textSoft, fontSize: 13.5, textAlign: 'center', marginTop: 10 }]}>
            A partir de hoy, empieza a regir tu vida el
          </Text>
          <Text style={[t.micro, { color: c.gold, fontSize: 11.5, letterSpacing: 1.5, fontWeight: '700', marginTop: 4, textAlign: 'center' }]}>
            CÓDIGO I DE RENASER
          </Text>
          <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 38, letterSpacing: 4, fontWeight: '800', marginTop: 6, textAlign: 'center' }]}>
            VERDAD
          </Text>

          {/* Divider */}
          <View style={[styles.goldDivider, { backgroundColor: c.gold, marginTop: 12 }]} />
        </View>

        {/* Philosophy & Creed Block */}
        <View style={styles.creedBlock}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontWeight: '700', textAlign: 'center' }]}>
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
          <Text style={[t.body, { color: c.textStrong, fontSize: 15, textAlign: 'center', fontWeight: '500' }]}>
            A partir de hoy, me comprometo a <Text style={{ color: c.gold, fontWeight: '800' }}>SER VERDAD.</Text>
          </Text>
        </View>

        {/* Signature Box Section */}
        <View style={styles.signatureSection}>
          <Text style={[t.micro, { color: c.textSoft, fontSize: 11, letterSpacing: 1.5, textAlign: 'center', fontWeight: '700', marginBottom: 8 }]}>
            FIRMA PARA CONTINUAR
          </Text>

          <View style={[styles.signatureCard, { backgroundColor: c.cardBgAlt, borderColor: c.borderStrong }]}>
            <SignatureCanvas
              key={clearTrigger}
              onSignatureChange={handleSignatureChange}
              initialSignature={savedSignature}
              hideControls
            />
            {/* Watermark label when empty */}
            {!hasSigned && (
              <View pointerEvents="none" style={styles.watermarkBox}>
                <View style={[styles.watermarkLine, { backgroundColor: c.border }]} />
                <Text style={[t.micro, { color: c.tabInactive, letterSpacing: 2, fontSize: 11, fontWeight: '700' }]}>
                  FIRMA AQUÍ
                </Text>
              </View>
            )}
          </View>

          {/* Signature Action Bar below canvas */}
          <View style={styles.signatureFooterRow}>
            <Pressable onPress={handleClearSignature} style={styles.clearBtn}>
              <Text style={{ color: c.textSoft, fontSize: 13 }}>⟲</Text>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 12 }]}>Limpiar firma</Text>
            </Pressable>

            <Text style={[t.micro, { color: hasSigned ? '#4E9F76' : c.tabInactive, fontWeight: '700', fontSize: 11.5 }]}>
              {hasSigned ? '✓ FIRMADO' : 'SIN FIRMAR'}
            </Text>
          </View>
        </View>

        {/* Confirm Button */}
        <GoldButton
          label="Confirmar mi firma"
          onPress={handleConfirmSignature}
          disabled={!hasSigned}
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
  signatureCard: {
    width: '100%',
    height: 180,
    borderWidth: 1.5,
    borderRadius: 18,
    overflow: 'hidden',
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
  },
});
