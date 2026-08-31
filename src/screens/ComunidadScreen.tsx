import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { MicroLabel, ScreenHeader, Placeholder } from '../components/ui';
import { Icon, IconName } from '../components/Icon';

const SOPORTE: { icon: IconName; label: string }[] = [
  { icon: 'clock', label: 'Eventos &\nExperiencias' },
  { icon: 'stack', label: 'Recursos\nExclusivos' },
  { icon: 'user', label: 'Atención\nPersonalizada' },
];

const METRICAS = [
  { n: '12', label: 'Conversaciones\nesta semana' },
  { n: '3', label: 'Eventos\npróximos' },
  { n: '2', label: 'Mentorías\nprogramadas' },
];

export default function ComunidadScreen() {
  const { c, t } = useTheme();
  const { rs } = useResponsive();
  const mentorPhoto = rs(50);
  const avatarSize = rs(42);
  const medallionSize = rs(40);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="COMUNIDAD" right="info" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', paddingTop: 20 }}>
          <Text style={[t.sectionTitle, { color: c.text, lineHeight: 21, textAlign: "center" }]}>
            TU TRIBU. TU SOPORTE.{"\n"}TU LEGADO.
          </Text>
        </View>

        <View style={{ paddingTop: 18 }}>
          <MicroLabel>MENTOR</MicroLabel>
          <View style={[styles.mentor, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            <Placeholder label="FOTO" style={{ width: mentorPhoto, height: mentorPhoto, borderRadius: mentorPhoto / 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[t.cardTitle, { color: c.textStrong }]}>Sebastián Arango</Text>
              <Text style={[t.small, { color: c.micro, marginTop: 3 }]}>Mentor de Alto Rendimiento</Text>
              <Text style={[t.small, { color: c.textSoft, marginTop: 8, fontStyle: "italic", lineHeight: 18 }]}>
                “Revisión de tu plan de esta semana.{"\n"}¿Agendamos tu llamada?”
              </Text>
            </View>
            <Icon name="chevron" size={12} color={c.chevron} />
          </View>
        </View>

        <View style={[styles.section, { borderTopColor: c.divider }]}>
          <MicroLabel>TRIBU PRIVADA</MicroLabel>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 13 }}>
            {[0, 1, 2, 3].map(i => <Placeholder key={i} style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }} />)}
            <View style={[styles.more, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, borderColor: c.border, backgroundColor: c.cardBg }]}>
              <Text style={[t.small, { color: c.textSoft }]}>+12</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { borderTopColor: c.divider }]}>
          <MicroLabel>TU SOPORTE</MicroLabel>
          <View style={{ flexDirection: 'row', marginTop: 15 }}>
            {SOPORTE.map(s => (
              <View key={s.label} style={{ flex: 1, alignItems: 'center', gap: 10 }}>
                <View style={[styles.medallion, { width: medallionSize, height: medallionSize, borderRadius: medallionSize / 2, borderColor: c.gold }]}>
                  <Icon name={s.icon} size={rs(19)} color={c.gold} strokeWidth={1.05} />
                </View>
                <Text style={[t.micro, { color: c.textSoft, textAlign: "center", letterSpacing: 0, fontSize: 9, lineHeight: 13 }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.section, { borderTopColor: c.divider, flex: 1, justifyContent: 'flex-end', paddingBottom: 14 }]}>
          <MicroLabel>INTERACCIONES CLAVE</MicroLabel>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            {METRICAS.map(m => (
              <View key={m.n} style={[styles.metric, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Text style={[t.metric, { color: c.textStrong, fontSize: 22 }]}>{m.n}</Text>
                <Text style={[t.micro, { color: c.micro, letterSpacing: 0, fontSize: 9, textAlign: "center", marginTop: 6, lineHeight: 13 }]}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24 },
  mentor: { marginTop: 11, borderWidth: 1, borderRadius: 16, padding: 15, flexDirection: 'row', gap: 14, alignItems: 'center' },
  section: { borderTopWidth: 1, marginTop: 18, paddingTop: 16 },
  more: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  medallion: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  metric: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
});