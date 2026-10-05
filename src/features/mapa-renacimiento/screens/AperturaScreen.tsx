import React from 'react';
import { Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Row } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { useProgramaDia } from '../../programa/hooks/useProgramaDia';
import { PantallaPaso } from '../components/PantallaPaso';
import { textosDeApertura } from '../textosDeApertura';
import type { PropsPaso } from './props';

/**
 * V01 · Apertura. Texto visible aprobado en el manual (§3 V01), con el día y los días que quedan
 * del programa real en vez del «DÍA 7» y los «83 días» escritos a mano (`textosDeApertura`).
 */
export function AperturaScreen({ estado, onSalir }: PropsPaso) {
  const { c, t } = useTheme();
  const { mapa, siguiente } = estado;
  const textos = textosDeApertura(useProgramaDia());
  const hayProgreso = mapa.estado !== 'no_iniciado' && mapa.pasoActual > 1;
  return (
    <PantallaPaso
      paso={1}
      onAtras={onSalir}
      etiquetaAtras="Volver"
      boton={{ label: hayProgreso ? 'Continuar mi mapa' : 'Diseñar mi mapa', onPress: siguiente }}
    >
      {/* Mientras no se sabe el día el renglón queda vacío y no salta: mismo alto que con texto. */}
      <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold', marginTop: 24 }]}>{textos.dia ?? ' '}</Text>
      <Text style={[t.hero, { color: c.textStrong, fontSize: 30, letterSpacing: 0.5, marginTop: 8, fontFamily: 'Jost_400Regular' }]}>
        Diseña tu mapa
      </Text>
      <View style={{ width: 36, height: 1, backgroundColor: c.gold, marginVertical: 18 }} />
      <Text style={[t.body, { color: c.text, lineHeight: 23 }]}>
        {textos.plan}
      </Text>
      <Text style={[t.body, { color: c.text, lineHeight: 23, marginTop: 14 }]}>
        Responde con honestidad. No buscamos respuestas perfectas; buscamos decisiones que puedas sostener y demostrar.
      </Text>
      <Row gap={8} style={{ marginTop: 22 }}>
        <Icon name="clock" size={14} color={c.textSoft} />
        <Text style={[t.small, { color: c.textSoft }]}>15–20 min</Text>
      </Row>
    </PantallaPaso>
  );
}
