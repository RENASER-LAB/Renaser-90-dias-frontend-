import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { MicroLabel } from './ui';
import { Icon, IconName } from './Icon';

interface FormFieldProps extends TextInputProps {
  label: string;
  helperText?: string;
  error?: string | null;
  icon?: IconName;
  containerStyle?: ViewStyle;
}

export function FormField({
  label,
  helperText,
  error,
  icon,
  containerStyle,
  multiline,
  numberOfLines = 1,
  style,
  ...inputProps
}: FormFieldProps) {
  const { c, t } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {Boolean(label) && (
        <View style={styles.labelGroup}>
          <MicroLabel>{label}</MicroLabel>
          {helperText && (
            <Text style={[t.small, { color: c.textSoft, fontSize: 12, lineHeight: 16, marginTop: 2 }]}>
              {helperText}
            </Text>
          )}
        </View>
      )}

      <View
        style={[
          styles.inputWrap,
          {
            borderColor: error ? c.danger : isFocused ? c.gold : c.border,
            backgroundColor: c.cardBgAlt,
            minHeight: multiline ? Math.max(90, numberOfLines * 24) : 52,
            alignItems: multiline ? 'flex-start' : 'center',
            paddingTop: multiline ? 12 : 0,
          },
        ]}
      >
        {icon && (
          <View style={[styles.iconContainer, multiline && { marginTop: 2 }]}>
            <Icon
              name={icon}
              size={18}
              color={error ? c.danger : isFocused ? c.goldInk : c.tabInactive}
            />
          </View>
        )}

        <TextInput
          {...inputProps}
          multiline={multiline}
          numberOfLines={numberOfLines}
          placeholderTextColor={c.tabInactive}
          onFocus={e => {
            setIsFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={e => {
            setIsFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: c.text,
              fontFamily: 'Jost_400Regular',
              textAlignVertical: multiline ? 'top' : 'center',
            },
            style,
          ]}
        />
      </View>

      {error ? (
        <Text style={[t.small, { color: c.danger, marginTop: 2, fontSize: 12 }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 7,
  },
  labelGroup: {
    gap: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15.5,
    height: '100%',
    paddingVertical: 6,
  },
});
