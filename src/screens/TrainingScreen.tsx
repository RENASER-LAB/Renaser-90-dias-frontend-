import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { ScreenHeader } from '../components/ui';
import { Icon, IconName } from '../components/Icon';

const DIMENSIONES: { icon: IconName; title: string; sub: string }[] = [
  { icon: 'body', title: 'CUERPO', sub: 'Fuerza · Energía · Salud' },
  { icon: 'brain', title: 'MENTE', sub: 'Enfoque · Mentalidad · Aprendizaje' },
  { icon: 'heart', title: 'EMOCIONES', sub: 'Gestión Emocional · Relaciones · Propósito' },
  { icon: 'spark', title: 'ESPÍRITU', sub: 'Propósito · Fe · Gratitud' },
  { icon: 'briefcase', title: 'VIDA Y NEGOCIO', sub: 'Hábitos · Entorno · Estilo de Vida\nValor · Estrategia · Impacto' },
];

export default function TrainingScreen() {
  const { c, t } = useTheme();
  const { rs, isTablet } = useResponsive();
  const medallionSize = rs(42);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="TRAINING" right="dots" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', paddingTop: 22 }}>
          <Text style={[t.sectionTitle, { color: c.text }]}>TU ENTRENAMIENTO INTEGRAL</Text>
          <Text style={[t.sectionSub, { color: c.micro, marginTop: 7 }]}>Cinco dimensiones. Un sistema.</Text>
        </View>

        <View style={{ flex: 1, gap: 9, paddingVertical: 16, maxWidth: isTablet ? 560 : undefined, alignSelf: isTablet ? 'center' : 'stretch', width: isTablet ? '100%' : undefined }}>
          {DIMENSIONES.map(d => (
            <Pressable key={d.title} style={[styles.card, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              <View style={[styles.medallion, { borderColor: c.gold, width: medallionSize, height: medallionSize, borderRadius: medallionSize / 2 }]}>
                <Icon name={d.icon} size={rs(21)} color={c.gold} strokeWidth={1.05} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Jost_700Bold', color: c.text, letterSpacing: 1.7, fontSize: 14 }}>{d.title}</Text>
                <Text style={[t.small, { color: c.micro, marginTop: 4, lineHeight: 17 }]}>{d.sub}</Text>
              </View>
              <Icon name="chevron" size={12} color={c.chevron} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24 },
  card: { flex: 1, minHeight: 78, borderWidth: 1, borderRadius: 18, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 15 },
  medallion: { alignItems: 'center', justifyContent: 'center', opacity: 0.95 },
});