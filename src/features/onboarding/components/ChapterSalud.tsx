import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  PanResponder,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { FichaSaludData } from '../types/onboarding.types';

interface ChapterSaludProps {
  data: FichaSaludData;
  onChange: (data: FichaSaludData) => void;
}

function SleepQualitySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const { c, t } = useTheme();
  const [trackWidth, setTrackWidth] = useState(240);

  const calculateValueFromX = (x: number) => {
    if (trackWidth <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / trackWidth));
    const newVal = Math.round(1 + ratio * 9); // 1..10
    const clamped = Math.max(1, Math.min(10, newVal));
    onChange(clamped);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: evt => {
          calculateValueFromX(evt.nativeEvent.locationX);
        },
        onPanResponderMove: evt => {
          calculateValueFromX(evt.nativeEvent.locationX);
        },
      }),
    [trackWidth]
  );

  const currentVal = value || 5;
  const progressRatio = Math.max(0, Math.min(1, (currentVal - 1) / 9));

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderTrackRow}>
        <View
          style={styles.sliderTrackTouchArea}
          onLayout={e => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) setTrackWidth(w);
          }}
          {...panResponder.panHandlers}
        >
          {/* Base Track Line */}
          <View style={[styles.sliderBaseLine, { backgroundColor: c.borderStrong }]} />

          {/* Active Progress Line */}
          <View
            style={[
              styles.sliderActiveLine,
              {
                backgroundColor: c.gold,
                width: `${progressRatio * 100}%`,
              },
            ]}
          />

          {/* Clean Flat Thumb (No Shadows) */}
          <View
            style={[
              styles.sliderThumb,
              {
                left: `${progressRatio * 100}%`,
                transform: [{ translateX: -10 }],
                backgroundColor: '#FFFFFF',
                borderColor: c.gold,
              },
            ]}
          />
        </View>

        {/* Number Value on the Right */}
        <Text
          style={[
            t.screenTitle,
            { color: c.textStrong, fontSize: 20, fontWeight: '700', width: 28, textAlign: 'right' },
          ]}
        >
          {currentVal}
        </Text>
      </View>

      {/* Labels: Pésimo y Óptimo */}
      <View style={styles.sliderLabelsRow}>
        <Text style={[t.micro, { color: c.textSoft, fontSize: 12 }]}>Pésimo</Text>
        <Text style={[t.micro, { color: c.textSoft, fontSize: 12 }]}>Óptimo</Text>
      </View>
    </View>
  );
}

