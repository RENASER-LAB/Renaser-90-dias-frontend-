import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FichaMenteData } from '../types/onboarding.types';
import { FormField } from '../../../components/FormField';

interface ChapterMenteProps {
  data: FichaMenteData;
  onChange: (data: FichaMenteData) => void;
}

export function ChapterMente({ data, onChange }: ChapterMenteProps) {
  const updateField = (key: keyof FichaMenteData, value: string) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <View style={styles.container}>
      <FormField
        label="EL PENSAMIENTO RECURRENTE QUE MÁS TE BOICOTEA"
        helperText="Sin maquillaje"
        value={data.pensamientoBoicot}
        onChangeText={val => updateField('pensamientoBoicot', val)}
        placeholder="Cuando algo importante está en juego, mi mente me dice..."
        multiline
        numberOfLines={3}
      />

      <FormField
        label="CUANDO FALLAS, ¿QUÉ TE DICE TU CRÍTICO INTERNO?"
        helperText="La frase exacta"
        value={data.criticoInterno}
        onChangeText={val => updateField('criticoInterno', val)}
        placeholder="Cuando fallo, una voz dentro de mí me dice..."
        multiline
        numberOfLines={3}
      />

      <FormField
        label="TU CREENCIA LIMITANTE #1"
        helperText="La que cargas hace años"
        value={data.creenciaLimitante}
        onChangeText={val => updateField('creenciaLimitante', val)}
        placeholder="Hace años creo inconscientemente que..."
        multiline
        numberOfLines={3}
      />

      <FormField
        label="¿CÓMO TE DEFINES HOY, EN UNA SOLA FRASE?"
        value={data.definicionHoy}
        onChangeText={val => updateField('definicionHoy', val)}
        placeholder="Hoy soy una persona que..."
        multiline
        numberOfLines={2}
      />

      <FormField
        label="¿EN QUÉ PERSONA TE CONVIERTES SI NO CAMBIAS?"
        helperText="Proyección a 5 años"
        value={data.sinoCambio}
        onChangeText={val => updateField('sinoCambio', val)}
        placeholder="Si no cambio nada, seré..."
        multiline
        numberOfLines={3}
      />

      <FormField
        label="¿QUIÉN QUIERES SER REALMENTE?"
        helperText="Tu versión más alta"
        value={data.quienQuieresSer}
        onChangeText={val => updateField('quienQuieresSer', val)}
        placeholder="La versión más alta de mí es alguien que..."
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
});
