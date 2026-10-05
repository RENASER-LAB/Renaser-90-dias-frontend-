import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { STICKERS_RENASER } from '../data/stickersRenaser';
import type { StickerRenaser } from '../data/stickersRenaser';

/**
 * Hoja del chat: una sola lista, sin permisos de galería ni conversiones de las imágenes.
 *
 * > **Corregido 2026-10-05 (tanda 2 de Comunidad).** Era un `Modal` propio con `animationType="slide"`:
 * > subía con la animación del sistema, sin agarradera ni arrastre, y el fondo oscuro aparecía de
 * > golpe. Ahora es la `HojaDesdeAbajo` de toda la app: sube con la curva del cajón, se arrastra para
 * > cerrarla, el fondo se aclara con el dedo y usa los colores del tema. La grilla, los stickers y
 * > cómo se envían no cambiaron.
 *
 * La grilla ocupa hasta un poco más de media pantalla y se desplaza si no entra (en un teléfono
 * chico, con tres columnas, no entra). Cada sticker se hunde al apoyar el dedo (`Presionable`).
 */
export function SelectorDeStickers({ visible, enviando, onCerrar, onElegir }: {
  visible: boolean;
  enviando: boolean;
  onCerrar: () => void;
  onElegir: (sticker: StickerRenaser) => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: altoVentana } = useWindowDimensions();
  const [ancho, setAncho] = useState(320);
  const columnas = ancho < 360 ? 3 : 4;

  return (
    <HojaDesdeAbajo visible={visible} alCerrar={onCerrar} titulo="Stickers Renaser" etiquetaCerrar="Cerrar stickers">
      <View onLayout={event => setAncho(event.nativeEvent.layout.width)}>
        <FlatList
          key={columnas}
          data={STICKERS_RENASER}
          numColumns={columnas}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: Math.round((altoVentana - insets.top) * 0.55) }}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <Presionable
              onPress={() => onElegir(item)}
              disabled={enviando}
              contenedorStyle={{ width: `${100 / columnas}%` }}
              style={[styles.sticker, { opacity: enviando ? 0.4 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={`Enviar sticker: ${item.nombre}`}
              accessibilityState={{ disabled: enviando }}
            >
              <Image source={item.imagen} style={styles.imagen} contentFit="contain" />
            </Presionable>
          )}
        />
      </View>
      {enviando && (
        <Text style={[styles.estado, { color: c.textSoft }]} accessibilityLiveRegion="polite">
          Enviando sticker…
        </Text>
      )}
    </HojaDesdeAbajo>
  );
}

const styles = StyleSheet.create({
  lista: { paddingHorizontal: 8, paddingBottom: 8 },
  sticker: { aspectRatio: 1, padding: 6, minHeight: 48 },
  imagen: { width: '100%', height: '100%' },
  estado: { textAlign: 'center', fontFamily: 'Jost_500Medium', fontSize: 14, paddingTop: 4 },
});
