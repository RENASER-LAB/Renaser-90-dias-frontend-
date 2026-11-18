import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';

import { GROSOR_TRAZO_PX } from '../../../components/Icon';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { coloresDelSemaforo } from '../../semaforo/utils/coloresDelSemaforo';
import type { ColorSemaforo } from '../../semaforo/types/semaforo.types';
import { PALABRA_DEL_ESTADO, estadoDelColor, etiquetaDelEstado, type EstadoDelLider } from '../utils/estadosDelLider';

export { PALABRA_DEL_ESTADO, estadoDelColor, etiquetaDelEstado, type EstadoDelLider };

const COLOR_DEL_ESTADO: Record<EstadoDelLider, ColorSemaforo> = { rojo: 'ROJO', ambar: 'AMARILLO', verde: 'VERDE', sinDatos: 'SIN_DATOS' };

/**
 * Los cuatro estados del semáforo en las pantallas del líder (spec 056 FR-043, WCAG 1.4.1): **nunca solo con color**. Cada uno tiene su
 * forma y su símbolo —× en cuadrado rojo, ! en triángulo ámbar, ✓ en círculo verde, · en círculo vacío gris— y una etiqueta para el lector
 * de pantalla («5 en rojo»). El color sale de `coloresDelSemaforo`, el mismo del resto de la app; sin datos es neutro, nunca verde.
 */
export function EstadoConForma({ estado, cifra, tamano = 18 }: { estado: EstadoDelLider; cifra?: number | null; tamano?: number }) {
  const { c, t } = useTheme();
  const { relleno } = coloresDelSemaforo(COLOR_DEL_ESTADO[estado], c);
  const tinta = estado === 'sinDatos' ? c.textSoft : c.onGold;
  const etiqueta = etiquetaDelEstado(estado, cifra);
  const sw = (GROSOR_TRAZO_PX * 24) / tamano;

  return (
    <View accessible accessibilityLabel={etiqueta} style={estilos.raiz}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: tamano, height: tamano }}>
        {/* La forma y el símbolo van en dos capas: la forma dice el estado aunque no se distinga el color, y el símbolo lo repite. */}
        <View testID={formaDe(estado)} style={estilos.capa}>
          <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
            {estado === 'rojo' ? <Rect x={2} y={2} width={20} height={20} rx={4} fill={relleno} /> : null}
            {estado === 'ambar' ? <Polygon points="12,2 22.5,21 1.5,21" fill={relleno} stroke={relleno} strokeWidth={1.5} strokeLinejoin="round" /> : null}
            {estado === 'verde' ? <Circle cx={12} cy={12} r={10.5} fill={relleno} /> : null}
            {estado === 'sinDatos' ? <Circle cx={12} cy={12} r={9.5} fill="none" stroke={relleno} strokeWidth={sw} /> : null}
          </Svg>
        </View>
        <View testID={simboloDe(estado)} style={estilos.capa}>
          <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
            {estado === 'rojo' ? <Path d="M8 8l8 8M16 8l-8 8" stroke={tinta} strokeWidth={sw} strokeLinecap="round" fill="none" /> : null}
            {estado === 'ambar' ? <Path d="M12 9v5.5M12 17.6v.1" stroke={tinta} strokeWidth={sw} strokeLinecap="round" fill="none" /> : null}
            {estado === 'verde' ? <Path d="M7.5 12.5l3 3 6-6.5" stroke={tinta} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
            {estado === 'sinDatos' ? <Circle cx={12} cy={12} r={1.8} fill={tinta} /> : null}
          </Svg>
        </View>
      </View>
      {cifra !== undefined && cifra !== null ? (
        <Text accessible={false} style={[t.body, estilos.cifra, { color: c.textStrong }]}>
          {cifra}
        </Text>
      ) : null}
    </View>
  );
}

function formaDe(estado: EstadoDelLider): string {
  return { rojo: 'forma-cuadrado', ambar: 'forma-triangulo', verde: 'forma-circulo', sinDatos: 'forma-circulo-vacio' }[estado];
}
function simboloDe(estado: EstadoDelLider): string {
  return { rojo: 'simbolo-x', ambar: 'simbolo-exclamacion', verde: 'simbolo-check', sinDatos: 'simbolo-punto' }[estado];
}

const estilos = StyleSheet.create({
  raiz: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  capa: { position: 'absolute', left: 0, top: 0 },
  /* Cifras tabulares: 9 y 10 no bailan de una fila a la otra. */
  cifra: { fontFamily: fuentes.seminegrita, fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
});
