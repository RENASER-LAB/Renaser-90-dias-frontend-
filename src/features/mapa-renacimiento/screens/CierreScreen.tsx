import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Row } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { PantallaPaso } from '../components/PantallaPaso';
import type { PropsPaso } from './props';

/** V11 · Cierre. Texto final aprobado (§10.1). No cuenta como paso; abre el Día 8, no el inicio genérico. */
export function CierreScreen({ estado, onSalir }: PropsPaso) {
  const { c, t } = useTheme();
  const { mapa } = estado;
  const filas: { icono: 'zap' | 'stack' | 'award' | 'calendar'; titulo: string; detalle: string }[] = [
    { icono: 'zap', titulo: '3 objetivos', detalle: 'Cuerpo, negocio y relaciones' },
    { icono: 'stack', titulo: `${mapa.acciones.length} acciones semanales`, detalle: 'Tu sistema de ejecución, ya en tus hábitos' },
    { icono: 'award', titulo: `${mapa.reemplazos.length} reemplazo${mapa.reemplazos.length === 1 ? '' : 's'}`, detalle: 'Para mantener el rumbo' },
    { icono: 'calendar', titulo: 'Próximo control: 7 días', detalle: 'Revisa tu avance y ajusta' },
  ];
  return (
    <PantallaPaso paso={null} boton={{ label: 'Comenzar mis 83 días', onPress: onSalir }}>
      <Text style={[t.micro, { color: c.gold, letterSpacing: 2, marginTop: 24 }]}>FELICIDADES</Text>
      <Text style={[t.hero, { color: c.textStrong, fontSize: 28, letterSpacing: 0.5, marginTop: 8, fontFamily: 'Jost_400Regular' }]}>
        Tu mapa está activo.
      </Text>
      <Text style={[t.body, { color: c.text, lineHeight: 23, marginTop: 16 }]}>
        Has completado la fase Diseño de tu Mapa. Desde hoy tienes una ruta clara para convertir tus decisiones en resultados observables durante los próximos 83 días.
      </Text>
      <Text style={[t.body, { color: c.text, lineHeight: 23, marginTop: 12 }]}>
        No necesitas hacerlo perfecto. Necesitas sostenerlo, medirlo y volver cada vez que te desvíes.
      </Text>

      <View style={[styles.resumen, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        {filas.map(f => (
          <Row key={f.titulo} gap={12} style={{ marginVertical: 8 }}>
            <View style={[styles.icono, { borderColor: c.gold }]}>
              <Icon name={f.icono} size={14} color={c.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14 }]}>{f.titulo}</Text>
              <Text style={[t.small, { color: c.textSoft, marginTop: 1 }]}>{f.detalle}</Text>
            </View>
          </Row>
        ))}
      </View>

      <Row gap={12} style={[styles.audio, { borderColor: c.border }]}>
        <Icon name="play" size={14} color={c.textSoft} />
        <View style={{ flex: 1 }}>
          <Text style={[t.small, { color: c.textSoft }]}>Audio de bautizo (opcional)</Text>
          <Text style={[t.micro, { color: c.micro, marginTop: 2 }]}>PRÓXIMAMENTE · REAFIRMA TU COMPROMISO</Text>
        </View>
      </Row>
    </PantallaPaso>
  );
}

const styles = StyleSheet.create({
  resumen: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 22 },
  icono: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  audio: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 12 },
});
