import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Card, MicroLabel, ScreenHeader, GoldCircle } from '../components/ui';
import { Icon } from '../components/Icon';

export default function HoyScreen() {
  const { c, t } = useTheme();
  const { rs } = useResponsive();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="HOY" right="bell" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { minHeight: rs(300) }]}>
          {[306, 258, 210, 162].map((d, i) => {
            const size = rs(d);
            return (
              <View
                key={d}
                style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: [c.ring1, c.ring2, c.ring3, c.ring2][i] }]}
              />
            );
          })}
          <View style={styles.heroCenter}>
            <Text style={[t.micro, { color: c.textSoft, letterSpacing: 3.2 }]}>TU ÚNICO FOCO</Text>
            <Text style={[t.hero, { color: c.textStrong, marginTop: 14 }]}>AHORA</Text>
            <View style={{ marginTop: 26 }}>
              <GoldCircle size={52} icon="chevron" />
            </View>
          </View>
        </View>

        <View style={{ gap: 16, paddingBottom: 10 }}>
          <Card>
            <MicroLabel>INSIGHT INTELIGENTE</MicroLabel>
            <View style={styles.insight}>
              <Icon name="sun" size={19} color={c.gold} />
              <View style={{ gap: 4 }}>
                <Text style={[t.cardTitle, { color: c.text }]}>Lidera tu energía.</Text>
                <Text style={[t.body, { color: c.textSoft }]}>Todo lo demás se alinea.</Text>
              </View>
            </View>
          </Card>

          <Card>
            <View style={styles.between}>
              <View>
                <MicroLabel>PREPARAR MAÑANA</MicroLabel>
                <Text style={[t.body, { color: c.text, marginTop: 13, lineHeight: 21 }]}>
                  Define tu prioridad #1{"\n"}y visualiza tu día ideal.
                </Text>
              </View>
              <Icon name="chevron" size={14} color={c.chevron} />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1 },
  heroCenter: { alignItems: 'center' },
  insight: { flexDirection: 'row', gap: 13, alignItems: 'flex-start', marginTop: 13 },
  between: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
});