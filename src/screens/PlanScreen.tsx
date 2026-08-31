import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { MicroLabel, ScreenHeader, ListRow } from '../components/ui';

const PRIORIDADES = [
  { i: '01', label: 'Convertirme en mi mejor versión' },
  { i: '02', label: 'Diseñar libertad financiera' },
  { i: '03', label: 'Impactar y servir a más personas' },
];

const FASES = [
  { d: 'DÍAS 1–30', n: 'FUNDACIÓN' },
  { d: 'DÍAS 31–60', n: 'ACELERACIÓN' },
  { d: 'DÍAS 61–90', n: 'EXPANSIÓN' },
];

export default function PlanScreen() {
  const { c, t } = useTheme();
  const { rs } = useResponsive();
  const gaugeW = rs(228);
  const gaugeH = rs(120);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="PLAN" right="dots" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', paddingTop: 20 }}>
          <Text style={[t.sectionTitle, { color: c.text }]}>TU MAPA DE LOS PRÓXIMOS 90 DÍAS</Text>
          <Text style={[t.sectionSub, { color: c.micro, marginTop: 7 }]}>Enfocado. Estratégico. Real.</Text>
        </View>

        <View style={[styles.gauge, { height: gaugeH + 8 }]}>
          <Svg width={gaugeW} height={gaugeH} viewBox="0 0 228 120">
            <Path d="M14 108a100 100 0 0 1 200 0" stroke={c.divider} strokeWidth={5} strokeLinecap="round" fill="none" />
            <Path d="M14 108a100 100 0 0 1 141-93" stroke={c.chevron} strokeWidth={5} strokeLinecap="round" fill="none" />
            <Circle cx={155} cy={15} r={6} fill={c.gold} />
          </Svg>
          <View style={styles.gaugeCenter}>
            <Text style={[t.micro, { color: c.micro }]}>DÍA</Text>
            <Text style={{ fontFamily: 'Jost_300Light', fontSize: 40, color: c.textStrong }}>37</Text>
            <Text style={[t.small, { color: c.micro }]}>DE 90</Text>
          </View>
          <Text style={[t.small, styles.gaugeLeft, { color: c.textSoft }]}>01</Text>
          <Text style={[t.small, styles.gaugeRight, { color: c.textSoft }]}>90</Text>
        </View>

        <View style={[styles.section, { borderTopColor: c.divider }]}>
          <MicroLabel>FASE ACTUAL</MicroLabel>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 11 }}>
            <Text style={[t.small, { color: c.gold }]}>01</Text>
            <Text style={[t.cardTitle, { color: c.text, flex: 1 }]}>Fundamentación</Text>
            <Text style={[t.small, { color: c.micro }]}>Días 1–30</Text>
          </View>
        </View>

        <View style={[styles.section, { borderTopColor: c.divider }]}>
          <MicroLabel>PRIORIDADES CLAVE</MicroLabel>
          <View style={{ marginTop: 6 }}>
            {PRIORIDADES.map(p => <ListRow key={p.i} index={p.i} label={p.label} />)}
          </View>
        </View>

        <View style={[styles.section, { borderTopColor: c.divider, flex: 1, justifyContent: 'flex-end', paddingBottom: 14 }]}>
          <MicroLabel>ARQUITECTURA DE TIEMPO</MicroLabel>
          <Svg width="100%" height={74} viewBox="0 0 300 74" style={{ marginVertical: 10 }}>
            <Path d="M6 62 L64 50 L122 54 L180 34 L238 32 L294 8" stroke={c.gold} strokeWidth={1.6} strokeLinecap="round" fill="none" />
            {[[6, 62], [64, 50], [122, 54], [180, 34], [238, 32], [294, 8]].map(([x, y]) => (
              <Circle key={x} cx={x} cy={y} r={3.4} fill={c.gold} />
            ))}
          </Svg>
          <View style={{ flexDirection: 'row' }}>
            {FASES.map((p, i) => (
              <View key={p.n} style={{ flex: 1, alignItems: i === 0 ? 'flex-start' : i === 1 ? 'center' : 'flex-end' }}>
                <Text style={[t.micro, { color: c.micro }]}>{p.d}</Text>
                <Text style={[t.micro, { color: c.textSoft, marginTop: 5 }]}>{p.n}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 26 },
  gauge: { height: 128, alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  gaugeCenter: { position: 'absolute', top: 44, alignItems: 'center' },
  gaugeLeft: { position: 'absolute', left: 8, bottom: 8 },
  gaugeRight: { position: 'absolute', right: 8, bottom: 8 },
  section: { borderTopWidth: 1, marginTop: 16, paddingTop: 16 },
});