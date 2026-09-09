import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { FichaConsentimientoData } from '../types/onboarding.types';
import { Icon } from '../../../components/Icon';

interface ChapterConsentimientoProps {
  data: FichaConsentimientoData;
  onChange: (data: FichaConsentimientoData) => void;
}

export function ChapterConsentimiento({ data, onChange }: ChapterConsentimientoProps) {
  const { c, t } = useTheme();

  const isChecked = Boolean(data.compromiso90Dias || data.autorizaUsoDatos);

  const handleToggle = () => {
    const nextVal = !isChecked;
    onChange({
      ...data,
      autorizaUsoDatos: nextVal,
      compromiso90Dias: nextVal,
    });
  };

  return (
    <View style={styles.container}>
      {/* Texto de Autorización y Tratamiento de Datos */}
      <Text style={[t.body, { color: c.text, fontSize: 14, lineHeight: 21 }]}>
        Autorizo el uso responsable de mis datos para fines de seguimiento, mejora continua del proceso y envío de información relevante relacionada al acompañamiento dentro del ecosistema RENASER.
      </Text>

      {/* Tarjeta de Consentimiento y Compromiso a 90 Días */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked }}
        accessibilityLabel="Consentimiento y compromiso de 90 días"
        onPress={handleToggle}
        style={[
          styles.consentCard,
          {
            borderColor: isChecked ? c.gold : c.borderStrong,
            backgroundColor: isChecked ? c.cardBgAlt : c.cardBg,
          },
        ]}
      >
        {/* Checkbox Rounded Pill */}
        <View
          style={[
            styles.checkPill,
            {
              backgroundColor: isChecked ? '#FFFFFF' : 'transparent',
              borderColor: isChecked ? '#FFFFFF' : c.tabInactive,
            },
          ]}
        >
          {isChecked && <Icon name="check" size={14} color="#1E1B18" />}
        </View>

        {/* Textos de la tarjeta */}
        <View style={styles.textColumn}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 14.5, fontFamily: 'Jost_700Bold', lineHeight: 20 }]}>
            Autorizo el uso de mis datos y me comprometo a los 90 días
          </Text>
          <Text style={[t.micro, { color: c.textSoft, fontSize: 12.5, lineHeight: 17, marginTop: 2 }]}>
            Acepto las exigencias del sistema y respeto el código de honor de la célula.
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
    width: '100%',
    paddingTop: 4,
  },
  consentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  checkPill: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
});
