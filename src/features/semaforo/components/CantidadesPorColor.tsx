import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { ResumenPorColor } from '../types/semaforo.types';
import {
  COLORES_EN_ORDEN,
  cantidadDelColor,
  cantidadEnPalabras,
  resumenEnPalabras,
} from '../utils/lecturaDelSemaforo';
import { EtiquetaSemaforo } from './EtiquetaSemaforo';

/**
 * «● 5 al día  ● 2 requieren atención  ● 1 con problemas  ○ 0 sin datos»: cuántos hay en cada color,
 * con la palabra al lado de cada punto (RL-30). Las cuatro siempre y siempre en el mismo orden, para
 * que dos grupos se comparen de un vistazo; una cantidad en cero va en gris.
 *
 * Las cifras son las del servidor (`resumen`), no una cuenta de las filas que haya en pantalla.
 * Todo el bloque se lee de corrido como una sola frase (`resumenEnPalabras`).
 */
export function CantidadesPorColor({ resumen }: { resumen: ResumenPorColor }) {
  return (
    <View style={estilos.fila} accessible accessibilityLabel={resumenEnPalabras(resumen)}>
      {COLORES_EN_ORDEN.map(color => {
        const cantidad = cantidadDelColor(resumen, color);
        return (
          <EtiquetaSemaforo
            key={color}
            color={color}
            etiqueta={cantidadEnPalabras(color, cantidad)}
            atenuada={cantidad === 0}
          />
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  /* Una al lado de la otra donde entran; en 360 px bajan de renglón solas, sin cortarse. */
  fila: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 6 },
});
