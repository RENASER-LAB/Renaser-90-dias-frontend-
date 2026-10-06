import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { useColorDelSemaforoVigente } from '../../semaforo/estado/useSemaforoVigente';
import { animoDelSemaforo, nombreDelAnimo } from '../utils/animoDelFenix';
import { FenixVivo } from './FenixVivo';

/**
 * El fénix de la tarjeta del semáforo (Hoy) y del detalle: su ánimo es el color VIGENTE que guarda la app
 * (`semaforoVigente`), el mismo que lee el botón de SER. En Hoy, vivo pero calmo (`life` 0.4, entrega §8.4).
 */
export function FenixDelSemaforo({ size, life, style }: { size: number; life: number; style?: StyleProp<ViewStyle> }) {
  const animo = animoDelSemaforo(useColorDelSemaforoVigente());
  return (
    <FenixVivo
      size={size}
      animo={animo}
      life={life}
      etiqueta={`Fénix ${nombreDelAnimo(animo)}`}
      style={style}
      testID="fenix-del-semaforo"
    />
  );
}
