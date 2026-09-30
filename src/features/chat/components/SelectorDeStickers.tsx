import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { STICKERS_RENASER } from '../data/stickersRenaser';
import type { StickerRenaser } from '../data/stickersRenaser';

/** Hoja del chat: una sola lista, sin permisos de galería ni conversiones de las imágenes. */
export function SelectorDeStickers({ visible, enviando, onCerrar, onElegir }: {
  visible: boolean;
  enviando: boolean;
  onCerrar: () => void;
  onElegir: (sticker: StickerRenaser) => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [ancho, setAncho] = useState(320);
  const columnas = ancho < 360 ? 3 : 4;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <View style={styles.velo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCerrar} accessibilityLabel="Cerrar stickers" />
        <View
          style={[styles.hoja, { backgroundColor: c.cardBg, paddingBottom: Math.max(insets.bottom, 12) }]}
          onLayout={event => setAncho(event.nativeEvent.layout.width)}
          accessibilityViewIsModal
        >
          <View style={styles.cabecera}>
            <Text style={[styles.titulo, { color: c.text }]} accessibilityRole="header">Stickers Renaser</Text>
            <Pressable onPress={onCerrar} style={styles.cerrar} accessibilityRole="button" accessibilityLabel="Cerrar stickers">
              <Icon name="close" size={22} color={c.text} />
            </Pressable>
          </View>
          <FlatList
            key={columnas}
            data={STICKERS_RENASER}
            numColumns={columnas}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.lista}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onElegir(item)}
                disabled={enviando}
                style={[styles.sticker, { width: `${100 / columnas}%`, opacity: enviando ? 0.4 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel={`Enviar sticker: ${item.nombre}`}
                accessibilityState={{ disabled: enviando }}
              >
                <Image source={item.imagen} style={styles.imagen} contentFit="contain" />
              </Pressable>
            )}
          />
          {enviando && <Text style={[styles.estado, { color: c.textSoft }]} accessibilityLiveRegion="polite">Enviando sticker…</Text>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  velo: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  hoja: { width: '100%', maxWidth: 560, height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 8, paddingVertical: 8 },
  titulo: { flex: 1, fontFamily: 'Jost_700Bold', fontSize: 19 },
  cerrar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  lista: { flexGrow: 1, paddingHorizontal: 8, paddingBottom: 16 },
  sticker: { aspectRatio: 1, padding: 6, minHeight: 48 },
  imagen: { width: '100%', height: '100%' },
  estado: { textAlign: 'center', fontFamily: 'Jost_500Medium', fontSize: 14, paddingBottom: 8 },
});
