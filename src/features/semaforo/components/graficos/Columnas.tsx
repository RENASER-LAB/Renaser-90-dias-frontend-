import React, { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { useTheme } from '../../../../theme/ThemeContext';
import type { ColorSemaforo } from '../../types/semaforo.types';
import { coloresDelSemaforo } from '../../utils/coloresDelSemaforo';
import { formatearPorcentaje, porcentajeCompacto } from '../../utils/lecturaDelSemaforo';

/** Una columna del gráfico. */
export interface Columna {
  clave: string;
  /**
   * 0..100, tal cual llegó. Se dibuja como barra y se escribe encima. `null` = no hubo medición:
   * un trazo neutro y una raya, nunca una barra en cero.
   */
  valor: number | null;
  color: ColorSemaforo;
  /** Uno o dos renglones cortos bajo la barra (el día, la semana). Solo con rótulos. */
  abajo?: readonly string[];
}

/** Alto mínimo de una barra medida: un 0 % real tiene que verse, y distinto del trazo de "sin datos". */
const BARRA_MINIMA = 3;
const GROSOR_TRAZO = 3;
/**
 * Por debajo de este ancho de columna, «71.4 %» ya no entra y los números se tocan (ocho semanas
 * en 360 px dan ~40 px por columna). Ahí el porcentaje se escribe compacto: «71.4%», un punto menos.
 */
const COLUMNA_COMODA = 46;

/**
 * Columnas de color sobre una línea de base, con `react-native-svg`. Es la pieza común de
 * `BarrasDeDias` y `TendenciaSemanal`; no se exporta fuera de `graficos/`.
 *
 * - Las barras se dibujan en SVG; los rótulos, con `Text` de la app — así usan Jost y respetan el
 *   tamaño de letra del sistema, cosa que el texto dentro de un SVG no hace.
 * - El ancho se mide (`onLayout`) en vez de estirar un `viewBox`: estirado, el redondeo de las barras
 *   se deforma según el ancho del teléfono.
 * - Todo el gráfico es UN elemento accesible con su lectura completa (`dicho`): la información está
 *   en la posición y el color de cada barra, y eso no se lee en voz alta.
 * - Sin animación de entrada, a propósito (§5 del contrato).
 */
export function Columnas({
  columnas,
  alto,
  conRotulos,
  dicho,
}: {
  columnas: readonly Columna[];
  /** Alto del área de barras, en px. */
  alto: number;
  conRotulos: boolean;
  dicho: string;
}) {
  const { c, t } = useTheme();
  const [ancho, setAncho] = useState(0);

  const alMedir = (e: LayoutChangeEvent) => {
    const medido = Math.round(e.nativeEvent.layout.width);
    if (medido !== ancho) setAncho(medido);
  };

  const n = columnas.length;
  const anchoColumna = n > 0 ? ancho / n : 0;
  const anchoBarra = Math.max(4, Math.min(28, anchoColumna * 0.56));
  const radio = Math.min(4, anchoBarra / 4);
  const estrecho = anchoColumna > 0 && anchoColumna < COLUMNA_COMODA;

  const rotulo = [t.small, estilos.rotulo];

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={dicho}>
      {conRotulos ? (
        <View style={estilos.fila}>
          {columnas.map(col => (
            <Text
              key={col.clave}
              numberOfLines={1}
              style={[
                rotulo,
                estilos.celda,
                {
                  color: col.valor === null ? c.chevron : coloresDelSemaforo(col.color, c).tinta,
                  fontFamily: 'Jost_500Medium',
                  fontSize: estrecho ? 11 : 12,
                },
              ]}
            >
              {col.valor === null ? '—' : estrecho ? porcentajeCompacto(col.valor) : formatearPorcentaje(col.valor)}
            </Text>
          ))}
        </View>
      ) : null}

      <View onLayout={alMedir} style={{ height: alto, marginTop: conRotulos ? 4 : 0 }}>
        {ancho > 0 ? (
          <Svg width={ancho} height={alto}>
            <Line x1={0} y1={alto - 0.5} x2={ancho} y2={alto - 0.5} stroke={c.divider} strokeWidth={1} />
            {columnas.map((col, i) => {
              const x = i * anchoColumna + (anchoColumna - anchoBarra) / 2;
              if (col.valor === null) {
                /* Trazo neutro, más corto que una barra: "no hubo medición" no se confunde con un
                   0 % medido, que es una barra roja del ancho completo. */
                const margen = anchoBarra * 0.25;
                const y = alto - GROSOR_TRAZO / 2 - 1;
                return (
                  <Line
                    key={col.clave}
                    x1={x + margen}
                    x2={x + anchoBarra - margen}
                    y1={y}
                    y2={y}
                    stroke={c.chevron}
                    strokeWidth={GROSOR_TRAZO}
                    strokeLinecap="round"
                  />
                );
              }
              const proporcion = Math.min(100, Math.max(0, col.valor)) / 100;
              const altoBarra = Math.max(BARRA_MINIMA, proporcion * (alto - 1));
              return (
                <Rect
                  key={col.clave}
                  x={x}
                  y={alto - 1 - altoBarra}
                  width={anchoBarra}
                  height={altoBarra}
                  rx={radio}
                  fill={coloresDelSemaforo(col.color, c).relleno}
                />
              );
            })}
          </Svg>
        ) : null}
      </View>

      {conRotulos && columnas.some(col => (col.abajo?.length ?? 0) > 0) ? (
        <View style={[estilos.fila, { marginTop: 6 }]}>
          {columnas.map(col => (
            <View key={col.clave} style={estilos.celda}>
              {(col.abajo ?? []).map((linea, j) => (
                <Text
                  key={`${col.clave}-${j}`}
                  numberOfLines={1}
                  style={[rotulo, { color: j === 0 ? c.textSoft : c.chevron }]}
                >
                  {linea}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', width: '100%' },
  /* Las celdas de texto se reparten el ancho igual que las columnas del SVG (ancho / n), así cada
     rótulo queda centrado bajo su barra sin medir nada más. */
  celda: { flex: 1, alignItems: 'center', minWidth: 0 },
  /* 12 px con cifras tabulares: el piso de las etiquetas de ayuda (AGENTS.md §4), y los números no
     bailan de ancho entre columnas. */
  rotulo: { fontSize: 12, lineHeight: 16, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
