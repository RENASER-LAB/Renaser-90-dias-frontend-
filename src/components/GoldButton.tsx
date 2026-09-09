import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { Icon, IconName } from './Icon';

interface GoldButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary' | 'outline';
}

export function GoldButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'right',
  style,
  textStyle,
  variant = 'primary',
}: GoldButtonProps) {
  const { c, t } = useTheme();

  const isDisabled = disabled || loading;

  if (variant === 'outline') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={({ pressed }) => [
          styles.outlineBtn,
          {
            borderColor: c.borderStrong,
            backgroundColor: c.cardBg,
            opacity: isDisabled ? 0.6 : pressed ? 0.72 : 1,
            transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={c.goldInk} size="small" />
        ) : (
          <>
            {icon && iconPosition === 'left' && <Icon name={icon} size={16} color={c.goldInk} />}
            <Text style={[t.micro, styles.outlineText, { color: c.text }, textStyle]}>
              {label}
            </Text>
            {icon && iconPosition === 'right' && <Icon name={icon} size={16} color={c.goldInk} />}
          </>
        )}
      </Pressable>
    );
  }

  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={({ pressed }) => [
          styles.outlineBtn,
          {
            borderColor: c.border,
            backgroundColor: c.cardBgAlt,
            opacity: isDisabled ? 0.6 : pressed ? 0.72 : 1,
            transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={c.textSoft} size="small" />
        ) : (
          <>
            {icon && iconPosition === 'left' && <Icon name={icon} size={16} color={c.textSoft} />}
            <Text style={[t.micro, styles.outlineText, { color: c.textSoft }, textStyle]}>
              {label}
            </Text>
            {icon && iconPosition === 'right' && <Icon name={icon} size={16} color={c.textSoft} />}
          </>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.primaryBtn,
        {
          shadowColor: c.gold,
          opacity: isDisabled ? 0.65 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      <LinearGradient
        colors={c.goldGrad}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={c.onGold} size="small" />
        ) : (
          <>
            {icon && iconPosition === 'left' && <Icon name={icon} size={16} color={c.onGold} />}
            <Text style={[t.micro, styles.primaryText, { color: c.onGold }, textStyle]}>
              {label}
            </Text>
            {icon && iconPosition === 'right' && <Icon name={icon} size={16} color={c.onGold} />}
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  gradient: {
    /* AGENTS.md 4 pide 48-52px de area tactil; con 15 de padding el boton medía ~45. */
    minHeight: 52,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryText: {
    /* `fontFamily` explicito en vez de `fontWeight`: sobre una familia personalizada Android
       sintetiza la negrita y deforma la Jost en lugar de usar el corte real. */
    fontFamily: 'Jost_700Bold',
    letterSpacing: 2.2,
    fontSize: 11,
  },
  outlineBtn: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  outlineText: {
    fontFamily: 'Jost_500Medium',
    letterSpacing: 1.6,
    fontSize: 11,
  },
});
