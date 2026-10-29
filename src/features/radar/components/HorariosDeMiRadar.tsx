import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { ChipDeOpcion } from '../../admin/components/ChipDeOpcion';
import { MI_RADAR } from '../config/configRadar';
import { horasElegibles } from '../utils/miRadar';
import { horaEnPunto } from '../utils/slotsDelRadar';

/**
 * Las horas en punto de Mi Radar, de 03:00 a 23:00, para marcar hasta 12 (las de todos los días, o las de los días
 * marcados, según quien lo use). Cada hora es un chip que se prende y se apaga al instante; el cuerpo de la regla
 * (cuántas, cuáles) vive en `utils/miRadar` y la decide quien lo usa con `alAlternar`.
 */
export function HorariosDeMiRadar({
  elegidas,
  alAlternar,
  deshabilitado = false,
}: {
  elegidas: readonly number[];
  alAlternar: (hora: number) => void;
  deshabilitado?: boolean;
}) {
  const { c, t } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <View accessibilityLabel="Horas de Mi Radar" style={estilos.fila}>
        {horasElegibles().map(hora => (
          <ChipDeOpcion
            key={hora}
            etiqueta={horaEnPunto(hora)}
            activo={elegidas.includes(hora)}
            deshabilitado={deshabilitado}
            onPress={() => {
              tacto.seleccion();
              alAlternar(hora);
            }}
          />
        ))}
      </View>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
        {elegidas.length} de {MI_RADAR.maximoDeHoras} horas elegidas
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
