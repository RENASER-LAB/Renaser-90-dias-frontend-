import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import type { ChatConversation } from '../../../screens/ComunidadScreen';
import { Icon } from '../../../components/Icon';

export interface SharePostTargetPost {
  id: string;
  author?: string;
  avatar?: string;
  text?: string;
  media?: { url: string }[];
}

export interface SharePostSheetProps {
  post: SharePostTargetPost;
  conversations: ChatConversation[];
  tieneCelula: boolean;
  onClose: () => void;
  onShareExternal: () => Promise<void> | void;
  onShareToConversation: (conv: ChatConversation) => Promise<void> | void;
}

export function SharePostSheet({
  post,
  conversations,
  tieneCelula,
  onClose,
  onShareExternal,
  onShareToConversation,
}: SharePostSheetProps) {
  const insets = useSafeAreaInsets();
  const [enviandoId, setEnviandoId] = useState<string | null>(null);

  // Soporte de navegación por gestos de Android / Xiaomi (Regla 6)
  useSystemBackHandler(() => {
    onClose();
    return true;
  }, true);

  // Clasificar conversaciones
  const globalConv = conversations.find(c => c.type === 'global');
  const celulaConv = conversations.find(c => c.type === 'celula');
  const directConvs = conversations.filter(c => c.type === 'direct');

  const handleSendToConv = async (conv: ChatConversation) => {
    if (enviandoId) return;
    setEnviandoId(conv.id);
    try {
      await onShareToConversation(conv);
    } finally {
      setEnviandoId(null);
    }
  };

  // Sin usar mientras la opcion externa este retirada (ver el bloque comentado abajo).
  const handleShareExt = async () => {
    if (enviandoId) return;
    await onShareExternal();
    onClose();
  };

  return (
    <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 18) }]}>
      {/* Píldora de arrastre decorativa */}
      <View style={styles.dragIndicator} />

      {/* Cabecera */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>COMPARTIR PUBLICACIÓN</Text>
          <Text style={styles.headerSubtitle}>
            {post.author ? `De ${post.author}` : 'Comunidad Renaser'}
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
          <Icon name="close" size={16} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Tarjeta de previsualización compacta del post */}
      <View style={styles.previewBox}>
        {post.media && post.media[0]?.url ? (
          <Image
            source={{ uri: post.media[0].url }}
            style={styles.previewImg}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : null}
        <View style={styles.previewContent}>
          <Text style={styles.previewAuthor}>{post.author || 'Renaser'}</Text>
          <Text numberOfLines={2} style={styles.previewText}>
            {post.text || 'Publicación compartida'}
          </Text>
        </View>
      </View>

      {/* Lista de opciones scrolleable */}
      <ScrollView
        style={styles.scrollOptions}
        contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/*
          "WhatsApp y Otras Apps" retirado por pedido del dueno del proyecto (2026-09-05),
          POR AHORA: compartir hacia afuera saca la publicacion de un aprendiz del circulo
          cerrado de la tribu, y eso todavia no esta decidido. `handleShareExt` y la prop
          `onShareExternal` se dejan en su lugar a proposito — la opcion vuelve prendiendo
          este bloque de nuevo, sin rehacer nada.
        */}

        {/* 2. CHAT GLOBAL DE LA COMUNIDAD */}
        <Pressable
          onPress={() => globalConv && handleSendToConv(globalConv)}
          disabled={!globalConv || enviandoId === globalConv?.id}
          style={({ pressed }) => [
            styles.optionCard,
            !globalConv && styles.optionCardDisabled,
            pressed && styles.optionCardPressed,
          ]}
        >
          <View style={[styles.optionIconBox, { backgroundColor: 'rgba(52, 152, 219, 0.15)' }]}>
            <Icon name="share" size={20} color="#E5C689" />
          </View>
          <View style={styles.optionTextBox}>
            <Text style={styles.optionTitle}>Chat Global Renaser</Text>
            <Text style={styles.optionDesc}>
              {globalConv ? 'Compartir en el canal general de toda la tribu' : 'Canal global no disponible'}
            </Text>
          </View>
          {enviandoId === globalConv?.id ? (
            <ActivityIndicator size="small" color="#E5C689" />
          ) : (
            <View style={styles.actionPill}>
              <Text style={styles.actionPillText}>Enviar ↗</Text>
            </View>
          )}
        </Pressable>

        {/* 3. CHAT DE MI CÉLULA (SOLO SI TIENE CÉLULA) */}
        {tieneCelula && (
          <Pressable
            onPress={() => celulaConv && handleSendToConv(celulaConv)}
            disabled={!celulaConv || enviandoId === celulaConv?.id}
            style={({ pressed }) => [
              styles.optionCard,
              !celulaConv && styles.optionCardDisabled,
              pressed && styles.optionCardPressed,
            ]}
          >
            <View style={[styles.optionIconBox, { backgroundColor: 'rgba(198,164,92,0.12)' }]}>
              <Icon name="users" size={20} color="#E5C689" />
            </View>
            <View style={styles.optionTextBox}>
              <Text style={styles.optionTitle}>Chat de mi Célula</Text>
              <Text style={styles.optionDesc}>
                {celulaConv ? `Enviar a ${celulaConv.title}` : 'Compartir con tu grupo íntimo y mentor'}
              </Text>
            </View>
            {enviandoId === celulaConv?.id ? (
              <ActivityIndicator size="small" color="#E5C689" />
            ) : (
              <View style={styles.actionPill}>
                <Text style={styles.actionPillText}>Enviar ↗</Text>
              </View>
            )}
          </Pressable>
        )}

        {/* 4. CHAT DIRECTO CON MIEMBROS */}
        <View style={styles.directSectionHeader}>
          <Text style={styles.directSectionTitle}>💬 CHAT DIRECTO CON MIEMBROS</Text>
        </View>

        {directConvs.length > 0 ? (
          directConvs.map(conv => (
            <Pressable
              key={conv.id}
              onPress={() => handleSendToConv(conv)}
              disabled={enviandoId === conv.id}
              style={({ pressed }) => [styles.directMemberCard, pressed && styles.optionCardPressed]}
            >
              <View style={styles.directAvatarBox}>
                <Text style={{ fontSize: 16 }}>{conv.avatar || '👤'}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.directMemberName}>
                  {conv.title}
                </Text>
                <Text numberOfLines={1} style={styles.directMemberSub}>
                  {conv.subtitle || '1 a 1'}
                </Text>
              </View>
              {enviandoId === conv.id ? (
                <ActivityIndicator size="small" color="#E5C689" />
              ) : (
                <View style={[styles.actionPill, { paddingHorizontal: 10 }]}>
                  <Text style={styles.actionPillText}>Enviar ↗</Text>
                </View>
              )}
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyDirectBox}>
            <Text style={styles.emptyDirectText}>
              Aún no tienes conversaciones directas abiertas con otros integrantes.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: '#1E1B18',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.3)',
    maxHeight: '82%',
    paddingHorizontal: 16,
    paddingTop: 10,
    width: '100%',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#E5C689',
    fontFamily: 'Jost_700Bold',
    fontSize: 14,
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    color: '#C5BEB3',
    fontFamily: 'Jost_400Regular',
    fontSize: 11.5,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Jost_700Bold',
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 8,
    marginVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  previewImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  previewContent: {
    flex: 1,
    minWidth: 0,
  },
  previewAuthor: {
    color: '#E5C689',
    fontFamily: 'Jost_700Bold',
    fontSize: 11.5,
  },
  previewText: {
    color: '#FFFFFF',
    fontFamily: 'Jost_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 1,
  },
  scrollOptions: {
    marginTop: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 52,
  },
  optionCardPressed: {
    backgroundColor: 'rgba(212, 160, 23, 0.15)',
    borderColor: '#E5C689',
  },
  optionCardDisabled: {
    opacity: 0.5,
  },
  optionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextBox: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    color: '#FFFFFF',
    fontFamily: 'Jost_700Bold',
    fontSize: 13,
  },
  optionDesc: {
    color: '#C5BEB3',
    fontFamily: 'Jost_400Regular',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  actionPill: {
    backgroundColor: 'rgba(212, 160, 23, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.4)',
  },
  actionPillText: {
    color: '#E5C689',
    fontFamily: 'Jost_700Bold',
    fontSize: 11,
  },
  directSectionHeader: {
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  directSectionTitle: {
    color: '#E5C689',
    fontFamily: 'Jost_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  directMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    minHeight: 48,
  },
  directAvatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directMemberName: {
    color: '#FFFFFF',
    fontFamily: 'Jost_500Medium',
    fontSize: 12.5,
  },
  directMemberSub: {
    color: '#C5BEB3',
    fontFamily: 'Jost_400Regular',
    fontSize: 10.5,
    marginTop: 1,
  },
  emptyDirectBox: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
  },
  emptyDirectText: {
    color: '#C5BEB3',
    fontFamily: 'Jost_400Regular',
    fontSize: 11.5,
    textAlign: 'center',
  },
});
