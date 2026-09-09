import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Row, RowBetween } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { PantallaPaso } from '../components/PantallaPaso';
import { Apoyo, Pregunta } from '../components/Piezas';
import { ETIQUETA_AREA, SUBTITULO_AREA } from '../reglas';
import type { Area } from '../tipos';
import { AREAS } from '../tipos';
import type { PropsPaso } from './props';

const ICONO: Record<Area, 'heart' | 'briefcase' | 'users'> = {
  salud: 'heart', negocio_dinero: 'briefcase', relaciones: 'users',
};

/** V02 · Prioridad principal. Selección única; no excluye a las otras áreas (§3 V02). */
export function PrioridadScreen({ estado }: PropsPaso) {
  const { c, t } = useTheme();
  const { mapa, actualizar, siguiente, anterior } = estado;
  return (
    <PantallaPaso
      paso={2}
      onAtras={anterior}
      boton={{ label: 'Continuar', onPress: siguiente, disabled: !mapa.prioridad, faltan: ['elegir el área que más impacto tendría'] }}
    >
      <Pregunta>Si durante estos 83 días solo pudieras transformar profundamente un área, ¿cuál tendría mayor impacto en tu vida?</Pregunta>
      <Apoyo>Trabajarás las tres. Esta elección solo define cuál tendrá prioridad cuando debas decidir.</Apoyo>
      <View style={{ marginTop: 22, gap: 12 }}>
        {AREAS.map(area => {
          const activa = mapa.prioridad === area;
          return (
            <Pressable
              key={area}
              onPress={() => actualizar(previo => ({ ...previo, prioridad: area }))}
              accessibilityRole="button"
              accessibilityState={{ selected: activa }}
              style={[styles.tarjeta, { borderColor: activa ? c.gold : c.border, backgroundColor: activa ? c.cardBgAlt : c.cardBg }]}
            >
              <RowBetween>
                <Row gap={14} style={{ flex: 1 }}>
                  <View style={[styles.icono, { borderColor: activa ? c.gold : c.border }]}>
                    <Icon name={ICONO[area]} size={20} color={activa ? c.gold : c.textSoft} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.cardTitle, { color: c.textStrong }]}>{ETIQUETA_AREA[area]}</Text>
                    <Text style={[t.small, { color: c.textSoft, marginTop: 2 }]}>{SUBTITULO_AREA[area]}</Text>
                  </View>
                </Row>
                {activa ? <Icon name="check" size={16} color={c.gold} /> : null}
              </RowBetween>
            </Pressable>
          );
        })}
      </View>
    </PantallaPaso>
  );
}

const styles = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 16, minHeight: 72 },
  icono: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
