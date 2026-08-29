import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { MicroLabel } from './ui';

interface SliderRatingProps {
  label: string;
  value: number; // 1 to 10
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
        <Text style={[t.screenTitle, { color: c.gold, fontSize: 20 }]}>{value}</Text>
      </View>

      {/* Discrete 1-10 Touch Selector */}
      <View style={[styles.scaleRow, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
          const isSelected = value === num;
          const isPassed = value >= num;

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
        <Text style={[t.micro, { color: c.textSoft, fontSize: 11, fontWeight: '500' }]}>{minLabel}</Text>
        <Text style={[t.micro, { color: c.gold, fontSize: 11, fontWeight: '700' }]}>{maxLabel}</Text>
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
