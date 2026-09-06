import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Row, RowBetween } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { PantallaPaso } from '../components/PantallaPaso';
import { Apoyo, Avisos, Entrada, Etiqueta, Pastillas, Pregunta } from '../components/Piezas';
import {
  BLOQUES, DIAS_SEMANA, ETIQUETA_AREA, EVIDENCIAS_ACCION, LIMITES, accionValida, accionesPorArea,
  ajustarDias, avisosDeCarga, esVago, sistemaEjecucionValido,
} from '../reglas';
import type { AccionMotora, Area, DiaSemana } from '../tipos';
import { AREAS } from '../tipos';
import { idLocal, type PropsPaso } from './props';

const ICONO: Record<Area, 'heart' | 'briefcase' | 'users'> = { salud: 'heart', negocio_dinero: 'briefcase', relaciones: 'users' };

/** V06 · Sistema de ejecución (§3 V06): 1–2 acciones por objetivo, máximo 6, sin verbos vagos. */
export function SistemaEjecucionScreen({ estado }: PropsPaso) {
  const { c, t } = useTheme();
  const { mapa, actualizar, siguiente, anterior } = estado;
  const total = mapa.acciones.length;
  const valido = sistemaEjecucionValido(mapa.acciones);

  const agregar = (area: Area) => actualizar(previo => {
    if (accionesPorArea(previo.acciones, area).length >= LIMITES.accionesPorObjetivo) return previo;
    if (previo.acciones.length >= LIMITES.accionesTotales) return previo;
    const nueva: AccionMotora = { id: idLocal(), area, texto: '', frecuenciaSemanal: 3, dias: ['L', 'X', 'V'], momento: null, evidencia: null };
    return { ...previo, acciones: [...previo.acciones, nueva] };
  });

  const cambiar = (id: string, parche: Partial<AccionMotora>) => actualizar(previo => ({
    ...previo,
    acciones: previo.acciones.map(a => (a.id === id ? { ...a, ...parche } : a)),
  }));

  const quitar = (id: string) => actualizar(previo => ({ ...previo, acciones: previo.acciones.filter(a => a.id !== id) }));

  return (
    <PantallaPaso
      paso={6}
      onAtras={anterior}
      boton={{ label: 'Confirmar mi sistema', onPress: siguiente, disabled: !valido }}
    >
      <Pregunta>Los resultados no se ejecutan; se ejecutan acciones.</Pregunta>
      <Apoyo>Elige las acciones que, sostenidas cada semana, harán más probable cada objetivo. Puedes definir hasta 6 acciones (máximo 2 por objetivo).</Apoyo>

      {AREAS.map(area => {
        const propias = accionesPorArea(mapa.acciones, area);
        const puedeAgregar = propias.length < LIMITES.accionesPorObjetivo && total < LIMITES.accionesTotales;
        return (
          <View key={area} style={[styles.bloque, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            <Row gap={8}>
              <Icon name={ICONO[area]} size={14} color={c.gold} />
              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14 }]}>{ETIQUETA_AREA[area]}</Text>
            </Row>
            {propias.map(a => (
              <EditorAccion key={a.id} accion={a} onCambiar={parche => cambiar(a.id, parche)} onQuitar={() => quitar(a.id)} />
            ))}
            {puedeAgregar ? (
              <Pressable onPress={() => agregar(area)} accessibilityRole="button" style={[styles.agregar, { borderColor: c.border }]}>
                <Row gap={8}>
                  <Icon name="plus" size={12} color={c.gold} />
                  <Text style={[t.small, { color: c.gold }]}>Agregar acción ({propias.length}/{LIMITES.accionesPorObjetivo})</Text>
                </Row>
              </Pressable>
            ) : (
              <Text style={[t.micro, { color: c.micro, marginTop: 10 }]}>
                {propias.length >= LIMITES.accionesPorObjetivo ? 'Máximo dos por objetivo: prioriza.' : 'Máximo seis acciones en total.'}
              </Text>
            )}
          </View>
        );
      })}

      <Avisos avisos={avisosDeCarga(mapa.acciones)} />
      <Text style={[t.micro, { color: c.micro, marginTop: 14, textAlign: 'center' }]}>{total}/{LIMITES.accionesTotales} acciones</Text>
    </PantallaPaso>
  );
}

