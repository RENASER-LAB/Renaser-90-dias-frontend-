import React from 'react';
import { Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Row } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { PantallaPaso } from '../components/PantallaPaso';
import type { PropsPaso } from './props';

/** V01 · Apertura. Texto visible aprobado en el manual (§3 V01). */
export function AperturaScreen({ estado, onSalir }: PropsPaso) {
  const { c, t } = useTheme();
  const { mapa, siguiente } = estado;
  const hayProgreso = mapa.estado !== 'no_iniciado' && mapa.pasoActual > 1;
  return (
    <PantallaPaso
      paso={1}
      onAtras={onSalir}
      etiquetaAtras="Volver"
      boton={{ label: hayProgreso ? 'Continuar mi mapa' : 'Diseñar mi mapa', onPress: siguiente }}
    >
      <Text style={[t.micro, { color: c.gold, letterSpacing: 2, marginTop: 24 }]}>DÍA 7</Text>
      <Text style={[t.hero, { color: c.textStrong, fontSize: 30, letterSpacing: 0.5, marginTop: 8, fontFamily: 'Jost_400Regular' }]}>
        Diseña tu mapa
      </Text>
      <View style={{ width: 36, height: 1, backgroundColor: c.gold, marginVertical: 18 }} />
      <Text style={[t.body, { color: c.text, lineHeight: 23 }]}>
        Ya conoces mejor tu punto de partida. Ahora convertirás lo aprendido en un plan claro para los próximos 83 días.
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
