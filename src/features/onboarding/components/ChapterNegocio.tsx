import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FichaNegocioData } from '../types/onboarding.types';
import { FormField } from '../../../components/FormField';

interface ChapterNegocioProps {
  data: FichaNegocioData;
  onChange: (data: FichaNegocioData) => void;
}

export function ChapterNegocio({ data, onChange }: ChapterNegocioProps) {
  const updateField = (key: keyof FichaNegocioData, value: string) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <View style={styles.container}>
      <FormField
        label="META DE FACTURACIÓN A 90 DÍAS (USD)"
        helperText="Número específico, no rango"
        value={data.metaFacturacion}
        onChangeText={val => updateField('metaFacturacion', val)}
        placeholder="Ej. 25000"
        keyboardType="numeric"
        icon="diamond"
      />

      <FormField
        label="TU PRODUCTO / SERVICIO ESTRELLA"
        helperText="2 a 3 líneas"
        value={data.producto}
        onChangeText={val => updateField('producto', val)}
        placeholder="¿Qué ofreces y qué transformación entregas?"
        multiline
        numberOfLines={3}
      />

      <FormField
        label="TU CLIENTE IDEAL"
        helperText="¿A quién sirves?"
        value={data.clienteIdeal}
        onChangeText={val => updateField('clienteIdeal', val)}
        placeholder="Perfil, dolores y poder adquisitivo de tu cliente"
        multiline
        numberOfLines={3}
      />

      <FormField
        label="TU ENEMIGO PÚBLICO #1 DEL NEGOCIO"
        helperText="La conducta tuya que más te sabotea"
        value={data.enemigoPublico}
        onChangeText={val => updateField('enemigoPublico', val)}
        placeholder="Lo que más sabotea mis ventas y enfoque es..."
        multiline
        numberOfLines={3}
      />

      <FormField
        label="OBJETIVO SMART DE NEGOCIO A 90 DÍAS"
        helperText="Qué, cuánto y para cuándo"
        value={data.smartNegocio}
        onChangeText={val => updateField('smartNegocio', val)}
        placeholder='Ej. "Facturar $30,000 USD cerrando 10 clientes de alto valor al Día 90"'
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
