import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChatConversation } from '../../../screens/ComunidadScreen';
import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { Presionable } from '../../../components/Presionable';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { AvatarDeChat, type TipoDeAvatar } from '../../chat/components/AvatarDeChat';
import { useTheme } from '../../../theme/ThemeContext';

export interface SharePostTargetPost {
  id: string;
  author?: string;
  avatar?: string;
  text?: string;
  media?: { url: string }[];
}

export interface SharePostSheetProps {
  /** La publicación que se comparte, o `null` con la hoja cerrada (baja animada antes de irse). */
  post: SharePostTargetPost | null;
  conversations: ChatConversation[];
  tieneCelula: boolean;
  onClose: () => void;
  onShareExternal: () => Promise<void> | void;
  onShareToConversation: (conv: ChatConversation) => Promise<void> | void;
}

/**
 * «Compartir publicación»: a qué chat mandar una publicación del Muro, desde la tarjeta o desde el
 * visor de fotos (rediseño del 2026-10-05, tanda 2 de Comunidad).
 *
 * > **Antes del 2026-10-05** era una caja con colores fijos `#1E1B18`/`#E5C689` —salía oscura
 * > también en el tema claro—, aparecía con un fundido, su agarradera era un adorno que no
 * > arrastraba, el chat global llevaba el ícono de «compartir» en una caja azul y cada destino un
 * > «Enviar ↗» (la flecha de «abrir afuera»). Ahora es la `HojaDesdeAbajo` de toda la app: sube, se
 * > arrastra para cerrarla, usa los colores del tema, y cada destino se ve como en la lista de chats.
 *
 * - **Cada destino con su avatar** (`AvatarDeChat`): el fénix del programa para la comunidad, la
 *   foto del grupo, la persona en un 1 a 1; con el mismo nombre y la misma línea de abajo que en la
 *   lista de chats, para reconocerlos sin leer.
 * - **Solo el botón redondo envía** (44 × 44, ícono `send`), no la fila: compartir no se deshace, y
 *   un toque al desplazar la lista no puede mandar la publicación a nadie.
 * - **Rótulos en tipo oración** («Directos»), como en la lista de chats.
 */
export function SharePostSheet({
  post,
  conversations,
  tieneCelula,
  onClose,
  onShareExternal,
  onShareToConversation,
}: SharePostSheetProps) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: altoVentana } = useWindowDimensions();
  const [enviandoId, setEnviandoId] = useState<string | null>(null);

  const globalConv = conversations.find(conv => conv.type === 'global');
  const celulaConv = conversations.find(conv => conv.type === 'celula');
  const directConvs = conversations.filter(conv => conv.type === 'direct');

  /*
    "WhatsApp y Otras Apps" retirado por pedido del dueno del proyecto (2026-09-05), POR AHORA:
    compartir hacia afuera saca la publicacion de un aprendiz del circulo cerrado de la tribu, y eso
    todavia no esta decidido. La prop `onShareExternal` se deja en su lugar a proposito — la opcion
    vuelve sumando su fila, sin rehacer nada.
  */
  void onShareExternal;

  const handleSendToConv = async (conv: ChatConversation) => {
    if (enviandoId) return;
    setEnviandoId(conv.id);
    try {
      await onShareToConversation(conv);
    } finally {
      setEnviandoId(null);
    }
  };

  /** Cómo está el botón de un destino: sin conversación o mientras se manda a otro, apagado. */
  const envioHacia = (conv: ChatConversation | undefined) => ({
    enviando: !!conv && enviandoId === conv.id,
    bloqueado: !conv || (enviandoId !== null && enviandoId !== conv.id),
    alEnviar: () => {
      if (conv) void handleSendToConv(conv);
    },
  });

  return (
    <HojaDesdeAbajo
      visible={post !== null}
      alCerrar={onClose}
      titulo="Compartir publicación"
      subtitulo={post?.author ? `De ${post.author}` : 'Comunidad Renaser'}
      etiquetaCerrar="Cerrar compartir"
      bajoElTitulo={post ? <VistaPreviaDelPost post={post} /> : null}
    >
      <ScrollView
        style={{ maxHeight: Math.round((altoVentana - insets.top) * 0.55) }}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.rotulo}>
          <MicroLabel>Formación Renaser</MicroLabel>
        </View>
        <DestinoDeCompartir
          tipo="global"
          nombre={globalConv?.title ?? 'Comunidad Renaser'}
          detalle={globalConv ? globalConv.subtitle : 'No disponible ahora'}
          {...envioHacia(globalConv)}
        />
        {tieneCelula && (
          <DestinoDeCompartir
            tipo="celula"
            nombre={celulaConv?.title ?? 'Tu grupo'}
            detalle={celulaConv ? celulaConv.subtitle : 'No disponible ahora'}
            fotoPath={celulaConv?.fotoPath}
            {...envioHacia(celulaConv)}
          />
        )}

        <View style={[styles.rotulo, styles.rotuloDirectos]}>
          <MicroLabel>Directos</MicroLabel>
        </View>
        {directConvs.length > 0 ? (
          directConvs.map(conv => (
            <DestinoDeCompartir
              key={conv.id}
              tipo="direct"
              nombre={conv.title}
              detalle={conv.subtitle || '1 a 1'}
              avatarUrl={conv.avatarUrl}
              {...envioHacia(conv)}
            />
          ))
        ) : (
          <Text style={[t.small, styles.vacio, { color: c.textSoft }]}>
            Todavía no tienes conversaciones uno a uno.
          </Text>
        )}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

