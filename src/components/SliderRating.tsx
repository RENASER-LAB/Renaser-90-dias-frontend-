import { fuentes } from '../theme/fuentes';
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
  /**
   * `'etiqueta'` (por defecto): el rótulo chico en negrita de siempre y el valor grande a la derecha.
   * `'pregunta'` (Código Renaser, 2026-11-03): el rótulo es el enunciado de una pregunta, igual que el de las otras cuatro
   * (16 semibold, a la izquierda), y el valor va a su altura a la derecha, más chico. Mismo selector del 1 al 10.
   */
  variante?: 'etiqueta' | 'pregunta';
}

export function SliderRating({
  label,
  value,
  onChange,
  minLabel = 'Mínimo (1)',
  maxLabel = 'Óptimo (10)',
  style,
  variante = 'etiqueta',
}: SliderRatingProps) {
  const { c, t } = useTheme();
  const comoPregunta = variante === 'pregunta';

  return (
    <View style={[styles.container, comoPregunta && styles.containerPregunta, style]}>
      <View style={[styles.header, comoPregunta && styles.headerPregunta]}>
        {comoPregunta ? (
          <Text style={[t.cardTitle, styles.enunciado, { color: c.text }]}>{label}</Text>
        ) : (
          <MicroLabel>{label}</MicroLabel>
        )}
        <Text
          style={[
            t.screenTitle,
            { color: value === null ? c.textSoft : c.goldInk, fontSize: comoPregunta ? 18 : 20 },
            comoPregunta && styles.valorDePregunta,
          ]}
        >
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
                    fontFamily: isSelected ? fuentes.negrita : fuentes.regular,
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
        <Text style={[t.micro, { color: c.textSoft, fontSize: 11, fontFamily: fuentes.media }]}>{minLabel}</Text>
        <Text style={[t.micro, { color: c.goldInk, fontSize: 11, fontFamily: fuentes.negrita }]}>{maxLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  containerPregunta: {
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  headerPregunta: {
    alignItems: 'center',
    gap: 8,
  },
  enunciado: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  valorDePregunta: {
    lineHeight: 22,
    minWidth: 24,
    textAlign: 'right',
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
