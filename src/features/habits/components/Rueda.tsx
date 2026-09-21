import React, { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';

/**
 * UNA columna de rueda: números que se scrollean libres y se enganchan al que queda en el centro,
 * como el selector nativo de reloj. No sabe qué significan los valores — recibe la lista y avisa
 * cuál quedó elegido.
 *
 * ## Por qué está en su propio archivo (2026-09-21)
 *
 * Nació adentro de `RuedaHoraPicker` como pieza privada de la rueda hora:minuto. El 2026-09-21 el
 * recordatorio "Otra" de Training dejó de ser un campo de texto —el teclado numérico se abría
 * encima y tapaba justo el número que la persona estaba escribiendo— y pasó a ser una rueda de
 * minutos. Hacía falta LA MISMA columna con otra lista de valores, así que se extrajo en vez de
 * copiarse: una rueda, dos usos, un solo lugar donde arreglar lo que falle.
 *
 * Sin dependencias nuevas: es un `ScrollView` con `snapToInterval` (nada de paquetes nativos
 * mientras se prueba por Expo Go).
 */

/** Cuanto tiene que quedarse quieta la rueda antes de avisarle al formulario. */
const MS_QUIETO = 140;

const ALTO_ITEM = 44;
const FILAS_VISIBLES = 3;
const ALTO_RUEDA = ALTO_ITEM * FILAS_VISIBLES;
const PADDING_VERTICAL = ALTO_ITEM * Math.floor(FILAS_VISIBLES / 2);

function aDosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

export interface RuedaProps {
  /** Qué elige esta columna. Es lo que lee el lector de pantalla: la rueda solo muestra números. */
  etiqueta: string;
  valores: number[];
  valorInicial: number;
  onCambiar: (valor: number) => void;
}

export function Rueda({ etiqueta, valores, valorInicial, onCambiar }: RuedaProps) {
  const { c, t } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [seleccionado, setSeleccionado] = useState(valorInicial);

  // Un timeout vivo despues de desmontar avisaria de un valor que ya no se esta editando.
  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  /**
   * El ÍNDICE del valor, que es lo único que sabe de posiciones en pantalla.
   *
   * No es lo mismo que el valor: las horas y los minutos del reloj empiezan en `0` y ahí índice y
   * valor coinciden, pero una rueda de "1 a 60 minutos antes" arranca en 1 y queda corrida un
   * lugar. Calcularlo siempre por `indexOf` es lo que deja a la rueda servir para cualquier lista.
   */
  const indiceDe = (valor: number) => Math.max(0, valores.indexOf(valor));

  /**
   * Posiciona la rueda en el valor que ya rige.
   *
   * **`contentOffset` NO alcanza: es una prop de iOS y Android la ignora.** El síntoma en el
   * teléfono era una rueda mostrando `00` mientras el botón decía `GUARDAR 05:00` — la rueda no
   * "volvía" a otra hora, nunca se había movido, y lo que se veía arriba era mentira. Peor que un
   * error: la pantalla afirmaba una cosa y el formulario tenía otra.
   *
   * `animated: false` porque esto es la posición INICIAL, no un movimiento que la persona pidió.
   * Depende de `valorInicial` para que remontar la rueda —cambiar de hábito, o el recorte de
   * minutos al pasar a las 23— también la reubique.
   */
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, valores.indexOf(valorInicial)) * ALTO_ITEM, animated: false });
  }, [valorInicial, valores]);

  const valorEnOffset = (offsetY: number) => {
    const indice = Math.max(0, Math.min(valores.length - 1, Math.round(offsetY / ALTO_ITEM)));
    return valores[indice];
  };

  const onFinDeScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const valor = valorEnOffset(e.nativeEvent.contentOffset.y);
    setSeleccionado(valor);
    onCambiar(valor);
  };

  /**
   * En WEB este es el unico evento que llega. `onMomentumScrollEnd` y `onScrollEndDrag` son de la
   * gesture de RN: con rueda de mouse o teclado no se disparan nunca, asi que la rueda se movia y
   * el formulario se quedaba con el valor viejo — el sintoma que llevo a reemplazarla por un
   * `<select>` y perder el diseño.
   *
   * Se resuelve sin tirar la rueda: `onScroll` marca el valor visible en el acto, y el aviso al
   * formulario se manda cuando el scroll se queda quieto {@link MS_QUIETO} ms. Ese respiro es lo
   * que evita mandar cincuenta valores intermedios mientras el dedo o la rueda todavia se mueven.
   */
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const valor = valorEnOffset(e.nativeEvent.contentOffset.y);
    setSeleccionado(valor);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => onCambiar(valor), MS_QUIETO);
  };

  return (
    <ScrollView
      ref={scrollRef}
      accessibilityLabel={etiqueta}
      style={{ height: ALTO_RUEDA }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ALTO_ITEM}
      decelerationRate="fast"
      contentContainerStyle={{ paddingVertical: PADDING_VERTICAL }}
      contentOffset={{ x: 0, y: indiceDe(valorInicial) * ALTO_ITEM }}
      onScroll={onScroll}
      scrollEventThrottle={16}
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
                color: v === seleccionado ? c.goldInk : c.textSoft,
                opacity: v === seleccionado ? 1 : 0.5,
                fontFamily: v === seleccionado ? 'Jost_700Bold' : 'Jost_400Regular',
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

/**
 * La franja central resaltada: fija, no scrollea, marca cuál de los tres números visibles es el
 * elegido. Va DENTRO del contenedor de la o las ruedas, que la posiciona a lo ancho.
 *
 * En web tambien: se habia apagado cuando la rueda se reemplazo por un `<select>`, y sin ella el
 * diseño pierde justo la pieza que dice cual de los tres numeros es el que cuenta.
 */
export function FranjaCentral() {
  const { c } = useTheme();
  return (
    <View
      pointerEvents="none"
      style={[styles.franjaCentral, { top: ALTO_ITEM, height: ALTO_ITEM, borderColor: c.gold }]}
    />
  );
}

const styles = StyleSheet.create({
  franjaCentral: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
  },
});
