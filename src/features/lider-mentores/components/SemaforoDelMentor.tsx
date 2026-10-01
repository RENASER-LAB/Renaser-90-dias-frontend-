import React from 'react';
import { View } from 'react-native';

import { EtiquetaSemaforo } from '../../semaforo/components/EtiquetaSemaforo';
import { formatearPorcentaje } from '../../semaforo/utils/lecturaDelSemaforo';
import type { IndicadoresApi } from '../api/liderMentoresSchemas';
import { Linea } from './MarcoDelLider';

/**
 * El semáforo de los aprendices de un mentor: el color del promedio con su palabra y el promedio, con
 * el mismo dibujo que el semáforo por grupos. Sin grupo no se pinta nada; caído, se dice.
 */
export function SemaforoDelMentor({ mentor }: { mentor: IndicadoresApi }) {
  if (mentor.semaforo.source !== 'OK') return <Linea>Semáforo: no se pudo leer</Linea>;
  const s = mentor.semaforo.summary;
  if (!s) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 4 }}>
      <EtiquetaSemaforo color={s.color} etiqueta={s.etiqueta} />
      <Linea>
        {s.promedio === null ? 'todavía sin actividad para medir' : `promedio ${formatearPorcentaje(s.promedio)}`}
      </Linea>
    </View>
  );
}
