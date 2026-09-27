import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ChatConversation } from '../../../screens/ComunidadScreen';
import { useTheme } from '../../../theme/ThemeContext';
import { horaDeLaLista } from '../utils/formatoChat';
import { AvatarDeChat } from './AvatarDeChat';

/**
 * Una fila de la lista de chats, con la gramática de WhatsApp (2026-09-26): avatar redondo,
 * nombre, último mensaje en una línea («Tú: …», «📷 Foto»), hora a la derecha y el contador de
 * no leídos en un círculo dorado. Con mensajes sin leer, la hora y la vista previa se marcan.
 *
 * Letra de 17/16 px: la app la usan personas de 30 a 60 años.
 */
export function FilaDeConversacion({
  conversacion,
  titulo,
  ahora,
  onPress,
}: {
  conversacion: ChatConversation;
  /** El nombre ya resuelto (el de un grupo sale de `/me/cells`, ver `nombreVisibleDeGrupo`). */
  titulo: string;
  ahora: Date;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const hora = conversacion.lastMessageAt ? horaDeLaLista(conversacion.lastMessageAt, ahora) : conversacion.lastTime;
  const sinLeer = conversacion.unreadCount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${conversacion.lastMessage}${sinLeer ? `. ${conversacion.unreadCount} sin leer` : ''}`}
      style={({ pressed }) => [styles.fila, pressed && { backgroundColor: c.goldWash }]}
    >
      <AvatarDeChat
        tipo={conversacion.type}
        nombre={titulo}
        avatarUrl={conversacion.avatarUrl}
        size={54}
      />
      <View style={[styles.cuerpo, { borderBottomColor: c.divider }]}>
        <View style={styles.renglon}>
          <Text numberOfLines={1} style={[styles.nombre, { color: c.textStrong }]}>
            {titulo}
          </Text>
          {!!hora && (
            <Text
              style={[
                styles.hora,
                { color: sinLeer ? c.goldInk : c.textSoft, fontFamily: sinLeer ? 'Jost_700Bold' : 'Jost_400Regular' },
              ]}
            >
              {hora}
            </Text>
          )}
        </View>
        <View style={styles.renglon}>
          <Text
            numberOfLines={1}
            style={[
              styles.vistaPrevia,
              { color: sinLeer ? c.text : c.textSoft, fontFamily: sinLeer ? 'Jost_500Medium' : 'Jost_400Regular' },
            ]}
          >
            {conversacion.lastMessage}
          </Text>
          {sinLeer && (
            <View style={[styles.contador, { backgroundColor: c.gold }]}>
              <Text style={[styles.contadorTexto, { color: c.onGold }]}>
                {conversacion.unreadCount > 99 ? '99+' : conversacion.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 76,
    paddingLeft: 4,
    borderRadius: 12,
  },
  cuerpo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    paddingVertical: 12,
    paddingRight: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  renglon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nombre: {
    flex: 1,
    fontFamily: 'Jost_500Medium',
    fontSize: 17,
  },
  hora: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  vistaPrevia: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  contador: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: {
    fontFamily: 'Jost_700Bold',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});
