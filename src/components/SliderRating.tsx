import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { MicroLabel } from './ui';

interface SliderRatingProps {
  label: string;
  /**
   * 1 a 10, o `null` para "todavía no respondió".
   *
   * `null` NO es lo mismo que 1 ni que 5: mientras vale `null` no hay ningún número marcado y en
   * el lugar del valor se muestra un guion. Existe porque un selector que arranca con algo elegido
   * se guarda como respuesta aunque nadie lo haya tocado, y después no hay forma de distinguir la
   * respuesta real del valor por defecto (decisión del dueño, 2026-09-05).
   */
  value: number | null;
  onChange: (val: number) => void;
  minLabel?: string;
  maxLabel?: string;
  style?: ViewStyle;
}

export function SliderRating({
  label,
  value,
  onChange,
  minLabel = 'Mínimo (1)',
  maxLabel = 'Óptimo (10)',
  style,
}: SliderRatingProps) {
  const { c, t } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <MicroLabel>{label}</MicroLabel>
        <Text style={[t.screenTitle, { color: value === null ? c.textSoft : c.goldInk, fontSize: 20 }]}>
          {value === null ? '—' : value}
        </Text>
      </View>

      {/* Discrete 1-10 Touch Selector */}
      <View style={[styles.scaleRow, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
          const isSelected = value === num;
          const isPassed = value !== null && value >= num;

          return (
            <Pressable
              key={num}
              onPress={() => onChange(num)}
              hitSlop={4}
              style={[
                styles.numBtn,
                isSelected && [styles.numBtnSelected, { backgroundColor: c.gold }],
              ]}
            >
              <Text
                style={[
                  styles.numText,
                  {
                    color: isSelected
                      ? c.onGold
                      : isPassed
                      ? c.textStrong
                      : c.tabInactive,
                    fontFamily: isSelected ? 'Jost_700Bold' : 'Jost_400Regular',
                  },
                ]}
              >
                {num}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.labelsRow}>
        <Text style={[t.micro, { color: c.textSoft, fontSize: 11, fontFamily: 'Jost_500Medium' }]}>{minLabel}</Text>
        <Text style={[t.micro, { color: c.goldInk, fontSize: 11, fontFamily: 'Jost_700Bold' }]}>{maxLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  scaleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 3,
    justifyContent: 'space-between',
  },
  numBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBtnSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  numText: {
    fontSize: 14,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
});
