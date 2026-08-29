import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FichaAlmaData } from '../types/onboarding.types';
import { FormField } from '../../../components/FormField';
import { SliderRating } from '../../../components/SliderRating';

interface ChapterAlmaProps {
  data: FichaAlmaData;
  onChange: (data: FichaAlmaData) => void;
}

export function ChapterAlma({ data, onChange }: ChapterAlmaProps) {
  const updateField = (key: keyof FichaAlmaData, value: string | number) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <View style={styles.container}>
      <FormField
        label="FRASE DE TU PADRE O MADRE QUE AÚN HOY TE MARCA"
        value={data.fraseParental}
        onChangeText={val => updateField('fraseParental', val)}
        placeholder="Mi padre/madre solía decirme..."
        multiline
        numberOfLines={2}
        icon="heart"
      />

      <SliderRating
        label="TU VÍNCULO HOY CON TU PADRE"
        value={data.vinculoPadre}
        onChange={val => updateField('vinculoPadre', val)}
        minLabel="Distante / Conflicto (1)"
        maxLabel="Sano / Amoroso (10)"
      />

      <SliderRating
        label="TU VÍNCULO HOY CON TU MADRE"
        value={data.vinculoMadre}
        onChange={val => updateField('vinculoMadre', val)}
        minLabel="Distante / Conflicto (1)"
        maxLabel="Sano / Amoroso (10)"
      />

      <FormField
        label="FRASE SOBRE EL DINERO QUE MÁS ESCUCHASTE EN TU INFANCIA"
        value={data.fraseDineroInfancia}
        onChangeText={val => updateField('fraseDineroInfancia', val)}
        placeholder='Ej. "El dinero cuesta mucho ganarlo", "No alcanza"'
        multiline
        numberOfLines={2}
        icon="briefcase"
      />

      <SliderRating
        label="¿SIENTES QUE MERECES GANAR MUCHO DINERO?"
        value={data.mereceDinero}
        onChange={val => updateField('mereceDinero', val)}
        minLabel="Poco merecedor (1)"
        maxLabel="Totalmente merecedor (10)"
      />

      <FormField
        label="¿POR QUÉ SIENTES ESO SOBRE EL DINERO?"
        value={data.porqueMerece}
        onChangeText={val => updateField('porqueMerece', val)}
        placeholder="Explica brevemente tu relación interna con la abundancia..."
        multiline
        numberOfLines={2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
});
