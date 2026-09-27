import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EtiquetaSemaforo } from '../../semaforo/components/EtiquetaSemaforo';
import { useMiSemaforo } from '../../semaforo/hooks/useMiSemaforo';
import { coloresDelSemaforo } from '../../semaforo/utils/coloresDelSemaforo';
import { PALABRA_DEL_COLOR } from '../../semaforo/utils/lecturaDelSemaforo';
import { useTheme } from '../../../theme/ThemeContext';
import { semaforoParaLaAgenda } from '../utils/semaforoEnAgenda';
import { LETRA } from './piezas';

/** Solo hace falta la ventana vigente: se pide una semana cerrada, lo mínimo que acepta el servidor. */
const SEMANAS_QUE_SE_PIDEN = 1;

/**
 * La línea del semáforo arriba de «Mi agenda»: color y palabra del semáforo vigente y, debajo, los
 * días ya vividos de esta semana con su puntito. Misma lectura, mismos colores y misma etiqueta que
 * la tarjeta de Hoy (`useMiSemaforo`, `EtiquetaSemaforo`). Sin semáforo no dibuja nada.
 */
export function SemaforoDeLaAgenda() {
  const { c } = useTheme();
  const { detalle, fallo } = useMiSemaforo(true, SEMANAS_QUE_SE_PIDEN);
  const lectura = semaforoParaLaAgenda(detalle, fallo);
  if (!lectura) return null;

  return (
    <View style={[estilos.caja, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <Text style={[estilos.rotulo, { color: c.textSoft }]}>Tu semáforo · últimos 7 días</Text>
      <EtiquetaSemaforo color={lectura.color} etiqueta={lectura.palabra} />
      {lectura.diasVividos.length > 0 ? (
        <View style={estilos.dias}>
          <Text style={[estilos.rotulo, { color: c.textSoft }]}>Esta semana:</Text>
          {lectura.diasVividos.map(d => {
            const { relleno } = coloresDelSemaforo(d.color, c);
            const sinDatos = d.color === 'SIN_DATOS';
            return (
              <View
                key={d.fecha}
                style={estilos.dia}
                accessible
                accessibilityLabel={`${d.rotulo}: ${PALABRA_DEL_COLOR[d.color]}`}
              >
                <Text style={[estilos.rotulo, { color: c.textStrong }]}>{d.rotulo}</Text>
                <View
                  style={[
                    estilos.punto,
                    { backgroundColor: sinDatos ? 'transparent' : relleno, borderWidth: sinDatos ? 2 : 0, borderColor: relleno },
                  ]}
                />
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  rotulo: { fontFamily: 'Jost_400Regular', fontSize: LETRA.cuerpo, lineHeight: 21 },
  dias: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 6 },
  dia: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  punto: { width: 11, height: 11, borderRadius: 6 },
});
