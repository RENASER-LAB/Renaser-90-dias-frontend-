import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { AvatarDeChat, type TipoDeAvatar } from './AvatarDeChat';

/**
 * La cabecera de una conversación, como en WhatsApp (2026-09-26): flecha para volver, avatar,
 * nombre y una línea debajo («Grupo · 3 integrantes», «Aprendiz · 1 a 1», «En línea»). Tocar el
 * avatar o el nombre abre la info (en un grupo, sus integrantes).
 */
export function CabeceraDeChat({
  tipo,
  titulo,
  subtitulo,
  enLinea,
  avatarUrl,
  onVolver,
  onAbrirInfo,
}: {
  tipo: TipoDeAvatar;
  titulo: string;
  subtitulo: string;
  /** En un 1 a 1, si la otra persona está conectada ahora (sale de la presencia del socket). */
  enLinea: boolean;
  avatarUrl?: string | null;
  onVolver: () => void;
  onAbrirInfo: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.barra, { borderBottomColor: c.divider, backgroundColor: c.cardBg }]}>
      <Pressable
        onPress={onVolver}
        hitSlop={8}
        style={styles.volver}
        accessibilityRole="button"
        accessibilityLabel="Volver a la lista de chats"
      >
        <Icon name="arrowLeft" size={20} color={c.goldInk} />
      </Pressable>

      <Pressable
        onPress={onAbrirInfo}
        style={styles.quien}
        accessibilityRole="button"
        accessibilityLabel={`Ver la información de ${titulo}`}
      >
        <AvatarDeChat tipo={tipo} nombre={titulo} avatarUrl={avatarUrl} size={42} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[styles.titulo, { color: c.textStrong }]}>
            {titulo}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.subtitulo, { color: enLinea ? c.success : c.textSoft }]}
          >
            {enLinea ? 'En línea' : subtitulo}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onAbrirInfo}
        hitSlop={8}
        style={styles.volver}
        accessibilityRole="button"
        accessibilityLabel="Información del chat"
      >
        <Icon name="info" size={20} color={c.goldInk} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  volver: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quien: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titulo: {
    fontFamily: 'Jost_500Medium',
    fontSize: 17,
  },
  subtitulo: {
    fontFamily: 'Jost_400Regular',
    fontSize: 14,
  },
});
