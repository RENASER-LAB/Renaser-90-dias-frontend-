import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Row } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { PantallaPaso } from '../components/PantallaPaso';
import { Apoyo, Entrada, Pregunta } from '../components/Piezas';
import { DIAS_HITO, ETIQUETA_AREA, faltantesDeHitos, hitosCompletos, hitosSugeridos } from '../reglas';
import type { Area, DiaHito } from '../tipos';
import { AREAS, objetivoDe } from '../tipos';
import type { PropsPaso } from './props';

const ICONO: Record<Area, 'heart' | 'briefcase' | 'users'> = { salud: 'heart', negocio_dinero: 'briefcase', relaciones: 'users' };

/** V08 · Hitos (§3 V08): tres por objetivo, sugeridos con progresión no lineal y editables. */
export function HitosScreen({ estado }: PropsPaso) {
  const { c, t } = useTheme();
  const { mapa, actualizar, siguiente, anterior } = estado;
  const valido = hitosCompletos(mapa.hitos);

  const valorDe = (area: Area, dia: DiaHito) => mapa.hitos.find(h => h.area === area && h.dia === dia)?.valor ?? '';

  const cambiar = (area: Area, dia: DiaHito, valor: string) => actualizar(previo => {
    const existe = previo.hitos.some(h => h.area === area && h.dia === dia);
    const hitos = existe
      ? previo.hitos.map(h => (h.area === area && h.dia === dia ? { ...h, valor } : h))
      : [...previo.hitos, { area, dia, valor }];
    return { ...previo, hitos };
  });

  const resugerir = (area: Area) => actualizar(previo => ({
    ...previo,
    hitos: [...previo.hitos.filter(h => h.area !== area), ...hitosSugeridos(objetivoDe(previo, area))],
  }));

  return (
    <PantallaPaso paso={8} onAtras={anterior} boton={{ label: 'Confirmar hitos', onPress: siguiente, disabled: !valido, faltan: faltantesDeHitos(mapa.hitos) }}>
      <Pregunta>No esperarás hasta el final para saber si avanzas.</Pregunta>
      <Apoyo>Revisa los hitos propuestos y ajústalos si no representan un progreso real. El del Día 90 es tu meta.</Apoyo>

      {AREAS.map(area => (
        <View key={area} style={[styles.bloque, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          <Row gap={8}>
            <Icon name={ICONO[area]} size={14} color={c.gold} />
            <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14 }]}>{ETIQUETA_AREA[area]}</Text>
          </Row>
          <Row gap={8} align="flex-start" style={{ marginTop: 12 }}>
            {DIAS_HITO.map(dia => (
              <View key={dia} style={{ flex: 1 }}>
                <Text style={[t.micro, { color: c.micro, marginBottom: 6, textAlign: 'center' }]}>DÍA {dia}</Text>
                <Entrada valor={valorDe(area, dia)} onCambiar={v => cambiar(area, dia, v)} placeholder="—" maximo={40} />
              </View>
            ))}
          </Row>
          <Text onPress={() => resugerir(area)} style={[t.micro, { color: c.textSoft, marginTop: 10, alignSelf: 'flex-end' }]}>
            VOLVER A SUGERIR
          </Text>
        </View>
      ))}
    </PantallaPaso>
  );
}

const styles = StyleSheet.create({
  bloque: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 14 },
});
