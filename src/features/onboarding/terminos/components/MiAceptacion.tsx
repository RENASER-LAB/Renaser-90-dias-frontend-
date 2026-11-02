import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../../components/Icon';
import { fuentes } from '../../../../theme/fuentes';
import { useTheme } from '../../../../theme/ThemeContext';
import {
  FRASE_DE_LA_DECISION,
  FRASE_DE_LA_DECLARACION,
  lineasDeMiAceptacion,
  TITULO_DE_MI_ACEPTACION,
  type AcuerdoDeLaPersona,
} from '../utils/miAceptacion';

/**
 * «MI ACEPTACIÓN» (spec 039, Acuerdo de transformación): el bloque final de los términos, antes de la firma. Dos frases fijas del dueño y los datos reales de la
 * persona, que llena el sistema: participante, programa, fecha de inicio, fecha de finalización y fecha de aceptación. Es solo lectura y quieto (se ve una vez, al
 * aceptar): ni un toque ni una animación. Las fechas de inicio y fin son las mismas de «Tu programa empieza mañana» (las dice el servidor).
 */
export function MiAceptacion({ acuerdo }: { acuerdo: AcuerdoDeLaPersona }) {
  const { c, t } = useTheme();
  const lineas = useMemo(() => lineasDeMiAceptacion(acuerdo), [acuerdo]);

  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
      <View style={estilos.cabeza}>
        <Icon name="signature" size={20} color={c.goldInk} />
        <Text accessibilityRole="header" style={[t.cardTitle, { color: c.textStrong, textTransform: 'uppercase', fontSize: 16 }]}>
          {TITULO_DE_MI_ACEPTACION}
        </Text>
      </View>

      <View style={estilos.frases}>
        <Text style={[t.body, { color: c.text, fontSize: 15, lineHeight: 22 }]}>{FRASE_DE_LA_DECISION}</Text>
        <Text style={[t.body, { color: c.text, fontSize: 15, lineHeight: 22 }]}>{FRASE_DE_LA_DECLARACION}</Text>
      </View>

      <View style={estilos.lineas}>
        {lineas.map(linea => (
          <View key={linea.clave} accessible accessibilityLabel={`${linea.etiqueta}: ${linea.valor}`} style={[estilos.linea, { borderColor: c.border }]}>
            <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>{linea.etiqueta}</Text>
            <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 23, fontFamily: fuentes.media }]}>{linea.valor}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  frases: { gap: 10 },
  lineas: { gap: 0 },
  linea: { gap: 2, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
