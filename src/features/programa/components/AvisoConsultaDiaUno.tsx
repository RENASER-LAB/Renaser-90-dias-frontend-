import React from 'react';
import { Text, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { Card } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';

export function AvisoConsultaDiaUno({ reintentar, mensaje }: { reintentar: () => void; mensaje?: string }) {
  const { c, t } = useTheme();
  return (
    <Card>
      <Text style={[t.cardTitle, { color: c.textStrong }]}>No pudimos comprobar tu programa</Text>
      <Text style={[t.body, { color: c.textSoft, marginTop: 8 }]}>
        {mensaje ?? 'Revisa tu conexión y vuelve a intentarlo para saber si tu programa ya empezó.'}
      </Text>
      <View style={{ marginTop: 18 }}>
        <GoldButton label="Reintentar" onPress={reintentar} />
      </View>
    </Card>
  );
}
