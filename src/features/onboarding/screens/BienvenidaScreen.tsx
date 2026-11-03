import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { GoldButton } from '../../../components/GoldButton';
import { usePlazoDeLaSesion } from '../../formaciones/hooks/usePlazoDeLaSesion';
import { diaDeLaEtapa, losProximos } from '../../formaciones/utils/plazoEnFrases';

interface BienvenidaScreenProps {
  onContinue: () => void;
}

/** Las cuatro etapas, con el día de cada una en un programa de 90 días; `etapasDelProgramaDe` las lleva a la duración de la persona (issue #103). */
const EVOLUTION_STAGES = [
  { dia: 1, title: 'SEMILLA', desc: 'Fundación & Consciencia', icon: 'spark' as const },
  { dia: 30, title: 'CRECIMIENTO', desc: 'Disciplina & Hábitos', icon: 'body' as const },
  { dia: 60, title: 'FORTALEZA', desc: 'Aceleración & Enfoque', icon: 'brain' as const },
  { dia: 90, title: 'ÁGUILA', desc: 'Identidad Renovada', icon: 'diamond' as const },
];

/** «DÍA 01», «DÍA 30»… en los 90 días de siempre; con 365 días, «DÍA 01», «DÍA 122», «DÍA 243» y «DÍA 365». */
export function etapasDelProgramaDe(duracionDias: number) {
  return EVOLUTION_STAGES.map(({ dia, ...etapa }) => ({
    ...etapa,
    day: `DÍA ${String(diaDeLaEtapa(dia, duracionDias)).padStart(2, '0')}`,
  }));
}

export function BienvenidaScreen({ onContinue }: BienvenidaScreenProps) {
  const { c, t, mode, toggle } = useTheme();
  const { rs, isTablet } = useResponsive();
  /* Issue #103: «los próximos 90 días» y el Día 90 son los del programa de la persona (3 meses, 1 año), no siempre 90. */
  const { plazo, duracionDias } = usePlazoDeLaSesion();

  const ringSizes = [rs(220), rs(176), rs(132), rs(88)];
  const ringColors = [c.ring1, c.ring2, c.ring3, c.ring2];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={{ width: 34 }} />
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
          { maxWidth: isTablet ? 500 : undefined, alignSelf: isTablet ? 'center' : 'stretch', width: isTablet ? '100%' : undefined }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Branding Hero */}
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
            <View style={[styles.iconMedallion, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
              <Icon name="spark" size={rs(22)} color={c.goldInk} strokeWidth={1.2} />
            </View>
          </View>

          <MicroLabel>Bienvenido a tu transformación</MicroLabel>
          <Text style={[t.hero, { color: c.textStrong, marginTop: 10, letterSpacing: 8, fontSize: 32 }]}>
            RENASER
          </Text>
          <Text style={[t.body, { color: c.textSoft, marginTop: 8, textAlign: 'center', lineHeight: 22, fontSize: 14.5 }]}>
            "La transformación no ocurre en un día,{"\n"}ocurre día a día."
          </Text>
        </View>

        {/* Evolution Timeline Card */}
        <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <MicroLabel>Tu mapa evolutivo</MicroLabel>
            <Text style={[t.sectionTitle, { color: c.text, marginTop: 4, fontSize: 13, letterSpacing: 2 }]}>
              {losProximos(plazo).toUpperCase()}
            </Text>
          </View>

          <View style={styles.stagesGrid}>
            {etapasDelProgramaDe(duracionDias).map(stage => (
              <View
                key={stage.day}
                style={[
                  styles.stageItem,
                  { borderColor: c.border, backgroundColor: c.cardBgAlt }
                ]}
              >
                <View style={[styles.stageIconWrap, { borderColor: c.gold }]}>
                  <Icon name={stage.icon} size={16} color={c.goldInk} />
                </View>
                <Text style={[t.micro, { color: c.goldInk, letterSpacing: 1.2, marginTop: 8, fontSize: 10.5, fontFamily: fuentes.negrita }]}>
                  {stage.day}
                </Text>
                <Text style={[t.body, { color: c.textStrong, fontFamily: fuentes.negrita, marginTop: 2, fontSize: 13.5 }]}>
                  {stage.title}
                </Text>
                <Text style={[t.small, { color: c.textSoft, fontSize: 10.5, textAlign: 'center', marginTop: 2 }]}>
                  {stage.desc}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.quoteBox, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}>
            <Icon name="diamond" size={16} color={c.goldInk} />
            <Text style={[t.body, { color: c.text, flex: 1, lineHeight: 20, fontSize: 13.5 }]}>
              {`${plazo.charAt(0).toUpperCase()}${plazo.slice(1)} de compromiso, disciplina innegociable y evolución en 5 dimensiones.`}
            </Text>
          </View>

          <GoldButton
            label="Comenzar mi viaje"
            onPress={onContinue}
            icon="arrow"
            style={{ marginTop: 6 }}
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
    paddingHorizontal: 20,
    paddingTop: 4,
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
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
  },
  ringContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  iconMedallion: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  stagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stageItem: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  stageIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
});
