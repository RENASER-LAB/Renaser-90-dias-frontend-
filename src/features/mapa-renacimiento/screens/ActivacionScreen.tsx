import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Row } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { PantallaPaso } from '../components/PantallaPaso';
import { Apoyo, Pregunta, TarjetaSeccion } from '../components/Piezas';
import { ETIQUETA_AREA, PATRONES, definicionDeTerminado, frasearReemplazo } from '../reglas';
import { AREAS, objetivoDe } from '../tipos';
import type { PropsPaso } from './props';

/**
 * V10 · Revisión y activación (§3 V10). Cada bloque vuelve a su pantalla con "Editar". Activar es
 * idempotente (AC-07): el hook recuerda qué hábitos ya creó. El compromiso de seguimiento es el
 * botón que pidió el dueño en §2 del manual.
 */
export function ActivacionScreen({ estado }: PropsPaso) {
  const { c, t } = useTheme();
  const { mapa, actualizar, irA, anterior, activar, activando, errorActivacion } = estado;
  const { listo, faltantes } = definicionDeTerminado(mapa);
  const puedeActivar = listo && mapa.compromisoSeguimiento && !activando;

  return (
    <PantallaPaso
      paso={10}
      onAtras={anterior}
      boton={{ label: 'Activar mi mapa', onPress: () => { void activar(); }, disabled: !puedeActivar, loading: activando }}
    >
      <Pregunta>Este es tu Mapa de Renacimiento.</Pregunta>
      <Apoyo>No tiene que ser perfecto; tiene que ser claro, medible y sostenible. Revisa cada sección antes de activarlo.</Apoyo>

      <TarjetaSeccion titulo="Prioridad principal" icono="star" onEditar={() => irA(2)}>
        <Text style={[t.small, { color: c.text }]}>{mapa.prioridad ? ETIQUETA_AREA[mapa.prioridad] : 'Sin definir'}</Text>
      </TarjetaSeccion>

      <TarjetaSeccion titulo="Objetivos (3)" icono="zap" onEditar={() => irA(3)}>
        {AREAS.map(area => {
          const o = objetivoDe(mapa, area);
          return (
            <View key={area} style={{ marginBottom: 8 }}>
              <Text style={[t.micro, { color: c.gold, letterSpacing: 1 }]}>{ETIQUETA_AREA[area].toUpperCase()}</Text>
              <Text style={[t.small, { color: c.text, lineHeight: 18, marginTop: 2 }]}>{o.metaRedactada || 'Sin meta'}</Text>
            </View>
          );
        })}
      </TarjetaSeccion>

      <TarjetaSeccion titulo={`Acciones semanales (${mapa.acciones.length})`} icono="stack" onEditar={() => irA(6)}>
        {mapa.acciones.map(a => (
          <Text key={a.id} style={[t.small, { color: c.text, lineHeight: 18 }]}>
            · {a.texto} — {a.frecuenciaSemanal}×/semana ({a.dias.join(' ')})
          </Text>
        ))}
      </TarjetaSeccion>

      <TarjetaSeccion titulo={`Patrones a reemplazar (${mapa.reemplazos.length})`} icono="award" onEditar={() => irA(7)}>
        {mapa.reemplazos.map(r => (
          <Text key={r.id} style={[t.small, { color: c.text, lineHeight: 18, marginBottom: 4 }]}>
            · {PATRONES.find(p => p.clave === r.patron)?.etiqueta ?? r.patron}: {frasearReemplazo(r)}
          </Text>
        ))}
      </TarjetaSeccion>

      <TarjetaSeccion titulo="Hitos de avance" icono="calendar" onEditar={() => irA(8)}>
        {AREAS.map(area => (
          <Text key={area} style={[t.small, { color: c.text, lineHeight: 18 }]}>
            · {ETIQUETA_AREA[area]}: {[30, 60, 90].map(d => mapa.hitos.find(h => h.area === area && h.dia === d)?.valor || '—').join(' → ')}
          </Text>
        ))}
      </TarjetaSeccion>

      <TarjetaSeccion titulo="Protocolo de retorno" icono="heart" onEditar={() => irA(9)}>
        <Text style={[t.small, { color: c.text, lineHeight: 18 }]}>{mapa.retorno || 'Sin definir'}</Text>
      </TarjetaSeccion>

      <Pressable
        onPress={() => actualizar(previo => ({ ...previo, compromisoSeguimiento: !previo.compromisoSeguimiento }))}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: mapa.compromisoSeguimiento }}
        style={[styles.compromiso, { borderColor: mapa.compromisoSeguimiento ? c.gold : c.border, backgroundColor: c.cardBg }]}
      >
        <Row gap={12} align="flex-start">
          <View style={[styles.casilla, { borderColor: c.gold, backgroundColor: mapa.compromisoSeguimiento ? c.gold : 'transparent' }]}>
            {mapa.compromisoSeguimiento ? <Icon name="check" size={12} color={c.onGold} /> : null}
          </View>
          <Text style={[t.small, { color: c.text, flex: 1, lineHeight: 19 }]}>
            Me comprometo a reportar mis avances y acepto ser mentoreado (seguimiento Renaser).
          </Text>
        </Row>
      </Pressable>

      {!listo ? (
        <View style={{ marginTop: 14 }}>
          <Text style={[t.small, { color: c.textSoft }]}>Falta completar: {faltantes.join('; ')}.</Text>
        </View>
      ) : null}
      {errorActivacion ? (
        <Text style={[t.small, { color: '#E06A66', marginTop: 12, lineHeight: 18 }]}>
          {errorActivacion} Lo que ya se creó no se duplica al reintentar.
        </Text>
      ) : null}
    </PantallaPaso>
  );
}

const styles = StyleSheet.create({
  compromiso: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 18, minHeight: 44 },
  casilla: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
