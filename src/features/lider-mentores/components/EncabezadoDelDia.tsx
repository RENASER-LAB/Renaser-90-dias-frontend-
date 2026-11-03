import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { Flecha } from '../../semaforo/components/NavegacionDeSemanas';
import { diaCompletoEnPalabras, rotuloDelDia, type Navegacion } from '../utils/habitosDeTodos';

/**
 * El día que se mira en «Hábitos de todos» (spec 029): ‹ «Hoy» ›. Las flechas de 48 llegan hasta donde dice el servidor (hoy y 7 días atrás;
 * `navegacionDelDia`) y se apagan en el límite, sin desaparecer, para que el rótulo no salte. Cambiar de día es instantáneo y sin animación
 * (se toca varias veces seguidas); vibra con el «tic» de selección. El rótulo se anuncia solo (`liveRegion`) al cambiar.
 */
export function EncabezadoDelDia({
  fecha,
  esHoy,
  masReciente,
  navegacion,
  onCambiar,
}: {
  /** El día que se está mirando; `null` = todavía no se sabe cuál es hoy (primera lectura). */
  fecha: string | null;
  esHoy: boolean;
  masReciente: string | null;
  navegacion: Navegacion;
  onCambiar: (fecha: string) => void;
}) {
  const { c, t } = useTheme();
  const rotulo = fecha ? rotuloDelDia(fecha, masReciente, esHoy) : 'Hoy';
  const completo = fecha ? diaCompletoEnPalabras(fecha) : null;
  const ir = (destino: string | null) => {
    if (!destino) return;
    tacto.seleccion();
    onCambiar(destino);
  };
  return (
    <View style={estilos.fila}>
      <Flecha icono="arrowLeft" etiqueta="Día anterior" habilitada={navegacion.anterior !== null} onPress={() => ir(navegacion.anterior)} />
      <View
        style={estilos.centro}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={completo ? `${rotulo}. ${completo}` : rotulo}
      >
        <Text style={[t.cardTitle, { color: c.textStrong, textAlign: 'center' }]}>{rotulo}</Text>
        {completo ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22, textAlign: 'center' }]}>{completo}</Text>
        ) : null}
      </View>
      <Flecha icono="arrow" etiqueta="Día siguiente" habilitada={navegacion.siguiente !== null} onPress={() => ir(navegacion.siguiente)} />
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  centro: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
});
