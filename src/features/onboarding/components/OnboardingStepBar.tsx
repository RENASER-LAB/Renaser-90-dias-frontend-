import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { CHAPTERS_CONFIG } from '../data/chaptersConfig';
import { Icon } from '../../../components/Icon';

interface OnboardingStepBarProps {
  currentStep: number; // 0 to 5
  totalSteps?: number;
}

export function OnboardingStepBar({ currentStep, totalSteps = 6 }: OnboardingStepBarProps) {
  const { c, t } = useTheme();
  const percentage = Math.round(((currentStep + 1) / totalSteps) * 100);

  return (
    <View style={styles.container}>
      {/* Visual step pills */}
      <View style={styles.pillsRow}>
        {CHAPTERS_CONFIG.map((ch, idx) => {
          const isPassed = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <View
              key={ch.id}
              style={[
                styles.pill,
                {
                  backgroundColor: isPassed || isCurrent ? c.gold : c.cardBgAlt,
                  borderColor: isCurrent ? c.gold : isPassed ? c.borderStrong : c.border,
                  opacity: isPassed ? 0.7 : isCurrent ? 1 : 0.35,
                },
              ]}
            >
              {isPassed ? (
                <Icon name="check" size={12} color={c.onGold} strokeWidth={2.2} />
              ) : (
                <Text
                  style={{
                    fontSize: 11,
                    color: isCurrent ? c.onGold : c.tabInactive,
                    fontFamily: 'Jost_700Bold',
                  }}
                >
                  {ch.id}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Progress percentage label */}
      <View style={styles.textRow}>
        <Text style={[t.micro, { color: c.goldInk, letterSpacing: 1.2, fontSize: 11, fontFamily: 'Jost_700Bold' }]}>
          CAPÍTULO {currentStep + 1} DE {totalSteps}
        </Text>
        <Text style={[t.micro, { color: c.textSoft, letterSpacing: 1, fontSize: 11, fontFamily: 'Jost_500Medium' }]}>
          {percentage}% COMPLETADO
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginVertical: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    flex: 1,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
});
