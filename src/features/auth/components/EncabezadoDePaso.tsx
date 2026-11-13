import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';

/**
 * La fila de arriba de cada paso de «Solicitar acceso» (spec 051): flecha para volver, el avance en segmentos
 * dorados y «N de M». Los segmentos llenos son los pasos ya alcanzados; el cambio de color es instantáneo
 * (se mira cada paso una vez, no se anima lo que pasa tan poco).
 *
 * Sin `total` ni `actual` (la pantalla del código) solo queda la flecha.
 */
export function EncabezadoDePaso({
  actual,
  total,
  alVolver,
  accesibilidadVolver = 'Volver al paso anterior',
  horizontalPadding,
}: {
  /** Paso en el que se está, desde 1. */
  actual?: number;
  total?: number;
  alVolver: () => void;
  accesibilidadVolver?: string;
  horizontalPadding: number;
}) {
  const { c, t } = useTheme();
  const conAvance = actual !== undefined && total !== undefined;

  return (
    <View style={[styles.fila, { paddingHorizontal: horizontalPadding }]}>
      <Presionable
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={accesibilidadVolver}
        onPress={alVolver}
        style={[styles.volver, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
      >
        <Icon name="arrowLeft" size={20} color={c.goldInk} />
      </Presionable>

      {conAvance ? (
        <>
          <View
            testID="avance-del-registro"
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Paso ${actual} de ${total}`}
            accessibilityValue={{ min: 1, max: total, now: actual }}
            style={styles.segmentos}
          >
            {Array.from({ length: total }, (_, i) => (
              <View
                key={i}
                testID={i < actual ? 'segmento-lleno' : 'segmento-vacio'}
                style={[styles.segmento, { backgroundColor: i < actual ? c.gold : c.divider }]}
              />
            ))}
          </View>
          <Text style={[t.small, styles.contador, { color: c.textSoft }]}>{`${actual} de ${total}`}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 52,
  },
  volver: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentos: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  segmento: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  contador: {
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'right',
  },
});
