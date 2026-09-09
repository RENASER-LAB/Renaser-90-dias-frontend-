import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Icon, IconName } from './Icon';

const ICONS: Record<string, IconName> = { Hoy: 'sun', Plan: 'doc', Training: 'diamond', Comunidad: 'users', Yo: 'user' };
const LABELS: Record<string, string> = { Hoy: 'HOY', Plan: 'PLAN', Training: 'TRAINING', Comunidad: 'COMUNIDAD', Yo: 'YO' };

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { rs, isTablet } = useResponsive();

  const centerSize = rs(46);
  const iconSize = rs(20);
  const maxBarWidth = isTablet ? 480 : undefined;

  return (
    /* BUG (2026-09-04): en modo oscuro esta barra se veía BLANCA. `c.cardBg` es translúcido en la
       paleta oscura (`rgba(255,255,255,0.04)`): está pensado para apoyarse sobre `c.bg` y dar una
       tarjeta apenas más clara. Pero la TabBar la dibuja el navegador FUERA del `SafeAreaView` de
       la pantalla, así que detrás no había fondo del tema sino la vista raíz de React Native, que
       es BLANCA por defecto — y 4% de blanco sobre blanco da blanco puro. Por eso también el aro
       del botón central salía blanco.
       Arreglo: se pinta `c.bg` opaco de base y `c.cardBg` como capa encima, reproduciendo
       exactamente la composición "tarjeta sobre página" que el token asume. En modo claro no
       cambia nada visible (`bg` #FCFBF9 y `cardBg` #FDFCFA son opacos y casi idénticos). */
    <View style={[styles.barOuter, { backgroundColor: c.bg, borderTopColor: c.divider, paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.cardBg }]} />
      <View style={[styles.bar, { maxWidth: maxBarWidth, alignSelf: 'center', width: '100%' }]}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const isCenter = route.name === 'Training';
          const onPress = () => navigation.navigate(route.name);

          if (isCenter) {
            return (
              <Pressable key={route.key} onPress={onPress} style={styles.item} hitSlop={8}
              accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={LABELS[route.name]}>
                {/* `c.bg` y no `c.cardBg`: el aro es opaco a propósito (mismo bug de arriba) y
                    además separa el círculo tanto de la barra como del contenido de la pantalla,
                    contra el que también se recorta por el `marginTop` negativo. */}
                <View style={[styles.centerWrap, { shadowColor: c.gold, borderColor: c.bg }]}>
                  <LinearGradient
                    colors={c.goldGrad}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={[styles.center, { width: centerSize, height: centerSize, borderRadius: centerSize / 2 }]}
                  >
                    <Icon name="diamond" size={rs(18)} color={c.onGold} />
                  </LinearGradient>
                </View>
                <Text style={[t.tab, { color: focused ? c.goldInk : c.tabInactive }]} numberOfLines={1} adjustsFontSizeToFit>
                  {LABELS[route.name]}
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.item} hitSlop={8}
              accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={LABELS[route.name]}>
              <Icon name={ICONS[route.name]} size={iconSize} color={focused ? c.goldInk : c.tabInactive} />
              <Text style={[t.tab, { color: focused ? c.goldInk : c.tabInactive }]} numberOfLines={1} adjustsFontSizeToFit>
                {LABELS[route.name]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* 10 y no 14: con cinco pestanas, cada 4px de padding le quita ~0.8px de ancho util a
     cada etiqueta, y "COMUNIDAD" es la que va justa. */
  barOuter: { borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 10 },
  bar: { flexDirection: 'row', alignItems: 'flex-end' },
  /* 48px minimos de zona pulsable por pestana (AGENTS.md 4); antes el alto lo definia el
     contenido (icono 20 + gap + etiqueta) y se quedaba en ~38. */
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, gap: 7 },
  centerWrap: { marginTop: -22, borderRadius: 29, borderWidth: 6, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  center: { alignItems: 'center', justifyContent: 'center' },
});