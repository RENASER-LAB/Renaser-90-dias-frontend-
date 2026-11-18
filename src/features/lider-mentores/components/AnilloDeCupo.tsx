import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * Un anillo con su número escrito adentro (spec 056 FR-003, FR-007, FR-031): un indicador de progreso (`progressbar`) con su valor y su texto en voz alta. El
 * número es lo que dice la cifra: el anillo solo la acompaña. Con `maximo` en cero no divide: queda el anillo vacío. `alerta` pinta el trazo de peligro
 * (cupo lleno, promedio bajo); el texto sigue diciendo lo mismo.
 */
export function AnilloDeProgreso({
  ahora,
  maximo,
  texto,
  etiqueta,
  alerta = false,
  tamano = 48,
  testID = 'anillo-de-progreso',
}: {
  ahora: number;
  maximo: number;
  texto: string;
  etiqueta: string;
  alerta?: boolean;
  tamano?: number;
  testID?: string;
}) {
  const { c } = useTheme();
  const tope = Math.max(0, maximo);
  const valor = Math.min(Math.max(0, ahora), tope);
  const grosor = tamano >= 64 ? 7 : 5;
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const llenado = tope > 0 ? (valor / tope) * circunferencia : 0;

  return (
    <View testID={testID} accessible accessibilityRole="progressbar" accessibilityLabel={etiqueta} accessibilityValue={{ min: 0, max: tope, now: valor }} style={{ width: tamano, height: tamano }}>
      <Svg width={tamano} height={tamano} style={StyleSheet.absoluteFill}>
        <Circle cx={tamano / 2} cy={tamano / 2} r={radio} stroke={c.border} strokeWidth={grosor} fill="none" />
        {llenado > 0 ? (
          <Circle
            cx={tamano / 2}
            cy={tamano / 2}
            r={radio}
            stroke={alerta ? c.danger : c.gold}
            strokeWidth={grosor}
            strokeLinecap="round"
            strokeDasharray={`${llenado} ${circunferencia}`}
            rotation={-90}
            origin={`${tamano / 2}, ${tamano / 2}`}
            fill="none"
          />
        ) : null}
      </Svg>
      <View style={estilos.centro} pointerEvents="none">
        <Text accessible={false} style={[estilos.numero, { color: c.textStrong, fontSize: tamano >= 64 ? 18 : 12.5, lineHeight: tamano >= 64 ? 22 : 16 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {texto}
        </Text>
      </View>
    </View>
  );
}

/**
 * El cupo de un mentor o de un grupo (spec 056 FR-003, FR-007): el anillo con «n/máx» escrito adentro. Con el cupo lleno el anillo pasa al rojo de peligro; el
 * número sigue siendo lo que lo dice.
 */
export function AnilloDeCupo({ acompanados, maximo, tamano = 48 }: { acompanados: number; maximo: number; tamano?: number }) {
  const lleno = maximo > 0 && acompanados >= maximo;
  return (
    <AnilloDeProgreso ahora={acompanados} maximo={maximo} texto={`${acompanados}/${maximo}`} etiqueta={`Cupo ${acompanados} de ${maximo}`} alerta={lleno} tamano={tamano} testID="anillo-de-cupo" />
  );
}

const estilos = StyleSheet.create({
  centro: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  numero: { fontFamily: fuentes.negrita, fontVariant: ['tabular-nums'] },
});
