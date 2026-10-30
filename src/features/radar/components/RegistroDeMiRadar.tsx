import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { horaLocalDelRegistro } from '../../mentor/utils/agruparRegistrosRadar';
import { ENERGIA_MAXIMA, PREGUNTAS_RADAR } from '../config/configRadar';
import type { RegistroRadarApi } from '../types/radar.types';
import { textoDeLaHoraDelRegistro } from '../utils/miRadar';

/**
 * Un registro de Mi Radar en la lista de la persona: la hora (`Prevista 14:00 · respondida 14:06`, o solo `14:06`), la
 * energía y lo que sintió; al tocarlo, las cuatro respuestas. Es lo suyo, escrito por ella: se muestra sin adornos ni
 * colores de estado.
 *
 * Abrir y cerrar es instantáneo, sin animación: se toca para leer y seguir, y lo que baja empuja a lo de abajo.
 */
export function RegistroDeMiRadar({ registro }: { registro: RegistroRadarApi }) {
  const { c, t } = useTheme();
  const [abierto, setAbierto] = useState(false);
  const hora = textoDeLaHoraDelRegistro(horaLocalDelRegistro(registro.createdAt), registro.horaPrevista);
  const sentia = registro.whatAmIFeeling.trim();

  return (
    <Presionable
      onPress={() => setAbierto(a => !a)}
      accessibilityRole="button"
      accessibilityLabel={`Registro. ${hora}. Energía ${registro.energyLevel} de ${ENERGIA_MAXIMA}`}
      accessibilityHint={abierto ? 'Toca para ocultar tus respuestas' : 'Toca para ver tus respuestas'}
      accessibilityState={{ expanded: abierto }}
      style={[estilos.registro, { borderColor: c.border, backgroundColor: c.cardBg }]}
    >
      <View style={estilos.cabecera}>
        <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_500Medium', flexShrink: 1 }]}>
          {hora}
        </Text>
        <View style={estilos.energia}>
          <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
            Energía {registro.energyLevel} / {ENERGIA_MAXIMA}
          </Text>
          <View style={{ transform: [{ rotate: abierto ? '-90deg' : '90deg' }] }}>
            <Icon name="chevron" size={16} color={c.chevron} />
          </View>
        </View>
      </View>

      {abierto ? (
        PREGUNTAS_RADAR.map(pregunta => (
          <View key={pregunta.campo} style={{ gap: 2 }}>
            <Text style={[t.body, { color: c.textSoft, fontSize: 14 }]}>{pregunta.titulo}</Text>
            <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>
              {registro[pregunta.campo]?.trim() || '—'}
            </Text>
          </View>
        ))
      ) : sentia ? (
        <Text numberOfLines={2} style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>
          Sentí: {sentia}
        </Text>
      ) : null}
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  registro: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 8, minHeight: 56 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  energia: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
