import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextLayoutLine, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { CURVA_EN_PANTALLA, CURVA_SALIDA } from '../../../theme/movimiento';
import { MOMENTO_MS } from './momentoDelHabito';
import { escucharLaTarjeta } from './momentoEnLaTarjeta';

/**
 * Lo que acompaña al check en la tarjeta cuando el hábito se cumple (2026-10-07, segunda vuelta): el brillo dorado del
 * borde y el tachado del título que se dibuja. Los dos arrancan con el aviso `celebrar` del check (`CheckDelHabito`),
 * que es el único que decide si hay celebración y con qué demora: así nunca hay dos, ni una a destiempo.
 */

/**
 * Un borde dorado encima del de la tarjeta que se enciende y se apaga (opacidad, sin sombra: animar `elevation`
 * redibuja la sombra en cada cuadro en Android). Con «reducir movimiento» es igual: es un fundido, no un movimiento.
 */
export function BrilloDeLaTarjeta({ registroId, color, radio }: { registroId: string; color: string; radio: number }) {
  const brillo = useSharedValue(0);

  useEffect(
    () =>
      escucharLaTarjeta(registroId, evento => {
        if (evento.tipo !== 'celebrar') return;
        brillo.set(
          withDelay(
            evento.demoraMs,
            withSequence(
              withTiming(1, { duration: MOMENTO_MS.brilloEntrada, easing: CURVA_SALIDA }),
              withTiming(0, { duration: MOMENTO_MS.brilloSalida, easing: CURVA_SALIDA }),
            ),
          ),
        );
      }),
    [registroId, brillo],
  );

  const estilo = useAnimatedStyle(() => ({ opacity: brillo.get() }));
  return (
    <Animated.View
      pointerEvents="none"
      testID="brillo-de-la-tarjeta"
      style={[styles.brillo, { borderColor: color, borderRadius: radio + 1 }, estilo]}
    />
  );
}

/**
 * El título del hábito, tachado cuando está cumplido. Si se cumple CON la tarjeta a la vista, la raya se dibuja de
 * izquierda a derecha, renglón por renglón (`onTextLayout` dice dónde cae cada uno); si ya estaba cumplido al montarse,
 * es el `line-through` de siempre. Con «reducir movimiento», la raya aparece con un fundido.
 */
export function TituloQueSeTacha({
  registroId,
  texto,
  cumplido,
  style,
  colorDeLaRaya,
}: {
  registroId: string;
  texto: string;
  cumplido: boolean;
  style: StyleProp<TextStyle>;
  colorDeLaRaya: string;
}) {
  const reducido = useReducedMotion();
  /* Cumplido al montarse: tachado de texto, sin animar. Se decide una vez (no cambia con el estado de la tarjeta). */
  const cumplidoAlMontarse = useRef(cumplido).current;
  const [renglones, setRenglones] = useState<TextLayoutLine[]>([]);
  const trazo = useSharedValue(0);

  useEffect(
    () =>
      escucharLaTarjeta(registroId, evento => {
        if (evento.tipo !== 'celebrar') return;
        trazo.set(0);
        const duracion = reducido ? MOMENTO_MS.fundido : MOMENTO_MS.tachado;
        trazo.set(withDelay(evento.demoraMs, withTiming(1, { duration: duracion, easing: CURVA_EN_PANTALLA })));
      }),
    [registroId, reducido, trazo],
  );
  /* Vuelve a pendiente (cambio de día): sin raya. */
  useEffect(() => {
    if (!cumplido) trazo.set(0);
  }, [cumplido, trazo]);

  const conTextoTachado = cumplido && cumplidoAlMontarse;
  const conRayas = cumplido && !cumplidoAlMontarse;
  return (
    <View style={styles.titulo}>
      <Text
        style={[style, { textDecorationLine: conTextoTachado ? 'line-through' : 'none' }]}
        onTextLayout={e => setRenglones(e.nativeEvent.lines)}
      >
        {texto}
      </Text>
      {conRayas &&
        renglones.map((renglon, i) => (
          <RayaDelRenglon
            key={i}
            renglon={renglon}
            indice={i}
            total={renglones.length}
            trazo={trazo}
            color={colorDeLaRaya}
            reducido={reducido}
          />
        ))}
    </View>
  );
}

/**
 * Una raya por renglón. Con varios renglones se dibujan en fila: el trazo (0 → 1) se reparte entre ellos. Con
 * «reducir movimiento», la raya entera aparece por opacidad.
 */
function RayaDelRenglon({
  renglon,
  indice,
  total,
  trazo,
  color,
  reducido,
}: {
  renglon: TextLayoutLine;
  indice: number;
  total: number;
  trazo: SharedValue<number>;
  color: string;
  reducido: boolean;
}) {
  const estilo = useAnimatedStyle(() => {
    const parte = Math.min(1, Math.max(0, trazo.get() * total - indice));
    return reducido ? { opacity: parte } : { transform: [{ scaleX: parte }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID="raya-del-tachado"
      style={[
        styles.raya,
        {
          left: renglon.x,
          top: renglon.y + renglon.height * 0.54,
          width: renglon.width,
          backgroundColor: color,
        },
        estilo,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  brillo: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderWidth: 2,
  },
  titulo: { flex: 1 },
  raya: {
    position: 'absolute',
    height: 1.5,
    transformOrigin: 'left center',
  },
});
