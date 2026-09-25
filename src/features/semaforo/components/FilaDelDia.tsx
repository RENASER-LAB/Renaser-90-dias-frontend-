import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { DiaDelSemaforo } from '../types/semaforo.types';
import { desgloseDelDia, dichoDelDia, fechaLarga, primeraEnMayuscula } from '../utils/lecturaDelSemaforo';
import { EtiquetaSemaforo } from './EtiquetaSemaforo';

/**
 * Un día de la lista, siempre en el mismo orden: la fecha, la palabra (si se midió) y el desglose
 * con denominadores. Apilado y no en una fila: con la palabra al costado, «Requiere atención» bajaba
 * de renglón y «Al día» no, y la lista se leía desordenada (visto en 360 px).
 *
 * Salió de `SemaforoScreen` tal cual, para que el detalle propio y la tarjeta del semáforo de un
 * aprendiz (mentor y administración) digan cada día con las mismas palabras.
 */
export function FilaDelDia({ dia, primera }: { dia: DiaDelSemaforo; primera: boolean }) {
  const { c, t } = useTheme();
  const medido = dia.estado === 'MEDIDO' && dia.porcentaje !== null;

  return (
    <View
      accessible
      accessibilityLabel={dichoDelDia(dia)}
      style={[estilos.dia, { borderTopColor: c.divider, borderTopWidth: primera ? 0 : 1 }]}
    >
      <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_500Medium' }]}>
        {primeraEnMayuscula(fechaLarga(dia.fecha))}
      </Text>
      {medido ? <EtiquetaSemaforo color={dia.color} /> : null}
      <Text
        style={[
          t.body,
          { fontSize: 16, lineHeight: 23, color: medido ? c.text : c.textSoft, fontVariant: ['tabular-nums'] },
        ]}
      >
        {desgloseDelDia(dia)}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  dia: { paddingVertical: 12, gap: 4 },
});
