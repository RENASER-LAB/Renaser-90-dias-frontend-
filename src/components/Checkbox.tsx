import React from 'react';
import { Pressable, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';

interface CheckboxProps {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

export function Checkbox({ checked, onToggle, title, subtitle, style }: CheckboxProps) {
  const { c, t } = useTheme();

  return (
    <Pressable
      onPress={() => onToggle(!checked)}
      style={[
        styles.container,
        {
          borderColor: checked ? c.gold : c.border,
          backgroundColor: checked ? c.cardBgAlt : c.cardBg,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? c.gold : c.borderStrong,
            backgroundColor: checked ? c.gold : 'transparent',
          },
        ]}
      >
        {checked && <Icon name="check" size={14} color={c.onGold} strokeWidth={2} />}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[t.body, { color: c.textStrong, fontWeight: checked ? '700' : '500', fontSize: 15.5 }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[t.small, { color: c.textSoft, marginTop: 4, lineHeight: 19, fontSize: 13.5 }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