function EditorAccion({ accion, onCambiar, onQuitar }: {
  accion: AccionMotora;
  onCambiar: (parche: Partial<AccionMotora>) => void;
  onQuitar: () => void;
}) {
  const { c, t } = useTheme();
  const vaga = accion.texto.trim().length > 0 && esVago(accion.texto);
  const completa = accionValida(accion);

  const alternarDia = (dia: DiaSemana) => {
    const dias = accion.dias.includes(dia) ? accion.dias.filter(d => d !== dia) : [...accion.dias, dia];
    const ordenados = DIAS_SEMANA.filter(d => dias.includes(d));
    onCambiar({ dias: ordenados, frecuenciaSemanal: Math.max(1, Math.min(7, ordenados.length)) });
  };

  const cambiarFrecuencia = (delta: number) => {
    const frecuencia = Math.max(1, Math.min(7, accion.frecuenciaSemanal + delta));
    onCambiar({ frecuenciaSemanal: frecuencia, dias: ajustarDias(accion.dias, frecuencia) });
  };

  return (
    <View style={[styles.editor, { borderColor: completa ? c.borderStrong : c.border, backgroundColor: c.cardBgAlt }]}>
      <Entrada
        valor={accion.texto}
        onCambiar={texto => onCambiar({ texto })}
        placeholder="Verbo + objeto. Ej. Caminar 40 minutos"
        minimo={LIMITES.accion.min}
        maximo={LIMITES.accion.max}
      />
      {vaga ? <Text style={[t.small, { color: '#E06A66', marginTop: 4 }]}>Pensar, intentar, mejorar o esforzarme no son acciones. Usa un verbo observable.</Text> : null}

      <Etiqueta>Frecuencia</Etiqueta>
      <RowBetween>
        <Text style={[t.small, { color: c.text }]}>{accion.frecuenciaSemanal} {accion.frecuenciaSemanal === 1 ? 'vez' : 'veces'} por semana</Text>
        <Row gap={8}>
          <Pressable onPress={() => cambiarFrecuencia(-1)} accessibilityRole="button" accessibilityLabel="Menos" style={[styles.masMenos, { borderColor: c.border }]}>
            <Text style={[t.body, { color: c.text }]}>−</Text>
          </Pressable>
          <Pressable onPress={() => cambiarFrecuencia(1)} accessibilityRole="button" accessibilityLabel="Más" style={[styles.masMenos, { borderColor: c.border }]}>
            <Text style={[t.body, { color: c.text }]}>+</Text>
          </Pressable>
        </Row>
      </RowBetween>

      <Etiqueta>Días</Etiqueta>
      <Row gap={6}>
        {DIAS_SEMANA.map(d => {
          const activo = accion.dias.includes(d);
          return (
            <Pressable key={d} onPress={() => alternarDia(d)} accessibilityRole="button" accessibilityState={{ selected: activo }}
              style={[styles.dia, { borderColor: activo ? c.gold : c.border, backgroundColor: activo ? c.cardBg : 'transparent' }]}>
              <Text style={[t.micro, { color: activo ? c.gold : c.textSoft }]}>{d}</Text>
            </Pressable>
          );
        })}
      </Row>

      <Etiqueta>Momento (opcional)</Etiqueta>
      <Pastillas opciones={BLOQUES} valor={accion.momento} onCambiar={m => onCambiar({ momento: accion.momento === m ? null : m })} />

      <Etiqueta>Evidencia</Etiqueta>
      <Pastillas opciones={EVIDENCIAS_ACCION} valor={accion.evidencia} onCambiar={e => onCambiar({ evidencia: e })} />

      <Pressable onPress={onQuitar} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-end', marginTop: 12, minHeight: 32, justifyContent: 'center' }}>
        <Text style={[t.micro, { color: c.textSoft }]}>QUITAR</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 14 },
  editor: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  agregar: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  masMenos: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dia: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
