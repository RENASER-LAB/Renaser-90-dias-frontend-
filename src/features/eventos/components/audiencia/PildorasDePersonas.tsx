import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AvatarPersona } from '../../../../components/ui';
import { Icon } from '../../../../components/Icon';
import { Presionable } from '../../../../components/Presionable';
import { fuentes } from '../../../../theme/fuentes';
import { useTheme } from '../../../../theme/ThemeContext';
import type { PersonaConvocable } from '../../types/audiencia.types';

/** Las personas elegidas por su nombre (spec 044), cada una con su «Quitar». La usan «¿Para quién es?» y «Elegir personas». */
export function PildorasDePersonas({ personas, onQuitar }: { personas: PersonaConvocable[]; onQuitar: (p: PersonaConvocable) => void }) {
  const { c } = useTheme();
  if (personas.length === 0) return null;
  return (
    <View style={estilos.pildoras}>
      {personas.map(p => (
        <View key={p.id} style={[estilos.pildora, { borderColor: c.gold, backgroundColor: c.goldWash }]}>
          <AvatarPersona nombre={p.nombre} avatarUrl={p.fotoUrl} size={28} />
          <Text style={[estilos.pildoraTexto, { color: c.textStrong }]} numberOfLines={1}>
            {p.nombre}
          </Text>
          <Presionable
            onPress={() => onQuitar(p)}
            accessibilityRole="button"
            accessibilityLabel={`Quitar a ${p.nombre}`}
            hitSlop={8}
            style={estilos.quitar}
          >
            <Icon name="close" size={16} color={c.goldInk} />
          </Presionable>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  pildoras: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pildora: { minHeight: 40, borderWidth: 1, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6, maxWidth: '100%' },
  pildoraTexto: { fontFamily: fuentes.seminegrita, fontSize: 14, flexShrink: 1 },
  quitar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
