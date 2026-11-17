import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { DIAS_DE_LA_SEMANA, DIAS_DE_LA_SEMANA_COMPLETOS, grillaDelMes, type CeldaDelDia, type Mes } from '../utils/calendarioDelMes';
import { LETRA } from './piezas';

/**
 * La grilla del mes, de lunes a domingo, sin saber qué se dibuja en cada día (spec 055 T030): quien la usa pasa `renderDia`.
 * La usan el calendario de Eventos (marcas de actividades) y el mes de colores de la ficha del mentor (color del semáforo de cada
 * día). La lógica de qué días hay vive en `utils/calendarioDelMes.ts`; acá solo se acomodan las celdas en filas de siete.
 */
export function GrillaDelMes({ mes, renderDia }: { mes: Mes; renderDia: (celda: CeldaDelDia) => React.ReactNode }) {
  const { c, space } = useTheme();
  const semanas = grillaDelMes(mes);
  return (
    <View style={[estilos.grilla, { borderColor: c.border, backgroundColor: c.cardBg, borderRadius: space.radius }]}>
      <View style={estilos.semana}>
        {DIAS_DE_LA_SEMANA.map((inicial, i) => (
          <Text key={i} accessibilityLabel={DIAS_DE_LA_SEMANA_COMPLETOS[i]} style={[estilos.inicial, { color: i >= 5 ? c.goldInk : c.textSoft }]}>
            {inicial}
          </Text>
        ))}
      </View>
      {semanas.map(semana => (
        <View key={semana[0].fecha} style={estilos.semana}>
          {semana.map(celda => (
            <React.Fragment key={celda.fecha}>{renderDia(celda)}</React.Fragment>
          ))}
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  grilla: { borderWidth: 1, paddingVertical: 8, paddingHorizontal: 4 },
  semana: { flexDirection: 'row' },
  inicial: { flex: 1, textAlign: 'center', fontFamily: fuentes.negrita, fontSize: LETRA.cuerpo, paddingVertical: 6 },
});
