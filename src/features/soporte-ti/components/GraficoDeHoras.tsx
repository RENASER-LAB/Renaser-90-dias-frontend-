import { fuentes } from '../../../theme/fuentes';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as TextoSvg } from 'react-native-svg';

import { useTheme } from '../../../theme/ThemeContext';
import { cifra, horaCorta, topeDelEje, type HoraDeMetricas } from '../utils/despliegue';

/**
 * Los dos colores del gráfico del despliegue (skill `dataviz`): «dentro» en el dorado de la marca y «fuera» en un azul
 * pizarra, un paso por tema. Validados con `validate_palette.js` contra la superficie de las tarjetas (`#FDFCFA` claro,
 * `#161513` oscuro): banda de luminosidad, croma, separación con daltonismo (ΔE ≥ 15) y contraste ≥ 3:1, todo en verde.
 * El texto nunca lleva estos colores: va en los tokens de texto, y la identidad la da la muestra de al lado.
 */
export const COLORES_DEL_GRAFICO = {
  light: { dentro: '#93701F', fuera: '#4F78B8' },
  dark: { dentro: '#B08A2E', fuera: '#5F86C6' },
} as const;

const ALTO = 132;
const MARGEN_IZQUIERDO = 40;
const MARGEN_DERECHO = 8;
const MARGEN_ARRIBA = 10;
const MARGEN_ABAJO = 6;

/**
 * Un gráfico de líneas de las últimas 24 h, por hora (decisión P5 del dueño): dentro y fuera del despliegue, de una
 * medida (pedidos o errores 5xx). Una sola escala por gráfico (pedidos y errores van en dos gráficos, nunca con dos ejes).
 *
 * - Líneas de 2 px, la línea base y la del tope en un gris de un paso, sin cuadrícula.
 * - Leyenda siempre (dos series) y, en vez del «hover» de la web, **tocar** el gráfico elige la hora más cercana: una
 *   línea vertical y los dos puntos (r 4, con un aro del color de la superficie) y la lectura arriba, en un renglón fijo
 *   que no mueve nada. Sin animación: es una herramienta, se toca seguido.
 * - Para el lector de pantalla, el gráfico se lee como un resumen; la tabla por hora está en la pantalla («Ver por hora»).
 */
