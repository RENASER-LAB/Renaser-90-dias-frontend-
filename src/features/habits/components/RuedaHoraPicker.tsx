import React, { useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';

/**
 * Rueda de hora/minuto de scroll libre, tipo selector de reloj nativo (iOS/Android): cualquier
 * minuto (00-59), no pasos fijos. Distinto a propósito de `HoraPickerModal` (que sigue usando
 * pasos de 5 minutos en pantallas de Plan) — este componente es solo para el flujo nuevo de
 * "Planificar" en Training, pedido explícitamente con scroll libre.
 *
 * Sin dependencias nuevas: dos `ScrollView` con `snapToInterval`, igual criterio que
 * `HoraPickerModal` (nada de paquetes nativos nuevos mientras se prueba por Expo Go).
 */

const ALTO_ITEM = 44;
const FILAS_VISIBLES = 3;
const ALTO_RUEDA = ALTO_ITEM * FILAS_VISIBLES;
const PADDING_VERTICAL = ALTO_ITEM * Math.floor(FILAS_VISIBLES / 2);

const HORAS = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS = Array.from({ length: 60 }, (_, i) => i);

function aDosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

interface RuedaProps {
  valores: number[];
  valorInicial: number;
  onCambiar: (valor: number) => void;
}

function Rueda({ valores, valorInicial, onCambiar }: RuedaProps) {
  const { c, t } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [seleccionado, setSeleccionado] = useState(valorInicial);

  const onFinDeScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const indice = Math.max(0, Math.min(valores.length - 1, Math.round(offsetY / ALTO_ITEM)));
    const valor = valores[indice];
    setSeleccionado(valor);
    onCambiar(valor);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ height: ALTO_RUEDA }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ALTO_ITEM}
      decelerationRate="fast"
      contentContainerStyle={{ paddingVertical: PADDING_VERTICAL }}
      contentOffset={{ x: 0, y: valorInicial * ALTO_ITEM }}
      onMomentumScrollEnd={onFinDeScroll}
      onScrollEndDrag={onFinDeScroll}
    >
      {valores.map(v => (
        <View key={v} style={{ height: ALTO_ITEM, alignItems: 'center', justifyContent: 'center' }}>
          <Text
            style={[
              t.cardTitle,
              {
                fontSize: v === seleccionado ? 30 : 20,
                color: v === seleccionado ? c.gold : c.textSoft,
                opacity: v === seleccionado ? 1 : 0.5,
                fontWeight: v === seleccionado ? '700' : '400',
              },
            ]}
          >
            {aDosDigitos(v)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

interface RuedaHoraPickerProps {
  horaInicial: number;
  minutoInicial: number;
  onCambiar: (hora: number, minuto: number) => void;
}

export function RuedaHoraPicker({ horaInicial, minutoInicial, onCambiar }: RuedaHoraPickerProps) {
  const { c } = useTheme();
  const horaRef = useRef(horaInicial);
  const minutoRef = useRef(minutoInicial);

  return (
    <View style={styles.contenedor}>
      {/* Franja central resaltada, fija, no scrollea — marca el valor elegido. */}
      <View
        pointerEvents="none"
        style={[
          styles.franjaCentral,
          { top: ALTO_ITEM, height: ALTO_ITEM, borderColor: c.gold },
        ]}
      />
      <Rueda
        valores={HORAS}
        valorInicial={horaInicial}
        onCambiar={h => {
          horaRef.current = h;
          onCambiar(horaRef.current, minutoRef.current);
        }}
      />
      <Text style={[styles.dosPuntos, { color: c.textStrong }]}>:</Text>
      <Rueda
        valores={MINUTOS}
        valorInicial={minutoInicial}
        onCambiar={m => {
          minutoRef.current = m;
          onCambiar(horaRef.current, minutoRef.current);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  franjaCentral: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
  },
  dosPuntos: {
    fontFamily: 'Jost_700Bold',
    fontSize: 26,
    marginBottom: 2,
  },
});
