import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { Icon, IconName } from './Icon';

export function MicroLabel({ children }: { children: React.ReactNode }) {
  const { c, t } = useTheme();
  return <Text style={[t.micro, { color: c.micro }]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { c } = useTheme();
  return (
    <View style={[{ borderWidth: 1, borderColor: c.border, borderRadius: 16, backgroundColor: c.cardBg, padding: 17 }, style]}>
      {children}
    </View>
  );
}

export function ScreenHeader({ title, right, onPressRight }: { title: string; right: IconName; onPressRight?: () => void }) {
  const { c, t } = useTheme();
  return (
    <View style={styles.header}>
      <Text style={[t.screenTitle, { color: c.text }]}>{title}</Text>
      <Pressable hitSlop={12} onPress={onPressRight} style={styles.headerBtn}>
        <Icon name={right} size={19} color={right === 'dots' ? c.textSoft : c.gold} />
      </Pressable>
    </View>
  );
}

export function GoldCircle({ size = 52, icon = "chevron" as IconName, onPress }: { size?: number; icon?: IconName; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ borderRadius: size / 2, overflow: "hidden", width: size, height: size }}>
      <LinearGradient colors={c.goldGrad} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={size * 0.3} color={c.onGold} />
      </LinearGradient>
    </Pressable>
  );
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.divider }} />;
}

export function Placeholder({ style, label }: { style?: ViewStyle; label?: string }) {
  const { c } = useTheme();
  return (
    <View style={[{ backgroundColor: c.placeholderA, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }, style]}>
      {label ? <Text style={{ fontSize: 6, color: c.micro }}>{label}</Text> : null}
    </View>
  );
}

export function ListRow({ index, label, onPress }: { index?: string; label: string; onPress?: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: c.divider }]}>
      {index ? <Text style={[t.small, { color: c.gold, width: 22 }]}>{index}</Text> : null}
      <Text style={[t.body, { color: c.text, flex: 1 }]}>{label}</Text>
      <Icon name="chevron" size={12} color={c.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30, paddingTop: 8 },
  headerBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1 },
});