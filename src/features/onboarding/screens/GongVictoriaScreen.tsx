import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { GoldButton } from '../../../components/GoldButton';

interface GongVictoriaScreenProps {
  onEnterApp: () => void;
}

const MILESTONES = [
  'Completaste tu Ficha Inicial oficial (Identidad, Salud y Consentimiento)',
  'Aceptaste los Términos y Condiciones del ecosistema',
  'Firmaste y sellaste el Código I de Renaser: VERDAD',
  'Activaste tu protocolo innegociable de 90 días',
];

export function GongVictoriaScreen({ onEnterApp }: GongVictoriaScreenProps) {
  const { c, t } = useTheme();
  const { rs, isTablet } = useResponsive();

  const ringSizes = [rs(220), rs(176), rs(132), rs(88)];
  const ringColors = [c.ring1, c.ring2, c.ring3, c.ring2];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { maxWidth: isTablet ? 520 : undefined, alignSelf: isTablet ? 'center' : 'stretch', width: isTablet ? '100%' : undefined }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Victory Hero */}
        <View style={styles.heroSection}>
          <View style={styles.ringContainer}>
            {ringSizes.map((size, index) => (
              <View
                key={size}
                style={[
                  styles.ring,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderColor: ringColors[index],
                  },
                ]}
              />
            ))}
            <View style={[styles.trophyMedallion, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
              <Icon name="trophy" size={rs(28)} color={c.goldInk} strokeWidth={1.2} />
            </View>
          </View>

          <MicroLabel>Proceso fundacional sellado</MicroLabel>
          <Text style={[t.hero, { color: c.textStrong, marginTop: 12, fontSize: 30, letterSpacing: 4, textAlign: 'center' }]}>
            ¡GONG DE VICTORIA!
          </Text>
          <Text style={[t.sectionSub, { color: c.textSoft, marginTop: 8, textAlign: 'center', lineHeight: 22 }]}>
            Has cruzado el umbral. Este es el paso que separa a quienes piensan en cambiar de quienes realmente lo hacen.
          </Text>
        </View>

        {/* Milestones Card */}
        <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          <MicroLabel>Hitos completados hoy</MicroLabel>
          <View style={{ gap: 14, marginVertical: 8 }}>
            {MILESTONES.map((milestone, idx) => (
              <View key={idx} style={styles.milestoneRow}>
                <View style={[styles.checkCircle, { backgroundColor: c.goldWash, borderColor: c.gold }]}>
                  <Icon name="check" size={13} color={c.goldInk} strokeWidth={2.2} />
                </View>
                <Text style={[t.body, { color: c.text, flex: 1, lineHeight: 21, fontSize: 14 }]}>
                  {milestone}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.quoteBox, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}>
            <Icon name="diamond" size={16} color={c.goldInk} />
            <Text style={[t.body, { color: c.textStrong, fontStyle: 'italic', flex: 1, lineHeight: 21, fontSize: 13.5 }]}>
              "El guerrero no se mide por lo que declara al inicio, sino por lo que sostiene hasta el final."
            </Text>
          </View>

          <GoldButton
            label="ENTRAR A MI DÍA 01 (HOY)"
            onPress={onEnterApp}
            icon="arrow"
            style={{ marginTop: 8 }}
          />
        </View>

        {/* Footer */}
        <Text style={[t.micro, styles.footerText, { color: c.textSoft, letterSpacing: 1, fontSize: 11, fontFamily: 'Jost_500Medium' }]}>
          BIENVENIDO AL SISTEMA INTEGRAL RENASER 🦅
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 14,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
  },
  ringContainer: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  trophyMedallion: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  footerText: {
    textAlign: 'center',
    marginTop: 8,
  },
});
