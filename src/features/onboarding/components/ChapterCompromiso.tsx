import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FichaCompromisoData } from '../types/onboarding.types';
import { FormField } from '../../../components/FormField';
import { Checkbox } from '../../../components/Checkbox';
import { SignatureCanvas } from '../../../components/SignatureCanvas';

interface ChapterCompromisoProps {
  data: FichaCompromisoData;
  onChange: (data: FichaCompromisoData) => void;
}

export function ChapterCompromiso({ data, onChange }: ChapterCompromisoProps) {
  const updateField = (key: keyof FichaCompromisoData, value: string | boolean) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <View style={styles.container}>
      <FormField
        label="¿POR QUÉ AHORA Y NO EN OTRO MOMENTO?"
        value={data.porqueAhora}
        onChangeText={val => updateField('porqueAhora', val)}
        placeholder="¿Por qué es urgente para ti transformar tu vida hoy?"
        multiline
        numberOfLines={3}
      />

      <FormField
        label="LA RAZÓN PRINCIPAL DE TU COMPROMISO"
        value={data.razonPrincipal}
        onChangeText={val => updateField('razonPrincipal', val)}
        placeholder="La razón no negociable por la que llegarás al Día 90..."
        multiline
        numberOfLines={3}
      />

      <FormField
        label="¿CUÁL ES EL COSTO REAL DE FRACASAR O RENDIRTE?"
        helperText="Consecuencia personal y real"
        value={data.costoFracaso}
        onChangeText={val => updateField('costoFracaso', val)}
        placeholder="Si me rindo, el precio que pagaré en mi vida será..."
        multiline
        numberOfLines={3}
      />

      <FormField
        label="¿QUÉ HÁBITO O PERSONAJE ESTÁS DISPUESTO/A A SOLTAR?"
        value={data.dispuestoSoltar}
        onChangeText={val => updateField('dispuestoSoltar', val)}
        placeholder="Renuncio a mi personaje de..."
        multiline
        numberOfLines={2}
      />

      <SignatureCanvas
        onSignatureChange={hasSign => {
          if (hasSign) {
            updateField('compromisoFirmado', true);
          }
        }}
        label="FIRMA DE CIERRE DE TU FICHA INICIAL"
      />

      <Checkbox
        checked={data.compromisoFirmado}
        onToggle={checked => updateField('compromisoFirmado', checked)}
        title="Ratifico mi compromiso con los 90 días de Renaser"
        subtitle="Entiendo que la transformación requiere disciplina diaria y evidencias reales."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
});