/** La publicación que se va a mandar, en chico: su primera foto, quién la escribió y el comienzo. */
function VistaPreviaDelPost({ post }: { post: SharePostTargetPost }) {
  const { c, t } = useTheme();
  const foto = post.media?.[0]?.url;
  return (
    <View style={[styles.vistaPrevia, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
      {foto ? (
        <Image
          source={{ uri: foto }}
          style={[styles.vistaPreviaFoto, { backgroundColor: c.placeholderA }]}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : null}
      <View style={styles.vistaPreviaTextos}>
        <Text numberOfLines={1} style={[t.small, { color: c.goldInk, fontFamily: 'Jost_500Medium' }]}>
          {post.author || 'Renaser'}
        </Text>
        <Text numberOfLines={2} style={[t.small, { color: c.text }]}>
          {post.text || 'Publicación compartida'}
        </Text>
      </View>
    </View>
  );
}

interface DestinoProps {
  tipo: TipoDeAvatar;
  nombre: string;
  detalle: string;
  avatarUrl?: string | null;
  fotoPath?: string | null;
  enviando: boolean;
  bloqueado: boolean;
  alEnviar: () => void;
}

/** Una fila: avatar, nombre y detalle como en la lista de chats, y a la derecha el botón de enviar. */
function DestinoDeCompartir({ tipo, nombre, detalle, avatarUrl, fotoPath, enviando, bloqueado, alEnviar }: DestinoProps) {
  const { c } = useTheme();
  const apagado = bloqueado || enviando;
  return (
    <View style={styles.fila}>
      <AvatarDeChat tipo={tipo} nombre={nombre} avatarUrl={avatarUrl} fotoPath={fotoPath} size={44} />
      <View style={[styles.filaCuerpo, { borderBottomColor: c.divider }]}>
        <View style={styles.filaTextos}>
          <Text numberOfLines={1} style={[styles.nombre, { color: c.textStrong }]}>
            {nombre}
          </Text>
          <Text numberOfLines={1} style={[styles.detalle, { color: c.textSoft }]}>
            {detalle}
          </Text>
        </View>
        <Presionable
          onPress={alEnviar}
          disabled={apagado}
          accessibilityRole="button"
          accessibilityLabel={`Enviar a ${nombre}`}
          accessibilityState={{ disabled: apagado, busy: enviando }}
          style={[styles.enviar, { backgroundColor: c.gold, opacity: bloqueado ? 0.4 : 1 }]}
        >
          {enviando ? <ActivityIndicator size="small" color={c.onGold} /> : <Icon name="send" size={20} color={c.onGold} />}
        </Presionable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  vistaPrevia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  vistaPreviaFoto: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  vistaPreviaTextos: {
    flex: 1,
    minWidth: 0,
  },
  lista: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  rotulo: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 2,
  },
  rotuloDirectos: {
    paddingTop: 18,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    gap: 12,
  },
  filaCuerpo: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingRight: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filaTextos: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  nombre: {
    fontFamily: 'Jost_500Medium',
    fontSize: 16,
    lineHeight: 21,
  },
  detalle: {
    fontFamily: 'Jost_400Regular',
    fontSize: 14,
    lineHeight: 19,
  },
  enviar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacio: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});
