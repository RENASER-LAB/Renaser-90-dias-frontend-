import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

/**
 * Velo de un `<Modal transparent>` que se cierra al tocar fuera de la tarjeta.
 *
 * POR QUE EXISTE. `useSystemBackHandler` cubre el retroceso de Android (boton, barra de tres
 * botones y deslizamiento desde el borde: los tres llegan como `hardwareBackPress`). En iOS
 * ese evento no existe, y `onRequestClose` solo se dispara al arrastrar hacia abajo un modal
 * con `presentationStyle` "pageSheet"/"formSheet" — que aqui no se puede usar, porque todos
 * los modales son `transparent` y eso fuerza `overFullScreen`.
 *
 * Resultado: en iOS la unica salida era el boton de cerrar. Tocar fuera es la convencion de
 * la plataforma para hojas y dialogos propios, no anade dependencia y no cambia el aspecto.
 *
 * CUANDO **NO** USARLO: si el modal tiene texto a medio escribir o una firma sin guardar.
 * Cerrar por un toque accidental fuera destruiria el trabajo del usuario, que es peor que
 * obligarle a buscar la ✕. Para esos casos hay que guardar borrador antes de cerrar (como
 * hace `PastillaRenacerModal`) o dejarlos solo con el boton.
 *
 * `onStartShouldSetResponder` en la tarjeta frena la propagacion: tocar dentro no cierra.
 */
export function VeloModal({
  children,
  onCerrar,
  style,
  etiqueta = 'Cerrar',
}: {
  children: React.ReactNode;
  onCerrar: () => void;
  /** Estilo del velo (color de fondo, centrado, padding). */
  style?: StyleProp<ViewStyle>;
  /** Lo que anuncia el lector de pantalla para la zona pulsable de fuera. */
  etiqueta?: string;
}) {
  return (
    <Pressable
      onPress={onCerrar}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={[styles.velo, style]}
    >
      {/* Envoltorio no pulsable que corta el toque: sin esto, tocar la tarjeta cerraria. */}
      <Pressable style={styles.contenido} onPress={() => {}} accessible={false}>
        {children}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  velo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  /* `contentente` no lleva flex: se ajusta a la tarjeta, para que el area de fuera sea
     realmente el resto de la pantalla y no un rectangulo invisible que la tape. */
  contenido: { width: '100%', alignItems: 'center' },
});
