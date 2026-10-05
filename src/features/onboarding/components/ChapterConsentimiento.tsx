import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { FichaConsentimientoData } from '../types/onboarding.types';
import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { tacto } from '../../../utils/tacto';

interface ChapterConsentimientoProps {
  data: FichaConsentimientoData;
  onChange: (data: FichaConsentimientoData) => void;
}

/**
 * Capítulo 3 de la Ficha Inicial · Consentimiento y compromiso (un solo paso).
 *
 * 2026-10-05 (onboarding nativo): mismos textos y misma casilla; cambia la respuesta al toque. La
 * tarjeta se hunde al apoyar el dedo, vibra al marcarse, y la marca va en dorado con la tinta de
 * encima del dorado. Antes, marcada, era un cuadrado BLANCO con borde blanco sobre una tarjeta
 * blanca (modo claro): sólo se veía el tilde, flotando.
 */
export function ChapterConsentimiento({ data, onChange }: ChapterConsentimientoProps) {
  const { c, t } = useTheme();

  const isChecked = Boolean(data.compromiso90Dias || data.autorizaUsoDatos);

  const handleToggle = () => {
    const nextVal = !isChecked;
    tacto.seleccion();
    onChange({
      ...data,
      autorizaUsoDatos: nextVal,
      compromiso90Dias: nextVal,
    });
  };

  return (
    <View style={styles.container}>
      {/* Texto de Autorización y Tratamiento de Datos */}
      <Text style={[t.body, { color: c.text, fontSize: 15, lineHeight: 23 }]}>
        Autorizo el uso responsable de mis datos para fines de seguimiento, mejora continua del proceso y envío de información relevante relacionada al acompañamiento dentro del ecosistema RENASER.
      </Text>

      {/* Tarjeta de Consentimiento y Compromiso a 90 Días */}
      <Presionable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked }}
        accessibilityLabel="Consentimiento y compromiso de 90 días"
        onPress={handleToggle}
        style={[
          styles.consentCard,
          {
            borderColor: isChecked ? c.gold : c.borderStrong,
            backgroundColor: isChecked ? c.goldWash : c.cardBgAlt,
          },
        ]}
      >
        {/* Casilla */}
        <View
          style={[
            styles.checkPill,
            {
              backgroundColor: isChecked ? c.gold : 'transparent',
              borderColor: isChecked ? c.gold : c.tabInactive,
            },
          ]}
        >
          {isChecked && <Icon name="check" size={15} color={c.onGold} strokeWidth={2.4} />}
        </View>

        {/* Textos de la tarjeta */}
        <View style={styles.textColumn}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 15, fontFamily: 'Jost_700Bold', lineHeight: 21 }]}>
            Autorizo el uso de mis datos y me comprometo a los 90 días
          </Text>
          <Text style={[t.small, { color: c.textSoft, fontSize: 13.5, lineHeight: 19, marginTop: 2 }]}>
            Acepto las exigencias del sistema y respeto el código de honor del grupo.
          </Text>
        </View>
      </Presionable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 22,
    width: '100%',
  },
  consentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  checkPill: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
});
