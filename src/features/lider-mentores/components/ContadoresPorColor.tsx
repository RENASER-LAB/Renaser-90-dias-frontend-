import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { EstadoConForma, PALABRA_DEL_ESTADO, etiquetaDelEstado, type EstadoDelLider } from './EstadoConForma';

const ESTADOS: EstadoDelLider[] = ['rojo', 'ambar', 'verde', 'sinDatos'];
/** La palabra sin «en» para el rótulo de la tarjeta: «rojo», «ámbar», «verde», «sin datos». */
const ROTULO: Record<EstadoDelLider, string> = { rojo: 'rojo', ambar: 'ámbar', verde: 'verde', sinDatos: 'sin datos' };

/**
 * Cuántos aprendices hay en cada estado, con su forma (spec 056 FR-003, FR-012): `linea` es el renglón compacto de las filas de mentor y de
 * grupo (× 5 ! 0 ✓ 0 · 4); `tarjetas` son los cuatro contadores del grupo, con la palabra de cada estado debajo de la cifra. Siempre los
 * cuatro, en el mismo orden: un cero también se dice.
 */
export function ContadoresPorColor({ rojo, ambar, verde, sinDatos, variante = 'linea' }: Record<EstadoDelLider, number> & { variante?: 'linea' | 'tarjetas' }) {
  const { c, t } = useTheme();
  const cifras: Record<EstadoDelLider, number> = { rojo, ambar, verde, sinDatos };

  if (variante === 'linea') {
    return (
      <View style={estilos.linea}>
        {ESTADOS.map(e => (
          <EstadoConForma key={e} estado={e} cifra={cifras[e]} tamano={16} />
        ))}
      </View>
    );
  }
  return (
    <View style={estilos.tarjetas}>
      {ESTADOS.map(e => (
        <View key={e} accessible accessibilityLabel={etiquetaDelEstado(e, cifras[e])} style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          <EstadoConForma estado={e} cifra={cifras[e]} tamano={16} />
          <Text accessible={false} style={[t.body, { color: c.textSoft, fontFamily: fuentes.media, fontSize: 13 }]} numberOfLines={1}>
            {ROTULO[e]}
          </Text>
        </View>
      ))}
    </View>
  );
}

export { PALABRA_DEL_ESTADO };

const estilos = StyleSheet.create({
  linea: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 4 },
  tarjetas: { flexDirection: 'row', gap: 8 },
  tarjeta: { flex: 1, minWidth: 0, minHeight: 52, borderWidth: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 2 },
});
