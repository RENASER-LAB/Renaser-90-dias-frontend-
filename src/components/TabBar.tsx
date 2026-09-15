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

/**
 * El nombre se ve SOLO en la pestaña activa (pedido del dueño, 2026-09-14) — antes se veían los
 * cinco a la vez y la barra era la franja más cargada de la app.
 *
 * ## Por qué `opacity` y no dejar de renderizar el texto
 *
 * Dos motivos, ninguno de gusto:
 *
 * 1. **El ícono saltaría.** `item` centra su contenido con `minHeight: 48`: sin la etiqueta, el
 *    ícono se recentra y se corre ~9 px hacia abajo. Eso pasaría en las cinco pestañas en cada
 *    cambio de pantalla — un tirón visible en el gesto más frecuente de la app. Reservando el
 *    hueco, lo único que cambia es qué texto se ve.
 * 2. **El nombre sigue existiendo para quien no ve.** El lector de pantalla no lee este texto sino
 *    el `accessibilityLabel` del `Pressable`, que se mantiene en las cinco — y es también de donde
 *    las 24 pruebas E2E toman la pestaña (`getByRole('tab', { name: /^hoy$/i })`). Por eso esconder
 *    el texto visible no rompe ni la accesibilidad ni la suite.
 *
 * Se descartó quitar los nombres del todo, como pide la referencia del dueño (Facebook): esos
 * íconos se aprendieron hace quince años, y acá un diamante para "Training" o una hoja para "Plan"
 * no son evidentes para un público de 40 a 60 años — el mismo criterio por el que `AGENTS.md` §4
 * fija tamaños mínimos de lectura.
 */
const OCULTO = { opacity: 0 } as const;

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
                <Text style={[t.tab, { color: c.goldInk }, !focused && OCULTO]} numberOfLines={1} adjustsFontSizeToFit>
                  {LABELS[route.name]}
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.item} hitSlop={8}
              accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={LABELS[route.name]}>
              <Icon name={ICONS[route.name]} size={iconSize} color={focused ? c.goldInk : c.tabInactive} />
              <Text style={[t.tab, { color: c.goldInk }, !focused && OCULTO]} numberOfLines={1} adjustsFontSizeToFit>
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