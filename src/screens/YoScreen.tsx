import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { useAuth } from '../context/AuthContext';
import { MicroLabel, ScreenHeader, Placeholder } from '../components/ui';
import { Icon } from '../components/Icon';

const EVOLUCION = [[6, 66], [38, 58], [70, 62], [102, 46], [134, 50], [166, 34], [198, 38], [230, 24], [262, 26], [294, 12], [314, 8]];
const PATRONES = [[6, 34], [90, 30], [174, 34], [258, 20], [314, 18]];

const STATS = [{ k: 'DISCIPLINA', v: '87' }, { k: 'ENFOQUE', v: '92' }, { k: 'ENERGÍA', v: '81' }];

export default function YoScreen() {
  const { c, t } = useTheme();
  const { rs } = useResponsive();
  const { user, logout, restartOnboarding } = useAuth();
  const moreSize = rs(56);
  const evoPath = 'M' + EVOLUCION.map(p => p[0] + ' ' + p[1]).join(' L');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="YO" right="dots" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        {user && (
          <View style={[styles.userCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            <View style={[styles.avatar, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Icon name="user" size={20} color={c.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.cardTitle, { color: c.textStrong }]}>{user.name}</Text>
              <Text style={[t.small, { color: c.micro, marginTop: 2 }]}>{user.email}</Text>
            </View>
          </View>
        )}

        <View style={{ paddingTop: 14 }}>
          <Text style={[t.micro, { color: c.textSoft }]}>TU EVOLUCIÓN</Text>
          <Text style={[t.micro, { color: c.micro, marginTop: 6 }]}>DÍA 37 DE 90</Text>
          <Svg width="100%" height={78} viewBox="0 0 320 78" style={{ marginTop: 12 }}>
            <Path d={evoPath} stroke={c.gold} strokeWidth={1.5} strokeLinecap="round" fill="none" />
            {EVOLUCION.map(([x, y]) => <Circle key={x} cx={x} cy={y} r={2.8} fill={c.gold} />)}
          </Svg>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, paddingTop: 14 }}>
          {STATS.map(s => (
            <View key={s.k} style={[styles.stat, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              <Text style={[t.micro, { color: c.micro, fontSize: 8 }]}>{s.k}</Text>
              <Text style={{ fontFamily: 'Jost_300Light', fontSize: 24, color: c.textStrong, marginTop: 8 }}>
                {s.v}<Text style={{ fontSize: 12, color: c.micro }}>%</Text>
              </Text>
            </View>
          ))}
        </View>

        <View style={{ paddingTop: 18 }}>
          <MicroLabel>EVIDENCIA</MicroLabel>
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 11 }}>
            {[0, 1, 2].map(i => <Placeholder key={i} label="FOTO" style={{ flex: 1, height: moreSize, borderRadius: 10 }} />)}
            <View style={[styles.more, { width: moreSize, height: moreSize, borderColor: c.border, backgroundColor: c.cardBg }]}>
              <Text style={[t.small, { color: c.textSoft }]}>+6</Text>
            </View>
          </View>
        </View>

        <View style={[styles.rowCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          <View>
            <MicroLabel>REFLEXIÓN DIARIA</MicroLabel>
            <Text style={[t.body, { color: c.text, marginTop: 8 }]}>¿Qué aprendí hoy sobre mí?</Text>
          </View>
          <Icon name="chevron" size={12} color={c.chevron} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', paddingTop: 16 }}>
          <MicroLabel>PATRONES</MicroLabel>
          <Svg width="100%" height={52} viewBox="0 0 320 52" style={{ marginTop: 8 }}>
            <Path
              d="M6 34 C 34 12, 62 44, 90 30 S 146 8, 174 34 S 230 44, 258 20 S 300 30, 314 18"
              stroke={c.gold} strokeWidth={1.5} strokeLinecap="round" fill="none"
            />
            {PATRONES.map(([x, y]) => <Circle key={x} cx={x} cy={y} r={2.8} fill={c.gold} />)}
          </Svg>
        </View>

        <View style={[styles.rowCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          <View>
            <MicroLabel>IDENTIDAD</MicroLabel>
            <Text style={[t.body, { color: c.text, marginTop: 8, lineHeight: 21 }]}>
              Soy la persona que…{"\n"}Elijo ser cada día.
            </Text>
          </View>
          <Icon name="chevron" size={12} color={c.chevron} />
        </View>

        {/* Review Ficha Inicial / Onboarding Button */}
        <Pressable
          onPress={restartOnboarding}
          style={[styles.onboardingBtn, { borderColor: c.borderStrong, backgroundColor: c.cardBg }]}
        >
          <Icon name="doc" size={16} color={c.gold} />
          <Text style={[t.micro, { color: c.textStrong, letterSpacing: 1.6, fontWeight: '600' }]}>
            MI FICHA INICIAL & PACTO
          </Text>
        </Pressable>

        {/* Logout Button */}
        <Pressable
          onPress={logout}
          style={[styles.logoutBtn, { borderColor: c.border, backgroundColor: c.cardBg }]}
        >
          <Icon name="logout" size={16} color={c.textSoft} />
          <Text style={[t.micro, { color: c.textSoft, letterSpacing: 1.8 }]}>
            CERRAR SESIÓN
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 },
  userCard: { marginTop: 14, borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stat: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  more: { borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowCard: { marginTop: 16, borderWidth: 1, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  onboardingBtn: { marginTop: 18, borderWidth: 1, borderRadius: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  logoutBtn: { marginTop: 10, marginBottom: 12, borderWidth: 1, borderRadius: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});