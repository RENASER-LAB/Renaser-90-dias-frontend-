import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { AprendizDelSemaforo } from '../types/semaforo.types';
import { coloresDelSemaforo } from '../utils/coloresDelSemaforo';
import { dichoDelAprendiz, formatearPorcentaje, textoDiasConDatos } from '../utils/lecturaDelSemaforo';
import { EtiquetaSemaforo } from './EtiquetaSemaforo';
import { GraficoDeDias } from './graficos';

/**
 * Una persona en la tabla de su grupo (§4.3): **el nombre primero**, después su palabra y su
 * porcentaje con el denominador de días, y abajo sus días en chico —el mismo gráfico que la tarjeta
 * de Hoy—.
 *
 * Sin datos no hay número: la fila dice «Sin datos», nunca «0 %». Con `onPress` se abre su detalle
 * (el mentor); sin él la fila es solo lectura (administración, desde la tabla del grupo).
 */
export function FilaAprendizDelSemaforo({
  aprendiz,
  primera,
  onPress,
}: {
  aprendiz: AprendizDelSemaforo;
  primera: boolean;
  onPress?: () => void;
}) {
  const { c, t } = useTheme();
  const nombre = aprendiz.nombre?.trim() || 'Aprendiz sin nombre';
  const { tinta } = coloresDelSemaforo(aprendiz.color, c);
  const borde = { borderTopColor: c.divider, borderTopWidth: primera ? 0 : 1 };

  const contenido = (
    <>
      <View style={estilos.cabecera}>
        <Text style={[t.cardTitle, estilos.nombre, { color: c.textStrong }]} numberOfLines={2}>
          {nombre}
        </Text>
        {aprendiz.porcentaje !== null ? (
          <Text style={[estilos.cifra, { color: tinta }]}>{formatearPorcentaje(aprendiz.porcentaje)}</Text>
        ) : null}
        {onPress ? <Icon name="chevron" size={14} color={c.chevron} /> : null}
      </View>
      <View style={estilos.estado}>
        <EtiquetaSemaforo color={aprendiz.color} etiqueta={aprendiz.etiqueta} />
        {aprendiz.diasConDatos !== null ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>
            {textoDiasConDatos(aprendiz.diasConDatos)}
          </Text>
        ) : null}
      </View>
      {aprendiz.dias.length > 0 ? (
        <View style={estilos.dias}>
          <GraficoDeDias dias={aprendiz.dias} tamano="chico" titulo={`Los días de ${nombre}`} />
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={[estilos.fila, borde]} accessible accessibilityLabel={dichoDelAprendiz(aprendiz)}>
        {contenido}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${dichoDelAprendiz(aprendiz)} Abrir su detalle.`}
      style={({ pressed }) => [estilos.fila, borde, { backgroundColor: pressed ? c.goldWash : 'transparent' }]}
    >
      {contenido}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  /* Más de 48 px de alto siempre: se toca con el pulgar sin apuntar (AGENTS.md §4). */
  fila: { paddingVertical: 14, minHeight: 56, gap: 6 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nombre: { flex: 1, minWidth: 0 },
  /* Cifras tabulares: 78.3 y 100 no bailan de ancho de una fila a la otra. */
  cifra: { fontFamily: 'Jost_700Bold', fontSize: 18, lineHeight: 24, fontVariant: ['tabular-nums'] },
  estado: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 12, rowGap: 2 },
  dias: { marginTop: 4 },
});
