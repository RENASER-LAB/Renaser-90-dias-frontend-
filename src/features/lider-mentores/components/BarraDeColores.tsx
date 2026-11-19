import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { coloresDelSemaforo } from '../../semaforo/utils/coloresDelSemaforo';
import { PALABRA_DEL_ESTADO, type EstadoDelLider } from './EstadoConForma';

/**
 * La barra de colores de un mentor o de un grupo (spec 056 FR-003): un solo renglón de 6 de alto con un tramo por estado, en proporción a
 * cuántos aprendices hay. Es un resumen para mirar de un vistazo: las cifras y sus formas van en `ContadoresPorColor`, así que la barra nunca
 * es lo único que dice algo. Sin nadie (todo en cero) no se dibuja.
 */
const ORDEN: Array<{ clave: 'rojo' | 'ambar' | 'verde' | 'sinDatos'; id: string; color: 'ROJO' | 'AMARILLO' | 'VERDE' | 'SIN_DATOS' }> = [
  { clave: 'rojo', id: 'barra-rojo', color: 'ROJO' },
  { clave: 'ambar', id: 'barra-ambar', color: 'AMARILLO' },
  { clave: 'verde', id: 'barra-verde', color: 'VERDE' },
  { clave: 'sinDatos', id: 'barra-sin-datos', color: 'SIN_DATOS' },
];

export function BarraDeColores({ rojo, ambar, verde, sinDatos }: Record<EstadoDelLider, number>) {
  const { c } = useTheme();
  const cifras = { rojo, ambar, verde, sinDatos };
  if (rojo + ambar + verde + sinDatos <= 0) return null;
  const etiqueta = ORDEN.filter(t => cifras[t.clave] > 0)
    .map(t => `${cifras[t.clave]} ${PALABRA_DEL_ESTADO[t.clave]}`)
    .join(', ');

  return (
    <View testID="barra-de-colores" accessible accessibilityLabel={etiqueta} style={[estilos.barra, { backgroundColor: c.border }]}>
      {ORDEN.filter(t => cifras[t.clave] > 0).map(t => (
        <View key={t.id} testID={t.id} style={{ flex: cifras[t.clave], backgroundColor: coloresDelSemaforo(t.color, c).relleno }} />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden' },
});
