import React, { useEffect, useRef, useState } from 'react';
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

/** Cuanto tiene que quedarse quieta la rueda antes de avisarle al formulario. */
const MS_QUIETO = 140;

const ALTO_ITEM = 44;
const FILAS_VISIBLES = 3;
const ALTO_RUEDA = ALTO_ITEM * FILAS_VISIBLES;
const PADDING_VERTICAL = ALTO_ITEM * Math.floor(FILAS_VISIBLES / 2);

const HORAS = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS = Array.from({ length: 60 }, (_, i) => i);

/**
 * Tope de arranque (D-122, backend `VentanaDelDia.ULTIMA_HORA_DE_DISPARO`). Más tarde que esto no
 * queda tiempo de completar el hábito antes de las 00:00, y el servidor devuelve 400.
 *
 * **Por qué se refleja acá y no se deja fallar al servidor.** El caso que motivó la regla es
 * justamente el de quien trabaja de noche: ofrecerle las 23:55 en la rueda y rechazárselo después
 * es la peor de las dos opciones. La rueda de minutos se acorta sola cuando la hora es 23.
 */
const ULTIMA_HORA = 23;
const ULTIMO_MINUTO_DE_LA_ULTIMA_HORA = 40;

function aDosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

interface RuedaProps {
  etiqueta: string;
  valores: number[];
  valorInicial: number;
  onCambiar: (valor: number) => void;
}

function Rueda({ etiqueta, valores, valorInicial, onCambiar }: RuedaProps) {
  const { c, t } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [seleccionado, setSeleccionado] = useState(valorInicial);

  // Un timeout vivo despues de desmontar avisaria de un valor que ya no se esta editando.
  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

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
    const indice = Math.max(0, valores.indexOf(valorInicial));
    scrollRef.current?.scrollTo({ y: indice * ALTO_ITEM, animated: false });
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
      style={{ height: ALTO_RUEDA }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ALTO_ITEM}
      decelerationRate="fast"
      contentContainerStyle={{ paddingVertical: PADDING_VERTICAL }}
      contentOffset={{ x: 0, y: valorInicial * ALTO_ITEM }}
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

interface RuedaHoraPickerProps {
  horaInicial: number;
  minutoInicial: number;
  onCambiar: (hora: number, minuto: number) => void;
}

export function RuedaHoraPicker({ horaInicial, minutoInicial, onCambiar }: RuedaHoraPickerProps) {
  const { c } = useTheme();
  // La hora es estado y no ref porque la rueda de minutos DEPENDE de ella: a las 23 se corta en
  // :40. El minuto sigue siendo ref — nada se re-renderiza cuando cambia.
  const [hora, setHora] = useState(horaInicial);
  const minutoRef = useRef(Math.min(minutoInicial, horaInicial === ULTIMA_HORA
    ? ULTIMO_MINUTO_DE_LA_ULTIMA_HORA
    : 59));

  const minutosDisponibles = hora === ULTIMA_HORA
    ? MINUTOS.slice(0, ULTIMO_MINUTO_DE_LA_ULTIMA_HORA + 1)
    : MINUTOS;

  return (
    <View style={styles.contenedor}>
      {/* Franja central resaltada, fija, no scrollea — marca el valor elegido. En web tambien:
          se habia apagado cuando la rueda se reemplazo por un `<select>`, y sin ella el diseño
          pierde justo la pieza que dice cual de los tres numeros visibles es el elegido. */}
      <View
        pointerEvents="none"
        style={[
          styles.franjaCentral,
          { top: ALTO_ITEM, height: ALTO_ITEM, borderColor: c.gold },
        ]}
      />
      <Rueda
        etiqueta="Hora (formato de 24 horas)"
        valores={HORAS}
        valorInicial={horaInicial}
        onCambiar={h => {
          // Subir a las 23 con :55 puesto dejaría un valor que el servidor rechaza: se recorta al
          // último minuto válido, y la rueda de minutos se vuelve a montar mostrando ese recorte.
          if (h === ULTIMA_HORA && minutoRef.current > ULTIMO_MINUTO_DE_LA_ULTIMA_HORA) {
            minutoRef.current = ULTIMO_MINUTO_DE_LA_ULTIMA_HORA;
          }
          setHora(h);
          onCambiar(h, minutoRef.current);
        }}
      />
      <Text style={[styles.dosPuntos, { color: c.textStrong }]}>:</Text>
      <Rueda
        // `Rueda` es no controlada: solo se reposiciona al montarse. La key la remonta cuando la
        // lista de minutos cambia de largo, que es lo único que la puede dejar desincronizada.
        etiqueta="Minutos"
        key={`minutos-${minutosDisponibles.length}`}
        valores={minutosDisponibles}
        valorInicial={minutoRef.current}
        onCambiar={m => {
          minutoRef.current = m;
          onCambiar(hora, minutoRef.current);
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
