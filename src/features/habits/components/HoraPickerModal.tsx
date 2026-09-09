import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { GoldButton } from '../../../components/GoldButton';
import { Icon } from '../../../components/Icon';

/**
 * Selector de hora táctil, pensado para un público de 40+ años (palabras del dueño del
 * producto): nada de escribir texto libre ("05:00 AM" a mano invita a errores de formato que
 * un aprendiz mayor no tiene por qué saber corregir). Se elige la hora y el minuto tocando
 * botones grandes, como el resto de los selectores de este mismo diseño (días de la semana,
 * momento del día).
 *
 * Antes de construir esto se revisó `package.json`: el proyecto no trae ningún selector de hora
 * nativo (`@react-native-community/datetimepicker` no está instalado), así que sumar uno hubiera
 * significado una dependencia nueva con código nativo — riesgo y tiempo de build que no hacen
 * falta cuando el propio diseño ya resuelve selección con grillas de botones en todos lados.
 *
 * Los minutos se ofrecen en pasos de 5 (12 opciones) en vez de los 60 posibles: con un dedo
 * grande y una lista de 60 botones, elegir el minuto exacto es más difícil, no más preciso en la
 * práctica — los horarios reales del catálogo ya son casi todos en punto o en :30.
 */

const HORAS = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS = Array.from({ length: 12 }, (_, i) => i * 5);

function aDosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

interface HoraPickerModalProps {
  visible: boolean;
  tituloHabito: string;
  /** `HH:mm` (24h) o cadena vacía si el hábito todavía no tiene hora de disparo. */
  horaInicial: string;
  onConfirmar: (hora: string) => void;
  onCerrar: () => void;
}

export function HoraPickerModal({
  visible,
  tituloHabito,
  horaInicial,
  onConfirmar,
  onCerrar,
}: HoraPickerModalProps) {
  const { c, t } = useTheme();
  const [hora, setHora] = useState(6);
  const [minuto, setMinuto] = useState(0);

  // Arranca desde la hora que ya tenía el hábito cada vez que se abre, no desde un valor fijo.
  useEffect(() => {
    if (!visible) return;
    const [h, m] = horaInicial.split(':').map(Number);
    setHora(Number.isFinite(h) ? h : 6);
    // Se ajusta al múltiplo de 5 más cercano: los pasos del selector son de a 5 minutos.
    setMinuto(Number.isFinite(m) ? Math.round(m / 5) * 5 % 60 : 0);
  }, [visible, horaInicial]);

  const momentoDelDia = hora < 12 ? 'de la mañana' : hora < 18 ? 'de la tarde' : 'de la noche';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={styles.overlay}>
        <View style={[styles.card, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
          <View style={[styles.header, { borderBottomColor: c.divider }]}>
            <View style={{ flex: 1 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>ELEGIR HORA</Text>
              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]} numberOfLines={1}>
                {tituloHabito}
              </Text>
            </View>
            <Pressable onPress={onCerrar} hitSlop={10}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Icon name="close" size={12} color={c.goldInk} />
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>Cerrar</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.horaGrande}>
            <Text style={{ fontFamily: 'Jost_400Regular', fontSize: 44, color: c.textStrong }}>
              {aDosDigitos(hora)}:{aDosDigitos(minuto)}
            </Text>
            <Text style={[t.micro, { color: c.textSoft, marginTop: 2 }]}>{momentoDelDia}</Text>
          </View>

          <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', marginTop: 6 }]}>HORA</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
          >
            {HORAS.map(h => {
              const seleccionada = h === hora;
              return (
                <Pressable
                  key={h}
                  onPress={() => setHora(h)}
                  style={[
                    styles.pill,
                    {
                      borderColor: seleccionada ? c.gold : c.border,
                      backgroundColor: seleccionada ? c.gold : c.cardBgAlt,
                    },
                  ]}
                >
                  <Text
                    style={[
                      t.cardTitle,
                      { fontSize: 14, color: seleccionada ? c.onGold : c.textStrong },
                    ]}
                  >
                    {aDosDigitos(h)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', marginTop: 12 }]}>MINUTOS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
          >
            {MINUTOS.map(m => {
              const seleccionado = m === minuto;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMinuto(m)}
                  style={[
                    styles.pill,
                    {
                      borderColor: seleccionado ? c.gold : c.border,
                      backgroundColor: seleccionado ? c.gold : c.cardBgAlt,
                    },
                  ]}
                >
                  <Text
                    style={[
                      t.cardTitle,
                      { fontSize: 14, color: seleccionado ? c.onGold : c.textStrong },
                    ]}
                  >
                    {aDosDigitos(m)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <GoldButton
            label="✓ GUARDAR HORA"
            onPress={() => onConfirmar(`${aDosDigitos(hora)}:${aDosDigitos(minuto)}`)}
            style={{ width: '100%', marginTop: 16 }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 8,
    gap: 10,
  },
  horaGrande: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  pill: {
    minWidth: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});
