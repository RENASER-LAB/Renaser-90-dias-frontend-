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
  const { c, t, mode, toggle } = useTheme();
  return (
    <View style={styles.header}>
      <Text style={[t.screenTitle, { color: c.text, flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>
        {title}
      </Text>
      <View style={styles.headerActions}>
        <Pressable
          hitSlop={10}
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={mode === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
          style={[styles.themeBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
        >
          <Icon name={mode === 'light' ? 'moon' : 'sun'} size={16} color={c.gold} />
        </Pressable>
        <Pressable hitSlop={12} onPress={onPressRight} style={styles.headerBtn}>
          <Icon name={right} size={19} color={right === 'dots' ? c.textSoft : c.gold} />
        </Pressable>
      </View>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 30, paddingTop: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  themeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1 },
});
/**
 * Primitivas de LAYOUT (auditoría de estilos 2026-09-06).
 *
 * Salieron de contar: `flexDirection: 'row', alignItems: 'center', gap: N` escrito a mano 16
 * veces y `flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'` otras
 * 12, repartidos por las pantallas. No es que `StyleSheet` esté mal —es lo idiomático en React
 * Native— sino que la MISMA idea se reescribía en cada archivo y ninguna copia sabía de las
 * otras. Con una primitiva, cambiar el criterio (un `gap` por defecto, una alineación) es un
 * solo lugar.
 *
 * Por qué NO Tailwind/NativeWind: habría sido migrar 24.000 líneas de TSX en 51 archivos con
 * estilos, sin suite de pruebas visuales, en un producto que ya está en manos de usuarios. El
 * problema real no era la herramienta, era la duplicación; esto la ataca sin reescribir nada.
 *
 * `style` se aplica DESPUÉS de los defaults, así que cualquier propiedad extra (`flex: 1`,
 * `marginTop`) se pasa ahí y gana. `gap` en `undefined` es inofensivo: RN lo ignora.
 */
type AlineacionFila = 'center' | 'flex-start' | 'flex-end' | 'baseline' | 'stretch';

export function Row({
  children,
  gap,
  align = 'center',
  style,
}: {
  children?: React.ReactNode;
  gap?: number;
  align?: AlineacionFila;
  style?: ViewStyle;
}) {
  return <View style={[{ flexDirection: 'row', alignItems: align, gap }, style]}>{children}</View>;
}

export function RowBetween({
  children,
  align = 'center',
  style,
}: {
  children?: React.ReactNode;
  align?: AlineacionFila;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: align }, style]}>
      {children}
    </View>
  );
}
