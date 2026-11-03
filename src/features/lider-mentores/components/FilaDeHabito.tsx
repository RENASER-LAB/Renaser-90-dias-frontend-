import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import type { HabitoDeTodos } from '../types/habitosDeTodos.types';
import { dichoDelHabito, dimensionDelHabito, fraccionCumplida, lineaDelHabito, nombreDelHabito } from '../utils/habitosDeTodos';

/**
 * Un hábito en la lista del día (spec 029): su nombre en tipo oración, la dimensión, «Cumplieron 41 de 100 · 50 pendientes» (hoy) o
 * «… · 9 sin cumplir» (un día cerrado) y una barra fina con lo cumplido. Toda la fila se toca y abre a las personas de ese hábito. La barra
 * es solo un apoyo visual (las cifras están escritas y las lee el lector de pantalla): no lleva color de estado. Sin animación propia.
 */
export function FilaDeHabito({
  habito,
  esHoy,
  primera,
  onAbrir,
}: {
  habito: HabitoDeTodos;
  esHoy: boolean;
  primera: boolean;
  onAbrir: () => void;
}) {
  const { c, t } = useTheme();
  const dimension = dimensionDelHabito(habito);
  const avance = Math.round(fraccionCumplida(habito) * 100);
  return (
    <Presionable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel={dichoDelHabito(habito, esHoy)}
      style={[estilos.fila, { borderTopColor: c.divider, borderTopWidth: primera ? 0 : StyleSheet.hairlineWidth }]}
    >
      <View style={estilos.texto}>
        <Text style={[t.cardTitle, { color: c.textStrong }]} numberOfLines={2}>
          {nombreDelHabito(habito)}
        </Text>
        {dimension ? <Text style={[t.body, { color: c.textSoft, fontSize: 15, lineHeight: 20 }]}>{dimension}</Text> : null}
        <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 22 }]}>{lineaDelHabito(habito, esHoy)}</Text>
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[estilos.pista, { backgroundColor: c.divider }]}
        >
          <View style={[estilos.relleno, { width: `${avance}%`, backgroundColor: c.success }]} />
        </View>
      </View>
      <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 12 },
  texto: { flex: 1, minWidth: 0, gap: 2 },
  pista: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  relleno: { height: 6, borderRadius: 3 },
});
