import { fuentes } from '../../../theme/fuentes';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { useTheme } from '../../../theme/ThemeContext';
import { CURVA_SALIDA } from '../../../theme/movimiento';
import { stickerDelSemaforo } from '../data/stickersDelSemaforo';
import type { MensajeDelSemaforo as MensajeDelSemaforoDto } from '../types/semaforo.types';

/** Lo que dura el fundido de entrada: un cambio de aire, no un efecto (la guía manda < 300 ms). */
export const FUNDIDO_DEL_MENSAJE_MS = 180;

/** Lado del sticker del búho. */
export const LADO_DEL_STICKER = 56;

/**
 * El mensaje del día junto al semáforo, con el búho (spec 006 del backend; pedido del dueño: «que el mensaje
 * le hable a la persona» y «un sticker del búho para que se sienta humano»).
 *
 * - **El texto es del servidor y no se toca**: ya viene redactado, con el nombre y los datos puestos, sin
 *   llaves y en tuteo. La app solo lo pinta (fuente regular 15, tamaño de lectura, color de texto del tema: contraste
 *   de los dos modos). Va en una burbuja de lavado dorado, a la derecha del sticker.
 * - **Sticker desconocido, vacío o que no carga → solo el texto** (la burbuja ocupa todo el ancho). Una app
 *   vieja ante un sticker nuevo del servidor nunca deja un hueco ni se rompe.
 * - **El sticker es decorativo** (`accessible={false}`): el nombre del archivo no dice nada a un lector de
 *   pantalla y el texto ya lo lleva la tarjeta en su etiqueta (`TarjetaSemaforoHoy`).
 *
 * Movimiento (`emil-design-eng`, `animate-expo`): la persona lo ve una vez al día, así que es del nivel
 * «ocasional», y su único propósito es que no aparezca de golpe junto a lo demás. Un fundido de 180 ms con
 * ease-out, solo `opacity` (hilo de la interfaz, sin re-dibujar). **Con «reducir movimiento» no se anima**
 * (sale a la vista ya puesto). Quien lo monte le pone `key={mensaje.id}`: un mensaje distinto vuelve a
 * fundirse, y el mismo mensaje con datos nuevos (los «faltan» bajan al cumplir un hábito) no.
 *
 * Mide al menos lo que mide el sticker, y el texto tiene `flexShrink: 1`: con letra del sistema grande o en
 * un teléfono angosto el texto baja de renglón, nunca se sale de la tarjeta.
 */
/**
 * La entrada es una animación de montaje de Reanimated (`entering`), no un valor compartido animado en un
 * `useEffect`: así el fundido lo maneja el propio montaje y la vista nunca puede quedar en opacidad 0.
 * > **Corregido 2026-10-19 (E2E de la spec 006 en el emulador).** Con `useSharedValue(0)` + `withTiming` en un
 * > `useEffect`, en la tarjeta de Hoy el mensaje quedaba montado pero invisible (opacidad 0) en Android: se veía el
 * > hueco y no el texto. Con «reducir movimiento» `ReduceMotion.System` lo deja puesto sin animar.
 */
const ENTRADA = FadeIn.duration(FUNDIDO_DEL_MENSAJE_MS).easing(CURVA_SALIDA).reduceMotion(ReduceMotion.System);

export function MensajeDelSemaforo({ mensaje }: { mensaje: MensajeDelSemaforoDto }) {
  const { c } = useTheme();
  const [stickerFallo, setStickerFallo] = useState(false);

  const sticker = stickerFallo ? null : stickerDelSemaforo(mensaje.sticker);

  return (
    <Animated.View style={estilos.fila} entering={ENTRADA}>
      {sticker ? (
        <Image
          source={sticker}
          style={estilos.sticker}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={0}
          onError={() => setStickerFallo(true)}
          accessible={false}
        />
      ) : null}
      <View style={[estilos.burbuja, sticker ? estilos.burbujaConSticker : null, { backgroundColor: c.goldWash }]}>
        <Text style={[estilos.texto, { color: c.text }]}>{mensaje.texto}</Text>
      </View>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  sticker: { width: LADO_DEL_STICKER, height: LADO_DEL_STICKER },
  burbuja: {
    flex: 1,
    flexShrink: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  /** Con el búho al lado, la burbuja no baja del alto del sticker: sticker y texto se leen como una pieza. */
  burbujaConSticker: { minHeight: LADO_DEL_STICKER - 8 },
  texto: { fontFamily: fuentes.regular, fontSize: 15, lineHeight: 21, flexShrink: 1 },
});
