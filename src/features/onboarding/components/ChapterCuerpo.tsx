import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FichaCuerpoData } from '../types/onboarding.types';
import { FormField } from '../../../components/FormField';
import { SliderRating } from '../../../components/SliderRating';

interface ChapterCuerpoProps {
  data: FichaCuerpoData;
  onChange: (data: FichaCuerpoData) => void;
}

export function ChapterCuerpo({ data, onChange }: ChapterCuerpoProps) {
  const updateField = (key: keyof FichaCuerpoData, value: string | number) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <FormField
            label="PESO ACTUAL (KG)"
            value={data.peso}
            onChangeText={val => updateField('peso', val)}
            placeholder="Ej. 74"
            keyboardType="numeric"
            icon="body"
          />
        </View>
        <View style={{ flex: 1 }}>
          <FormField
            label="ESTATURA (CM)"
            value={data.estatura}
            onChangeText={val => updateField('estatura', val)}
            placeholder="Ej. 175"
            keyboardType="numeric"
            icon="body"
          />
        </View>
      </View>

      <FormField
        label="HORAS PROMEDIO DE SUEÑO"
        value={data.horasSueno}
        onChangeText={val => updateField('horasSueno', val)}
        placeholder="Ej. 7.5"
        keyboardType="numeric"
        icon="clock"
      />

      <SliderRating
        label="CALIDAD DE TU SUEÑO Y DESCANSO"
        value={data.calidadSueno}
        onChange={val => updateField('calidadSueno', val)}
        minLabel="Pésimo (1)"
        maxLabel="Óptimo (10)"
      />

      <FormField
        label="MEDICACIÓN / CONDICIONES DE SALUD"
        value={data.medicacion}
        onChangeText={val => updateField('medicacion', val)}
        placeholder="Medicación regular, lesiones o escribe 'Ninguna'"
        multiline
        numberOfLines={2}
      />

      <FormField
        label="OBJETIVO SMART DE CUERPO A 90 DÍAS"
        helperText="Qué, cuánto y para cuándo"
        value={data.smartCuerpo}
        onChangeText={val => updateField('smartCuerpo', val)}
        placeholder='Ej. "Bajar 6 kg y correr 5 km 3 veces por semana al Día 90"'
        multiline
        numberOfLines={3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
});
