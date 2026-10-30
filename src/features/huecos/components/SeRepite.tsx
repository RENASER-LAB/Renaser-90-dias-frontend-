import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { HuecoQueSeRepite } from '../types/huecos.types';
import { etiquetaDeLosDias, filasQueSeRepiten } from '../utils/agendaDelDia';
import { tramoEnPalabras } from '../utils/textosDeHuecos';

/**
 * «Se repite»: los tramos que a esa persona le quedan libres en varios días de la semana, tres como máximo (los que se
 * apoyan en más días primero). El servidor decide cuáles se repiten —libres 30 minutos o más en 3 días o más, solo con
 * días con plan—; acá solo se eligen los que entran y se les pone nombre a los días. Sin ninguno no se dibuja nada.
 */
export function SeRepite({ huecos }: { huecos: HuecoQueSeRepite[] }) {
  const { c, t } = useTheme();
  const filas = filasQueSeRepiten(huecos);
  if (filas.length === 0) return null;

  return (
    <View style={estilos.bloque}>
      <Text accessibilityRole="header" style={[estilos.rotulo, { color: c.goldInk }]}>
        Se repite
      </Text>
      {filas.map(hueco => {
        const dias = etiquetaDeLosDias(hueco.dias);
        const tramo = tramoEnPalabras(hueco.desde, hueco.hasta);
        return (
          <View
            key={`${hueco.desde}-${hueco.hasta}-${hueco.dias.join('')}`}
            accessible
            accessibilityLabel={`${dias}, libre de ${hueco.desde} a ${hueco.hasta}`}
            style={[estilos.fila, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}
          >
            <Text style={[t.body, estilos.dias, { color: c.text }]}>{dias}</Text>
            <Text style={[t.body, estilos.tramo, { color: c.textSoft }]}>{tramo}</Text>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: { gap: 6, marginTop: 22 },
  /* Rótulo en tipo oración: 13 px, negrita y sin espaciar (decisión del dueño, 2026-10-05). */
  rotulo: { fontFamily: 'Jost_700Bold', fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 10,
    rowGap: 2,
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dias: { fontSize: 16, lineHeight: 22, flexShrink: 1 },
  tramo: { fontSize: 16, lineHeight: 22, fontVariant: ['tabular-nums'] },
});