export function GraficoDeHoras({
  titulo,
  horas,
  medida,
}: {
  titulo: string;
  horas: readonly HoraDeMetricas[];
  medida: 'pedidos' | 'errores';
}) {
  const { c, t, mode } = useTheme();
  const colores = COLORES_DEL_GRAFICO[mode === 'dark' ? 'dark' : 'light'];
  const [ancho, setAncho] = useState(0);
  const [elegida, setElegida] = useState<number | null>(null);

  const valores = (lado: 'dentro' | 'fuera') => horas.map(h => h[lado][medida]);
  const dentro = valores('dentro');
  const fuera = valores('fuera');
  const tope = topeDelEje(Math.max(0, ...dentro, ...fuera));
  const totalDentro = dentro.reduce((s, v) => s + v, 0);
  const totalFuera = fuera.reduce((s, v) => s + v, 0);
  const unidad = medida === 'pedidos' ? 'pedidos' : 'errores';

  const anchoDelTrazo = Math.max(0, ancho - MARGEN_IZQUIERDO - MARGEN_DERECHO);
  const altoDelTrazo = ALTO - MARGEN_ARRIBA - MARGEN_ABAJO;
  const paso = horas.length > 1 ? anchoDelTrazo / (horas.length - 1) : 0;
  const x = (i: number) => MARGEN_IZQUIERDO + i * paso;
  const y = (v: number) => MARGEN_ARRIBA + altoDelTrazo - (v / tope) * altoDelTrazo;
  const camino = (serie: number[]) => serie.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const elegir = (e: GestureResponderEvent) => {
    if (horas.length === 0 || paso <= 0) return;
    const i = Math.round((e.nativeEvent.locationX - MARGEN_IZQUIERDO) / paso);
    const indice = Math.min(horas.length - 1, Math.max(0, i));
    setElegida(actual => (actual === indice ? null : indice));
  };

  const lectura =
    elegida !== null && horas[elegida]
      ? `${horaCorta(horas[elegida].hora)} · dentro ${cifra(dentro[elegida])} · fuera ${cifra(fuera[elegida])}`
      : 'Toca el gráfico para ver una hora.';
  const ultimo = horas.length - 1;
  const medio = Math.floor(ultimo / 2);
  const suave = [t.small, { color: c.textSoft, fontSize: 13 }];

  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
      <Text accessibilityRole="header" style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>
        {titulo}
      </Text>
      <View style={estilos.leyenda}>
        <Muestra color={colores.dentro} texto="Dentro del despliegue" />
        <Muestra color={colores.fuera} texto="Fuera" />
      </View>

      {horas.length === 0 ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Sin datos de las últimas 24 horas.</Text>
      ) : (
        <>
          <Text style={[suave, estilos.lectura, { fontVariant: ['tabular-nums'] }]} numberOfLines={1}>
            {lectura}
          </Text>
          <Pressable
            onPress={elegir}
            onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
            accessibilityRole="image"
            accessibilityLabel={`${titulo}, últimas 24 horas: dentro del despliegue ${cifra(totalDentro)} ${unidad}, fuera ${cifra(totalFuera)} ${unidad}.`}
            accessibilityHint="Toca para ver una hora"
            style={{ height: ALTO }}
          >
            {ancho > 0 ? (
              <Svg width={ancho} height={ALTO}>
                <Line x1={MARGEN_IZQUIERDO} x2={ancho - MARGEN_DERECHO} y1={y(0)} y2={y(0)} stroke={c.border} strokeWidth={1} />
                <Line x1={MARGEN_IZQUIERDO} x2={ancho - MARGEN_DERECHO} y1={y(tope)} y2={y(tope)} stroke={c.divider} strokeWidth={1} />
                <TextoSvg x={MARGEN_IZQUIERDO - 6} y={y(tope) + 4} fontSize={12} fontFamily={fuentes.regular} fill={c.textSoft} textAnchor="end">
                  {cifra(tope)}
                </TextoSvg>
                <TextoSvg x={MARGEN_IZQUIERDO - 6} y={y(0) + 4} fontSize={12} fontFamily={fuentes.regular} fill={c.textSoft} textAnchor="end">
                  0
                </TextoSvg>
                {elegida !== null ? (
                  <Line x1={x(elegida)} x2={x(elegida)} y1={MARGEN_ARRIBA} y2={y(0)} stroke={c.borderStrong} strokeWidth={1} />
                ) : null}
                <Path d={camino(fuera)} stroke={colores.fuera} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                <Path d={camino(dentro)} stroke={colores.dentro} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                {[elegida ?? ultimo].map(i => (
                  <React.Fragment key={i}>
                    <Circle cx={x(i)} cy={y(fuera[i])} r={4} fill={colores.fuera} stroke={c.cardBg} strokeWidth={2} />
                    <Circle cx={x(i)} cy={y(dentro[i])} r={4} fill={colores.dentro} stroke={c.cardBg} strokeWidth={2} />
                  </React.Fragment>
                ))}
              </Svg>
            ) : null}
          </Pressable>
          <View style={[estilos.horas, { marginLeft: MARGEN_IZQUIERDO }]}>
            <Text style={suave}>{horaCorta(horas[0].hora)}</Text>
            {ultimo > 1 ? <Text style={suave}>{horaCorta(horas[medio].hora)}</Text> : null}
            <Text style={suave}>{horaCorta(horas[ultimo].hora)}</Text>
          </View>
        </>
      )}
    </View>
  );
}

/** Una muestra de la leyenda: un trazo corto del color de la serie y su nombre en el color del texto. */
function Muestra({ color, texto }: { color: string; texto: string }) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.muestra}>
      <View style={[estilos.trazo, { backgroundColor: color }]} />
      <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  muestra: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trazo: { width: 16, height: 3, borderRadius: 2 },
  lectura: { minHeight: 18 },
  horas: { flexDirection: 'row', justifyContent: 'space-between' },
});
