import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { AvatarPersona } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import type { IndicadoresApi } from '../api/liderMentoresSchemas';
import { evaluacionEnPalabras, gruposEnPalabras, pendientesEnPalabras } from '../utils/lecturaDeMentores';
import { Linea } from './MarcoDelLider';
import { SemaforoDelMentor } from './SemaforoDelMentor';

/**
 * Un mentor en el padrón: su nombre primero y en grande, y debajo, en frases, cómo va (SDD 002, plan
 * §7: «la unidad es la persona, no la métrica»). Toda la fila abre su ficha.
 */
export function FilaDeMentor({ mentor, mes, onAbrir }: { mentor: IndicadoresApi; mes: string; onAbrir: () => void }) {
  const { c, t } = useTheme();
  const pendientes = pendientesEnPalabras(mentor);

  return (
    <Pressable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel={`${mentor.fullName}. Abrir su ficha.`}
      style={({ pressed }) => [estilos.tarjeta, { borderColor: c.border, backgroundColor: pressed ? c.goldWash : c.cardBg }]}
    >
      <View style={estilos.cabecera}>
        <AvatarPersona nombre={mentor.fullName} avatarUrl={mentor.avatarUrl} size={40} />
        <Text style={[t.cardTitle, { color: c.textStrong, flex: 1, minWidth: 0 }]} numberOfLines={2}>
          {mentor.fullName}
        </Text>
        <Icon name="chevron" size={16} color={c.chevron} />
      </View>
      <Linea>{gruposEnPalabras(mentor)}</Linea>
      <SemaforoDelMentor mentor={mentor} />
      {pendientes ? <Linea>{pendientes}</Linea> : null}
      <Linea>{evaluacionEnPalabras(mentor, mes)}</Linea>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6, width: '100%' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