export function ChapterSalud({ data, onChange }: ChapterSaludProps) {
  const { c, t } = useTheme();

  const updateField = (key: keyof FichaSaludData, value: any) => {
    onChange({ ...data, [key]: value });
  };

  // Single Atomic State Update for Medication Toggle
  const handleToggleMedicacion = (val: boolean) => {
    onChange({
      ...data,
      tomaMedicacionRegular: val,
      especificacionMedicacion: val ? data.especificacionMedicacion : '',
      motivoMedicacion: val ? data.motivoMedicacion : '',
    });
  };

  const handleHorasChange = (text: string) => {
    const numeric = text.replace(/[^\d.]/g, '');
    const num = parseFloat(numeric);
    if (!isNaN(num) && num > 24) {
      updateField('horasSueno', '24');
    } else {
      updateField('horasSueno', numeric);
    }
  };

  const horasNum = parseFloat(data.horasSueno);
  const isValidHoras = !isNaN(horasNum) && horasNum >= 0 && horasNum <= 24 && data.horasSueno.trim() !== '';

  return (
    <View style={styles.container}>
      {/* Campo 1: Horas promedio de sueño */}
      <View style={styles.fieldBlock}>
        <View style={styles.labelRow}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 14.5, fontWeight: '600' }]}>
            Horas promedio de sueño
          </Text>
          {isValidHoras && (
            <Text style={{ color: '#4E9F76', fontSize: 14, fontWeight: '700' }}>✓</Text>
          )}
        </View>

        <View
          style={[
            styles.inputWrap,
            {
              borderColor: isValidHoras ? '#4E9F76' : c.borderStrong,
              backgroundColor: c.cardBgAlt,
            },
          ]}
        >
          <TextInput
            value={data.horasSueno}
            onChangeText={handleHorasChange}
            placeholder="Ej. 7 u 8"
            placeholderTextColor={c.tabInactive}
            keyboardType="numeric"
            maxLength={4}
            style={[styles.textInput, { color: c.textStrong }]}
          />
        </View>
        <Text style={[t.micro, { color: c.textSoft, fontSize: 12 }]}>Entre 0 y 24.</Text>
      </View>

      {/* Campo 2: Calidad de tu sueño (Opcional) */}
      <View style={styles.fieldBlock}>
        <View style={styles.labelRow}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 14.5, fontWeight: '600' }]}>
            Calidad de tu sueño
          </Text>
          <Text style={[t.micro, { color: c.tabInactive, fontSize: 12 }]}>Opcional</Text>
        </View>

        <SleepQualitySlider
          value={data.calidadSueno || 5}
          onChange={val => updateField('calidadSueno', val)}
        />
      </View>

      {/* Campo 3: ¿Tomas alguna medicación de forma regular? */}
      <View style={styles.fieldBlock}>
        <Text style={[t.body, { color: c.textStrong, fontSize: 14.5, fontWeight: '600' }]}>
          ¿Tomas alguna medicación de forma regular?
        </Text>

        <View style={styles.radioOptionsGroup}>
          {/* Opción Sí */}
          <Pressable
            onPress={() => handleToggleMedicacion(true)}
            style={[
              styles.radioCard,
              {
                borderColor: data.tomaMedicacionRegular === true ? c.gold : c.borderStrong,
                backgroundColor: data.tomaMedicacionRegular === true ? c.cardBgAlt : c.cardBg,
              },
            ]}
          >
            <View
              style={[
                styles.radioCircle,
                {
                  borderColor: data.tomaMedicacionRegular === true ? c.gold : c.tabInactive,
                  backgroundColor: data.tomaMedicacionRegular === true ? c.gold : 'transparent',
                },
              ]}
            >
              {data.tomaMedicacionRegular === true && <View style={styles.radioInnerWhite} />}
            </View>
            <Text style={[t.body, { color: c.textStrong, fontSize: 14.5, fontWeight: '500' }]}>
              Sí
            </Text>
          </Pressable>

          {/* Opción No */}
          <Pressable
            onPress={() => handleToggleMedicacion(false)}
            style={[
              styles.radioCard,
              {
                borderColor: data.tomaMedicacionRegular === false ? c.gold : c.borderStrong,
                backgroundColor: data.tomaMedicacionRegular === false ? c.cardBgAlt : c.cardBg,
              },
            ]}
          >
            <View
              style={[
                styles.radioCircle,
                {
                  borderColor: data.tomaMedicacionRegular === false ? c.gold : c.tabInactive,
                  backgroundColor: data.tomaMedicacionRegular === false ? c.gold : 'transparent',
                },
              ]}
            >
              {data.tomaMedicacionRegular === false && <View style={styles.radioInnerWhite} />}
            </View>
            <Text style={[t.body, { color: c.textStrong, fontSize: 14.5, fontWeight: '500' }]}>
              No
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Campo 4: Especifica tu medicación (SOLO VISIBLE CUANDO ES "SÍ") */}
      {data.tomaMedicacionRegular === true && (
        <View style={styles.fieldBlock}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 14.5, fontWeight: '600' }]}>
            Especifica tu medicación y motivo de la toma
          </Text>

          <View style={[styles.textareaWrap, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
            <TextInput
              value={data.especificacionMedicacion}
              onChangeText={val => {
                updateField('especificacionMedicacion', val);
                updateField('motivoMedicacion', val);
              }}
              placeholder="Ejemplo: Levotiroxina 50 mcg para el tiroides."
              placeholderTextColor={c.tabInactive}
              multiline
              numberOfLines={4}
              style={[styles.textareaInput, { color: c.textStrong }]}
            />
          </View>
          <Text style={[t.micro, { color: c.textSoft, fontSize: 12 }]}>
            Ejemplo: Levotiroxina 50 mcg para el tiroides.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    width: '100%',
  },
  fieldBlock: {
    gap: 8,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputWrap: {
    borderWidth: 1.5,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 15,
    height: '100%',
  },
  sliderContainer: {
    gap: 6,
    paddingTop: 4,
  },
  sliderTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sliderTrackTouchArea: {
    flex: 1,
    height: 32, // Large comfortable touch target
    justifyContent: 'center',
    position: 'relative',
  },
  sliderBaseLine: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  sliderActiveLine: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  radioOptionsGroup: {
    gap: 8,
    width: '100%',
  },
  radioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInnerWhite: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  textareaWrap: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    minHeight: 90,
  },
  textareaInput: {
    fontSize: 14.5,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
});
