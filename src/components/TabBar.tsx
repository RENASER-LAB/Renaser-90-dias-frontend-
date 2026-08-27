import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Icon, IconName } from './Icon';

const ICONS: Record<string, IconName> = { Hoy: 'sun', Plan: 'doc', Training: 'diamond', Comunidad: 'users', Yo: 'user' };
const LABELS: Record<string, string> = { Hoy: 'HOY', Plan: 'PLAN', Training: 'TRAINING', Comunidad: 'COMUNIDAD', Yo: 'YO' };

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { backgroundColor: c.cardBg, borderTopColor: c.divider, paddingBottom: Math.max(insets.bottom, 14) }]}>
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const isCenter = route.name === 'Training';
        const onPress = () => navigation.navigate(route.name);

        if (isCenter) {
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.item}>
              <View style={[styles.centerWrap, { shadowColor: c.gold, borderColor: c.cardBg }]}>
                <LinearGradient colors={c.goldGrad} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.center}>
                  <Icon name="diamond" size={18} color={c.onGold} />
                </LinearGradient>
              </View>
              <Text style={[t.tab, { color: focused ? c.gold : c.tabInactive }]}>{LABELS[route.name]}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.item}>
            <Icon name={ICONS[route.name]} size={20} color={focused ? c.gold : c.tabInactive} />
            <Text style={[t.tab, { color: focused ? c.gold : c.tabInactive }]}>{LABELS[route.name]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 14, alignItems: 'flex-end' },
  item: { flex: 1, alignItems: 'center', gap: 7 },
  centerWrap: { marginTop: -22, borderRadius: 29, borderWidth: 6, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  center: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});