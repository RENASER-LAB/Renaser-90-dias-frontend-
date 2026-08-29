import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { FichaInicialData } from '../types/onboarding.types';
import { CHAPTERS_CONFIG, INITIAL_FICHA_DATA } from '../data/chaptersConfig';
import { OnboardingStepBar } from '../components/OnboardingStepBar';
import { ChapterIdentidad } from '../components/ChapterIdentidad';
import { ChapterSalud } from '../components/ChapterSalud';
import { ChapterConsentimiento } from '../components/ChapterConsentimiento';
import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { GoldButton } from '../../../components/GoldButton';

interface FichaInicialScreenProps {
  initialUserName?: string;
  initialUserEmail?: string;
  onComplete: (data: FichaInicialData) => void;
  onBack: () => void;
}

export function FichaInicialScreen({
  initialUserName = '',
  initialUserEmail = '',
  onComplete,
  onBack,
}: FichaInicialScreenProps) {
  const { c, t, mode, toggle } = useTheme();
  const { isSmall, isTablet } = useResponsive();

  const [currentChapter, setCurrentChapter] = useState(0);
  const [formData, setFormData] = useState<FichaInicialData>({
    ...INITIAL_FICHA_DATA,
    identidad: {
      ...INITIAL_FICHA_DATA.identidad,
      nombre: initialUserName || INITIAL_FICHA_DATA.identidad.nombre,
      email: initialUserEmail || INITIAL_FICHA_DATA.identidad.email,
    },
  });

  const activeConfig = CHAPTERS_CONFIG[currentChapter];
  const isLastChapter = currentChapter === CHAPTERS_CONFIG.length - 1;

  const validateChapter = (): boolean => {
    if (currentChapter === 0) {
      if (formData.identidad.nombre.trim().length < 3) {
        Alert.alert('Nombre requerido', 'Por favor ingresa tu nombre completo en la Identidad.');
        return false;
      }
      if (!formData.identidad.sexo) {
        Alert.alert('Sexo requerido', 'Por favor selecciona una opción de sexo.');
        return false;
      }
      if (formData.identidad.numeroDocumento.trim().length < 4) {
        Alert.alert('Documento requerido', 'Por favor ingresa tu número de documento de identidad.');
        return false;
      }
      if (!formData.identidad.fechaNacimiento.trim()) {
        Alert.alert('Fecha requerida', 'Por favor selecciona tu fecha de nacimiento.');
        return false;
      }
      if (formData.identidad.whatsapp.trim().length < 6) {
        Alert.alert('WhatsApp requerido', 'Por favor ingresa tu número de WhatsApp para contacto con tu mentor.');
        return false;
      }
    } else if (currentChapter === 1) {
      const horas = parseFloat(formData.salud.horasSueno);
      if (isNaN(horas) || horas < 0 || horas > 24 || !formData.salud.horasSueno.trim()) {
        Alert.alert('Horas de sueño requeridas', 'Por favor ingresa tus horas promedio de sueño (entre 0 y 24).');
        return false;
      }
      if (formData.salud.tomaMedicacionRegular) {
        if (!formData.salud.especificacionMedicacion?.trim()) {
          Alert.alert('Medicación requerida', 'Por favor especifica tu medicación y el motivo de la toma.');
          return false;
        }
      }
    } else if (currentChapter === 2) {
      if (!formData.consentimiento.autorizaUsoDatos && !formData.consentimiento.compromiso90Dias) {
        Alert.alert(
          'Compromiso requerido',
          'Por favor marca la casilla de autorización de datos y compromiso a los 90 días para continuar.'
        );
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateChapter()) return;

    if (isLastChapter) {
      onComplete(formData);
    } else {
      setCurrentChapter(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentChapter > 0) {
      setCurrentChapter(prev => prev - 1);
    } else {
      onBack();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { paddingHorizontal: isSmall ? 14 : isTablet ? 32 : 18 }]}>
        <Pressable
          hitSlop={12}
          onPress={handlePrev}
          style={[styles.backBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
        >
          <Icon name="arrowLeft" size={16} color={c.gold} />
          <Text style={[t.micro, { color: c.text, letterSpacing: 1.2, fontSize: 11, fontWeight: '700' }]}>
            {currentChapter === 0 ? 'SALIR' : 'ANTERIOR'}
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
            paddingHorizontal: isSmall ? 14 : isTablet ? 32 : 18,
            maxWidth: isTablet ? 560 : undefined,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Chapter Header */}
        <View style={styles.header}>
          <View style={[styles.iconMedallion, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <Icon name={activeConfig.icon} size={22} color={c.gold} />
          </View>
          <MicroLabel>{activeConfig.subtitle}</MicroLabel>
          <Text style={[t.screenTitle, { color: c.textStrong, marginTop: 4, textAlign: 'center' }]}>
            {activeConfig.title}
          </Text>
        </View>

        {/* Step Progress Bar */}
        <OnboardingStepBar currentStep={currentChapter} totalSteps={CHAPTERS_CONFIG.length} />

        {/* Modular Chapter Form Box */}
        <View style={[styles.formCard, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          {currentChapter === 0 && (
            <ChapterIdentidad
              data={formData.identidad}
              onChange={identidad => setFormData({ ...formData, identidad })}
            />
          )}

          {currentChapter === 1 && (
            <ChapterSalud
              data={formData.salud}
              onChange={salud => setFormData({ ...formData, salud })}
            />
          )}

          {currentChapter === 2 && (
            <ChapterConsentimiento
              data={formData.consentimiento}
              onChange={consentimiento => setFormData({ ...formData, consentimiento })}
            />
          )}
        </View>

        {/* Bottom Actions */}
        <View style={styles.actionsRow}>
          {currentChapter > 0 && (
            <GoldButton
              label="ANTERIOR"
              variant="secondary"
              onPress={handlePrev}
              icon="arrowLeft"
              iconPosition="left"
              style={{ flex: 1 }}
            />
          )}

          <GoldButton
            label={isLastChapter ? 'CONTINUAR A TÉRMINOS' : 'SIGUIENTE'}
            variant="primary"
            onPress={handleNext}
            icon="arrow"
            style={{ flex: currentChapter > 0 ? 1.5 : 1 }}
          />
        </View>
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
    paddingBottom: 36,
    gap: 12,
  },
  header: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 6,
  },
  iconMedallion: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
