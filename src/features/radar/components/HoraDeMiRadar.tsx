import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { type HoraDeMiRadar as HoraDeLosDias, textoDeLaFalta } from '../utils/vecesDeMiRadar';

/**
 * «Hora» de Mi Radar (spec 019): el horario de solo lectura, con la estética de la rueda de Planificar (las dos líneas doradas):
 * «05:30 a 22:30», con «Despertar» y «Dormir» chicos debajo. Con días de horario distinto dice «Estos días tienen horas
 * distintas»; si falta el Despertar o el Dormir, una tarjeta de una línea («Falta tu hora de Despertar»).
 *
 * No se toca: el horario se programa en Training → Planificar (el Despertar y el Dormir son hábitos).
 */
export function HoraDeMiRadar({ hora }: { hora: HoraDeLosDias }) {
  const { c, t } = useTheme();

  return (
    <View>
      <MicroLabel>Hora</MicroLabel>
      {hora.tipo === 'horario' ? (
        <View
          style={estilos.rueda}
          accessible
          accessibilityLabel={`Despertar ${hora.despertar}, Dormir ${hora.dormir}`}
        >
          <View style={estilos.columna}>
            <View style={[estilos.centro, { borderColor: c.gold }]}>
              <Text style={[estilos.cifra, { color: c.goldInk }]}>{hora.despertar}</Text>
            </View>
            <Text style={[estilos.etiqueta, { color: c.textSoft }]}>Despertar</Text>
          </View>
          <Text style={[estilos.separador, { color: c.text }]}>a</Text>
          <View style={estilos.columna}>
            <View style={[estilos.centro, { borderColor: c.gold }]}>
              <Text style={[estilos.cifra, { color: c.goldInk }]}>{hora.dormir}</Text>
            </View>
            <Text style={[estilos.etiqueta, { color: c.textSoft }]}>Dormir</Text>
          </View>
        </View>
      ) : (
        <View style={[estilos.tarjeta, { backgroundColor: c.goldWash, borderColor: c.border }]}>
          <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 22, fontFamily: fuentes.negrita }]}>
            {hora.tipo === 'distintas' ? 'Estos días tienen horas distintas' : textoDeLaFalta(hora.motivo)}
          </Text>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  rueda: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  columna: { flex: 1, alignItems: 'center', gap: 6 },
  centro: { alignSelf: 'stretch', alignItems: 'center', borderTopWidth: 1.5, borderBottomWidth: 1.5, paddingVertical: 8 },
  cifra: { fontFamily: fuentes.negrita, fontSize: 30, lineHeight: 36, fontVariant: ['tabular-nums'] },
  separador: { fontFamily: fuentes.negrita, fontSize: 22, paddingHorizontal: 10, marginTop: -8 },
  etiqueta: { fontFamily: fuentes.regular, fontSize: 13, lineHeight: 18 },
  tarjeta: { marginTop: 8, minHeight: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, justifyContent: 'center' },
});
